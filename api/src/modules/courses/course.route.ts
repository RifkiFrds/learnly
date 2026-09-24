import { Router } from 'express';
import { z } from 'zod';
import { paginationQuery } from '../../lib/pagination';
import { authenticate, optionalAuth } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { acceptUpload } from '../../middlewares/upload';
import { idParam, validate } from '../../middlewares/validate';
import { reviewController } from '../reviews/review.controller';
import { courseController, enrollmentController } from './course.controller';
import {
  courseBody,
  courseLessonParam,
  enrollBody,
  gradeAssignmentBody,
  lessonActionBody,
  lessonBody,
  lessonUpdateBody,
  moduleLessonParam,
  modulesBody,
  quizAttemptBody,
  rejectCourseBody,
  slugParam,
} from './course.schema';

const adminOnly = [authenticate, authorize('admin')];
const learnerOnly = [authenticate, authorize('student', 'parent')];

// /courses — docs/06-api-spec.md §8
export const courseRouter = Router();
courseRouter.post('/', ...adminOnly, validate({ body: courseBody }), courseController.create);
courseRouter.get(
  '/:slug',
  optionalAuth,
  validate({ params: slugParam }),
  courseController.getPublic,
);
courseRouter.put(
  '/:id',
  ...adminOnly,
  validate({ params: idParam, body: courseBody }),
  courseController.update,
);
courseRouter.put(
  '/:id/modules',
  ...adminOnly,
  validate({ params: idParam, body: modulesBody }),
  courseController.setModules,
);
courseRouter.post(
  '/:id/modules/:moduleId/lessons',
  ...adminOnly,
  validate({ params: moduleLessonParam, body: lessonBody }),
  courseController.addLesson,
);
courseRouter.put(
  '/:id/lessons/:lessonId',
  ...adminOnly,
  validate({ params: courseLessonParam, body: lessonUpdateBody }),
  courseController.updateLesson,
);
courseRouter.delete(
  '/:id/lessons/:lessonId',
  ...adminOnly,
  validate({ params: courseLessonParam }),
  courseController.deleteLesson,
);
courseRouter.patch(
  '/:id/submit-review',
  ...adminOnly,
  validate({ params: idParam }),
  courseController.submitReview,
);
courseRouter.patch(
  '/:id/publish',
  ...adminOnly,
  validate({ params: idParam }),
  courseController.publish,
);
courseRouter.patch(
  '/:id/reject',
  ...adminOnly,
  validate({ params: idParam, body: rejectCourseBody }),
  courseController.reject,
);
courseRouter.get(
  '/:id/reviews',
  validate({ params: idParam, query: z.object(paginationQuery) }),
  reviewController.listForCourse,
);
courseRouter.get(
  '/:id/grades',
  ...adminOnly,
  validate({ params: idParam }),
  courseController.grades,
);
courseRouter.post(
  '/:id/enroll',
  ...learnerOnly,
  validate({ params: idParam, body: enrollBody }),
  courseController.enroll,
);

// /enrollments
export const enrollmentRouter = Router();
enrollmentRouter.get(
  '/',
  ...learnerOnly,
  validate({ query: z.object(paginationQuery) }),
  enrollmentController.listMine,
);
enrollmentRouter.get(
  '/:id',
  authenticate,
  validate({ params: idParam }),
  enrollmentController.getById,
);
enrollmentRouter.get(
  '/:id/certificate',
  authenticate,
  validate({ params: idParam }),
  enrollmentController.getCertificate,
);

// /lessons — hanya pemilik enrollment (dicek di service)
export const lessonRouter = Router();
lessonRouter.use(...learnerOnly);
lessonRouter.post(
  '/:id/complete',
  validate({ params: idParam, body: lessonActionBody }),
  enrollmentController.completeLesson,
);
lessonRouter.post(
  '/:id/quiz-attempts',
  validate({ params: idParam, body: quizAttemptBody }),
  enrollmentController.submitQuiz,
);
lessonRouter.post(
  '/:id/assignments',
  ...acceptUpload({
    allowed: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'],
    maxSizeMb: 10,
  }),
  validate({ params: idParam, body: lessonActionBody }),
  enrollmentController.submitAssignment,
);

// /assignments
export const assignmentRouter = Router();
assignmentRouter.patch(
  '/:id/grade',
  ...adminOnly,
  validate({ params: idParam, body: gradeAssignmentBody }),
  enrollmentController.gradeAssignment,
);
