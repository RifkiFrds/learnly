import crypto from 'node:crypto';
import type { Payment } from '@prisma/client';
import { Errors } from '../../lib/app-error';
import { generateCertificatePdf } from '../../lib/certificate-pdf';
import { toNumber } from '../../lib/money';
import { buildMeta, toSkipTake } from '../../lib/pagination';
import { prisma } from '../../lib/prisma';
import { resolveFileUrl, uploadFile, type StoredFile } from '../../lib/storage';
import type { Viewer } from '../bookings/booking.service';
import { notificationService } from '../notifications/notification.service';
import { PAYMENT_STATUS_LABEL } from '../payments/payment.policy';
import { paymentRepository } from '../payments/payment.repository';
import { buildPaymentInstructions } from '../payments/payment.service';
import { settingsService } from '../settings/settings.service';
import {
  averageEvaluationScore,
  calculateProgressPercent,
  certificateEligibility,
  scoreQuiz,
} from './course-progress';
import { effectivePassingGrade, formatLesson } from './course.service';
import { enrollmentRepository, type EnrollmentFull } from './enrollment.repository';
import type {
  EnrollBody,
  GradeAssignmentBody,
  LessonActionBody,
  QuizAttemptBody,
} from './course.schema';

// Akses materi: kursus gratis, atau kursus berbayar dengan pembayaran terakhir berstatus paid (FR-COURSE-04)
function hasAccess(course: { isFree: boolean }, payment: Payment | null) {
  return course.isFree || payment?.status === 'paid';
}

/** Ringkasan evaluasi & kelayakan sertifikat untuk satu enrollment */
function evaluate(enrollment: EnrollmentFull, defaultPassingGrade: number) {
  const lessons = enrollment.course.modules.flatMap((mod) => mod.lessons);
  const completedIds = new Set(
    enrollment.lessonProgress
      .filter((row) => row.status === 'completed')
      .map((row) => row.lessonId),
  );
  const progressPercent = calculateProgressPercent(
    lessons.length,
    lessons.filter((lesson) => completedIds.has(lesson.id)).length,
  );

  const quizzes = lessons
    .filter((lesson) => lesson.type === 'quiz')
    .map((lesson) => {
      const attempts = enrollment.quizAttempts.filter((attempt) => attempt.lessonId === lesson.id);
      const bestScore = attempts.length
        ? Math.max(...attempts.map((a) => toNumber(a.score)))
        : null;
      return {
        lessonId: lesson.id,
        title: lesson.title,
        attempts: attempts.length,
        bestScore,
        passed: attempts.some((attempt) => attempt.passed),
      };
    });

  const assignments = lessons
    .filter((lesson) => lesson.type === 'assignment')
    .map((lesson) => {
      const latest = enrollment.assignmentSubmissions.find((sub) => sub.lessonId === lesson.id);
      return {
        lessonId: lesson.id,
        title: lesson.title,
        submission: latest
          ? {
              id: latest.id,
              fileUrl: resolveFileUrl(latest.fileUrl),
              submittedAt: latest.submittedAt,
              score: latest.score === null ? null : toNumber(latest.score),
              feedback: latest.feedback,
              gradedAt: latest.gradedAt,
            }
          : null,
      };
    });

  const scores = [
    ...quizzes.filter((quiz) => quiz.bestScore !== null).map((quiz) => quiz.bestScore as number),
    ...assignments
      .filter((item) => item.submission?.score !== null && item.submission?.score !== undefined)
      .map((item) => item.submission!.score as number),
  ];
  const averageScore = averageEvaluationScore(scores);
  const passingGrade = effectivePassingGrade(enrollment.course, defaultPassingGrade);
  const eligibility = certificateEligibility({
    issuesCertificate: enrollment.course.issuesCertificate,
    progressPercent,
    averageScore,
    passingGrade,
    ungradedAssignments: assignments.filter(
      (item) => item.submission && item.submission.score === null,
    ).length,
  });

  return {
    progressPercent,
    completedIds,
    quizzes,
    assignments,
    averageScore,
    passingGrade,
    eligibility,
  };
}

async function loadOwned(viewer: Viewer, enrollmentId: bigint) {
  const enrollment = await enrollmentRepository.findById(prisma, enrollmentId);
  if (!enrollment) throw Errors.notFound('Enrollment tidak ditemukan');
  if (viewer.role !== 'admin' && enrollment.learner.ownerUserId !== viewer.userId) {
    throw Errors.forbidden('Enrollment ini bukan milikmu');
  }
  return enrollment;
}

