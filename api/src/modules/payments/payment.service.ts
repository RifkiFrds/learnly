import type { Payment, Prisma } from '@prisma/client';
import { Errors } from '../../lib/app-error';
import { toNumber } from '../../lib/money';
import { buildMeta, toSkipTake } from '../../lib/pagination';
import { prisma } from '../../lib/prisma';
import { resolveFileUrl, uploadFile, type StoredFile } from '../../lib/storage';
import { addHours, wibDateTimeToUtc, toWibParts } from '../../lib/time';
import { sweepExpired } from '../bookings/booking-maintenance';
import { STATUS_LABEL } from '../bookings/booking-status';
import { cancelInTx, confirmPaidInTx } from '../bookings/booking.lifecycle';
import { bookingRepository } from '../bookings/booking.repository';
import { notificationService } from '../notifications/notification.service';
import { settingsService } from '../settings/settings.service';
import type { PlatformSettings } from '../settings/settings.schema';
import { tutorRepository } from '../tutors/tutor.repository';
import type { Viewer } from '../bookings/booking.service';
import { decideVerification, PAYMENT_STATUS_LABEL } from './payment.policy';
import { paymentRepository } from './payment.repository';
import type {
  AdminPaymentsQuery,
  EarningsQuery,
  ListPaymentsQuery,
  RefundPaymentBody,
  VerifyPaymentBody,
} from './payment.schema';

type Payables = Awaited<ReturnType<typeof paymentRepository.loadPayables>>;

function paymentExpiresAt(payment: Payment, settings: PlatformSettings) {
  return payment.status === 'menunggu_pembayaran'
    ? addHours(payment.createdAt, settings.paymentWindowHours)
    : null;
}

/**
 * Instruksi pembayaran manual (FR-PAY-01/02): QRIS statis dan/atau rekening transfer.
 * Dipakai bersama oleh booking (GET /bookings/:id/payment-info) dan enrollment kursus.
 */
export function buildPaymentInstructions(payment: Payment | null, settings: PlatformSettings) {
  const canUploadProof =
    payment !== null && ['menunggu_pembayaran', 'menunggu_verifikasi'].includes(payment.status);
  return {
    payment: payment
      ? {
          id: payment.id,
          status: payment.status,
          statusLabel: PAYMENT_STATUS_LABEL[payment.status],
          amount: payment.amount,
          proofImageUrl: resolveFileUrl(payment.proofImageUrl),
          submittedAt: payment.submittedAt,
          rejectionReason: payment.rejectionReason,
          paidAt: payment.paidAt,
          expiresAt: paymentExpiresAt(payment, settings),
        }
      : null,
    paymentMethods: {
      qris: settings.qrisImageUrl ? { imageUrl: settings.qrisImageUrl } : null,
      bankTransfer: settings.bankTransfer,
    },
    instructions: [
      'Scan QRIS di atas dengan aplikasi e-wallet/m-banking, atau transfer ke rekening yang tertera.',
      'Bayar sesuai nominal total (tanpa pembulatan) agar mudah dicocokkan.',
      'Unggah foto/screenshot bukti transfer lewat tombol "Upload bukti bayar".',
      'Tim Learnly akan memverifikasi bukti transfermu maksimal 1x24 jam. Status akan berubah otomatis di halaman ini.',
    ],
    canUploadProof,
  };
}

function formatPayment(
  payment: Payment & {
    user?: { id: bigint; fullName: string; email: string; phone: string | null };
  },
  payables: Payables,
  options: { includePayer: boolean; settings: PlatformSettings },
) {
  const booking =
    payment.payableType === 'booking' ? payables.bookings.get(payment.payableId) : undefined;
  const enrollment =
    payment.payableType === 'course_enrollment'
      ? payables.enrollments.get(payment.payableId)
      : undefined;

  return {
    id: payment.id,
    payableType: payment.payableType,
    payableId: payment.payableId,
    amount: payment.amount,
    method: payment.method,
    status: payment.status,
    statusLabel: PAYMENT_STATUS_LABEL[payment.status],
    proofImageUrl: resolveFileUrl(payment.proofImageUrl),
    submittedAt: payment.submittedAt,
    verifiedAt: payment.verifiedAt,
    rejectionReason: payment.rejectionReason,
    paidAt: payment.paidAt,
    expiresAt: paymentExpiresAt(payment, options.settings),
    refundAmount: payment.refundAmount,
    refundNote: payment.refundNote,
    refundedAt: payment.refundedAt,
    createdAt: payment.createdAt,
    // FE mem-polling GET /payments/:id selama belum final (docs/06-api-spec.md §13)
    polling: {
      shouldPoll: ['menunggu_pembayaran', 'menunggu_verifikasi'].includes(payment.status),
      intervalSeconds: 5,
    },
    ...(options.includePayer && payment.user ? { payer: payment.user } : {}),
    booking: booking
      ? {
          id: booking.id,
          status: booking.status,
          statusLabel: STATUS_LABEL[booking.status],
          mode: booking.mode,
          scheduledStartAt: booking.scheduledStartAt,
          durationMinutes: booking.durationMinutes,
          learnerName: booking.learner.fullName,
          subjectName: booking.subject.name,
          tutorProfileId: booking.tutorProfile.id,
          tutorName: booking.tutorProfile.user.fullName,
        }
      : null,
    enrollment: enrollment
      ? {
          id: enrollment.id,
          learnerName: enrollment.learner.fullName,
          courseId: enrollment.course.id,
          courseTitle: enrollment.course.title,
          courseSlug: enrollment.course.slug,
        }
      : null,
  };
}

