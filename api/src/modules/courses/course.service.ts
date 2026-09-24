import type { UserRole } from '@prisma/client';
import { Errors } from '../../lib/app-error';
import { toNumber } from '../../lib/money';
import { buildMeta, toSkipTake } from '../../lib/pagination';
import { prisma } from '../../lib/prisma';
import { resolveFileUrl } from '../../lib/storage';
import { slugify } from '../../lib/slug';
import { notificationService } from '../notifications/notification.service';
import { settingsService } from '../settings/settings.service';
import { courseRepository, type CourseFull } from './course.repository';
import type {
  AdminCoursesQuery,
  CourseBody,
  LessonBody,
  ModulesBody,
  RejectCourseBody,
} from './course.schema';

export const COURSE_STATUS_LABEL = {
  draft: 'Draf',
  in_review: 'Menunggu review admin',
  published: 'Terbit',
  archived: 'Diarsipkan',
} as const;

type LessonRow = CourseFull['modules'][number]['lessons'][number];

/**
 * Bentuk lesson untuk response.
 * - 'preview' : katalog publik (tanpa konten)
 * - 'learner' : peserta yang punya akses (konten + soal kuis TANPA kunci jawaban)
 * - 'admin'   : pengelola kursus (konten + kunci jawaban)
 */
export function formatLesson(lesson: LessonRow, mode: 'preview' | 'learner' | 'admin') {
  const base = {
    id: lesson.id,
    title: lesson.title,
    type: lesson.type,
    durationSeconds: lesson.durationSeconds,
    orderIndex: lesson.orderIndex,
    questionCount: lesson.quizQuestions.length,
  };
  if (mode === 'preview') return base;
  return {
    ...base,
    contentUrl: lesson.contentUrl,
    contentBody: lesson.contentBody,
    questions:
      lesson.type === 'quiz'
        ? lesson.quizQuestions.map((question) => ({
            id: question.id,
            questionText: question.questionText,
            options: question.options.map((option) => ({
              id: option.id,
              optionText: option.optionText,
              ...(mode === 'admin' ? { isCorrect: option.isCorrect } : {}),
            })),
          }))
        : undefined,
  };
}

export function effectivePassingGrade(course: { passingGrade: unknown }, defaultGrade: number) {
  return course.passingGrade === null ? defaultGrade : toNumber(course.passingGrade as number);
}

export async function formatCourse(course: CourseFull, mode: 'preview' | 'admin') {
  const settings = await settingsService.get();
  const lessons = course.modules.flatMap((mod) => mod.lessons);
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description,
    category: course.category,
    educationLevel: course.educationLevel,
    level: course.level,
    price: course.price,
    isFree: course.isFree,
    thumbnailUrl: resolveFileUrl(course.thumbnailUrl),
    status: course.status,
    statusLabel: COURSE_STATUS_LABEL[course.status],
    passingGrade: effectivePassingGrade(course, settings.defaultPassingGrade),
    issuesCertificate: course.issuesCertificate,
    avgRating: course.avgRating,
    reviewCount: course.reviewCount,
    instructor: course.createdBy,
    enrollmentCount: course._count.enrollments,
    lessonCount: lessons.length,
    totalDurationSeconds: lessons.reduce((sum, lesson) => sum + (lesson.durationSeconds ?? 0), 0),
    modules: course.modules.map((mod) => ({
      id: mod.id,
      title: mod.title,
      orderIndex: mod.orderIndex,
      lessons: mod.lessons.map((lesson) => formatLesson(lesson, mode)),
    })),
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
}

async function assertMasterData(input: CourseBody) {
  if (!(await courseRepository.categoryExists(input.categoryId))) {
    throw Errors.validation('Kategori tidak ditemukan', [
      { field: 'categoryId', message: 'not_found' },
    ]);
  }
  if (
    input.educationLevelId &&
    !(await courseRepository.educationLevelExists(input.educationLevelId))
  ) {
    throw Errors.validation('Jenjang tidak ditemukan', [
      { field: 'educationLevelId', message: 'not_found' },
    ]);
  }
}

async function uniqueSlug(title: string) {
  const base = slugify(title) || 'kursus';
  let slug = base;
  for (let i = 2; await courseRepository.slugExists(slug); i++) slug = `${base}-${i}`;
  return slug;
}

async function getCourse(id: bigint) {
  const course = await courseRepository.findById(prisma, id);
  if (!course) throw Errors.notFound('Kursus tidak ditemukan');
  return course;
}

function assertCreator(course: CourseFull, adminId: bigint) {
  if (course.createdByUserId !== adminId) {
    throw Errors.forbidden('Hanya admin pembuat kursus yang bisa mengubah kursus ini');
  }
}

