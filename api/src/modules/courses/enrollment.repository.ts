import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { courseInclude } from './course.repository';

type Db = Prisma.TransactionClient | typeof prisma;

export const enrollmentInclude = {
  learner: { select: { id: true, fullName: true, ownerUserId: true } },
  course: { include: courseInclude },
  lessonProgress: true,
  quizAttempts: { orderBy: { attemptedAt: 'desc' } },
  assignmentSubmissions: { orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }] },
  certificate: true,
} satisfies Prisma.CourseEnrollmentInclude;

export type EnrollmentFull = Prisma.CourseEnrollmentGetPayload<{
  include: typeof enrollmentInclude;
}>;

export const enrollmentRepository = {
  findById(db: Db, id: bigint) {
    return db.courseEnrollment.findUnique({ where: { id }, include: enrollmentInclude });
  },

  findByCourseAndLearner(courseId: bigint, learnerId: bigint) {
    return prisma.courseEnrollment.findUnique({
      where: { courseId_learnerId: { courseId, learnerId } },
    });
  },

  create(db: Db, courseId: bigint, learnerId: bigint) {
    return db.courseEnrollment.create({ data: { courseId, learnerId } });
  },

  listForOwner(ownerUserId: bigint, skip: number, take: number) {
    const where = { learner: { ownerUserId } };
    return prisma.$transaction([
      prisma.courseEnrollment.findMany({
        where,
        include: {
          learner: { select: { id: true, fullName: true } },
          course: {
            select: {
              id: true,
              slug: true,
              title: true,
              thumbnailUrl: true,
              isFree: true,
              price: true,
              level: true,
            },
          },
          certificate: { select: { certificateNumber: true, issuedAt: true } },
        },
        orderBy: { enrolledAt: 'desc' },
        skip,
        take,
      }),
      prisma.courseEnrollment.count({ where }),
    ]);
  },

  /** Enrollment milik akun ini pada kursus tempat lesson berada */
  findOwnedForLesson(ownerUserId: bigint, lessonId: bigint) {
    return prisma.courseEnrollment.findMany({
      where: {
        learner: { ownerUserId },
        course: { modules: { some: { lessons: { some: { id: lessonId } } } } },
      },
      select: { id: true },
    });
  },

  findLesson(id: bigint) {
    return prisma.courseLesson.findUnique({
      where: { id },
      include: {
        module: { select: { courseId: true } },
        quizQuestions: {
          include: { options: true },
          orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }],
        },
      },
    });
  },

  upsertLessonProgress(
    db: Db,
    enrollmentId: bigint,
    lessonId: bigint,
    status: 'in_progress' | 'completed',
  ) {
    const completedAt = status === 'completed' ? new Date() : null;
    return db.lessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
      create: { enrollmentId, lessonId, status, completedAt },
      // lesson yang sudah selesai tidak turun kembali ke in_progress
      update: status === 'completed' ? { status, completedAt } : {},
    });
  },

  createQuizAttempt(db: Db, data: Prisma.QuizAttemptUncheckedCreateInput) {
    return db.quizAttempt.create({ data });
  },

  createSubmission(db: Db, data: Prisma.AssignmentSubmissionUncheckedCreateInput) {
    return db.assignmentSubmission.create({ data });
  },

  findSubmission(id: bigint) {
    return prisma.assignmentSubmission.findUnique({
      where: { id },
      include: {
        lesson: { select: { id: true, title: true, type: true } },
        enrollment: {
          select: {
            id: true,
            learner: { select: { fullName: true, ownerUserId: true } },
            course: { select: { id: true, title: true, createdByUserId: true } },
          },
        },
      },
    });
  },

  updateSubmission(db: Db, id: bigint, data: Prisma.AssignmentSubmissionUncheckedUpdateInput) {
    return db.assignmentSubmission.update({ where: { id }, data });
  },

  update(db: Db, id: bigint, data: Prisma.CourseEnrollmentUncheckedUpdateInput) {
    return db.courseEnrollment.update({ where: { id }, data });
  },

  createCertificate(db: Db, data: Prisma.CertificateUncheckedCreateInput) {
    return db.certificate.create({ data });
  },
};
