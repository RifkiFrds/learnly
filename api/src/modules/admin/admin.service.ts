import { Errors } from '../../lib/app-error';
import { toNumber } from '../../lib/money';
import { prisma } from '../../lib/prisma';
import { addHours } from '../../lib/time';
import { sweepExpired } from '../bookings/booking-maintenance';
import { STATUS_LABEL } from '../bookings/booking-status';
import { notificationService } from '../notifications/notification.service';
import { PAYMENT_STATUS_LABEL } from '../payments/payment.policy';
import { paymentRepository } from '../payments/payment.repository';
import { adminRepository } from './admin.repository';
import type { DashboardQuery, SuspendUserBody } from './admin.schema';

const DEFAULT_PERIOD_DAYS = 30;

export const adminService = {
  // FR-ADMIN-02
  async setUserStatus(adminId: bigint, userId: bigint, input: SuspendUserBody) {
    if (adminId === userId)
      throw Errors.businessRule('Kamu tidak bisa menangguhkan akunmu sendiri');
    const user = await adminRepository.findUser(userId);
    if (!user) throw Errors.notFound('Akun tidak ditemukan');
    if (user.role === 'admin')
      throw Errors.businessRule('Akun admin tidak bisa ditangguhkan di sini');
    if (user.status === input.status) return user;

    const updated = await adminRepository.setUserStatus(userId, input.status);
    await notificationService.notify(
      prisma,
      userId,
      input.status === 'suspended'
        ? {
            type: 'account_suspended',
            title: 'Akunmu ditangguhkan sementara',
            body: input.reason ?? 'Hubungi admin Learnly untuk informasi lebih lanjut.',
          }
        : {
            type: 'account_reactivated',
            title: 'Akunmu aktif kembali',
            body: 'Kamu sudah bisa memakai Learnly seperti biasa.',
          },
    );
    return updated;
  },

  // FR-ADMIN-05: ringkasan KPI (default 30 hari terakhir)
  async dashboardSummary(query: DashboardQuery) {
    await sweepExpired();
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from ? new Date(query.from) : addHours(to, -24 * DEFAULT_PERIOD_DAYS);
    const raw = await adminRepository.dashboard(from, to);

    const byStatus = Object.fromEntries(Object.keys(STATUS_LABEL).map((status) => [status, 0]));
    for (const row of raw.bookingsByStatus) byStatus[row.status] = row._count._all;
    const gmvBy = Object.fromEntries(
      raw.paidPayments.map((row) => [
        row.payableType,
        { amount: toNumber(row._sum.amount), count: row._count._all },
      ]),
    );
    const roles = Object.fromEntries(raw.usersByRole.map((row) => [row.role, row._count._all]));
    const courses = Object.fromEntries(
      raw.coursesByStatus.map((row) => [row.status, row._count._all]),
    );
    const bookingGmv = gmvBy.booking?.amount ?? 0;
    const courseGmv = gmvBy.course_enrollment?.amount ?? 0;

    return {
      period: { from, to },
      bookings: {
        total: Object.values(byStatus).reduce((sum, count) => sum + count, 0),
        byStatus,
        completed: byStatus.sesi_selesai,
      },
      // GMV = total pembayaran lunas (termasuk yang kemudian di-refund) pada periode
      gmv: { total: bookingGmv + courseGmv, bookings: bookingGmv, courses: courseGmv },
      platformRevenue: { bookingServiceFee: toNumber(raw.serviceFee) },
      refunds: {
        pendingCount: raw.pendingRefunds._count._all,
        pendingAmount: toNumber(raw.pendingRefunds._sum.refundAmount),
        refundedCount: raw.refunded._count._all,
        refundedAmount: toNumber(raw.refunded._sum.refundAmount),
      },
      payments: { awaitingVerification: raw.awaitingVerification },
      tutors: { active: raw.tutorsActive, pendingVerification: raw.tutorsPending },
      users: {
        students: roles.student ?? 0,
        parents: roles.parent ?? 0,
        tutors: roles.tutor ?? 0,
        admins: roles.admin ?? 0,
      },
      courses: {
        published: courses.published ?? 0,
        inReview: courses.in_review ?? 0,
        draft: courses.draft ?? 0,
      },
      topCourses: raw.topCourses.map((row) => ({
        courseId: row.id,
        title: row.title,
        slug: row.slug,
        enrollments: Number(row.enrollments),
        revenue: toNumber(row.revenue),
      })),
    };
  },

  // FR-ADMIN-06: daftar booking/pembayaran bermasalah + aksi yang disarankan
  async disputes() {
    await sweepExpired();
    const now = new Date();
    const [refunds, rejected, stuck] = await Promise.all([
      adminRepository.paymentsWithPendingRefund(),
      adminRepository.recentRejectedPayments(addHours(now, -24 * 30)),
      adminRepository.stuckBookings(addHours(now, -2), addHours(now, -6)),
    ]);
    const payables = await paymentRepository.loadPayables([...refunds, ...rejected]);
    const describePayable = (payment: { payableType: string; payableId: bigint }) => {
      if (payment.payableType === 'booking') {
        const booking = payables.bookings.get(payment.payableId);
        return booking
          ? {
              type: 'booking',
              id: booking.id,
              status: booking.status,
              statusLabel: STATUS_LABEL[booking.status],
              summary: `${booking.subject.name} — ${booking.learner.fullName} dengan ${booking.tutorProfile.user.fullName}`,
            }
          : null;
      }
      const enrollment = payables.enrollments.get(payment.payableId);
      return enrollment
        ? {
            type: 'course_enrollment',
            id: enrollment.id,
            summary: `${enrollment.course.title} — ${enrollment.learner.fullName}`,
          }
        : null;
    };

    const items = [
      ...refunds.map((payment) => ({
        type: payment.status === 'paid' ? 'refund_pending' : 'verify_before_refund',
        severity: 'high',
        title:
          payment.status === 'paid'
            ? `Refund Rp${toNumber(payment.refundAmount).toLocaleString('id-ID')} belum ditransfer`
            : 'Bukti bayar untuk booking yang sudah dibatalkan',
        description:
          payment.status === 'paid'
            ? 'Transfer manual ke pembayar, lalu catat lewat PATCH /admin/payments/:id/refund.'
            : 'Verifikasi dulu bukti transfernya (approve jika uang memang masuk), lalu proses refund.',
        payment: {
          id: payment.id,
          status: payment.status,
          statusLabel: PAYMENT_STATUS_LABEL[payment.status],
          amount: payment.amount,
          refundAmount: payment.refundAmount,
          payer: payment.user,
        },
        related: describePayable(payment),
        suggestedActions:
          payment.status === 'paid'
            ? [`PATCH /admin/payments/${payment.id}/refund`]
            : [`PATCH /admin/payments/${payment.id}/verify`],
      })),
      ...rejected.map((payment) => ({
        type: 'payment_rejected',
        severity: 'medium',
        title: 'Pembayaran ditolak — pantau jika pembayar mengajukan keberatan',
        description: `Alasan penolakan: ${payment.rejectionReason ?? '-'}`,
        payment: {
          id: payment.id,
          status: payment.status,
          statusLabel: PAYMENT_STATUS_LABEL[payment.status],
          amount: payment.amount,
          refundAmount: payment.refundAmount,
          payer: payment.user,
        },
        related: describePayable(payment),
        suggestedActions: ['Hubungi pembayar; jika perlu, override status booking terkait'],
      })),
      ...stuck.map((booking) => ({
        type:
          booking.status === 'sesi_berlangsung' ? 'session_not_checked_out' : 'session_not_started',
        severity: 'medium',
        title:
          booking.status === 'sesi_berlangsung'
            ? 'Sesi berjalan >6 jam tanpa check-out'
            : 'Jadwal sesi sudah lewat tapi belum dimulai',
        description: `Status sekarang "${STATUS_LABEL[booking.status]}". Konfirmasi ke tutor & siswa, lalu selesaikan/batalkan booking.`,
        payment: null,
        related: {
          type: 'booking',
          id: booking.id,
          status: booking.status,
          statusLabel: STATUS_LABEL[booking.status],
          summary: `${booking.subject.name} — ${booking.learner.fullName} dengan ${booking.tutorProfile.user.fullName}`,
          scheduledStartAt: booking.scheduledStartAt,
        },
        suggestedActions: [`PATCH /admin/bookings/${booking.id}/status`],
      })),
    ];

    return {
      summary: {
        total: items.length,
        refundPending: items.filter((item) => item.type === 'refund_pending').length,
        verifyBeforeRefund: items.filter((item) => item.type === 'verify_before_refund').length,
        paymentRejected: items.filter((item) => item.type === 'payment_rejected').length,
        stuckBookings: stuck.length,
      },
      items,
    };
  },
};
