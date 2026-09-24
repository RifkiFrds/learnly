import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { idParam, validate } from '../../middlewares/validate';
import { reviewController } from './review.controller';
import { createReviewBody, replyReviewBody, updateReviewBody } from './review.schema';

// docs/06-api-spec.md §10. Daftar review publik: GET /tutors/:id/reviews & GET /courses/:id/reviews
export const reviewRouter = Router();
reviewRouter.use(authenticate);
reviewRouter.post(
  '/',
  authorize('student', 'parent'),
  validate({ body: createReviewBody }),
  reviewController.create,
);
reviewRouter.patch(
  '/:id',
  authorize('student', 'parent'),
  validate({ params: idParam, body: updateReviewBody }),
  reviewController.update,
);
reviewRouter.post(
  '/:id/reply',
  authorize('tutor'),
  validate({ params: idParam, body: replyReviewBody }),
  reviewController.reply,
);