async function formatMany(
  payments: (Payment & {
    user?: { id: bigint; fullName: string; email: string; phone: string | null };
  })[],
  includePayer: boolean,
) {
  const [payables, settings] = await Promise.all([
    paymentRepository.loadPayables(payments),
    settingsService.get(),
  ]);
  return payments.map((payment) => formatPayment(payment, payables, { includePayer, settings }));
}

/** Pembayaran + hak akses viewer (payer, tutor pemilik booking, admin) */
async function loadForViewer(paymentId: bigint, viewer: Viewer) {
  const payment = await paymentRepository.findById(prisma, paymentId);
  if (!payment) throw Errors.notFound('Pembayaran tidak ditemukan');
  if (viewer.role === 'admin' || payment.userId === viewer.userId) return payment;
  if (viewer.role === 'tutor' && payment.payableType === 'booking') {
    const booking = await prisma.booking.findUnique({
      where: { id: payment.payableId },
      select: { tutorProfile: { select: { userId: true } } },
    });
    if (booking?.tutorProfile.userId === viewer.userId) return payment;
  }
  throw Errors.forbidden('Pembayaran ini bukan milikmu');
}

async function formatOne(paymentId: bigint, includePayer: boolean) {
  const payment = await paymentRepository.findById(prisma, paymentId);
  return (await formatMany([payment!], includePayer))[0];
}

