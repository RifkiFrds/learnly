import type { PaymentStatus } from '@prisma/client';
import { roundRupiah } from '../../lib/money';

// Aturan murni pembayaran manual — tanpa DB agar mudah dites (docs/09-coding-standards.md §5).

export type VerifyAction = 'approve' | 'reject';

export type VerifyDecision =
  | { kind: 'apply'; nextStatus: 'paid' | 'ditolak' }
  | { kind: 'noop' } // aksi diulang pada status yang sama → idempotent (NFR-AVAIL-02)
  | { kind: 'conflict'; message: string };

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  menunggu_pembayaran: 'Menunggu pembayaran',
  menunggu_verifikasi: 'Menunggu verifikasi admin',
  paid: 'Lunas',
  ditolak: 'Ditolak',
  expired: 'Kedaluwarsa',
  refunded: 'Dana dikembalikan',
};

/**
 * FR-PAY-03/08 + NFR-AVAIL-02: admin hanya bisa memverifikasi pembayaran berstatus
 * `menunggu_verifikasi`. Mengulang aksi yang sama pada hasil akhirnya tidak mengubah apa pun.
 */
export function decideVerification(current: PaymentStatus, action: VerifyAction): VerifyDecision {
  if (current === 'menunggu_verifikasi') {
    return { kind: 'apply', nextStatus: action === 'approve' ? 'paid' : 'ditolak' };
  }
  if (
    (current === 'paid' && action === 'approve') ||
    (current === 'ditolak' && action === 'reject')
  ) {
    return { kind: 'noop' };
  }
  if (current === 'menunggu_pembayaran') {
    return {
      kind: 'conflict',
      message: 'Bukti transfer belum diunggah, pembayaran belum bisa diverifikasi',
    };
  }
  return {
    kind: 'conflict',
    message: `Pembayaran sudah berstatus "${PAYMENT_STATUS_LABEL[current]}" sehingga tidak bisa di-${action === 'approve' ? 'approve' : 'reject'}`,
  };
}

/** Status pembayaran yang uangnya (mungkin) sudah diterima → perlu refund bila dibatalkan */
export const MONEY_RECEIVED_STATUSES: PaymentStatus[] = ['menunggu_verifikasi', 'paid'];

/**
 * FR-PAY-06: pembatalan oleh siswa ≥ freeCancelHours sebelum jadwal → refund penuh;
 * < freeCancelHours → refund lateRefundPercent%. Pembatalan tutor/sistem → refund penuh.
 */
export function computeRefundAmount(params: {
  amount: number;
  cancelledBy: 'student' | 'tutor' | 'system';
  hoursBeforeStart: number;
  freeCancelHours: number;
  lateRefundPercent: number;
}): number {
  if (params.cancelledBy !== 'student') return roundRupiah(params.amount);
  if (params.hoursBeforeStart >= params.freeCancelHours) return roundRupiah(params.amount);
  return roundRupiah((params.amount * params.lateRefundPercent) / 100);
}
