import { Router } from 'express';
import { z } from 'zod';
import { paginationQuery } from '../../lib/pagination';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { acceptUpload } from '../../middlewares/upload';
import { idParam, validate } from '../../middlewares/validate';
import { paymentController } from '../payments/payment.controller';
import { earningsQuery } from '../payments/payment.schema';
import { tutorController } from './tutor.controller';
import {
  availableSlotsQuery,
  blockedDateBody,
  certificationBody,
  setAvailabilitiesBody,
  setEducationLevelsBody,
  setServiceAreasBody,
  setSubjectsBody,
  updateTutorProfileBody,
} from './tutor.schema';

export const tutorRouter = Router();

// ---- Milik tutor sendiri (/tutors/me/...) — didaftarkan sebelum /:id agar "me" tidak dianggap id
const me = Router();
me.use(authenticate, authorize('tutor'));
me.get('/', tutorController.getMine);
me.put('/', validate({ body: updateTutorProfileBody }), tutorController.updateMine);
me.post(
  '/certifications',
  ...acceptUpload({ allowed: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'] }),
  validate({ body: certificationBody }),
  tutorController.addCertification,
);
me.delete(
  '/certifications/:id',
  validate({ params: idParam }),
  tutorController.deleteCertification,
);
me.put('/subjects', validate({ body: setSubjectsBody }), tutorController.setSubjects);
me.put(
  '/education-levels',
  validate({ body: setEducationLevelsBody }),
  tutorController.setEducationLevels,
);
me.put('/service-areas', validate({ body: setServiceAreasBody }), tutorController.setServiceAreas);
me.put(
  '/availabilities',
  validate({ body: setAvailabilitiesBody }),
  tutorController.setAvailabilities,
);
me.post('/blocked-dates', validate({ body: blockedDateBody }), tutorController.addBlockedDate);
me.delete('/blocked-dates/:id', validate({ params: idParam }), tutorController.deleteBlockedDate);
// FR-PAY-05
me.get('/earnings', validate({ query: earningsQuery }), paymentController.earnings);
tutorRouter.use('/me', me);

// ---- Publik
tutorRouter.get('/:id', validate({ params: idParam }), tutorController.getPublic);
tutorRouter.get(
  '/:id/available-slots',
  validate({ params: idParam, query: availableSlotsQuery }),
  tutorController.availableSlots,
);
tutorRouter.get(
  '/:id/reviews',
  validate({ params: idParam, query: z.object(paginationQuery) }),
  tutorController.listReviews,
);
