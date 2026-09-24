import { Prisma, type TutorVerificationStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export const tutorProfileInclude = {
  user: {
    select: { id: true, fullName: true, email: true, phone: true, status: true, createdAt: true },
  },
  certifications: { orderBy: { id: 'asc' } },
  subjects: { include: { subject: true } },
  educationLevels: { include: { educationLevel: true } },
  serviceAreas: { orderBy: { id: 'asc' } },
  availabilities: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
  blockedDates: { orderBy: { blockedDate: 'asc' } },
} satisfies Prisma.TutorProfileInclude;

export type TutorProfileFull = Prisma.TutorProfileGetPayload<{
  include: typeof tutorProfileInclude;
}>;

/** Status booking yang "memakan" slot tutor (FR-BOOK-06) */
export const ACTIVE_BOOKING_STATUSES = [
  'pending_confirmation',
  'menunggu_pembayaran',
  'dikonfirmasi',
  'tutor_bersiap',
  'tutor_dalam_perjalanan',
  'tutor_tiba',
  'sesi_berlangsung',
  'sesi_selesai',
] as const;

export const tutorRepository = {
  findByUserId(userId: bigint) {
    return prisma.tutorProfile.findUnique({ where: { userId }, include: tutorProfileInclude });
  },

  findById(id: bigint) {
    return prisma.tutorProfile.findUnique({ where: { id }, include: tutorProfileInclude });
  },

  findBasicByUserId(userId: bigint) {
    return prisma.tutorProfile.findUnique({ where: { userId } });
  },

  update(id: bigint, data: Prisma.TutorProfileUncheckedUpdateInput) {
    return prisma.tutorProfile.update({ where: { id }, data });
  },

  createCertification(data: Prisma.TutorCertificationUncheckedCreateInput) {
    return prisma.tutorCertification.create({ data });
  },

  findCertification(id: bigint) {
    return prisma.tutorCertification.findUnique({ where: { id } });
  },

  deleteCertification(id: bigint) {
    return prisma.tutorCertification.delete({ where: { id } });
  },

  countExisting(model: 'subject' | 'educationLevel', ids: bigint[]) {
    const where = { id: { in: ids } };
    return model === 'subject'
      ? prisma.subject.count({ where })
      : prisma.educationLevel.count({ where });
  },

  replaceSubjects(tutorProfileId: bigint, subjectIds: bigint[]) {
    return prisma.$transaction([
      prisma.tutorSubject.deleteMany({ where: { tutorProfileId } }),
      prisma.tutorSubject.createMany({
        data: subjectIds.map((subjectId) => ({ tutorProfileId, subjectId })),
      }),
    ]);
  },

  replaceEducationLevels(tutorProfileId: bigint, educationLevelIds: bigint[]) {
    return prisma.$transaction([
      prisma.tutorEducationLevel.deleteMany({ where: { tutorProfileId } }),
      prisma.tutorEducationLevel.createMany({
        data: educationLevelIds.map((educationLevelId) => ({ tutorProfileId, educationLevelId })),
      }),
    ]);
  },

  replaceServiceAreas(
    tutorProfileId: bigint,
    areas: Omit<Prisma.TutorServiceAreaCreateManyInput, 'tutorProfileId'>[],
  ) {
    return prisma.$transaction([
      prisma.tutorServiceArea.deleteMany({ where: { tutorProfileId } }),
      prisma.tutorServiceArea.createMany({
        data: areas.map((area) => ({ ...area, tutorProfileId })),
      }),
    ]);
  },

  replaceAvailabilities(
    tutorProfileId: bigint,
    rows: { dayOfWeek: number; startTime: Date; endTime: Date }[],
  ) {
    return prisma.$transaction([
      prisma.tutorAvailability.deleteMany({ where: { tutorProfileId } }),
      prisma.tutorAvailability.createMany({
        data: rows.map((row) => ({ ...row, tutorProfileId })),
      }),
    ]);
  },

  findBlockedDate(tutorProfileId: bigint, blockedDate: Date) {
    return prisma.tutorBlockedDate.findUnique({
      where: { tutorProfileId_blockedDate: { tutorProfileId, blockedDate } },
    });
  },

  findBlockedDateById(id: bigint) {
    return prisma.tutorBlockedDate.findUnique({ where: { id } });
  },

  createBlockedDate(data: Prisma.TutorBlockedDateUncheckedCreateInput) {
    return prisma.tutorBlockedDate.create({ data });
  },

  deleteBlockedDate(id: bigint) {
    return prisma.tutorBlockedDate.delete({ where: { id } });
  },

  /** Booking aktif tutor yang bersinggungan dengan rentang waktu tertentu */
  findBusyRanges(tutorProfileId: bigint, from: Date, to: Date) {
    return prisma.booking.findMany({
      where: {
        tutorProfileId,
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
        scheduledStartAt: { lt: to },
        scheduledEndAt: { gt: from },
      },
      select: { scheduledStartAt: true, scheduledEndAt: true },
    });
  },

  listByStatus(status: TutorVerificationStatus, skip: number, take: number) {
    const where = { verificationStatus: status };
    return prisma.$transaction([
      prisma.tutorProfile.findMany({
        where,
        include: tutorProfileInclude,
        orderBy: { updatedAt: 'asc' },
        skip,
        take,
      }),
      prisma.tutorProfile.count({ where }),
    ]);
  },

  /** Ulasan tutor = review bertipe tutor_booking pada booking milik tutor tsb (non-hidden) */
  async listReviews(tutorProfileId: bigint, skip: number, take: number) {
    const [rows, countRows] = await Promise.all([
      prisma.$queryRaw<
        {
          id: bigint;
          rating: number;
          comment: string | null;
          reply_text: string | null;
          replied_at: Date | null;
          created_at: Date;
          booking_id: bigint;
          reviewer_name: string;
          subject_name: string;
        }[]
      >(Prisma.sql`
        SELECT r.id, r.rating, r.comment, r.reply_text, r.replied_at, r.created_at,
               b.id AS booking_id, u.full_name AS reviewer_name, s.name AS subject_name
        FROM reviews r
        JOIN bookings b ON b.id = r.reviewable_id AND r.reviewable_type = 'tutor_booking'
        JOIN users u ON u.id = r.reviewer_user_id
        JOIN subjects s ON s.id = b.subject_id
        WHERE b.tutor_profile_id = ${tutorProfileId} AND r.is_hidden = FALSE
        ORDER BY r.created_at DESC
        LIMIT ${take} OFFSET ${skip}`),
      prisma.$queryRaw<{ total: bigint }[]>(Prisma.sql`
        SELECT COUNT(*) AS total
        FROM reviews r
        JOIN bookings b ON b.id = r.reviewable_id AND r.reviewable_type = 'tutor_booking'
        WHERE b.tutor_profile_id = ${tutorProfileId} AND r.is_hidden = FALSE`),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        rating: Number(row.rating),
        comment: row.comment,
        replyText: row.reply_text,
        repliedAt: row.replied_at,
        createdAt: row.created_at,
        bookingId: row.booking_id,
        subjectName: row.subject_name,
        reviewerName: row.reviewer_name,
      })),
      total: Number(countRows[0]?.total ?? 0),
    };
  },
};
