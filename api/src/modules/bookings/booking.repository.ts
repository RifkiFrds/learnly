import { Prisma, type BookingStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ACTIVE_BOOKING_STATUSES } from '../tutors/tutor.repository';

type Db = Prisma.TransactionClient | typeof prisma;

export const bookingInclude = {
  learner: {
    select: {
      id: true,
      fullName: true,
      ownerUserId: true,
      owner: { select: { id: true, fullName: true, phone: true, email: true } },
    },
  },
  tutorProfile: {
    select: {
      id: true,
      userId: true,
      user: { select: { id: true, fullName: true, phone: true } },
    },
  },
  subject: { select: { id: true, name: true, slug: true } },
  address: true,
  progressReport: { select: { id: true, createdAt: true } },
} satisfies Prisma.BookingInclude;

export type BookingWithRelations = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

export const bookingRepository = {
  /** Kunci baris tutor → booking untuk tutor yang sama diproses berurutan (cegah double-booking) */
  async lockTutor(tx: Prisma.TransactionClient, tutorProfileId: bigint) {
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM tutor_profiles WHERE id = ${tutorProfileId} FOR UPDATE`,
    );
  },

  countConflicts(db: Db, tutorProfileId: bigint, start: Date, end: Date, excludeId?: bigint) {
    return db.booking.count({
      where: {
        tutorProfileId,
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
        scheduledStartAt: { lt: end },
        scheduledEndAt: { gt: start },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  },

  create(tx: Prisma.TransactionClient, data: Prisma.BookingUncheckedCreateInput) {
    return tx.booking.create({ data, include: bookingInclude });
  },

  findById(db: Db, id: bigint) {
    return db.booking.findUnique({ where: { id }, include: bookingInclude });
  },

  findHistory(bookingId: bigint) {
    return prisma.bookingStatusHistory.findMany({
      where: { bookingId },
      orderBy: [{ changedAt: 'asc' }, { id: 'asc' }],
    });
  },

  findLatestLocation(bookingId: bigint) {
    return prisma.tutorLocation.findFirst({
      where: { bookingId },
      orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }],
    });
  },

  list(where: Prisma.BookingWhereInput, skip: number, take: number) {
    return prisma.$transaction([
      prisma.booking.findMany({
        where,
        include: bookingInclude,
        orderBy: [{ scheduledStartAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      prisma.booking.count({ where }),
    ]);
  },

  update(db: Db, id: bigint, data: Prisma.BookingUncheckedUpdateInput) {
    return db.booking.update({ where: { id }, data, include: bookingInclude });
  },

  /** Update bersyarat status → aman dari race (dua request mengubah status bersamaan) */
  updateIfStatus(
    db: Db,
    id: bigint,
    expected: BookingStatus,
    data: Prisma.BookingUncheckedUpdateInput,
  ) {
    return db.booking.updateMany({ where: { id, status: expected }, data });
  },

  addHistory(db: Db, bookingId: bigint, status: BookingStatus, changedByUserId: bigint | null) {
    return db.bookingStatusHistory.create({ data: { bookingId, status, changedByUserId } });
  },

  addLocation(bookingId: bigint, latitude: number, longitude: number) {
    return prisma.tutorLocation.create({ data: { bookingId, latitude, longitude } });
  },

  findStalePending(createdBefore: Date, now: Date) {
    return prisma.booking.findMany({
      where: {
        status: 'pending_confirmation',
        OR: [{ createdAt: { lt: createdBefore } }, { scheduledStartAt: { lte: now } }],
      },
      include: bookingInclude,
    });
  },

  findUnpaidPastStart(now: Date) {
    return prisma.booking.findMany({
      where: { status: 'menunggu_pembayaran', scheduledStartAt: { lte: now } },
      include: bookingInclude,
    });
  },

  createProgressReport(
    tx: Prisma.TransactionClient,
    data: Prisma.ProgressReportUncheckedCreateInput,
  ) {
    return tx.progressReport.create({ data });
  },
};