/**
 * Hitung ulang progres, tandai selesai, dan terbitkan sertifikat PDF secara synchronous
 * begitu syarat FR-COURSE-07 terpenuhi. Idempotent — aman dipanggil berulang.
 */
export async function refreshProgress(enrollmentId: bigint) {
  const settings = await settingsService.get();
  const enrollment = (await enrollmentRepository.findById(prisma, enrollmentId))!;
  const result = evaluate(enrollment, settings.defaultPassingGrade);
  const justCompleted = result.progressPercent >= 100 && enrollment.status !== 'completed';

  await enrollmentRepository.update(prisma, enrollment.id, {
    progressPercent: result.progressPercent,
    ...(justCompleted ? { status: 'completed', completedAt: new Date() } : {}),
  });

  if (justCompleted) {
    await notificationService.notify(prisma, enrollment.learner.ownerUserId, {
      type: 'course_completed',
      title: 'Kursus selesai!',
      body: `${enrollment.learner.fullName} menyelesaikan semua materi "${enrollment.course.title}". Yuk beri ulasan.`,
      data: { enrollmentId: enrollment.id, courseId: enrollment.course.id },
    });
  }

  if (result.eligibility.eligible && !enrollment.certificate) {
    const issuedAt = new Date();
    const certificateNumber = `LRN-${issuedAt.getFullYear()}-${String(enrollment.id).padStart(6, '0')}-${crypto
      .randomBytes(2)
      .toString('hex')
      .toUpperCase()}`;
    const pdf = await generateCertificatePdf({
      certificateNumber,
      learnerName: enrollment.learner.fullName,
      courseTitle: enrollment.course.title,
      issuedAt,
      averageScore: result.averageScore,
    });
    const fileUrl = await uploadFile(
      { buffer: pdf, mimeType: 'application/pdf' },
      { folder: 'certificates' },
    );
    try {
      await enrollmentRepository.createCertificate(prisma, {
        enrollmentId: enrollment.id,
        certificateNumber,
        fileUrl,
        issuedAt,
      });
      await notificationService.notify(prisma, enrollment.learner.ownerUserId, {
        type: 'certificate_issued',
        title: 'Sertifikat sudah terbit',
        body: `Selamat! Sertifikat "${enrollment.course.title}" untuk ${enrollment.learner.fullName} siap diunduh.`,
        data: { enrollmentId: enrollment.id, certificateNumber },
      });
    } catch (err) {
      // request paralel sudah menerbitkan sertifikat (unique enrollment_id) → abaikan
      if ((err as { code?: string }).code !== 'P2002') throw err;
    }
  }
}

/** Resolve enrollment milik viewer untuk lesson tertentu (orang tua dengan >1 anak wajib kirim enrollmentId) */
async function resolveEnrollmentForLesson(viewer: Viewer, lessonId: bigint, enrollmentId?: bigint) {
  const lesson = await enrollmentRepository.findLesson(lessonId);
  if (!lesson) throw Errors.notFound('Lesson tidak ditemukan');

  let targetId = enrollmentId;
  if (!targetId) {
    const owned = await enrollmentRepository.findOwnedForLesson(viewer.userId, lessonId);
    if (owned.length === 0) throw Errors.forbidden('Kamu belum terdaftar di kursus ini');
    if (owned.length > 1) {
      throw Errors.validation('Pilih enrollment (anak) yang sedang belajar', [
        { field: 'enrollmentId', message: 'required' },
      ]);
    }
    targetId = owned[0].id;
  }
  const enrollment = await loadOwned(viewer, targetId);
  if (enrollment.course.id !== lesson.module.courseId) {
    throw Errors.validation('Lesson ini bukan bagian dari kursus pada enrollment tersebut');
  }
  const payment = await paymentRepository.findLatestForPayable(
    prisma,
    'course_enrollment',
    enrollment.id,
  );
  if (!hasAccess(enrollment.course, payment)) {
    throw Errors.forbidden('Selesaikan pembayaran kursus terlebih dahulu untuk membuka materi');
  }
  return { lesson, enrollment };
}

