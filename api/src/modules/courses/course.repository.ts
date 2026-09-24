import type { CourseStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

type Db = Prisma.TransactionClient | typeof prisma;

export const courseInclude = {
  category: true,
  educationLevel: true,
  createdBy: { select: { id: true, fullName: true } },
  modules: {
    orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }],
    include: {
      lessons: {
        orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }],
        include: {
          quizQuestions: {
            orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }],
            include: { options: { orderBy: { id: 'asc' } } },
          },
        },
      },
    },
  },
  _count: { select: { enrollments: true } },
} satisfies Prisma.CourseInclude;

export type CourseFull = Prisma.CourseGetPayload<{ include: typeof courseInclude }>;

export const courseRepository = {
  findById(db: Db, id: bigint) {
    return db.course.findUnique({ where: { id }, include: courseInclude });
  },

  findBySlug(slug: string) {
    return prisma.course.findUnique({ where: { slug }, include: courseInclude });
  },

  slugExists(slug: string) {
    return prisma.course.count({ where: { slug } }).then((count) => count > 0);
  },

  create(data: Prisma.CourseUncheckedCreateInput) {
    return prisma.course.create({ data });
  },

  update(db: Db, id: bigint, data: Prisma.CourseUncheckedUpdateInput) {
    return db.course.update({ where: { id }, data });
  },

  countLessonProgress(moduleIds: bigint[]) {
    return prisma.lessonProgress.count({ where: { lesson: { moduleId: { in: moduleIds } } } });
  },

  /** Susun ulang modul: update yang ada, buat yang baru, hapus yang tidak dikirim (cascade lesson). */
  replaceModules(courseId: bigint, modules: { id?: bigint; title: string }[], removeIds: bigint[]) {
    return prisma.$transaction(async (tx) => {
      if (removeIds.length) await tx.courseModule.deleteMany({ where: { id: { in: removeIds } } });
      for (const [orderIndex, mod] of modules.entries()) {
        if (mod.id) {
          await tx.courseModule.update({
            where: { id: mod.id },
            data: { title: mod.title, orderIndex },
          });
        } else {
          await tx.courseModule.create({ data: { courseId, title: mod.title, orderIndex } });
        }
      }
    });
  },

  findModule(id: bigint) {
    return prisma.courseModule.findUnique({
      where: { id },
      include: { _count: { select: { lessons: true } } },
    });
  },

  countQuizAttempts(lessonId: bigint) {
    return prisma.quizAttempt.count({ where: { lessonId } });
  },

  async countLessonActivity(lessonId: bigint) {
    const [progress, attempts, submissions] = await Promise.all([
      prisma.lessonProgress.count({ where: { lessonId } }),
      prisma.quizAttempt.count({ where: { lessonId } }),
      prisma.assignmentSubmission.count({ where: { lessonId } }),
    ]);
    return progress + attempts + submissions;
  },

  updateLesson(
    lessonId: bigint,
    data: Prisma.CourseLessonUncheckedUpdateInput,
    questions?: { questionText: string; options: { optionText: string; isCorrect: boolean }[] }[],
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.courseLesson.update({ where: { id: lessonId }, data });
      if (questions) {
        await tx.quizQuestion.deleteMany({ where: { lessonId } });
        for (const [orderIndex, question] of questions.entries()) {
          await tx.quizQuestion.create({
            data: {
              lessonId,
              questionText: question.questionText,
              orderIndex,
              options: { create: question.options },
            },
          });
        }
      }
    });
  },

  deleteLesson(lessonId: bigint) {
    return prisma.courseLesson.delete({ where: { id: lessonId } });
  },

  createLesson(data: Prisma.CourseLessonUncheckedCreateInput) {
    return prisma.courseLesson.create({
      data,
      include: { quizQuestions: { include: { options: true } } },
    });
  },

  listByStatus(status: CourseStatus, skip: number, take: number) {
    const where = { status };
    return prisma.$transaction([
      prisma.course.findMany({
        where,
        include: courseInclude,
        // antrian review: yang terlama diajukan di atas (FIFO); status lain: terbaru di atas
        orderBy: { updatedAt: status === 'in_review' ? 'asc' : 'desc' },
        skip,
        take,
      }),
      prisma.course.count({ where }),
    ]);
  },

  categoryExists(id: bigint) {
    return prisma.category.count({ where: { id } }).then((count) => count > 0);
  },

  educationLevelExists(id: bigint) {
    return prisma.educationLevel.count({ where: { id } }).then((count) => count > 0);
  },

  /** Rekap nilai seluruh peserta (FR-EVAL-02) */
  findEnrollmentsWithScores(courseId: bigint) {
    return prisma.courseEnrollment.findMany({
      where: { courseId },
      orderBy: { enrolledAt: 'asc' },
      include: {
        learner: {
          select: { id: true, fullName: true, owner: { select: { fullName: true, email: true } } },
        },
        quizAttempts: { orderBy: { attemptedAt: 'desc' } },
        assignmentSubmissions: { orderBy: { submittedAt: 'desc' } },
        certificate: true,
      },
    });
  },
};
