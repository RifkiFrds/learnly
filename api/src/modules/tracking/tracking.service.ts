import { Errors } from '../../lib/app-error';
import { prisma } from '../../lib/prisma';
import { STATUS_LABEL } from '../bookings/booking-status';
import { statusChangeNotification, transitionInTx } from '../bookings/booking.lifecycle';
import { bookingRepository } from '../bookings/booking.repository';
import type { LocationPingBody, UpdateTravelStatusBody } from '../bookings/booking.schema';
import {
  assertTutorOf,
  bookingService,
  loadBookingFor,
  type Viewer,
} from '../bookings/booking.service';
import { notificationService } from '../notifications/notification.service';

// FR-TRACK-01..04: status perjalanan tutor & titik lokasi. Klien siswa/orang tua membaca
// perubahan lewat polling GET /bookings/:id — tidak ada WebSocket/push.
export const trackingService = {
  async updateTravelStatus(viewer: Viewer, bookingId: bigint, input: UpdateTravelStatusBody) {
    const { booking } = await loadBookingFor(bookingId, viewer);
    assertTutorOf(booking, viewer); // FR-TRACK-02
    if (booking.mode !== 'tatap_muka') {
      throw Errors.businessRule('Status perjalanan hanya berlaku untuk sesi tatap muka');
    }
    await prisma.$transaction(async (tx) => {
      await transitionInTx(tx, booking, input.status, viewer.userId);
      await notificationService.notify(
        tx,
        booking.learner.ownerUserId,
        statusChangeNotification(booking, input.status),
      );
    });
    return bookingService.detail(bookingId, 'tutor');
  },

  async locationPing(viewer: Viewer, bookingId: bigint, input: LocationPingBody) {
    const { booking } = await loadBookingFor(bookingId, viewer);
    assertTutorOf(booking, viewer);
    if (booking.status !== 'tutor_dalam_perjalanan') {
      throw Errors.businessRule(
        `Lokasi hanya bisa dikirim saat status "${STATUS_LABEL.tutor_dalam_perjalanan}"`,
      );
    }
    const location = await bookingRepository.addLocation(
      booking.id,
      input.latitude,
      input.longitude,
    );
    return {
      bookingId: booking.id,
      latitude: location.latitude,
      longitude: location.longitude,
      recordedAt: location.recordedAt,
    };
  },
};
