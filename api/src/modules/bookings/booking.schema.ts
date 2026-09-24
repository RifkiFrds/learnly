import { z } from 'zod';
import { paginationQuery } from '../../lib/pagination';
import { idSchema } from '../../middlewares/validate';
import { TRAVEL_STATUSES } from './booking-status';

const BOOKING_STATUSES = [
  'pending_confirmation',
  'rejected',
  'menunggu_pembayaran',
  'dikonfirmasi',
  'tutor_bersiap',
  'tutor_dalam_perjalanan',
  'tutor_tiba',
  'sesi_berlangsung',
  'sesi_selesai',
  'dibatalkan',
] as const;

// Contoh payload: docs/06-api-spec.md §14
export const createBookingBody = z
  .object({
    learnerId: idSchema.optional(), // student mandiri boleh kosong → otomatis profil dirinya
    tutorProfileId: idSchema,
    subjectId: idSchema,
    mode: z.enum(['online', 'tatap_muka']),
    scheduledStartAt: z.iso.datetime({
      offset: true,
      error: 'format ISO 8601 dengan zona waktu, mis. 2026-10-01T09:00:00+07:00',
    }),
    durationMinutes: z.number().int(),
    addressId: idSchema.optional(),
  })
  .refine((body) => body.mode !== 'tatap_muka' || body.addressId, {
    message: 'Alamat wajib diisi untuk sesi tatap muka',
    path: ['addressId'],
  });
export type CreateBookingBody = z.infer<typeof createBookingBody>;

export const listBookingsQuery = z.object({
  // satu atau beberapa status dipisah koma: ?status=dikonfirmasi,tutor_bersiap
  status: z
    .string()
    .optional()
    .transform((value) => (value ? value.split(',').map((item) => item.trim()) : undefined))
    .pipe(z.array(z.enum(BOOKING_STATUSES)).optional()),
  mode: z.enum(['online', 'tatap_muka']).optional(),
  learnerId: idSchema.optional(),
  ...paginationQuery,
});
export type ListBookingsQuery = z.infer<typeof listBookingsQuery>;

export const respondBookingBody = z
  .object({
    action: z.enum(['accept', 'reject']),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((body) => body.action === 'accept' || body.reason, {
    message: 'Alasan penolakan wajib diisi',
    path: ['reason'],
  });
export type RespondBookingBody = z.infer<typeof respondBookingBody>;

export const updateTravelStatusBody = z.object({ status: z.enum(TRAVEL_STATUSES) });
export type UpdateTravelStatusBody = z.infer<typeof updateTravelStatusBody>;

export const locationPingBody = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type LocationPingBody = z.infer<typeof locationPingBody>;

export const checkinBody = z.object({ qrToken: z.string().trim().min(10).max(191).optional() });
export type CheckinBody = z.infer<typeof checkinBody>;

// FR-REPORT-01: laporan perkembangan wajib saat check-out
export const checkoutSessionBody = z.object({
  materialsCovered: z.string().trim().min(10, 'jelaskan materi minimal 10 karakter').max(5000),
  understandingLevel: z.number().int().min(1).max(5),
  masteredSkills: z.string().trim().max(5000).optional(),
  areasToImprove: z.string().trim().max(5000).optional(),
  homeworkGiven: z.string().trim().max(5000).optional(),
  recommendationNotes: z.string().trim().max(5000).optional(),
});
export type CheckoutSessionBody = z.infer<typeof checkoutSessionBody>;

export const cancelBookingBody = z.object({
  reason: z.string().trim().min(5, 'tuliskan alasan minimal 5 karakter').max(500),
});
export type CancelBookingBody = z.infer<typeof cancelBookingBody>;

// FR-ONLINE-02
export const meetingLinkBody = z.object({
  meetingLink: z.url({ protocol: /^https$/, error: 'link meeting harus URL https' }).max(500),
});
export type MeetingLinkBody = z.infer<typeof meetingLinkBody>;

export const adminOverrideStatusBody = z.object({
  status: z.enum(BOOKING_STATUSES),
  reason: z.string().trim().min(5).max(500),
});
export type AdminOverrideStatusBody = z.infer<typeof adminOverrideStatusBody>;
