import { roundRupiah } from '../../lib/money';
import type { PlatformSettings } from '../settings/settings.schema';

export interface BookingPrice {
  hourlyRate: number;
  durationMinutes: number;
  subtotal: number;
  serviceFee: number;
  total: number;
}

/**
 * FR-BOOK-03: total = (tarif per jam × durasi dalam jam) + biaya layanan (flat atau persentase).
 * Contoh docs/06-api-spec.md §14: 100.000 × 1,5 jam + 10.000 = 160.000.
 */
export function calculateBookingPrice(
  hourlyRate: number,
  durationMinutes: number,
  serviceFee: PlatformSettings['serviceFee'],
): BookingPrice {
  const subtotal = roundRupiah((hourlyRate * durationMinutes) / 60);
  const fee =
    serviceFee.type === 'flat'
      ? roundRupiah(serviceFee.value)
      : roundRupiah((subtotal * serviceFee.value) / 100);
  return { hourlyRate, durationMinutes, subtotal, serviceFee: fee, total: subtotal + fee };
}

export const MIN_DURATION_MINUTES = 60;
export const MAX_DURATION_MINUTES = 240;
export const DURATION_STEP_MINUTES = 30;

/** FR-BOOK-01: durasi kelipatan 30 menit, 1–4 jam. */
export function isValidDuration(minutes: number): boolean {
  return (
    Number.isInteger(minutes) &&
    minutes >= MIN_DURATION_MINUTES &&
    minutes <= MAX_DURATION_MINUTES &&
    minutes % DURATION_STEP_MINUTES === 0
  );
}
