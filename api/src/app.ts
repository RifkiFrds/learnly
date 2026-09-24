import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { env } from './config/env';
import { UPLOAD_DIR } from './lib/storage';
import { errorHandler, notFoundHandler } from './middlewares/error-handler';
import { requestLogger } from './middlewares/request-logger';
import { adminRouter } from './modules/admin/admin.route';
import { masterDataPublicRouter } from './modules/admin/master-data.route';
import { authRouter } from './modules/auth/auth.route';
import { bookingRouter } from './modules/bookings/booking.route';
import {
  courseRouter,
  enrollmentRouter,
  assignmentRouter,
  lessonRouter,
} from './modules/courses/course.route';
import { healthRouter } from './modules/health/health.route';
import { notificationRouter } from './modules/notifications/notification.route';
import { paymentRouter } from './modules/payments/payment.route';
import { reportRouter } from './modules/reports/report.route';
import { reviewRouter } from './modules/reviews/review.route';
import { searchRouter } from './modules/search/search.route';
import { settingsRouter } from './modules/settings/settings.route';
import { tutorRouter } from './modules/tutors/tutor.route';
import { addressRouter, learnerRouter, userRouter } from './modules/users/user.route';

/**
 * Serialisasi JSON: BIGINT (id) dan DECIMAL (nominal) dari Prisma dikirim sebagai number,
 * sesuai contoh di docs/06-api-spec.md (mis. "id": 981, "totalAmount": 160000).
 * `this[key]` = nilai asli sebelum toJSON() dipanggil.
 */
function jsonReplacer(this: Record<string, unknown>, key: string, value: unknown) {
  const raw = this[key];
  if (Prisma.Decimal.isDecimal(raw)) return (raw as Prisma.Decimal).toNumber();
  if (typeof value === 'bigint') return Number(value);
  return value;
}

// Pesan validasi bawaan Zod dalam Bahasa Indonesia (NFR-UX-03)
z.config(z.locales.id());

export function createApp() {
  const app = express();

  app.set('json replacer', jsonReplacer);
  app.set('trust proxy', 1); // di belakang proxy Railway (rate limit butuh IP asli)

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(requestLogger);
  app.use(express.json({ limit: '8mb' })); // cukup untuk upload base64 ≤ 5 MB
  app.use(cookieParser());

  if (env.STORAGE_DRIVER === 'local') {
    app.use('/uploads', express.static(UPLOAD_DIR, { fallthrough: false }));
  }

  // /health di root untuk healthcheck platform (Railway), juga tersedia di /api/v1/health.
  app.use('/health', healthRouter);

  const v1 = Router();
  v1.use('/health', healthRouter);
  v1.use('/auth', authRouter);
  v1.use('/users', userRouter);
  v1.use('/learners', learnerRouter);
  v1.use('/addresses', addressRouter);
  v1.use('/tutors', tutorRouter);
  v1.use('/search', searchRouter);
  v1.use('/bookings', bookingRouter);
  v1.use('/reports', reportRouter);
  v1.use('/courses', courseRouter);
  v1.use('/enrollments', enrollmentRouter);
  v1.use('/lessons', lessonRouter);
  v1.use('/assignments', assignmentRouter);
  v1.use('/payments', paymentRouter);
  v1.use('/reviews', reviewRouter);
  v1.use('/notifications', notificationRouter);
  v1.use('/settings', settingsRouter);
  v1.use('/admin', adminRouter);
  v1.use('/', masterDataPublicRouter); // GET /subjects, /education-levels, /categories
  app.use('/api/v1', v1);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
