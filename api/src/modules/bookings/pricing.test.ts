import { describe, expect, it } from 'vitest';
import { calculateBookingPrice, isValidDuration } from './pricing';

describe('kalkulasi biaya booking (FR-BOOK-03)', () => {
  it('sesuai contoh API spec §14: 100.000/jam × 90 menit + flat 10.000 = 160.000', () => {
    expect(calculateBookingPrice(100_000, 90, { type: 'flat', value: 10_000 })).toEqual({
      hourlyRate: 100_000,
      durationMinutes: 90,
      subtotal: 150_000,
      serviceFee: 10_000,
      total: 160_000,
    });
  });

  it('biaya layanan persentase dihitung dari subtotal', () => {
    const price = calculateBookingPrice(120_000, 120, { type: 'percent', value: 5 });
    expect(price.subtotal).toBe(240_000);
    expect(price.serviceFee).toBe(12_000);
    expect(price.total).toBe(252_000);
  });

  it('pembulatan ke rupiah penuh', () => {
    const price = calculateBookingPrice(75_555, 90, { type: 'percent', value: 7.5 });
    expect(Number.isInteger(price.subtotal)).toBe(true);
    expect(Number.isInteger(price.serviceFee)).toBe(true);
    expect(price.total).toBe(price.subtotal + price.serviceFee);
  });

  it('biaya layanan 0 → total = subtotal', () => {
    expect(calculateBookingPrice(90_000, 60, { type: 'flat', value: 0 }).total).toBe(90_000);
  });
});

describe('validasi durasi (FR-BOOK-01)', () => {
  it.each([60, 90, 120, 240])('%i menit valid', (minutes) => {
    expect(isValidDuration(minutes)).toBe(true);
  });
  it.each([0, 30, 45, 75, 270, 61.5])('%s menit tidak valid', (minutes) => {
    expect(isValidDuration(minutes)).toBe(false);
  });
});