async function detail(enrollmentId: bigint) {
  const [enrollment, payment, settings] = await Promise.all([
    enrollmentRepository.findById(prisma, enrollmentId),
    paymentRepository.findLatestForPayable(prisma, 'course_enrollment', enrollmentId),
    settingsService.get(),
  ]);
  const e = enrollment!;
  // Ulasan kursus milik akun ini (FR-REVIEW-01/02) → FE tahu harus menulis baru atau mengedit
  const review = await prisma.review.findFirst({
    where: { reviewableType: 'course', reviewableId: e.course.id, reviewerUserId: e.learner.ownerUserId },
  });
  const access = hasAccess(e.course, payment);
  const result = evaluate(e, settings.defaultPassingGrade);
  const progressByLesson = new Map(e.lessonProgress.map((row) => [row.lessonId, row]));

  return {
    id: e.id,
    status: e.status,
    progressPercent: result.progressPercent,
    enrolledAt: e.enrolledAt,
    completedAt: e.completedAt,
    hasAccess: access,
    learner: { id: e.learner.id, fullName: e.learner.fullName },
    course: {
      id: e.course.id,
      slug: e.course.slug,
      title: e.course.title,
      thumbnailUrl: resolveFileUrl(e.course.thumbnailUrl),
      isFree: e.course.isFree,
      price: e.course.price,
      passingGrade: result.passingGrade,
      issuesCertificate: e.course.issuesCertificate,
    },
    payment: payment
      ? {
          id: payment.id,
          status: payment.status,
          statusLabel: PAYMENT_STATUS_LABEL[payment.status],
          amount: payment.amount,
        }
      : null,
    // Materi lengkap hanya untuk yang punya akses; soal kuis tanpa kunci jawaban
    modules: e.course.modules.map((mod) => ({
      id: mod.id,
      title: mod.title,
      lessons: mod.lessons.map((lesson) => ({
        ...formatLesson(lesson, access ? 'learner' : 'preview'),
        progressStatus: progressByLesson.get(lesson.id)?.status ?? 'not_started',
        completedAt: progressByLesson.get(lesson.id)?.completedAt ?? null,
      })),
    })),
    // FR-EVAL-01: riwayat nilai
    evaluation: {
      quizzes: result.quizzes,
      assignments: result.assignments,
      averageScore: result.averageScore,
      passingGrade: result.passingGrade,
    },
    certificate: e.certificate
      ? {
          certificateNumber: e.certificate.certificateNumber,
          fileUrl: resolveFileUrl(e.certificate.fileUrl),
          issuedAt: e.certificate.issuedAt,
        }
      : null,
    certificateEligibility: result.eligibility,
    review: review
      ? {
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          replyText: review.replyText,
          repliedAt: review.repliedAt,
          isHidden: review.isHidden,
          createdAt: review.createdAt,
          editableUntil: new Date(review.createdAt.getTime() + settings.reviewEditDays * 86_400_000),
        }
      : null,
  };
}

