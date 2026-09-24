import { z } from 'zod';
import { paginationQuery } from '../../lib/pagination';

const PAYMENT_STATUSES = [
  'menunggu_pembayaran',
  'menunggu_verifikasi',
  'paid',
  'ditolak',
  'expired',
  'refunded',
] as const;

export const listPaymentsQuery = z.object({
  status: z.enum(PAYMENT_STATUSES).optional(),
  payableType: z.enum(['booking', 'course_enrollment']).optional(),
  ...paginationQuery,
});
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuery>;

export const adminPaymentsQuery = listPaymentsQuery.extend({
  status: z.enum(PAYMENT_STATUSES).default('menunggu_verifikasi'),
});
export type AdminPaymentsQuery = z.infer<typeof adminPaymentsQuery>;

export const verifyPaymentBody = z
  .object({
    action: z.enum(['approve', 'reject']),
    rejectionReason: z.string().trim().min(5).max(500).optional(),
  })
  .refine((body) => body.action === 'approve' || body.rejectionReason, {
    message: 'Alasan penolakan wajib diisi',
    path: ['rejectionReason'],
  });
export type VerifyPaymentBody = z.infer<typeof verifyPaymentBody>;

export const refundPaymentBody = z.object({
  refundAmount: z.number().int().min(0).optional(),
  note: z.string().trim().min(5, 'isi catatan/nomor referensi transfer refund').max(500),
});
export type RefundPaymentBody = z.infer<typeof refundPaymentBody>;

export const earningsQuery = z
  .object({
    from: z.iso.datetime({ offset: true }).optional(),
    to: z.iso.datetime({ offset: true }).optional(),
  })
  .refine((query) => !query.from || !query.to || new Date(query.from) < new Date(query.to), {
    message: '`from` harus sebelum `to`',
    path: ['from'],
  });
export type EarningsQuery = z.infer<typeof earningsQuery>;
