import type { Booking, PublicSettings } from '@/lib/types';

/** Sama dengan perhitungan backend (payment.policy): flat atau persen dari subtotal, dibulatkan ke rupiah. */
export function computeServiceFee(subtotal: number, fee: PublicSettings['serviceFee']): number {
  return Math.round(fee.type === 'flat' ? fee.value : (subtotal * fee.value) / 100);
}

export function costBreakdown(hourlyRate: number, durationMinutes: number, fee: PublicSettings['serviceFee']) {
  const subtotal = Math.round((hourlyRate * durationMinutes) / 60);
  const serviceFee = computeServiceFee(subtotal, fee);
  return { subtotal, serviceFee, total: subtotal + serviceFee };
}

const MONEY_RECEIVED = ['menunggu_verifikasi', 'paid'];

/**
 * Pratinjau konsekuensi pembatalan — cermin computeRefundAmount di backend:
 * pembatalan tutor → refund penuh; siswa ≥ freeCancelHours sebelum sesi → penuh; di bawahnya → lateRefundPercent.
 */
export function cancellationPreview(booking: Booking, by: 'student' | 'tutor', policy: PublicSettings['cancellationPolicy']) {
  const paid = booking.payment && MONEY_RECEIVED.includes(booking.payment.status) ? booking.payment.amount : 0;
  const hoursBefore = (new Date(booking.scheduledStartAt).getTime() - Date.now()) / 3_600_000;
  const free = by === 'tutor' || hoursBefore >= policy.freeCancelHours;
  const refund = paid ? Math.round(free ? paid : (paid * policy.lateRefundPercent) / 100) : 0;
  return { paid, refund, free, hoursBefore };
}

/** Isi QR = JSON {bookingId, qrToken}. Tutor boleh juga menempel token mentah. */
export function parseQrPayload(raw: string): { bookingId?: number; qrToken: string } | null {
  const text = raw.trim();
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as { bookingId?: number; qrToken?: string };
    if (parsed && typeof parsed.qrToken === 'string') return { bookingId: Number(parsed.bookingId), qrToken: parsed.qrToken };
  } catch {
    // bukan JSON → anggap token mentah
  }
  return text.length >= 10 ? { qrToken: text } : null;
}

export const UNDERSTANDING_LABEL: Record<number, string> = {
  1: 'Belum paham',
  2: 'Mulai paham',
  3: 'Cukup paham',
  4: 'Paham',
  5: 'Sangat paham',
};
