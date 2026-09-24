import type { BookingStatus, Payment, Prisma, UserRole } from '@prisma/client';
import { Errors } from '../../lib/app-error';
import { haversineDistanceKm } from '../../lib/geo';
import { toNumber } from '../../lib/money';
import { buildMeta, toSkipTake } from '../../lib/pagination';
import { prisma } from '../../lib/prisma';
import { addHours, dateOnly, toWibParts } from '../../lib/time';
import { notificationService } from '../notifications/notification.service';
import { PAYMENT_STATUS_LABEL } from '../payments/payment.policy';
import { paymentRepository } from '../payments/payment.repository';
import { buildPaymentInstructions } from '../payments/payment.service';
import { settingsService } from '../settings/settings.service';
import type { PlatformSettings } from '../settings/settings.schema';
import { fitsAvailability } from '../tutors/availability';
import { tutorRepository } from '../tutors/tutor.repository';
import { toTimeWindows } from '../tutors/tutor.service';
import { sweepExpired } from './booking-maintenance';
import { FINAL_STATUSES, isFinal, STATUS_LABEL, TRAVEL_STATUSES } from './booking-status';
import { acceptInTx, cancelInTx, transitionInTx } from './booking.lifecycle';
import { bookingRepository, type BookingWithRelations } from './booking.repository';
import type {
  AdminOverrideStatusBody,
  CancelBookingBody,
  CreateBookingBody,
  ListBookingsQuery,
  MeetingLinkBody,
  RespondBookingBody,
} from './booking.schema';
import { calculateBookingPrice, isValidDuration } from './pricing';

export interface Viewer {
  userId: bigint;
  role: UserRole;
}
type ViewerRole = 'owner' | 'tutor' | 'admin';

const CONFIRMED_OR_LATER: BookingStatus[] = [
  'dikonfirmasi',
  'tutor_bersiap',
  'tutor_dalam_perjalanan',
  'tutor_tiba',
  'sesi_berlangsung',
  'sesi_selesai',
];

/** Muat booking + pastikan viewer berhak (FR-BOOK-08: pemilik learner, tutor terkait, admin). */
export async function loadBookingFor(bookingId: bigint, viewer: Viewer) {
  const booking = await bookingRepository.findById(prisma, bookingId);
  if (!booking) throw Errors.notFound('Booking tidak ditemukan');
  let as: ViewerRole | null = null;
  if (viewer.role === 'admin') as = 'admin';
  else if (booking.learner.ownerUserId === viewer.userId) as = 'owner';
  else if (booking.tutorProfile.userId === viewer.userId) as = 'tutor';
  if (!as) throw Errors.forbidden('Booking ini bukan milikmu');
  return { booking, as };
}

export function assertTutorOf(booking: BookingWithRelations, viewer: Viewer) {
  if (booking.tutorProfile.userId !== viewer.userId) {
    throw Errors.forbidden('Hanya tutor pemilik booking yang bisa melakukan aksi ini');
  }
}

export function assertOwnerOf(booking: BookingWithRelations, viewer: Viewer) {
  if (booking.learner.ownerUserId !== viewer.userId) {
    throw Errors.forbidden('Hanya siswa/orang tua pemilik booking yang bisa melakukan aksi ini');
  }
}

