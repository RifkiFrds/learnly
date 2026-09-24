import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export const reportInclude = {
  booking: {
    select: {
      id: true,
      mode: true,
      scheduledStartAt: true,
      durationMinutes: true,
      checkedInAt: true,
      checkedOutAt: true,
      learner: { select: { id: true, fullName: true, ownerUserId: true } },
      subject: { select: { id: true, name: true } },
      tutorProfile: { select: { id: true, userId: true, user: { select: { fullName: true } } } },
    },
  },
} satisfies Prisma.ProgressReportInclude;

export const reportRepository = {
  list(where: Prisma.ProgressReportWhereInput, skip: number, take: number) {
    return prisma.$transaction([
      prisma.progressReport.findMany({
        where,
        include: reportInclude,
        orderBy: { booking: { scheduledStartAt: 'desc' } },
        skip,
        take,
      }),
      prisma.progressReport.count({ where }),
    ]);
  },

  findByBookingId(bookingId: bigint) {
    return prisma.progressReport.findUnique({ where: { bookingId }, include: reportInclude });
  },
};
