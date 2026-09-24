import type { Prisma } from '@prisma/client';
import { Errors } from '../../lib/app-error';
import { buildMeta, toSkipTake } from '../../lib/pagination';
import { wibDateTimeToUtc } from '../../lib/time';
import type { Viewer } from '../bookings/booking.service';
import { reportRepository } from './report.repository';
import type { ListReportsQuery } from './report.schema';

const UNDERSTANDING_LABEL: Record<number, string> = {
  1: 'Belum paham',
  2: 'Mulai paham',
  3: 'Cukup paham',
  4: 'Paham',
  5: 'Sangat paham',
};

type ReportRow = Awaited<ReturnType<typeof reportRepository.findByBookingId>>;

function formatReport(report: NonNullable<ReportRow>) {
  const { booking } = report;
  return {
    id: report.id,
    bookingId: booking.id,
    materialsCovered: report.materialsCovered,
    understandingLevel: report.understandingLevel,
    understandingLabel: UNDERSTANDING_LABEL[report.understandingLevel],
    masteredSkills: report.masteredSkills,
    areasToImprove: report.areasToImprove,
    homeworkGiven: report.homeworkGiven,
    recommendationNotes: report.recommendationNotes,
    createdAt: report.createdAt,
    session: {
      mode: booking.mode,
      scheduledStartAt: booking.scheduledStartAt,
      durationMinutes: booking.durationMinutes,
      checkedInAt: booking.checkedInAt,
      checkedOutAt: booking.checkedOutAt,
    },
    learner: { id: booking.learner.id, fullName: booking.learner.fullName },
    subject: booking.subject,
    tutor: {
      tutorProfileId: booking.tutorProfile.id,
      fullName: booking.tutorProfile.user.fullName,
    },
  };
}

export const reportService = {
  // FR-REPORT-02/03: siswa/orang tua hanya melihat laporan learner miliknya
  async list(viewer: Viewer, query: ListReportsQuery) {
    const bookingWhere: Prisma.BookingWhereInput = {
      learner: { ownerUserId: viewer.userId },
      ...(query.learnerId ? { learnerId: query.learnerId } : {}),
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.tutorProfileId ? { tutorProfileId: query.tutorProfileId } : {}),
    };
    if (query.dateFrom || query.dateTo) {
      bookingWhere.scheduledStartAt = {
        ...(query.dateFrom ? { gte: wibDateTimeToUtc(query.dateFrom, '00:00') } : {}),
        ...(query.dateTo
          ? { lt: new Date(wibDateTimeToUtc(query.dateTo, '00:00').getTime() + 86_400_000) }
          : {}),
      };
    }
    const { skip, take } = toSkipTake(query);
    const [rows, total] = await reportRepository.list({ booking: bookingWhere }, skip, take);
    return { items: rows.map(formatReport), meta: buildMeta(query.page, query.limit, total) };
  },

  // Pemilik learner, tutor pembuat laporan, atau admin
  async getByBookingId(viewer: Viewer, bookingId: bigint) {
    const report = await reportRepository.findByBookingId(bookingId);
    if (!report) throw Errors.notFound('Laporan untuk booking ini belum ada');
    const { booking } = report;
    const allowed =
      viewer.role === 'admin' ||
      booking.learner.ownerUserId === viewer.userId ||
      booking.tutorProfile.userId === viewer.userId;
    if (!allowed) throw Errors.forbidden('Laporan ini bukan milikmu');
    return formatReport(report);
  },
};