/** Aksi yang tersedia untuk viewer saat ini — membantu FE menampilkan tombol yang tepat. */
function availableActions(
  booking: BookingWithRelations,
  as: ViewerRole,
  payment: Payment | null,
): string[] {
  const actions: string[] = [];
  const { status, mode } = booking;
  const cancellable = !FINAL_STATUSES.includes(status) && status !== 'sesi_berlangsung';

  if (as === 'owner') {
    if (status === 'menunggu_pembayaran') {
      actions.push('view_payment_info');
      if (payment?.status === 'menunggu_pembayaran') actions.push('upload_payment_proof');
    }
    if (mode === 'tatap_muka' && ['dikonfirmasi', ...TRAVEL_STATUSES].includes(status)) {
      actions.push('show_checkin_qr');
    }
    if (status === 'sesi_selesai') actions.push('view_report', 'write_review');
    if (cancellable) actions.push('cancel');
  }
  if (as === 'tutor') {
    if (status === 'pending_confirmation') actions.push('accept', 'reject');
    if (mode === 'tatap_muka') {
      if (status === 'dikonfirmasi') actions.push('update_status:tutor_bersiap');
      if (status === 'tutor_bersiap') actions.push('update_status:tutor_dalam_perjalanan');
      if (status === 'tutor_dalam_perjalanan')
        actions.push('update_status:tutor_tiba', 'location_ping');
      if (status === 'tutor_tiba') actions.push('checkin');
    } else if (status === 'dikonfirmasi') {
      actions.push('set_meeting_link', 'checkin');
    }
    if (status === 'sesi_berlangsung') actions.push('checkout_session');
    if (status === 'sesi_selesai') actions.push('view_report');
    if (cancellable) actions.push('cancel');
  }
  return actions;
}

function meetingLinkFor(booking: BookingWithRelations, as: ViewerRole, settings: PlatformSettings) {
  if (booking.mode !== 'online') return { meetingLink: null, meetingLinkAvailableAt: null };
  if (as !== 'owner') return { meetingLink: booking.meetingLink, meetingLinkAvailableAt: null };
  // FR-ONLINE-02: tampil ke siswa mulai H-x (default 24 jam) sebelum sesi
  const availableAt = addHours(booking.scheduledStartAt, -settings.meetingLinkVisibleHours);
  const visible = CONFIRMED_OR_LATER.includes(booking.status) && new Date() >= availableAt;
  return { meetingLink: visible ? booking.meetingLink : null, meetingLinkAvailableAt: availableAt };
}

