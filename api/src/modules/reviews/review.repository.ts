import { Prisma, type ReviewableType } from '@prisma/client';
import { prisma } from '../../lib/prisma';

type Db = Prisma.TransactionClient | typeof prisma;

export const reviewRepository = {
  findById(id: bigint) {
    return prisma.review.findUnique({
      where: { id },
      include: { reviewer: { select: { id: true, fullName: true } } },
    });
  },

  countFor(type: ReviewableType, reviewableId: bigint, reviewerUserId?: bigint) {
    return prisma.review.count({
      where: { reviewableType: type, reviewableId, ...(reviewerUserId ? { reviewerUserId } : {}) },
    });
  },

  create(db: Db, data: Prisma.ReviewUncheckedCreateInput) {
    return db.review.create({
      data,
      include: { reviewer: { select: { id: true, fullName: true } } },
    });
  },

  update(db: Db, id: bigint, data: Prisma.ReviewUncheckedUpdateInput) {
    return db.review.update({
      where: { id },
      data,
      include: { reviewer: { select: { id: true, fullName: true } } },
    });
  },

  // FR-REVIEW-04: agregat rating dihitung ulang synchronous (hanya review yang tidak disembunyikan)
  recalcTutor(db: Db, tutorProfileId: bigint) {
    return db.$executeRaw(Prisma.sql`
      UPDATE tutor_profiles tp
      JOIN (
        SELECT COALESCE(AVG(r.rating), 0) AS avg_rating, COUNT(r.id) AS review_count
        FROM reviews r
        JOIN bookings b ON b.id = r.reviewable_id AND r.reviewable_type = 'tutor_booking'
        WHERE b.tutor_profile_id = ${tutorProfileId} AND r.is_hidden = FALSE
      ) agg
      SET tp.avg_rating = ROUND(agg.avg_rating, 2), tp.review_count = agg.review_count
      WHERE tp.id = ${tutorProfileId}`);
  },

  recalcCourse(db: Db, courseId: bigint) {
    return db.$executeRaw(Prisma.sql`
      UPDATE courses c
      JOIN (
        SELECT COALESCE(AVG(r.rating), 0) AS avg_rating, COUNT(r.id) AS review_count
        FROM reviews r
        WHERE r.reviewable_type = 'course' AND r.reviewable_id = ${courseId} AND r.is_hidden = FALSE
      ) agg
      SET c.avg_rating = ROUND(agg.avg_rating, 2), c.review_count = agg.review_count
      WHERE c.id = ${courseId}`);
  },

  listForCourse(courseId: bigint, skip: number, take: number) {
    const where = { reviewableType: 'course' as const, reviewableId: courseId, isHidden: false };
    return prisma.$transaction([
      prisma.review.findMany({
        where,
        include: { reviewer: { select: { id: true, fullName: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      prisma.review.count({ where }),
    ]);
  },

  findBookingForReview(bookingId: bigint) {
    return prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        learner: { select: { ownerUserId: true, fullName: true } },
        subject: { select: { name: true } },
        tutorProfile: { select: { id: true, userId: true } },
      },
    });
  },

  countCompletedEnrollments(ownerUserId: bigint, courseId: bigint) {
    return prisma.courseEnrollment.count({
      where: { courseId, status: 'completed', learner: { ownerUserId } },
    });
  },
};
