import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { acceptUpload } from '../../middlewares/upload';
import { idParam, validate } from '../../middlewares/validate';
import { paymentController } from './payment.controller';
import { listPaymentsQuery } from './payment.schema';

// docs/06-api-spec.md §9 — tidak ada webhook: status berubah hanya lewat upload bukti & aksi admin.
// Endpoint admin (/admin/payments...) dipasang di admin.route.
export const paymentRouter = Router();
paymentRouter.use(authenticate);

paymentRouter.get(
  '/',
  authorize('student', 'parent', 'tutor'),
  validate({ query: listPaymentsQuery }),
  paymentController.list,
);
paymentRouter.get('/:id', validate({ params: idParam }), paymentController.getById);
paymentRouter.post(
  '/:id/proof',
  authorize('student', 'parent'),
  ...acceptUpload({ allowed: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'] }),
  validate({ params: idParam }),
  paymentController.uploadProof,
);