export function formatBooking(
  booking: BookingWithRelations,
  as: ViewerRole,
  extras: {
    payment: Payment | null;
    settings: PlatformSettings;
    history?: { status: string; changedAt: Date; changedByUserId: bigint | null }[];
    latestLocation?: {
      latitude: Prisma.Decimal;
      longitude: Prisma.Decimal;
      recordedAt: Date;
    } | null;
  },
) {
  const confirmed = CONFIRMED_OR_LATER.includes(booking.status);
  const subtotal = toNumber(booking.totalAmount) - toNumber(booking.serviceFee);
  const showLocation =
    booking.mode === 'tatap_muka' &&
    ['tutor_dalam_perjalanan', 'tutor_tiba'].includes(booking.status);
  const actualDurationMinutes =
    booking.checkedInAt && booking.checkedOutAt
      ? Math.round((booking.checkedOutAt.getTime() - booking.checkedInAt.getTime()) / 60_000)
      : null;

  return {
    id: booking.id,
    status: booking.status,
    statusLabel: STATUS_LABEL[booking.status],
    isFinal: isFinal(booking.status),
    mode: booking.mode,
    scheduledStartAt: booking.scheduledStartAt,
    scheduledEndAt: booking.scheduledEndAt,
    scheduledDate: toWibParts(booking.scheduledStartAt).date,
    durationMinutes: booking.durationMinutes,
    hourlyRateSnapshot: booking.hourlyRateSnapshot,
    subtotal,
    serviceFee: booking.serviceFee,
    totalAmount: booking.totalAmount,
    learner: { id: booking.learner.id, fullName: booking.learner.fullName },
    tutor: {
      tutorProfileId: booking.tutorProfile.id,
      fullName: booking.tutorProfile.user.fullName,
      // kontak dibuka setelah booking dikonfirmasi (sudah dibayar)
      phone: confirmed || as === 'admin' ? booking.tutorProfile.user.phone : null,
    },
    bookedBy: {
      userId: booking.learner.owner.id,
      fullName: booking.learner.owner.fullName,
      phone: confirmed || as !== 'tutor' ? booking.learner.owner.phone : null,
    },
    subject: booking.subject,
    address: booking.address
      ? {
          id: booking.address.id,
          label: booking.address.label,
          fullAddress: booking.address.fullAddress,
          detailNote: booking.address.detailNote,
          latitude: booking.address.latitude,
          longitude: booking.address.longitude,
        }
      : null,
    ...meetingLinkFor(booking, as, extras.settings),
    payment: extras.payment
      ? {
          id: extras.payment.id,
          status: extras.payment.status,
          statusLabel: PAYMENT_STATUS_LABEL[extras.payment.status],
          amount: extras.payment.amount,
          refundAmount: extras.payment.refundAmount,
        }
      : null,
    checkedInAt: booking.checkedInAt,
    checkedOutAt: booking.checkedOutAt,
    actualDurationMinutes,
    cancelReason: booking.cancelReason,
    cancelledBy: booking.cancelledBy,
    hasProgressReport: Boolean(booking.progressReport),
    latestLocation: showLocation ? (extras.latestLocation ?? null) : null,
    ...(extras.history ? { statusHistory: extras.history } : {}),
    availableActions: availableActions(booking, as, extras.payment),
    // FR-TRACK-03: FE mem-polling GET /bookings/:id selama status belum final
    polling: { shouldPoll: !isFinal(booking.status), intervalSeconds: 5 },
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

async function detail(bookingId: bigint, as: ViewerRole) {
  const [booking, history, latestLocation, payment, settings, review] = await Promise.all([
    bookingRepository.findById(prisma, bookingId),
    bookingRepository.findHistory(bookingId),
    bookingRepository.findLatestLocation(bookingId),
    paymentRepository.findLatestForPayable(prisma, 'booking', bookingId),
    settingsService.get(),
    prisma.review.findFirst({ where: { reviewableType: 'tutor_booking', reviewableId: bookingId } }),
  ]);
  const formatted = formatBooking(booking!, as, {
    payment,
    settings,
    latestLocation,
    history: history.map((row) => ({
      status: row.status,
      statusLabel: STATUS_LABEL[row.status as BookingStatus] ?? row.status,
      changedAt: row.changedAt,
      changedByUserId: row.changedByUserId,
    })),
  });
  // Ulasan sesi ini (FR-REVIEW-01/02/03): FE perlu tahu apakah menulis baru, mengedit, atau membalas
  const editableUntil = review
    ? new Date(review.createdAt.getTime() + settings.reviewEditDays * 86_400_000)
    : null;
  const canEdit = Boolean(editableUntil && editableUntil.getTime() > Date.now());
  return {
    ...formatted,
    availableActions: formatted.availableActions.flatMap((action) =>
      action !== 'write_review' || !review ? [action] : canEdit ? ['edit_review'] : [],
    ),
    review: review
      ? {
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          replyText: review.replyText,
          repliedAt: review.repliedAt,
          isHidden: review.isHidden,
          createdAt: review.createdAt,
          editableUntil,
        }
      : null,
  };
}

export const bookingService = {
  detail,

  // FR-BOOK-01/02/03/06
  async create(viewer: Viewer, input: CreateBookingBody) {
    await sweepExpired();
    const settings = await settingsService.get();

    // 1. Learner milik akun ini (student mandiri boleh tanpa learnerId)
    const learners = await prisma.learner.findMany({ where: { ownerUserId: viewer.userId } });
    const learner = input.learnerId
      ? learners.find((row) => row.id === input.learnerId)
      : learners.find((row) => row.isSelf);
    if (!learner) {
      throw input.learnerId
        ? Errors.forbidden('Profil siswa ini bukan milikmu')
        : Errors.validation('Pilih profil anak yang akan belajar', [
            { field: 'learnerId', message: 'required' },
          ]);
    }

    // 2. Tutor terverifikasi, aktif, mengajar mapel & mode yang dipilih
    const tutor = await tutorRepository.findById(input.tutorProfileId);
    if (!tutor || tutor.verificationStatus !== 'verified' || tutor.user.status !== 'active') {
      throw Errors.businessRule('Tutor belum terverifikasi atau tidak tersedia untuk booking');
    }
    if (tutor.userId === viewer.userId)
      throw Errors.businessRule('Kamu tidak bisa memesan dirimu sendiri');
    if (!tutor.subjects.some(({ subjectId }) => subjectId === input.subjectId)) {
      throw Errors.validation('Tutor ini tidak mengajar mata pelajaran tersebut', [
        { field: 'subjectId', message: 'not_taught' },
      ]);
    }
    if (tutor.teachingMode !== 'both' && tutor.teachingMode !== input.mode) {
      throw Errors.validation(
        `Tutor ini hanya menerima sesi ${tutor.teachingMode === 'online' ? 'online' : 'tatap muka'}`,
        [{ field: 'mode', message: 'not_supported' }],
      );
    }

    // 3. Durasi & jadwal
    if (!isValidDuration(input.durationMinutes)) {
      throw Errors.validation('Durasi harus kelipatan 30 menit, antara 60 dan 240 menit', [
        { field: 'durationMinutes', message: 'invalid' },
      ]);
    }
    const start = new Date(input.scheduledStartAt);
    const end = new Date(start.getTime() + input.durationMinutes * 60_000);
    const startWib = toWibParts(start);
    if (start.getTime() <= Date.now()) {
      throw Errors.validation('Jadwal harus di masa depan', [
        { field: 'scheduledStartAt', message: 'past' },
      ]);
    }
    if (startWib.minutesOfDay % 30 !== 0 || start.getUTCSeconds() !== 0) {
      throw Errors.validation('Jam mulai harus tepat di :00 atau :30', [
        { field: 'scheduledStartAt', message: 'not_aligned' },
      ]);
    }
    if (tutor.blockedDates.some((row) => dateOnly(row.blockedDate) === startWib.date)) {
      throw Errors.businessRule('Tutor tidak menerima sesi pada tanggal tersebut');
    }
    if (!fitsAvailability(start, input.durationMinutes, toTimeWindows(tutor))) {
      throw Errors.businessRule(
        'Jadwal di luar jam ketersediaan tutor. Cek GET /tutors/:id/available-slots untuk slot yang kosong.',
      );
    }

    // 4. Alamat (tatap muka) — milik akun ini & di dalam wilayah layanan tutor
    let addressId: bigint | null = null;
    if (input.mode === 'tatap_muka') {
      const address = await prisma.address.findUnique({ where: { id: input.addressId! } });
      if (!address) throw Errors.notFound('Alamat tidak ditemukan');
      if (address.userId !== viewer.userId) throw Errors.forbidden('Alamat ini bukan milikmu');
      const radiusAreas = tutor.serviceAreas.filter((area) => area.areaType === 'radius');
      const hasNamedAreas = tutor.serviceAreas.some((area) => area.areaType === 'area_name');
      const covered = radiusAreas.some(
        (area) =>
          haversineDistanceKm(
            toNumber(address.latitude),
            toNumber(address.longitude),
            toNumber(area.centerLatitude),
            toNumber(area.centerLongitude),
          ) <= toNumber(area.radiusKm),
      );
      // Area berbasis nama tidak bisa dicek otomatis → hanya ditolak jika tutor murni berbasis radius
      if (radiusAreas.length > 0 && !covered && !hasNamedAreas) {
        throw Errors.businessRule('Alamat ini berada di luar wilayah layanan tutor');
      }
      addressId = address.id;
    }

    const price = calculateBookingPrice(
      toNumber(tutor.hourlyRate),
      input.durationMinutes,
      settings.serviceFee,
    );

    // 5. Simpan (tutor dikunci agar dua booking bersamaan tidak lolos cek bentrok)
    const bookingId = await prisma.$transaction(async (tx) => {
      await bookingRepository.lockTutor(tx, tutor.id);
      if ((await bookingRepository.countConflicts(tx, tutor.id, start, end)) > 0) {
        throw Errors.conflict('Slot ini baru saja dipesan orang lain. Silakan pilih jam lain.');
      }
      const booking = await bookingRepository.create(tx, {
        learnerId: learner.id,
        tutorProfileId: tutor.id,
        subjectId: input.subjectId,
        mode: input.mode,
        scheduledStartAt: start,
        scheduledEndAt: end,
        durationMinutes: input.durationMinutes,
        addressId,
        status: 'pending_confirmation',
        hourlyRateSnapshot: price.hourlyRate,
        serviceFee: price.serviceFee,
        totalAmount: price.total,
      });
      await bookingRepository.addHistory(tx, booking.id, 'pending_confirmation', viewer.userId);

      if (tutor.autoAccept) {
        // FR-BOOK-04: mode auto-accept → langsung menunggu pembayaran
        await acceptInTx(tx, booking, null);
      } else {
        await notificationService.notify(tx, tutor.userId, {
          type: 'booking_created',
          title: 'Ada booking baru untukmu',
          body: `${learner.fullName} ingin sesi ${booking.subject.name} (${input.mode === 'online' ? 'online' : 'tatap muka'}) pada ${startWib.date} ${startWib.time} WIB. Terima atau tolak dalam ${settings.bookingResponseHours} jam.`,
          data: { bookingId: booking.id },
        });
      }
      return booking.id;
    });

    return detail(bookingId, 'owner');
  },

  async list(viewer: Viewer, query: ListBookingsQuery) {
    await sweepExpired();
    const where: Prisma.BookingWhereInput = {
      ...(query.status ? { status: { in: query.status } } : {}),
      ...(query.mode ? { mode: query.mode } : {}),
      ...(query.learnerId ? { learnerId: query.learnerId } : {}),
    };
    let as: ViewerRole = 'owner';
    if (viewer.role === 'tutor') {
      const profile = await tutorRepository.findBasicByUserId(viewer.userId);
      if (!profile) throw Errors.notFound('Profil tutor tidak ditemukan');
      where.tutorProfileId = profile.id;
      as = 'tutor';
    } else {
      where.learner = { ownerUserId: viewer.userId };
    }

    const { skip, take } = toSkipTake(query);
    const [rows, total] = await bookingRepository.list(where, skip, take);
    const [payments, settings] = await Promise.all([
      paymentRepository.findLatestForPayables(
        'booking',
        rows.map((row) => row.id),
      ),
      settingsService.get(),
    ]);
    const latestPayment = new Map<bigint, Payment>();
    for (const payment of payments) {
      if (!latestPayment.has(payment.payableId)) latestPayment.set(payment.payableId, payment);
    }
    return {
      items: rows.map((row) =>
        formatBooking(row, as, { payment: latestPayment.get(row.id) ?? null, settings }),
      ),
      meta: buildMeta(query.page, query.limit, total),
    };
  },

  async getById(viewer: Viewer, bookingId: bigint) {
    await sweepExpired();
    const { as } = await loadBookingFor(bookingId, viewer);
    return detail(bookingId, as);
  },

  // FR-BOOK-04/05
  async respond(viewer: Viewer, bookingId: bigint, input: RespondBookingBody) {
    await sweepExpired(true);
    const { booking } = await loadBookingFor(bookingId, viewer);
    assertTutorOf(booking, viewer);
    if (booking.status !== 'pending_confirmation') {
      throw Errors.businessRule(`Booking sudah berstatus "${STATUS_LABEL[booking.status]}"`);
    }

    await prisma.$transaction(async (tx) => {
      if (input.action === 'accept') {
        await acceptInTx(tx, booking, viewer.userId);
      } else {
        await transitionInTx(tx, booking, 'rejected', viewer.userId, {
          cancelReason: input.reason,
        });
        await notificationService.notify(tx, booking.learner.ownerUserId, {
          type: 'booking_rejected',
          title: 'Booking ditolak tutor',
          body: `${booking.tutorProfile.user.fullName} tidak bisa menerima sesi ini. Alasan: ${input.reason}. Yuk cari jadwal atau tutor lain.`,
          data: { bookingId: booking.id },
        });
      }
    });
    return detail(bookingId, 'tutor');
  },

  // FR-PAY-01/02
  async paymentInfo(viewer: Viewer, bookingId: bigint) {
    await sweepExpired();
    const { booking } = await loadBookingFor(bookingId, viewer);
    if (viewer.role !== 'admin') assertOwnerOf(booking, viewer);
    const [payment, settings] = await Promise.all([
      paymentRepository.findLatestForPayable(prisma, 'booking', booking.id),
      settingsService.get(),
    ]);
    const subtotal = toNumber(booking.totalAmount) - toNumber(booking.serviceFee);
    return {
      bookingId: booking.id,
      bookingStatus: booking.status,
      bookingStatusLabel: STATUS_LABEL[booking.status],
      breakdown: {
        hourlyRate: booking.hourlyRateSnapshot,
        durationMinutes: booking.durationMinutes,
        subtotal,
        serviceFee: booking.serviceFee,
        total: booking.totalAmount,
      },
      ...buildPaymentInstructions(payment, settings),
      ...(booking.status === 'pending_confirmation'
        ? { message: 'Tagihan akan muncul setelah tutor menerima booking ini.' }
        : {}),
    };
  },

  // FR-BOOK-07 + FR-PAY-06
  async cancel(viewer: Viewer, bookingId: bigint, input: CancelBookingBody) {
    await sweepExpired(true);
    const { booking, as } = await loadBookingFor(bookingId, viewer);
    if (as === 'admin') {
      throw Errors.businessRule('Admin membatalkan booking lewat PATCH /admin/bookings/:id/status');
    }
    const settings = await settingsService.get();
    const { refundAmount } = await prisma.$transaction((tx) =>
      cancelInTx(tx, booking, {
        cancelledBy: as === 'tutor' ? 'tutor' : 'student',
        reason: input.reason,
        actorUserId: viewer.userId,
        settings,
      }),
    );
    return { ...(await detail(bookingId, as)), refundAmount };
  },

  // FR-ONLINE-02
  async setMeetingLink(viewer: Viewer, bookingId: bigint, input: MeetingLinkBody) {
    const { booking } = await loadBookingFor(bookingId, viewer);
    assertTutorOf(booking, viewer);
    if (booking.mode !== 'online')
      throw Errors.businessRule('Link meeting hanya untuk sesi online');
    if (!['menunggu_pembayaran', 'dikonfirmasi', 'sesi_berlangsung'].includes(booking.status)) {
      throw Errors.businessRule(
        `Link meeting tidak bisa diubah saat booking berstatus "${STATUS_LABEL[booking.status]}"`,
      );
    }
    await prisma.$transaction(async (tx) => {
      await bookingRepository.update(tx, booking.id, { meetingLink: input.meetingLink });
      await notificationService.notify(tx, booking.learner.ownerUserId, {
        type: 'meeting_link_updated',
        title: 'Link meeting sesi online sudah tersedia',
        body: `Tutor ${booking.tutorProfile.user.fullName} melampirkan link meeting untuk sesi ${booking.subject.name}.`,
        data: { bookingId: booking.id },
      });
    });
    return detail(bookingId, 'tutor');
  },

  // FR-ADMIN-06: override status oleh admin (dispute) — di luar state machine normal, tetap tercatat
  async adminOverrideStatus(adminId: bigint, bookingId: bigint, input: AdminOverrideStatusBody) {
    const booking = await bookingRepository.findById(prisma, bookingId);
    if (!booking) throw Errors.notFound('Booking tidak ditemukan');
    if (booking.status === input.status) return detail(bookingId, 'admin');
    const settings = await settingsService.get();

    await prisma.$transaction(async (tx) => {
      if (input.status === 'dibatalkan') {
        // lewat cancelInTx agar tagihan ditutup & refund dihitung, tapi tanpa batasan state machine
        await cancelInTx(tx, booking, {
          cancelledBy: 'system',
          reason: `[Admin] ${input.reason}`,
          actorUserId: adminId,
          settings,
          force: true,
        });
        return;
      }
      await transitionInTx(
        tx,
        booking,
        input.status,
        adminId,
        input.status === 'sesi_selesai' && !booking.checkedOutAt
          ? { checkedOutAt: new Date() }
          : {},
        true,
      );
      await notificationService.notify(
        tx,
        [booking.learner.ownerUserId, booking.tutorProfile.userId],
        {
          type: 'booking_status_overridden',
          title: `Status booking diubah admin: ${STATUS_LABEL[input.status]}`,
          body: `Catatan admin: ${input.reason}`,
          data: { bookingId: booking.id, status: input.status },
        },
      );
    });
    return detail(bookingId, 'admin');
  },
};
