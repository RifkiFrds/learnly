import type { BookingStatus, Prisma } from '@prisma/client';
import { Errors } from '../../lib/app-error';
import { toNumber } from '../../lib/money';
import { notificationService } from '../notifications/notification.service';
import { computeRefundAmount, MONEY_RECEIVED_STATUSES } from '../payments/payment.policy';
import { paymentRepository } from '../payments/payment.repository';
import type { PlatformSettings } from '../settings/settings.schema';
import { canTransition, describeInvalidTransition, STATUS_LABEL } from './booking-status';
import { bookingRepository, type BookingWithRelations } from './booking.repository';

type Tx = Prisma.TransactionClient;

// Perubahan status booking yang dipakai lintas modul (booking, payment, admin, sweep kedaluwarsa).
// Semua perubahan status lewat sini agar state machine + riwayat + notifikasi selalu konsisten.

export async function transitionInTx(
  tx: Tx,
  booking: BookingWithRelations,
  to: BookingStatus,
  actorUserId: bigint | null,
  extraData: Prisma.BookingUncheckedUpdateInput = {},
  /** true = override admin (FR-ADMIN-06): lewati state machine, tetap tercatat di riwayat */
  force = false,
) {
  if (!force && !canTransition(booking.mode, booking.status, to)) {
    throw Errors.businessRule(describeInvalidTransition(booking.mode, booking.status, to));
  }
  const result = await bookingRepository.updateIfStatus(tx, booking.id, booking.status, {
    status: to,
    ...extraData,
  });
  if (result.count === 0) {
    throw Errors.conflict('Status booking baru saja berubah. Muat ulang halaman lalu coba lagi.');
  }
  await bookingRepository.addHistory(tx, booking.id, to, actorUserId);
}

/** FR-BOOK-05: booking diterima → menunggu_pembayaran + tagihan dibuat */
export async function acceptInTx(
  tx: Tx,
  booking: BookingWithRelations,
  actorUserId: bigint | null,
) {
  await transitionInTx(tx, booking, 'menunggu_pembayaran', actorUserId);
  const payment = await paymentRepository.create(tx, {
    payableType: 'booking',
    payableId: booking.id,
    userId: booking.learner.ownerUserId,
    amount: booking.totalAmount,
    method: 'qris',
    status: 'menunggu_pembayaran',
  });
  await notificationService.notify(tx, booking.learner.ownerUserId, {
    type: 'booking_accepted',
    title: 'Booking diterima tutor — lanjutkan pembayaran',
    body: `${booking.tutorProfile.user.fullName} menerima sesi ${booking.subject.name}. Selesaikan pembayaran agar jadwal terkunci.`,
    data: { bookingId: booking.id, paymentId: payment.id },
  });
  return payment;
}

/** Pembayaran di-approve admin → booking dikonfirmasi (jika masih menunggu pembayaran) */
export async function confirmPaidInTx(tx: Tx, bookingId: bigint, actorUserId: bigint) {
  const booking = await bookingRepository.findById(tx, bookingId);
  if (!booking || booking.status !== 'menunggu_pembayaran') return booking;
  await transitionInTx(tx, booking, 'dikonfirmasi', actorUserId);
  await notificationService.notify(tx, [booking.learner.ownerUserId, booking.tutorProfile.userId], {
    type: 'booking_confirmed',
    title: 'Pembayaran diterima — sesi dikonfirmasi',
    body: `Sesi ${booking.subject.name} bersama ${booking.tutorProfile.user.fullName} untuk ${booking.learner.fullName} sudah terkonfirmasi.`,
    data: { bookingId: booking.id },
  });
  return booking;
}

/**
 * Pembatalan (FR-BOOK-07, FR-PAY-06). Tagihan yang belum dibayar ditutup (expired);
 * jika uang sudah/mungkin diterima, nominal refund dicatat untuk diproses manual admin.
 */
export async function cancelInTx(
  tx: Tx,
  booking: BookingWithRelations,
  params: {
    cancelledBy: 'student' | 'tutor' | 'system';
    reason: string;
    actorUserId: bigint | null;
    settings: PlatformSettings;
    force?: boolean;
  },
) {
  await transitionInTx(
    tx,
    booking,
    'dibatalkan',
    params.actorUserId,
    { cancelReason: params.reason, cancelledBy: params.cancelledBy, qrToken: null },
    params.force,
  );

  let refundAmount: number | null = null;
  const payment = await paymentRepository.findLatestForPayable(tx, 'booking', booking.id);
  if (payment?.status === 'menunggu_pembayaran') {
    await paymentRepository.update(tx, payment.id, { status: 'expired' });
  } else if (payment && MONEY_RECEIVED_STATUSES.includes(payment.status)) {
    const hoursBeforeStart = (booking.scheduledStartAt.getTime() - Date.now()) / 3_600_000;
    refundAmount = computeRefundAmount({
      amount: toNumber(payment.amount),
      cancelledBy: params.cancelledBy,
      hoursBeforeStart,
      freeCancelHours: params.settings.cancellationPolicy.freeCancelHours,
      lateRefundPercent: params.settings.cancellationPolicy.lateRefundPercent,
    });
    await paymentRepository.update(tx, payment.id, { refundAmount });
  }

  const recipients = [booking.learner.ownerUserId, booking.tutorProfile.userId].filter(
    (id) => id !== params.actorUserId,
  );
  const by = { student: 'siswa/orang tua', tutor: 'tutor', system: 'sistem' }[params.cancelledBy];
  await notificationService.notify(tx, recipients, {
    type: 'booking_cancelled',
    title: 'Booking dibatalkan',
    body: `Sesi ${booking.subject.name} (${booking.learner.fullName}) dibatalkan oleh ${by}. Alasan: ${params.reason}`,
    data: { bookingId: booking.id, refundAmount },
  });
  if (refundAmount !== null && refundAmount > 0) {
    await notificationService.notifyAdmins(tx, {
      type: 'refund_required',
      title: 'Ada refund yang perlu diproses',
      body: `Booking #${booking.id} dibatalkan, refund Rp${refundAmount.toLocaleString('id-ID')} perlu ditransfer manual.`,
      data: { bookingId: booking.id, paymentId: payment?.id, refundAmount },
    });
  }
  return { refundAmount };
}

export function statusChangeNotification(booking: BookingWithRelations, to: BookingStatus) {
  return {
    type: 'booking_status_changed',
    title: STATUS_LABEL[to],
    body: `Sesi ${booking.subject.name} bersama ${booking.tutorProfile.user.fullName}: ${STATUS_LABEL[to].toLowerCase()}.`,
    data: { bookingId: booking.id, status: to },
  };
}
