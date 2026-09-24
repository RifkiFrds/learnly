import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { acceptUpload } from '../../middlewares/upload';
import { idParam, validate } from '../../middlewares/validate';
import { bookingController } from '../bookings/booking.controller';
import { courseController } from '../courses/course.controller';
import { adminCoursesQuery } from '../courses/course.schema';
import { adminOverrideStatusBody } from '../bookings/booking.schema';
import { paymentController } from '../payments/payment.controller';
import {
  adminPaymentsQuery,
  refundPaymentBody,
  verifyPaymentBody,
} from '../payments/payment.schema';
import { reviewController } from '../reviews/review.controller';
import { reviewVisibilityBody } from '../reviews/review.schema';
import { updateSettingsBody } from '../settings/settings.schema';
import { tutorController } from '../tutors/tutor.controller';
import { adminTutorListQuery, verifyTutorBody } from '../tutors/tutor.schema';
import { adminController } from './admin.controller';
import { dashboardQuery, suspendUserBody } from './admin.schema';
import { masterDataAdminRouter } from './master-data.route';

// Semua endpoint /admin/* khusus role admin (FR-ADMIN-*)
export const adminRouter = Router();
adminRouter.use(authenticate, authorize('admin'));

// Verifikasi tutor (FR-ADMIN-01)
adminRouter.get('/tutors', validate({ query: adminTutorListQuery }), tutorController.adminList);
adminRouter.patch(
  '/tutors/:id/verify',
  validate({ params: idParam, body: verifyTutorBody }),
  tutorController.adminVerify,
);

// Suspend/reaktivasi akun (FR-ADMIN-02)
adminRouter.patch(
  '/users/:id/suspend',
  validate({ params: idParam, body: suspendUserBody }),
  adminController.setUserStatus,
);

// Master data (FR-ADMIN-03)
adminRouter.use(masterDataAdminRouter);

// Pengaturan platform (FR-ADMIN-07)
adminRouter.get('/settings', adminController.getSettings);
adminRouter.patch(
  '/settings',
  validate({ body: updateSettingsBody }),
  adminController.updateSettings,
);
adminRouter.post(
  '/settings/qris-image',
  ...acceptUpload({ allowed: ['image/png', 'image/jpeg', 'image/webp'] }),
  adminController.uploadQrisImage,
);

// Verifikasi pembayaran manual (FR-PAY-03/08) & refund manual (FR-PAY-06)
adminRouter.get('/payments', validate({ query: adminPaymentsQuery }), paymentController.adminList);
adminRouter.patch(
  '/payments/:id/verify',
  validate({ params: idParam, body: verifyPaymentBody }),
  paymentController.verify,
);
adminRouter.patch(
  '/payments/:id/refund',
  validate({ params: idParam, body: refundPaymentBody }),
  paymentController.refund,
);

// Override status booking untuk penanganan dispute (FR-ADMIN-06)
adminRouter.patch(
  '/bookings/:id/status',
  validate({ params: idParam, body: adminOverrideStatusBody }),
  bookingController.adminOverrideStatus,
);

// Antrian review kursus (FR-ADMIN-04) — approve/reject lewat PATCH /courses/:id/publish|reject
adminRouter.get('/courses', validate({ query: adminCoursesQuery }), courseController.adminList);

// Dashboard KPI (FR-ADMIN-05) & dispute (FR-ADMIN-06)
adminRouter.get(
  '/dashboard/summary',
  validate({ query: dashboardQuery }),
  adminController.dashboardSummary,
);
adminRouter.get('/disputes', adminController.disputes);

// Moderasi ulasan (FR-REVIEW-05) — ulasan disembunyikan, tidak dihapus
adminRouter.patch(
  '/reviews/:id/visibility',
  validate({ params: idParam, body: reviewVisibilityBody }),
  reviewController.setVisibility,
);
