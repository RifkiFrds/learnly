import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate';
import { reportController } from './report.controller';
import { bookingIdParam, listReportsQuery } from './report.schema';

export const reportRouter = Router();
reportRouter.use(authenticate);
reportRouter.get(
  '/',
  authorize('student', 'parent'),
  validate({ query: listReportsQuery }),
  reportController.list,
);
reportRouter.get(
  '/:bookingId',
  validate({ params: bookingIdParam }),
  reportController.getByBookingId,
);
