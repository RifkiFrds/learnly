import type { Review } from '@prisma/client';
import { Errors } from '../../lib/app-error';
import { buildMeta, toSkipTake } from '../../lib/pagination';
import { prisma } from '../../lib/prisma';
import type { Viewer } from '../bookings/booking.service';
import { notificationService } from '../notifications/notification.service';
import { settingsService } from '../settings/settings.service';
import { reviewRepository } from './review.repository';
import type {
  CreateReviewBody,
  ReplyReviewBody,
  ReviewVisibilityBody,
  UpdateReviewBody,
} from './review.schema';

type ReviewWithReviewer = Review & { reviewer: { id: bigint; fullName: string } };

function formatReview(review: ReviewWithReviewer, editableUntil?: Date) {
  return {
    id: review.id,
    reviewableType: review.reviewableType,
    reviewableId: review.reviewableId,
    rating: review.rating,
    comment: review.comment,
    replyText: review.replyText,
    repliedAt: review.repliedAt,
    isHidden: review.isHidden,
    reviewer: review.reviewer,
    createdAt: review.createdAt,
    ...(editableUntil ? { editableUntil } : {}),
  };
}

/** Recalc rating agregat tutor/kursus terkait review (FR-REVIEW-04) */
async function recalcFor(review: Pick<Review, 'reviewableType' | 'reviewableId'>) {
  if (review.reviewableType === 'course') {
    await reviewRepository.recalcCourse(prisma, review.reviewableId);
    return;
  }
  const booking = await reviewRepository.findBookingForReview(review.reviewableId);
  if (booking) await reviewRepository.recalcTutor(prisma, booking.tutorProfile.id);
}

async function editDeadline(review: Review) {
  const settings = await settingsService.get();
  return new Date(review.createdAt.getTime() + settings.reviewEditDays * 86_400_000);
}

export const reviewService = {
  // FR-REVIEW-01/02
  async create(viewer: Viewer, input: CreateReviewBody) {
    let notifyUserId: bigint;
    if (input.reviewableType === 'tutor_booking') {
      const booking = await reviewRepository.findBookingForReview(input.reviewableId);
      if (!booking) throw Errors.notFound('Booking tidak ditemukan');
      if (booking.learner.ownerUserId !== viewer.userId)
        throw Errors.forbidden('Booking ini bukan milikmu');
      if (booking.status !== 'sesi_selesai') {
        throw Errors.businessRule('Ulasan bisa diberikan setelah sesi selesai');
      }
      if ((await reviewRepository.countFor('tutor_booking', booking.id)) > 0) {
        throw Errors.conflict(
          'Sesi ini sudah pernah kamu ulas. Kamu bisa mengedit ulasan yang ada.',
        );
      }
      notifyUserId = booking.tutorProfile.userId;
    } else {
      const course = await prisma.course.findUnique({ where: { id: input.reviewableId } });
      if (!course || course.status !== 'published') throw Errors.notFound('Kursus tidak ditemukan');
      if ((await reviewRepository.countCompletedEnrollments(viewer.userId, course.id)) === 0) {
        throw Errors.businessRule('Ulasan kursus bisa diberikan setelah menyelesaikan kursus');
      }
      if ((await reviewRepository.countFor('course', course.id, viewer.userId)) > 0) {
        throw Errors.conflict(
          'Kamu sudah pernah mengulas kursus ini. Kamu bisa mengedit ulasan yang ada.',
        );
      }
      notifyUserId = course.createdByUserId;
    }

    const review = await prisma.$transaction(async (tx) => {
      const created = await reviewRepository.create(tx, {
        reviewableType: input.reviewableType,
        reviewableId: input.reviewableId,
        reviewerUserId: viewer.userId,
        rating: input.rating,
        comment: input.comment ?? null,
      });
      await notificationService.notify(tx, notifyUserId, {
        type: 'review_received',
        title: `Ulasan baru ★${input.rating}`,
        body: input.comment
          ? `"${input.comment.slice(0, 120)}"`
          : 'Seseorang memberi rating tanpa komentar.',
        data: { reviewId: created.id },
      });
      return created;
    });
    await recalcFor(review);
    return formatReview(review, await editDeadline(review));
  },

  // FR-REVIEW-02: bisa diedit dalam window waktu (default 7 hari)
  async update(viewer: Viewer, reviewId: bigint, input: UpdateReviewBody) {
    const review = await reviewRepository.findById(reviewId);
    if (!review) throw Errors.notFound('Ulasan tidak ditemukan');
    if (review.reviewerUserId !== viewer.userId) throw Errors.forbidden('Ulasan ini bukan milikmu');
    const deadline = await editDeadline(review);
    if (Date.now() > deadline.getTime()) {
      throw Errors.businessRule('Batas waktu mengedit ulasan sudah lewat');
    }
    const updated = await reviewRepository.update(prisma, reviewId, {
      rating: input.rating,
      comment: input.comment,
    });
    await recalcFor(updated);
    return formatReview(updated, deadline);
  },

  // FR-REVIEW-03: tutor membalas satu kali
  async reply(viewer: Viewer, reviewId: bigint, input: ReplyReviewBody) {
    const review = await reviewRepository.findById(reviewId);
    if (!review) throw Errors.notFound('Ulasan tidak ditemukan');
    if (review.reviewableType !== 'tutor_booking') {
      throw Errors.businessRule('Balasan hanya untuk ulasan sesi tutor');
    }
    const booking = await reviewRepository.findBookingForReview(review.reviewableId);
    if (booking?.tutorProfile.userId !== viewer.userId) {
      throw Errors.forbidden('Hanya tutor yang diulas yang bisa membalas');
    }
    if (review.replyText) throw Errors.conflict('Ulasan ini sudah kamu balas');
    const updated = await prisma.$transaction(async (tx) => {
      const result = await reviewRepository.update(tx, reviewId, {
        replyText: input.replyText,
        repliedAt: new Date(),
      });
      await notificationService.notify(tx, review.reviewerUserId, {
        type: 'review_replied',
        title: 'Tutor membalas ulasanmu',
        body: `"${input.replyText.slice(0, 120)}"`,
        data: { reviewId },
      });
      return result;
    });
    return formatReview(updated);
  },

  async listForCourse(courseId: bigint, page: number, limit: number) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { status: true },
    });
    if (!course || course.status !== 'published') throw Errors.notFound('Kursus tidak ditemukan');
    const { skip, take } = toSkipTake({ page, limit });
    const [rows, total] = await reviewRepository.listForCourse(courseId, skip, take);
    return { items: rows.map((row) => formatReview(row)), meta: buildMeta(page, limit, total) };
  },

  // FR-REVIEW-05: moderasi — review tidak pernah dihapus (audit), hanya disembunyikan
  async setVisibility(reviewId: bigint, input: ReviewVisibilityBody) {
    const review = await reviewRepository.findById(reviewId);
    if (!review) throw Errors.notFound('Ulasan tidak ditemukan');
    const updated = await reviewRepository.update(prisma, reviewId, { isHidden: input.isHidden });
    await recalcFor(updated);
    if (input.isHidden) {
      await notificationService.notify(prisma, review.reviewerUserId, {
        type: 'review_hidden',
        title: 'Ulasanmu disembunyikan admin',
        body: input.reason ?? 'Ulasan dinilai melanggar pedoman komunitas Learnly.',
        data: { reviewId },
      });
    }
    return formatReview(updated);
  },
};