export const courseService = {
  getCourse,

  // FR-COURSE-01
  async create(adminId: bigint, input: CourseBody) {
    await assertMasterData(input);
    const course = await courseRepository.create({
      ...input,
      description: input.description ?? null,
      educationLevelId: input.educationLevelId ?? null,
      thumbnailUrl: input.thumbnailUrl ?? null,
      passingGrade: input.passingGrade ?? null,
      slug: await uniqueSlug(input.title),
      status: 'draft',
      createdByUserId: adminId,
    });
    return formatCourse(await getCourse(course.id), 'admin');
  },

  async update(adminId: bigint, courseId: bigint, input: CourseBody) {
    const course = await getCourse(courseId);
    assertCreator(course, adminId);
    if (course.status === 'archived')
      throw Errors.businessRule('Kursus yang diarsipkan tidak bisa diubah');
    await assertMasterData(input);
    await courseRepository.update(prisma, courseId, {
      ...input,
      description: input.description ?? null,
      educationLevelId: input.educationLevelId ?? null,
      thumbnailUrl: input.thumbnailUrl ?? null,
      passingGrade: input.passingGrade ?? null,
    });
    return formatCourse(await getCourse(courseId), 'admin');
  },

  async setModules(adminId: bigint, courseId: bigint, input: ModulesBody) {
    const course = await getCourse(courseId);
    assertCreator(course, adminId);
    const existingIds = new Set(course.modules.map((mod) => mod.id));
    for (const mod of input.modules) {
      if (mod.id && !existingIds.has(mod.id)) {
        throw Errors.validation(`Modul #${mod.id} bukan bagian dari kursus ini`, [
          { field: 'modules', message: 'invalid_id' },
        ]);
      }
    }
    const keep = new Set(input.modules.map((mod) => mod.id).filter(Boolean) as bigint[]);
    const removeIds = [...existingIds].filter((id) => !keep.has(id));
    if (removeIds.length && (await courseRepository.countLessonProgress(removeIds)) > 0) {
      throw Errors.businessRule('Modul yang sudah dipelajari peserta tidak bisa dihapus');
    }
    await courseRepository.replaceModules(courseId, input.modules, removeIds);
    return formatCourse(await getCourse(courseId), 'admin');
  },

  // FR-COURSE-02
  async addLesson(adminId: bigint, courseId: bigint, moduleId: bigint, input: LessonBody) {
    const course = await getCourse(courseId);
    assertCreator(course, adminId);
    const mod = await courseRepository.findModule(moduleId);
    if (!mod || mod.courseId !== courseId)
      throw Errors.notFound('Modul tidak ditemukan di kursus ini');

    await courseRepository.createLesson({
      moduleId,
      title: input.title,
      type: input.type,
      contentUrl: input.contentUrl ?? null,
      contentBody: input.contentBody ?? null,
      durationSeconds: input.durationSeconds ?? null,
      orderIndex: input.orderIndex ?? mod._count.lessons,
      quizQuestions: input.questions
        ? {
            create: input.questions.map((question, index) => ({
              questionText: question.questionText,
              orderIndex: index,
              options: { create: question.options },
            })),
          }
        : undefined,
    });
    return formatCourse(await getCourse(courseId), 'admin');
  },

  /** Ubah lesson. Soal kuis hanya bisa diganti selama belum ada peserta yang mengerjakan. */
  async updateLesson(adminId: bigint, courseId: bigint, lessonId: bigint, input: LessonBody) {
    const course = await getCourse(courseId);
    assertCreator(course, adminId);
    const lesson = course.modules.flatMap((mod) => mod.lessons).find((row) => row.id === lessonId);
    if (!lesson) throw Errors.notFound('Lesson tidak ditemukan di kursus ini');
    if (lesson.type !== input.type) {
      throw Errors.businessRule('Tipe lesson tidak bisa diubah. Hapus lalu buat lesson baru.');
    }
    const replaceQuestions = input.type === 'quiz' && input.questions;
    if (replaceQuestions && (await courseRepository.countQuizAttempts(lessonId)) > 0) {
      throw Errors.businessRule('Soal kuis yang sudah dikerjakan peserta tidak bisa diganti');
    }
    await courseRepository.updateLesson(
      lessonId,
      {
        title: input.title,
        contentUrl: input.contentUrl ?? null,
        contentBody: input.contentBody ?? null,
        durationSeconds: input.durationSeconds ?? null,
        ...(input.orderIndex !== undefined ? { orderIndex: input.orderIndex } : {}),
      },
      replaceQuestions ? input.questions : undefined,
    );
    return formatCourse(await getCourse(courseId), 'admin');
  },

  /** Hapus lesson yang belum pernah dipelajari/dikerjakan peserta. */
  async deleteLesson(adminId: bigint, courseId: bigint, lessonId: bigint) {
    const course = await getCourse(courseId);
    assertCreator(course, adminId);
    if (!course.modules.some((mod) => mod.lessons.some((row) => row.id === lessonId))) {
      throw Errors.notFound('Lesson tidak ditemukan di kursus ini');
    }
    if ((await courseRepository.countLessonActivity(lessonId)) > 0) {
      throw Errors.businessRule('Lesson yang sudah dipelajari peserta tidak bisa dihapus');
    }
    await courseRepository.deleteLesson(lessonId);
    return formatCourse(await getCourse(courseId), 'admin');
  },

  // FR-COURSE-03: draft → in_review → published
  async submitReview(adminId: bigint, courseId: bigint) {
    const course = await getCourse(courseId);
    assertCreator(course, adminId);
    if (course.status !== 'draft') {
      throw Errors.businessRule(
        `Hanya kursus berstatus draf yang bisa diajukan (sekarang: ${COURSE_STATUS_LABEL[course.status]})`,
      );
    }
    if (!course.modules.some((mod) => mod.lessons.length > 0)) {
      throw Errors.businessRule(
        'Tambahkan minimal satu modul berisi lesson sebelum mengajukan review',
      );
    }
    await courseRepository.update(prisma, courseId, { status: 'in_review' });
    await notificationService.notifyAdmins(prisma, {
      type: 'course_submitted',
      title: 'Kursus baru menunggu review',
      body: `"${course.title}" diajukan untuk dipublikasikan.`,
      data: { courseId },
    });
    return formatCourse(await getCourse(courseId), 'admin');
  },

  // FR-ADMIN-04
  async publish(courseId: bigint) {
    const course = await getCourse(courseId);
    if (course.status !== 'in_review') {
      throw Errors.businessRule(
        `Hanya kursus yang sedang direview yang bisa diterbitkan (sekarang: ${COURSE_STATUS_LABEL[course.status]})`,
      );
    }
    await courseRepository.update(prisma, courseId, { status: 'published' });
    await notificationService.notify(prisma, course.createdByUserId, {
      type: 'course_published',
      title: 'Kursus sudah terbit',
      body: `"${course.title}" kini tampil di katalog Learnly.`,
      data: { courseId },
    });
    return formatCourse(await getCourse(courseId), 'admin');
  },

  async reject(courseId: bigint, input: RejectCourseBody) {
    const course = await getCourse(courseId);
    if (course.status !== 'in_review')
      throw Errors.businessRule('Kursus ini tidak sedang direview');
    await courseRepository.update(prisma, courseId, { status: 'draft' });
    await notificationService.notify(prisma, course.createdByUserId, {
      type: 'course_rejected',
      title: 'Kursus perlu diperbaiki sebelum terbit',
      body: `Catatan reviewer untuk "${course.title}": ${input.notes}`,
      data: { courseId },
    });
    return formatCourse(await getCourse(courseId), 'admin');
  },

  /** GET /courses/:slug — publik hanya kursus terbit; admin bisa melihat semua status. */
  async getPublic(slugOrId: string, viewerRole?: UserRole) {
    let course = await courseRepository.findBySlug(slugOrId);
    if (!course && /^\d+$/.test(slugOrId))
      course = await courseRepository.findById(prisma, BigInt(slugOrId));
    const isAdmin = viewerRole === 'admin';
    if (!course || (course.status !== 'published' && !isAdmin))
      throw Errors.notFound('Kursus tidak ditemukan');
    return formatCourse(course, isAdmin ? 'admin' : 'preview');
  },

  async adminList(query: AdminCoursesQuery) {
    const { skip, take } = toSkipTake(query);
    const [rows, total] = await courseRepository.listByStatus(query.status, skip, take);
    return {
      items: await Promise.all(rows.map((row) => formatCourse(row, 'admin'))),
      meta: buildMeta(query.page, query.limit, total),
    };
  },

  // FR-EVAL-02: rekap nilai seluruh peserta
  async grades(courseId: bigint) {
    const course = await getCourse(courseId);
    const lessons = course.modules.flatMap((mod) => mod.lessons);
    const quizLessons = lessons.filter((lesson) => lesson.type === 'quiz');
    const assignmentLessons = lessons.filter((lesson) => lesson.type === 'assignment');
    const enrollments = await courseRepository.findEnrollmentsWithScores(courseId);

    return {
      course: { id: course.id, title: course.title, slug: course.slug },
      participants: enrollments.map((enrollment) => ({
        enrollmentId: enrollment.id,
        learner: { id: enrollment.learner.id, fullName: enrollment.learner.fullName },
        account: enrollment.learner.owner,
        status: enrollment.status,
        progressPercent: enrollment.progressPercent,
        quizzes: quizLessons.map((lesson) => {
          const attempts = enrollment.quizAttempts.filter(
            (attempt) => attempt.lessonId === lesson.id,
          );
          return {
            lessonId: lesson.id,
            title: lesson.title,
            attempts: attempts.length,
            bestScore: attempts.length ? Math.max(...attempts.map((a) => toNumber(a.score))) : null,
          };
        }),
        assignments: assignmentLessons.map((lesson) => {
          const latest = enrollment.assignmentSubmissions.find((sub) => sub.lessonId === lesson.id);
          return {
            lessonId: lesson.id,
            title: lesson.title,
            submission: latest
              ? {
                  id: latest.id,
                  fileUrl: resolveFileUrl(latest.fileUrl),
                  submittedAt: latest.submittedAt,
                  score: latest.score,
                  feedback: latest.feedback,
                  gradedAt: latest.gradedAt,
                }
              : null,
          };
        }),
        certificate: enrollment.certificate
          ? {
              certificateNumber: enrollment.certificate.certificateNumber,
              issuedAt: enrollment.certificate.issuedAt,
            }
          : null,
      })),
    };
  },
};
