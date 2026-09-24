import { z } from 'zod';
import { paginationQuery } from '../../lib/pagination';
import { idSchema } from '../../middlewares/validate';

export const courseBody = z
  .object({
    title: z.string().trim().min(5).max(191),
    description: z.string().trim().max(10_000).nullable().optional(),
    categoryId: idSchema,
    educationLevelId: idSchema.nullable().optional(),
    level: z.enum(['pemula', 'menengah', 'lanjut']).default('pemula'),
    isFree: z.boolean(),
    price: z.number().int().min(0).max(50_000_000),
    thumbnailUrl: z.url().max(500).nullable().optional(),
    passingGrade: z.number().min(0).max(100).nullable().optional(),
    issuesCertificate: z.boolean().default(false),
  })
  .refine((body) => (body.isFree ? body.price === 0 : body.price >= 1000), {
    message: 'Kursus gratis harus berharga 0; kursus berbayar minimal Rp1.000',
    path: ['price'],
  });
export type CourseBody = z.infer<typeof courseBody>;

export const modulesBody = z.object({
  modules: z
    .array(z.object({ id: idSchema.optional(), title: z.string().trim().min(2).max(191) }))
    .min(1)
    .max(50),
});
export type ModulesBody = z.infer<typeof modulesBody>;

const quizQuestion = z.object({
  questionText: z.string().trim().min(3).max(2000),
  options: z
    .array(z.object({ optionText: z.string().trim().min(1).max(500), isCorrect: z.boolean() }))
    .min(2)
    .max(6)
    .refine((options) => options.filter((option) => option.isCorrect).length === 1, {
      message: 'Setiap soal harus punya tepat satu jawaban benar',
    }),
});

export const lessonBody = z
  .object({
    title: z.string().trim().min(2).max(191),
    type: z.enum(['video', 'article', 'quiz', 'assignment']),
    contentUrl: z.url().max(500).optional(),
    contentBody: z.string().trim().max(200_000).optional(),
    durationSeconds: z.number().int().min(0).max(86_400).optional(),
    orderIndex: z.number().int().min(0).max(1000).optional(),
    questions: z.array(quizQuestion).min(1).max(50).optional(),
  })
  .superRefine((body, ctx) => {
    const need = (field: 'contentUrl' | 'contentBody' | 'questions', message: string) => {
      if (!body[field]) ctx.addIssue({ code: 'custom', path: [field], message });
    };
    if (body.type === 'video') need('contentUrl', 'Lesson video wajib punya contentUrl');
    if (body.type === 'article') need('contentBody', 'Lesson artikel wajib punya contentBody');
    if (body.type === 'assignment') need('contentBody', 'Tulis instruksi tugas di contentBody');
    if (body.type === 'quiz') need('questions', 'Lesson kuis wajib punya daftar soal');
    if (body.type !== 'quiz' && body.questions) {
      ctx.addIssue({
        code: 'custom',
        path: ['questions'],
        message: 'questions hanya untuk lesson kuis',
      });
    }
  });
export type LessonBody = z.infer<typeof lessonBody>;

export const moduleLessonParam = z.object({ id: idSchema, moduleId: idSchema });
export type ModuleLessonParam = z.infer<typeof moduleLessonParam>;

export const slugParam = z.object({ slug: z.string().trim().min(1).max(191) });
export type SlugParam = z.infer<typeof slugParam>;

export const rejectCourseBody = z.object({ notes: z.string().trim().min(5).max(500) });
export type RejectCourseBody = z.infer<typeof rejectCourseBody>;

export const adminCoursesQuery = z.object({
  status: z.enum(['draft', 'in_review', 'published', 'archived']).default('in_review'),
  ...paginationQuery,
});
export type AdminCoursesQuery = z.infer<typeof adminCoursesQuery>;

export const enrollBody = z.object({ learnerId: idSchema.optional() });
export type EnrollBody = z.infer<typeof enrollBody>;

// enrollmentId opsional: wajib hanya jika orang tua mendaftarkan >1 anak ke kursus yang sama
export const lessonActionBody = z.object({ enrollmentId: idSchema.optional() });
export type LessonActionBody = z.infer<typeof lessonActionBody>;

export const quizAttemptBody = z.object({
  enrollmentId: idSchema.optional(),
  answers: z
    .array(z.object({ questionId: idSchema, optionId: idSchema }))
    .min(1)
    .max(50),
});
export type QuizAttemptBody = z.infer<typeof quizAttemptBody>;

export const gradeAssignmentBody = z.object({
  score: z.number().min(0).max(100),
  feedback: z.string().trim().min(3).max(5000),
});
export type GradeAssignmentBody = z.infer<typeof gradeAssignmentBody>;