export const enrollmentService = {
  // FR-COURSE-04: gratis → langsung aktif; berbayar → tagihan manual (sama dengan booking)
  async enroll(viewer: Viewer, courseId: bigint, input: EnrollBody) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.status !== 'published') throw Errors.notFound('Kursus tidak ditemukan');

    const learners = await prisma.learner.findMany({ where: { ownerUserId: viewer.userId } });
    const learner = input.learnerId
      ? learners.find((row) => row.id === input.learnerId)
      : learners.find((row) => row.isSelf);
    if (!learner) {
      throw input.learnerId
        ? Errors.forbidden('Profil siswa ini bukan milikmu')
        : Errors.validation('Pilih profil anak yang akan mengikuti kursus', [
            { field: 'learnerId', message: 'required' },
          ]);
    }

    const settings = await settingsService.get();
    const existing = await enrollmentRepository.findByCourseAndLearner(course.id, learner.id);
    let enrollmentId = existing?.id;
    let created = false;

    if (existing) {
      const payment = await paymentRepository.findLatestForPayable(
        prisma,
        'course_enrollment',
        existing.id,
      );
      if (hasAccess(course, payment)) {
        throw Errors.conflict(`${learner.fullName} sudah terdaftar di kursus ini`);
      }
      // Tagihan lama masih berjalan → kembalikan instruksi yang sama (tidak membuat tagihan ganda)
      if (payment && ['menunggu_pembayaran', 'menunggu_verifikasi'].includes(payment.status)) {
        return {
          enrollment: await detail(existing.id),
          requiresPayment: true,
          ...buildPaymentInstructions(payment, settings),
          created: false,
        };
      }
    }

    await prisma.$transaction(async (tx) => {
      if (!enrollmentId) {
        enrollmentId = (await enrollmentRepository.create(tx, course.id, learner.id)).id;
        created = true;
      }
      if (!course.isFree) {
        await paymentRepository.create(tx, {
          payableType: 'course_enrollment',
          payableId: enrollmentId,
          userId: viewer.userId,
          amount: course.price,
          method: 'qris',
          status: 'menunggu_pembayaran',
        });
      }
    });

    const payment = course.isFree
      ? null
      : await paymentRepository.findLatestForPayable(prisma, 'course_enrollment', enrollmentId!);
    return {
      enrollment: await detail(enrollmentId!),
      requiresPayment: !course.isFree,
      ...(course.isFree ? {} : buildPaymentInstructions(payment, settings)),
      created: created || !course.isFree,
    };
  },

  async listMine(viewer: Viewer, page: number, limit: number) {
    const { skip, take } = toSkipTake({ page, limit });
    const [rows, total] = await enrollmentRepository.listForOwner(viewer.userId, skip, take);
    const payments = await paymentRepository.findLatestForPayables(
      'course_enrollment',
      rows.map((row) => row.id),
    );
    const latest = new Map<bigint, Payment>();
    for (const payment of payments)
      if (!latest.has(payment.payableId)) latest.set(payment.payableId, payment);
    return {
      items: rows.map((row) => ({
        id: row.id,
        status: row.status,
        progressPercent: row.progressPercent,
        enrolledAt: row.enrolledAt,
        completedAt: row.completedAt,
        hasAccess: hasAccess(row.course, latest.get(row.id) ?? null),
        paymentStatus: latest.get(row.id)?.status ?? null,
        learner: row.learner,
        course: { ...row.course, thumbnailUrl: resolveFileUrl(row.course.thumbnailUrl) },
        certificate: row.certificate,
      })),
      meta: buildMeta(page, limit, total),
    };
  },

  async getById(viewer: Viewer, enrollmentId: bigint) {
    await loadOwned(viewer, enrollmentId);
    return detail(enrollmentId);
  },

  // FR-COURSE-05: tandai lesson video/artikel selesai
  async completeLesson(viewer: Viewer, lessonId: bigint, input: LessonActionBody) {
    const { lesson, enrollment } = await resolveEnrollmentForLesson(
      viewer,
      lessonId,
      input.enrollmentId,
    );
    if (lesson.type === 'quiz')
      throw Errors.businessRule('Kuis diselesaikan dengan mengirim jawaban (quiz-attempts)');
    if (lesson.type === 'assignment')
      throw Errors.businessRule('Tugas diselesaikan dengan mengunggah file (assignments)');
    await enrollmentRepository.upsertLessonProgress(prisma, enrollment.id, lesson.id, 'completed');
    await refreshProgress(enrollment.id);
    return detail(enrollment.id);
  },

  // FR-COURSE-06: kuis dinilai otomatis; lulus → lesson selesai
  async submitQuiz(viewer: Viewer, lessonId: bigint, input: QuizAttemptBody) {
    const { lesson, enrollment } = await resolveEnrollmentForLesson(
      viewer,
      lessonId,
      input.enrollmentId,
    );
    if (lesson.type !== 'quiz') throw Errors.businessRule('Lesson ini bukan kuis');

    const questionIds = new Set(lesson.quizQuestions.map((question) => question.id));
    const invalid = input.answers.find((answer) => !questionIds.has(answer.questionId));
    if (invalid) {
      throw Errors.validation(`Soal #${invalid.questionId} bukan bagian dari kuis ini`, [
        { field: 'answers', message: 'invalid_question' },
      ]);
    }

    const settings = await settingsService.get();
    const passingGrade = effectivePassingGrade(enrollment.course, settings.defaultPassingGrade);
    const result = scoreQuiz(lesson.quizQuestions, input.answers);
    const passed = result.score >= passingGrade;

    const attempt = await prisma.$transaction(async (tx) => {
      const created = await enrollmentRepository.createQuizAttempt(tx, {
        enrollmentId: enrollment.id,
        lessonId: lesson.id,
        score: result.score,
        passed,
      });
      await enrollmentRepository.upsertLessonProgress(
        tx,
        enrollment.id,
        lesson.id,
        passed ? 'completed' : 'in_progress',
      );
      return created;
    });
    await refreshProgress(enrollment.id);

    const updated = await detail(enrollment.id);
    return {
      attemptId: attempt.id,
      score: result.score,
      passed,
      passingGrade,
      correctCount: result.correctCount,
      totalQuestions: result.totalQuestions,
      // Kunci jawaban baru dibuka setelah lulus agar kuis tidak bisa "ditebak ulang"
      results: result.results.map((item) => ({
        questionId: item.questionId,
        selectedOptionId: item.selectedOptionId,
        isCorrect: item.isCorrect,
        ...(passed ? { correctOptionId: item.correctOptionId } : {}),
      })),
      message: passed
        ? 'Selamat, kamu lulus kuis ini!'
        : `Skor ${result.score} belum mencapai ${passingGrade}. Pelajari lagi materinya lalu coba kembali.`,
      enrollment: {
        id: updated.id,
        status: updated.status,
        progressPercent: updated.progressPercent,
        certificate: updated.certificate,
        certificateEligibility: updated.certificateEligibility,
      },
    };
  },

  // FR-COURSE-06: tugas diunggah → lesson dianggap selesai, nilai menyusul dari instruktur
  async submitAssignment(
    viewer: Viewer,
    lessonId: bigint,
    input: LessonActionBody,
    file: StoredFile,
  ) {
    const { lesson, enrollment } = await resolveEnrollmentForLesson(
      viewer,
      lessonId,
      input.enrollmentId,
    );
    if (lesson.type !== 'assignment') throw Errors.businessRule('Lesson ini bukan tugas');
    const fileUrl = await uploadFile(file, { folder: 'assignments', isPrivate: true });

    const submission = await prisma.$transaction(async (tx) => {
      const created = await enrollmentRepository.createSubmission(tx, {
        enrollmentId: enrollment.id,
        lessonId: lesson.id,
        fileUrl,
      });
      await enrollmentRepository.upsertLessonProgress(tx, enrollment.id, lesson.id, 'completed');
      await notificationService.notify(tx, enrollment.course.createdByUserId, {
        type: 'assignment_submitted',
        title: 'Tugas baru perlu dinilai',
        body: `${enrollment.learner.fullName} mengumpulkan "${lesson.title}" di kursus "${enrollment.course.title}".`,
        data: { submissionId: created.id, courseId: enrollment.course.id },
      });
      return created;
    });
    await refreshProgress(enrollment.id);
    return {
      ...submission,
      fileUrl: resolveFileUrl(submission.fileUrl),
      message: 'Tugas terkirim. Nilai akan muncul setelah diperiksa instruktur.',
    };
  },

  // FR-COURSE-06 / FR-EVAL: penilaian manual oleh admin/instruktur
  async gradeAssignment(adminId: bigint, submissionId: bigint, input: GradeAssignmentBody) {
    const submission = await enrollmentRepository.findSubmission(submissionId);
    if (!submission) throw Errors.notFound('Pengumpulan tugas tidak ditemukan');
    const updated = await prisma.$transaction(async (tx) => {
      const graded = await enrollmentRepository.updateSubmission(tx, submission.id, {
        score: input.score,
        feedback: input.feedback,
        gradedByUserId: adminId,
        gradedAt: new Date(),
      });
      await notificationService.notify(tx, submission.enrollment.learner.ownerUserId, {
        type: 'assignment_graded',
        title: 'Tugas sudah dinilai',
        body: `"${submission.lesson.title}" (${submission.enrollment.course.title}) mendapat nilai ${input.score}.`,
        data: { submissionId: submission.id, enrollmentId: submission.enrollment.id },
      });
      return graded;
    });
    await refreshProgress(submission.enrollment.id);
    return { ...updated, fileUrl: resolveFileUrl(updated.fileUrl) };
  },

  // FR-COURSE-07
  async getCertificate(viewer: Viewer, enrollmentId: bigint) {
    const enrollment = await loadOwned(viewer, enrollmentId);
    if (!enrollment.certificate) {
      // Jika syarat sudah terpenuhi tapi sertifikat belum ada (mis. error sebelumnya), terbitkan sekarang
      await refreshProgress(enrollment.id);
    }
    const result = await detail(enrollment.id);
    if (!result.certificate) {
      throw Errors.notFound(
        `Sertifikat belum terbit: ${result.certificateEligibility.reasons.join('; ') || 'syarat belum terpenuhi'}`,
      );
    }
    return {
      enrollmentId: enrollment.id,
      learnerName: enrollment.learner.fullName,
      courseTitle: enrollment.course.title,
      averageScore: result.evaluation.averageScore,
      ...result.certificate,
    };
  },
};
