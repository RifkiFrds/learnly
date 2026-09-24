import crypto from 'node:crypto';
import { Errors } from '../../lib/app-error';
import { prisma } from '../../lib/prisma';
import { STATUS_LABEL, TRAVEL_STATUSES } from '../bookings/booking-status';
import { statusChangeNotification, transitionInTx } from '../bookings/booking.lifecycle';
import { bookingRepository } from '../bookings/booking.repository';
import type { CheckinBody, CheckoutSessionBody } from '../bookings/booking.schema';
import {
  assertOwnerOf,
  assertTutorOf,
  bookingService,
  loadBookingFor,
  type Viewer,
} from '../bookings/booking.service';
import { notificationService } from '../notifications/notification.service';

// NFR-SEC-07: QR check-in berumur pendek & terikat ke satu booking.
// Format token: "<expUnix>.<acak>" disimpan di bookings.qr_token → tidak bisa ditebak/dipakai ulang.
const QR_TTL_SECONDS = 10 * 60;
const QR_REUSE_MIN_REMAINING_SECONDS = 2 * 60;

function parseQrToken(token: string | null): { expiresAt: Date } | null {
  if (!token) return null;
  const expUnix = Number(token.split('.')[0]);
  return Number.isFinite(expUnix) ? { expiresAt: new Date(expUnix * 1000) } : null;
}

const QR_ALLOWED_STATUSES = ['dikonfirmasi', ...TRAVEL_STATUSES] as const;

export const checkinService = {
  // Ditampilkan siswa/orang tua sebagai QR code untuk dipindai tutor (FR-CHECKIN-02)
  async getQrToken(viewer: Viewer, bookingId: bigint) {
    const { booking } = await loadBookingFor(bookingId, viewer);
    assertOwnerOf(booking, viewer);
    if (booking.mode !== 'tatap_muka') {
      throw Errors.businessRule('QR check-in hanya untuk sesi tatap muka');
    }
    if (!(QR_ALLOWED_STATUSES as readonly string[]).includes(booking.status)) {
      throw Errors.businessRule(
        `QR check-in belum/tidak tersedia saat status "${STATUS_LABEL[booking.status]}"`,
      );
    }

    // Token lama dipakai ulang selama masih cukup lama berlaku (agar QR tidak berganti tiap polling)
    const current = parseQrToken(booking.qrToken);
    let qrToken = booking.qrToken;
    let expiresAt = current?.expiresAt;
    if (
      !current ||
      current.expiresAt.getTime() - Date.now() < QR_REUSE_MIN_REMAINING_SECONDS * 1000
    ) {
      const expUnix = Math.floor(Date.now() / 1000) + QR_TTL_SECONDS;
      qrToken = `${expUnix}.${crypto.randomBytes(18).toString('base64url')}`;
      expiresAt = new Date(expUnix * 1000);
      await bookingRepository.update(prisma, booking.id, { qrToken });
    }
    return {
      bookingId: booking.id,
      qrToken,
      expiresAt,
      // String inilah yang di-encode menjadi gambar QR oleh FE
      qrPayload: JSON.stringify({ bookingId: Number(booking.id), qrToken }),
    };
  },

  // FR-CHECKIN-01/02
  async checkin(viewer: Viewer, bookingId: bigint, input: CheckinBody) {
    const { booking } = await loadBookingFor(bookingId, viewer);
    assertTutorOf(booking, viewer);

    if (booking.mode === 'tatap_muka') {
      if (booking.status !== 'tutor_tiba') {
        throw Errors.businessRule(
          `Check-in tatap muka dilakukan setelah status "${STATUS_LABEL.tutor_tiba}" (status sekarang: "${STATUS_LABEL[booking.status]}")`,
        );
      }
      if (!input.qrToken) {
        throw Errors.validation('Pindai QR code dari siswa/orang tua untuk check-in', [
          { field: 'qrToken', message: 'required' },
        ]);
      }
      const parsed = parseQrToken(booking.qrToken);
      const matches =
        booking.qrToken !== null &&
        input.qrToken.length === booking.qrToken.length &&
        crypto.timingSafeEqual(Buffer.from(input.qrToken), Buffer.from(booking.qrToken));
      if (!matches || !parsed) {
        throw Errors.validation('QR code tidak valid untuk booking ini', [
          { field: 'qrToken', message: 'invalid' },
        ]);
      }
      if (parsed.expiresAt.getTime() < Date.now()) {
        throw Errors.validation('QR code sudah kedaluwarsa. Minta siswa menampilkan QR terbaru.', [
          { field: 'qrToken', message: 'expired' },
        ]);
      }
    } else if (booking.status !== 'dikonfirmasi') {
      throw Errors.businessRule(
        `Sesi online bisa dimulai saat status "${STATUS_LABEL.dikonfirmasi}" (status sekarang: "${STATUS_LABEL[booking.status]}")`,
      );
    }

    await prisma.$transaction(async (tx) => {
      await transitionInTx(tx, booking, 'sesi_berlangsung', viewer.userId, {
        checkedInAt: new Date(),
        qrToken: null, // token sekali pakai
      });
      await notificationService.notify(
        tx,
        booking.learner.ownerUserId,
        statusChangeNotification(booking, 'sesi_berlangsung'),
      );
    });
    return bookingService.detail(bookingId, 'tutor');
  },

  // FR-CHECKIN-03 + FR-REPORT-01: check-out hanya sah bersama laporan perkembangan
  async checkoutSession(viewer: Viewer, bookingId: bigint, input: CheckoutSessionBody) {
    const { booking } = await loadBookingFor(bookingId, viewer);
    assertTutorOf(booking, viewer);
    if (booking.status !== 'sesi_berlangsung') {
      throw Errors.businessRule(
        `Check-out hanya bisa saat sesi berlangsung (status sekarang: "${STATUS_LABEL[booking.status]}")`,
      );
    }

    const report = await prisma.$transaction(async (tx) => {
      const created = await bookingRepository.createProgressReport(tx, {
        bookingId: booking.id,
        materialsCovered: input.materialsCovered,
        understandingLevel: input.understandingLevel,
        masteredSkills: input.masteredSkills ?? null,
        areasToImprove: input.areasToImprove ?? null,
        homeworkGiven: input.homeworkGiven ?? null,
        recommendationNotes: input.recommendationNotes ?? null,
      });
      await transitionInTx(tx, booking, 'sesi_selesai', viewer.userId, {
        checkedOutAt: new Date(),
      });
      await notificationService.notify(tx, booking.learner.ownerUserId, {
        type: 'progress_report_ready',
        title: 'Sesi selesai — laporan perkembangan sudah tersedia',
        body: `${booking.tutorProfile.user.fullName} sudah mengisi laporan sesi ${booking.subject.name} untuk ${booking.learner.fullName}. Jangan lupa beri ulasan, ya.`,
        data: { bookingId: booking.id, progressReportId: created.id },
      });
      return created;
    });

    return { booking: await bookingService.detail(bookingId, 'tutor'), progressReport: report };
  },
};
