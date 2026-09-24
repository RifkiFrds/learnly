import { z } from 'zod';
import { paginationQuery } from '../../lib/pagination';
import { dateString, idSchema } from '../../middlewares/validate';

// FR-REPORT-03: filter per anak, mapel, tutor, rentang tanggal (tanggal sesi, WIB)
export const listReportsQuery = z.object({
  learnerId: idSchema.optional(),
  subjectId: idSchema.optional(),
  tutorProfileId: idSchema.optional(),
  dateFrom: dateString.optional(),
  dateTo: dateString.optional(),
  ...paginationQuery,
});
export type ListReportsQuery = z.infer<typeof listReportsQuery>;

export const bookingIdParam = z.object({ bookingId: idSchema });
export type BookingIdParam = z.infer<typeof bookingIdParam>;
