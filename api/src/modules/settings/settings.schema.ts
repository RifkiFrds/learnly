import { z } from 'zod';

// Parameter bisnis yang bisa diatur admin (FR-ADMIN-07), disimpan di tabel platform_settings.
export const settingsSchema = z.object({
  serviceFee: z.object({
    type: z.enum(['flat', 'percent']),
    value: z.number().min(0),
  }),
  cancellationPolicy: z.object({
    /** Batal ≥ N jam sebelum jadwal → refund penuh (FR-PAY-06) */
    freeCancelHours: z.number().int().min(0).max(168),
    /** Persentase refund bila siswa batal < freeCancelHours sebelum jadwal */
    lateRefundPercent: z.number().min(0).max(100),
  }),
  /** Batas waktu tutor merespons booking sebelum auto-cancel (FR-BOOK-04) */
  bookingResponseHours: z.number().int().min(1).max(168),
  /** Batas waktu membayar sebelum pembayaran expired (FR-PAY-04) */
  paymentWindowHours: z.number().int().min(1).max(168),
  defaultPassingGrade: z.number().min(0).max(100),
  /** Review bisa diedit sampai N hari setelah dibuat (FR-REVIEW-02) */
  reviewEditDays: z.number().int().min(0).max(90),
  /** Link meeting tampil ke siswa mulai N jam sebelum sesi (FR-ONLINE-02) */
  meetingLinkVisibleHours: z.number().int().min(0).max(168),
  qrisImageUrl: z.url().nullable(),
  bankTransfer: z
    .object({
      bankName: z.string().min(2).max(50),
      accountNumber: z.string().min(4).max(30),
      accountName: z.string().min(2).max(100),
    })
    .nullable(),
});

export type PlatformSettings = z.infer<typeof settingsSchema>;

export const updateSettingsBody = settingsSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Minimal satu pengaturan harus dikirim');

export const DEFAULT_SETTINGS: PlatformSettings = {
  serviceFee: { type: 'flat', value: 10000 },
  cancellationPolicy: { freeCancelHours: 24, lateRefundPercent: 50 },
  bookingResponseHours: 24,
  paymentWindowHours: 24,
  defaultPassingGrade: 70,
  reviewEditDays: 7,
  meetingLinkVisibleHours: 24,
  qrisImageUrl: null,
  bankTransfer: null,
};
