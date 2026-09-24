import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { idParam, validate } from '../../middlewares/validate';
import { checkinController } from '../checkin/checkin.controller';
import { trackingController } from '../tracking/tracking.controller';
import { bookingController } from './booking.controller';
import {
  cancelBookingBody,
  checkinBody,
  checkoutSessionBody,
  createBookingBody,
  listBookingsQuery,
  locationPingBody,
  meetingLinkBody,
  respondBookingBody,
  updateTravelStatusBody,
} from './booking.schema';

// docs/06-api-spec.md §6 — kepemilikan (siswa/orang tua pemilik, tutor terkait) dicek di service
export const bookingRouter = Router();
bookingRouter.use(authenticate);

const withId = (body?: Parameters<typeof validate>[0]['body']) =>
  validate({ params: idParam, body });

bookingRouter.post(
  '/',
  authorize('student', 'parent'),
  validate({ body: createBookingBody }),
  bookingController.create,
);
bookingRouter.get(
  '/',
  authorize('student', 'parent', 'tutor'),
  validate({ query: listBookingsQuery }),
  bookingController.list,
);
bookingRouter.get('/:id', withId(), bookingController.getById);
bookingRouter.patch(
  '/:id/respond',
  authorize('tutor'),
  withId(respondBookingBody),
  bookingController.respond,
);
bookingRouter.get(
  '/:id/payment-info',
  authorize('student', 'parent'),
  withId(),
  bookingController.paymentInfo,
);
bookingRouter.patch(
  '/:id/status',
  authorize('tutor'),
  withId(updateTravelStatusBody),
  trackingController.updateTravelStatus,
);
bookingRouter.post(
  '/:id/location-ping',
  authorize('tutor'),
  withId(locationPingBody),
  trackingController.locationPing,
);
bookingRouter.patch(
  '/:id/meeting-link',
  authorize('tutor'),
  withId(meetingLinkBody),
  bookingController.setMeetingLink,
);
bookingRouter.get(
  '/:id/qr-token',
  authorize('student', 'parent'),
  withId(),
  checkinController.getQrToken,
);
bookingRouter.post(
  '/:id/checkin',
  authorize('tutor'),
  withId(checkinBody),
  checkinController.checkin,
);
bookingRouter.post(
  '/:id/checkout-session',
  authorize('tutor'),
  withId(checkoutSessionBody),
  checkinController.checkoutSession,
);
bookingRouter.post(
  '/:id/cancel',
  authorize('student', 'parent', 'tutor'),
  withId(cancelBookingBody),
  bookingController.cancel,
);
