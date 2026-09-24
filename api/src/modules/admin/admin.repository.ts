import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { publicUserSelect } from '../auth/auth.repository';
import { bookingInclude } from '../bookings/booking.repository';

export const adminRepository = {
  findUser(id: bigint) {
    return prisma.user.findUnique({ where: { id }, select: publicUserSelect });
  },

  /** Suspend: status berubah + semua refresh token dicabut agar sesi aktif langsung berakhir. */
  setUserStatus(id: bigint, status: 'active' | 'suspended') {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: { status },
        select: publicUserSelect,
      });
      if (status === 'suspended') {
        await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      return user;
    });
  },

  // ---- Dashboard (FR-ADMIN-05) — query langsung ke DB (NFR-OBS-02)
  async dashboard(from: Date, to: Date) {
    const inPeriod = { gte: from, lt: to };
    const [
      bookingsByStatus,
      paidPayments,
      refunded,
      pendingRefunds,
      awaitingVerification,
      tutorsActive,
      tutorsPending,
      usersByRole,
      coursesByStatus,
      serviceFeeRows,
      topCourses,
    ] = await Promise.all([
      prisma.booking.groupBy({
        by: ['status'],
        where: { createdAt: inPeriod },
        _count: { _all: true },
      }),
      prisma.payment.groupBy({
        by: ['payableType'],
        where: { status: { in: ['paid', 'refunded'] }, paidAt: inPeriod },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.payment.aggregate({
        where: { status: 'refunded', refundedAt: inPeriod },
        _sum: { refundAmount: true },
        _count: { _all: true },
      }),
      prisma.payment.aggregate({
        where: { status: { in: ['paid', 'menunggu_verifikasi'] }, refundAmount: { gt: 0 } },
        _sum: { refundAmount: true },
        _count: { _all: true },
      }),
      prisma.payment.count({ where: { status: 'menunggu_verifikasi' } }),
      prisma.tutorProfile.count({
        where: { verificationStatus: 'verified', user: { status: 'active' } },
      }),
      prisma.tutorProfile.count({ where: { verificationStatus: 'pending_verification' } }),
      prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      prisma.course.groupBy({ by: ['status'], _count: { _all: true } }),
      // Pendapatan platform = biaya layanan booking yang lunas pada periode
      prisma.$queryRaw<{ total: Prisma.Decimal | null }[]>(Prisma.sql`
        SELECT SUM(b.service_fee) AS total
        FROM payments p JOIN bookings b ON b.id = p.payable_id AND p.payable_type = 'booking'
        WHERE p.status = 'paid' AND p.paid_at >= ${from} AND p.paid_at < ${to}`),
      // Kursus terlaris: jumlah enrollment dengan akses (gratis / lunas) pada periode
      prisma.$queryRaw<
        {
          id: bigint;
          title: string;
          slug: string;
          enrollments: bigint;
          revenue: Prisma.Decimal | null;
        }[]
      >(
        Prisma.sql`
        SELECT c.id, c.title, c.slug, COUNT(e.id) AS enrollments,
               SUM(CASE WHEN p.status = 'paid' THEN p.amount ELSE 0 END) AS revenue
        FROM course_enrollments e
        JOIN courses c ON c.id = e.course_id
        LEFT JOIN payments p ON p.payable_type = 'course_enrollment' AND p.payable_id = e.id AND p.status = 'paid'
        WHERE e.enrolled_at >= ${from} AND e.enrolled_at < ${to} AND (c.is_free = TRUE OR p.id IS NOT NULL)
        GROUP BY c.id, c.title, c.slug
        ORDER BY enrollments DESC, revenue DESC
        LIMIT 5`,
      ),
    ]);
    return {
      bookingsByStatus,
      paidPayments,
      refunded,
      pendingRefunds,
      awaitingVerification,
      tutorsActive,
      tutorsPending,
      usersByRole,
      coursesByStatus,
      serviceFee: serviceFeeRows[0]?.total ?? null,
      topCourses,
    };
  },

  // ---- Dispute (FR-ADMIN-06)
  paymentsWithPendingRefund() {
    return prisma.payment.findMany({
      where: { status: { in: ['paid', 'menunggu_verifikasi'] }, refundAmount: { gt: 0 } },
      include: { user: { select: { id: true, fullName: true, email: true, phone: true } } },
      orderBy: { updatedAt: 'asc' },
    });
  },

  recentRejectedPayments(since: Date) {
    return prisma.payment.findMany({
      where: { status: 'ditolak', verifiedAt: { gte: since } },
      include: { user: { select: { id: true, fullName: true, email: true, phone: true } } },
      orderBy: { verifiedAt: 'desc' },
      take: 50,
    });
  },

  stuckBookings(notStartedBefore: Date, runningSince: Date) {
    return prisma.booking.findMany({
      where: {
        OR: [
          {
            status: {
              in: ['dikonfirmasi', 'tutor_bersiap', 'tutor_dalam_perjalanan', 'tutor_tiba'],
            },
            scheduledEndAt: { lt: notStartedBefore },
          },
          { status: 'sesi_berlangsung', checkedInAt: { lt: runningSince } },
        ],
      },
      include: bookingInclude,
      orderBy: { scheduledStartAt: 'asc' },
      take: 100,
    });
  },
};
