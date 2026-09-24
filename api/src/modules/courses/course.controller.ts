import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { Errors } from '../../lib/app-error';
import { sendCreated, sendSuccess } from '../../lib/response';
import { currentUser } from '../../middlewares/auth.middleware';
import type { idParam } from '../../middlewares/validate';
import type {
  AdminCoursesQuery,
  CourseBody,
  CourseLessonParam,
  EnrollBody,
  GradeAssignmentBody,
  LessonActionBody,
  LessonBody,
  ModuleLessonParam,
  ModulesBody,
  QuizAttemptBody,
  RejectCourseBody,
  SlugParam,
} from './course.schema';
import { courseService } from './course.service';
import { enrollmentService } from './enrollment.service';

type IdParam = z.infer<typeof idParam>;
type PageQuery = { page: number; limit: number };

export const courseController = {
  create: (async (req, res) => {
    sendCreated(
      res,
      await courseService.create(currentUser(req).userId, req.valid.body as CourseBody),
    );
  }) satisfies RequestHandler,

  getPublic: (async (req, res) => {
    const { slug } = req.valid.params as SlugParam;
    sendSuccess(res, await courseService.getPublic(slug, req.auth?.role));
  }) satisfies RequestHandler,

  update: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    sendSuccess(
      res,
      await courseService.update(currentUser(req).userId, id, req.valid.body as CourseBody),
    );
  }) satisfies RequestHandler,

  setModules: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    sendSuccess(
      res,
      await courseService.setModules(currentUser(req).userId, id, req.valid.body as ModulesBody),
    );
  }) satisfies RequestHandler,

  addLesson: (async (req, res) => {
    const { id, moduleId } = req.valid.params as ModuleLessonParam;
    const body = req.valid.body as LessonBody;
    sendCreated(res, await courseService.addLesson(currentUser(req).userId, id, moduleId, body));
  }) satisfies RequestHandler,

  updateLesson: (async (req, res) => {
    const { id, lessonId } = req.valid.params as CourseLessonParam;
    const body = req.valid.body as LessonBody;
    sendSuccess(res, await courseService.updateLesson(currentUser(req).userId, id, lessonId, body));
  }) satisfies RequestHandler,

  deleteLesson: (async (req, res) => {
    const { id, lessonId } = req.valid.params as CourseLessonParam;
    sendSuccess(res, await courseService.deleteLesson(currentUser(req).userId, id, lessonId));
  }) satisfies RequestHandler,

  submitReview: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    sendSuccess(res, await courseService.submitReview(currentUser(req).userId, id));
  }) satisfies RequestHandler,

  publish: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    sendSuccess(res, await courseService.publish(id));
  }) satisfies RequestHandler,

  reject: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    sendSuccess(res, await courseService.reject(id, req.valid.body as RejectCourseBody));
  }) satisfies RequestHandler,

  adminList: (async (req, res) => {
    const { items, meta } = await courseService.adminList(req.valid.query as AdminCoursesQuery);
    sendSuccess(res, items, 200, meta);
  }) satisfies RequestHandler,

  grades: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    sendSuccess(res, await courseService.grades(id));
  }) satisfies RequestHandler,

  enroll: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    const result = await enrollmentService.enroll(
      currentUser(req),
      id,
      req.valid.body as EnrollBody,
    );
    const { created, ...data } = result;
    sendSuccess(res, data, created ? 201 : 200);
  }) satisfies RequestHandler,
};

export const enrollmentController = {
  listMine: (async (req, res) => {
    const { page, limit } = req.valid.query as PageQuery;
    const { items, meta } = await enrollmentService.listMine(currentUser(req), page, limit);
    sendSuccess(res, items, 200, meta);
  }) satisfies RequestHandler,

  getById: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    sendSuccess(res, await enrollmentService.getById(currentUser(req), id));
  }) satisfies RequestHandler,

  getCertificate: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    sendSuccess(res, await enrollmentService.getCertificate(currentUser(req), id));
  }) satisfies RequestHandler,

  completeLesson: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    const body = req.valid.body as LessonActionBody;
    sendSuccess(res, await enrollmentService.completeLesson(currentUser(req), id, body));
  }) satisfies RequestHandler,

  submitQuiz: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    const body = req.valid.body as QuizAttemptBody;
    sendCreated(res, await enrollmentService.submitQuiz(currentUser(req), id, body));
  }) satisfies RequestHandler,

  submitAssignment: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    if (!req.uploadedFile) throw Errors.validation('File tugas wajib diunggah');
    const body = req.valid.body as LessonActionBody;
    sendCreated(
      res,
      await enrollmentService.submitAssignment(currentUser(req), id, body, req.uploadedFile),
    );
  }) satisfies RequestHandler,

  gradeAssignment: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    const body = req.valid.body as GradeAssignmentBody;
    sendSuccess(res, await enrollmentService.gradeAssignment(currentUser(req).userId, id, body));
  }) satisfies RequestHandler,
};