export const paymentService = {
  // GET /payments — payer: riwayat tagihanmu; tutor: pemasukan dari booking miliknya
  async list(viewer: Viewer, query: ListPaymentsQuery) {
    await sweepExpired();
    const where: Prisma.PaymentWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.payableType ? { payableType: query.payableType } : {}),
    };
    if (viewer.role === 'tutor') {
      const profile = await tutorRepository.findBasicByUserId(viewer.userId);
      if (!profile) throw Errors.notFound('Profil tutor tidak ditemukan');
      where.payableType = 'booking';
      where.payableId = { in: await paymentRepository.tutorBookingIds(profile.id) };
      if (!query.status) where.status = { in: ['paid', 'refunded'] };
    } else {
      where.userId = viewer.userId;
    }
    const { skip, take } = toSkipTake(query);
    const [rows, total] = await paymentRepository.list(where, skip, take);
    return {
      items: await formatMany(rows, false),
      meta: buildMeta(query.page, query.limit, total),
    };
  },

  async getById(viewer: Viewer, paymentId: bigint) {
    await sweepExpired();
    const payment = await loadForViewer(paymentId, viewer);
    const [formatted, settings] = await Promise.all([
      formatOne(paymentId, viewer.role === 'admin'),
      settingsService.get(),
    ]);
    // Instruksi bayar ikut dikirim agar satu halaman pembayaran FE bisa dipakai untuk booking & kursus
    const { paymentMethods, instructions, canUploadProof } = buildPaymentInstructions(
      payment,
      settings,
    );
    return { ...formatted, paymentMethods, instructions, canUploadProof };
  },

  // FR-PAY-03: upload bukti → menunggu_verifikasi (bisa diunggah ulang selama belum diverifikasi)
  async uploadProof(viewer: Viewer, paymentId: bigint, file: StoredFile) {
    await sweepExpired(true);
    const payment = await loadForViewer(paymentId, viewer);
    if (payment.userId !== viewer.userId)
      throw Errors.forbidden('Hanya pembayar yang bisa mengunggah bukti');
    if (!['menunggu_pembayaran', 'menunggu_verifikasi'].includes(payment.status)) {
      throw Errors.businessRule(
        `Bukti tidak bisa diunggah karena pembayaran berstatus "${PAYMENT_STATUS_LABEL[payment.status]}"`,
      );
    }
    if (payment.payableType === 'booking') {
      const booking = await prisma.booking.findUnique({ where: { id: payment.payableId } });
      if (booking?.status !== 'menunggu_pembayaran') {
        throw Errors.businessRule('Booking ini sudah tidak menunggu pembayaran');
      }
    }

    const proofImageUrl = await uploadFile(file, { folder: 'payment-proofs', isPrivate: true });
    await prisma.$transaction(async (tx) => {
      const updated = await paymentRepository.updateIfStatus(tx, payment.id, payment.status, {
        proofImageUrl,
        status: 'menunggu_verifikasi',
        submittedAt: new Date(),
      });
      if (updated.count === 0)
        throw Errors.conflict('Status pembayaran baru saja berubah, muat ulang halaman');
      await notificationService.notifyAdmins(tx, {
        type: 'payment_proof_submitted',
        title: 'Bukti transfer baru menunggu verifikasi',
        body: `Pembayaran #${payment.id} sebesar Rp${toNumber(payment.amount).toLocaleString('id-ID')} dari ${payment.user.fullName}.`,
        data: { paymentId: payment.id },
      });
    });
    return formatOne(payment.id, false);
  },

  // GET /admin/payments — antrian FIFO (yang paling lama menunggu di atas)
  async adminList(query: AdminPaymentsQuery) {
    await sweepExpired();
    const where: Prisma.PaymentWhereInput = {
      status: query.status,
      ...(query.payableType ? { payableType: query.payableType } : {}),
    };
    const { skip, take } = toSkipTake(query);
    const [rows, total] = await prisma.$transaction([
      prisma.payment.findMany({
        where,
        orderBy: query.status === 'menunggu_verifikasi' ? { submittedAt: 'asc' } : { id: 'desc' },
        skip,
        take,
        include: { user: { select: { id: true, fullName: true, email: true, phone: true } } },
      }),
      prisma.payment.count({ where }),
    ]);
    return { items: await formatMany(rows, true), meta: buildMeta(query.page, query.limit, total) };
  },

  // FR-PAY-03/04/08 + NFR-AVAIL-02 (idempotent)
  async verify(adminId: bigint, paymentId: bigint, input: VerifyPaymentBody) {
    const payment = await paymentRepository.findById(prisma, paymentId);
    if (!payment) throw Errors.notFound('Pembayaran tidak ditemukan');

    const decision = decideVerification(payment.status, input.action);
    if (decision.kind === 'conflict') throw Errors.conflict(decision.message);
    if (decision.kind === 'noop') {
      return { ...(await formatOne(paymentId, true)), alreadyProcessed: true };
    }

    const settings = await settingsService.get();
    await prisma.$transaction(async (tx) => {
      const now = new Date();
      const updated = await paymentRepository.updateIfStatus(
        tx,
        payment.id,
        'menunggu_verifikasi',
        {
          status: decision.nextStatus,
          verifiedByUserId: adminId,
          verifiedAt: now,
          ...(decision.nextStatus === 'paid'
            ? { paidAt: now, rejectionReason: null }
            : { rejectionReason: input.rejectionReason }),
        },
      );
      if (updated.count === 0)
        throw Errors.conflict('Pembayaran ini baru saja diproses admin lain');

      if (payment.payableType === 'booking') {
        if (decision.nextStatus === 'paid') {
          const booking = await confirmPaidInTx(tx, payment.payableId, adminId);
          // Booking sudah dibatalkan sebelum diverifikasi → uang harus dikembalikan penuh
          if (booking?.status === 'dibatalkan') {
            await paymentRepository.update(tx, payment.id, { refundAmount: payment.amount });
          }
        } else {
          const booking = await tx.booking.findUnique({ where: { id: payment.payableId } });
          if (booking?.status === 'menunggu_pembayaran') {
            // FR-PAY-04: pembayaran ditolak → booking otomatis batal & slot dilepas
            const full = await bookingRepository.findById(tx, booking.id);
            await cancelInTx(tx, full!, {
              cancelledBy: 'system',
              reason: `Pembayaran ditolak: ${input.rejectionReason}`,
              actorUserId: adminId,
              settings,
            });
          }
        }
      }

      await notificationService.notify(
        tx,
        payment.userId,
        decision.nextStatus === 'paid'
          ? {
              type: 'payment_approved',
              title: 'Pembayaran terverifikasi',
              body:
                payment.payableType === 'booking'
                  ? 'Terima kasih! Pembayaranmu sudah kami terima dan sesi sudah dikonfirmasi.'
                  : 'Terima kasih! Akses kursus sudah terbuka, selamat belajar.',
              data: {
                paymentId: payment.id,
                payableType: payment.payableType,
                payableId: payment.payableId,
              },
            }
          : {
              type: 'payment_rejected',
              title: 'Bukti transfer ditolak',
              body: `Alasan: ${input.rejectionReason}. Hubungi admin jika kamu merasa sudah membayar dengan benar.`,
              data: {
                paymentId: payment.id,
                payableType: payment.payableType,
                payableId: payment.payableId,
              },
            },
      );
    });
    return formatOne(paymentId, true);
  },

  // FR-PAY-06 / FR-ADMIN-06: refund ditransfer manual oleh admin, sistem hanya mencatat
  async refund(adminId: bigint, paymentId: bigint, input: RefundPaymentBody) {
    const payment = await paymentRepository.findById(prisma, paymentId);
    if (!payment) throw Errors.notFound('Pembayaran tidak ditemukan');
    if (payment.status === 'refunded')
      return { ...(await formatOne(paymentId, true)), alreadyProcessed: true };
    if (payment.status !== 'paid') {
      throw Errors.businessRule(
        `Refund hanya untuk pembayaran lunas (status sekarang: "${PAYMENT_STATUS_LABEL[payment.status]}")`,
      );
    }
    const refundAmount = input.refundAmount ?? toNumber(payment.refundAmount ?? payment.amount);
    if (refundAmount > toNumber(payment.amount)) {
      throw Errors.validation('Nominal refund melebihi nominal pembayaran', [
        { field: 'refundAmount', message: 'too_large' },
      ]);
    }
    await prisma.$transaction(async (tx) => {
      const updated = await paymentRepository.updateIfStatus(tx, payment.id, 'paid', {
        status: 'refunded',
        refundAmount,
        refundNote: input.note,
        refundedAt: new Date(),
        verifiedByUserId: adminId,
      });
      if (updated.count === 0)
        throw Errors.conflict('Pembayaran ini baru saja diproses admin lain');
      await notificationService.notify(tx, payment.userId, {
        type: 'payment_refunded',
        title: 'Dana sudah dikembalikan',
        body: `Refund Rp${refundAmount.toLocaleString('id-ID')} sudah ditransfer. Catatan: ${input.note}`,
        data: { paymentId: payment.id },
      });
    });
    return formatOne(paymentId, true);
  },

  // FR-PAY-05: pendapatan tutor = subtotal (tarif × durasi) dari sesi selesai yang lunas
  async earnings(userId: bigint, query: EarningsQuery) {
    const profile = await tutorRepository.findBasicByUserId(userId);
    if (!profile) throw Errors.notFound('Profil tutor tidak ditemukan');

    // Default: bulan berjalan (WIB)
    const today = toWibParts(new Date()).date;
    const [y, m] = today.split('-').map(Number);
    const monthStart = wibDateTimeToUtc(`${y}-${String(m).padStart(2, '0')}-01`, '00:00');
    const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const from = query.from ? new Date(query.from) : monthStart;
    const to = query.to ? new Date(query.to) : wibDateTimeToUtc(nextMonth, '00:00');

    const bookings = await prisma.booking.findMany({
      where: {
        tutorProfileId: profile.id,
        status: {
          in: [
            'dikonfirmasi',
            'tutor_bersiap',
            'tutor_dalam_perjalanan',
            'tutor_tiba',
            'sesi_berlangsung',
            'sesi_selesai',
          ],
        },
        scheduledStartAt: { gte: from, lt: to },
      },
      include: {
        subject: { select: { name: true } },
        learner: { select: { fullName: true } },
      },
      orderBy: { scheduledStartAt: 'asc' },
    });
    const payments = await paymentRepository.findLatestForPayables(
      'booking',
      bookings.map((b) => b.id),
    );
    const paidIds = new Set(payments.filter((p) => p.status === 'paid').map((p) => p.payableId));

    const items = bookings
      .filter((booking) => paidIds.has(booking.id))
      .map((booking) => ({
        bookingId: booking.id,
        status: booking.status,
        statusLabel: STATUS_LABEL[booking.status],
        scheduledStartAt: booking.scheduledStartAt,
        durationMinutes: booking.durationMinutes,
        subjectName: booking.subject.name,
        learnerName: booking.learner.fullName,
        earning: toNumber(booking.totalAmount) - toNumber(booking.serviceFee),
        isCompleted: booking.status === 'sesi_selesai',
      }));
    const completed = items.filter((item) => item.isCompleted);
    return {
      periodStart: from,
      periodEnd: to,
      completedSessions: completed.length,
      completedHours: completed.reduce((sum, item) => sum + item.durationMinutes, 0) / 60,
      totalEarnings: completed.reduce((sum, item) => sum + item.earning, 0),
      // sudah dibayar siswa tapi sesinya belum selesai
      upcomingEarnings: items
        .filter((item) => !item.isCompleted)
        .reduce((sum, item) => sum + item.earning, 0),
      items,
    };
  },
};
