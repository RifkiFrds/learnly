import { describe, expect, it } from 'vitest';
import { wibDateTimeToUtc } from '../../lib/time';
import { computeAvailableSlots, findAvailabilityProblem, fitsAvailability } from './availability';

// 2026-10-05 adalah hari Senin (dayOfWeek = 1)
const DATE = '2026-10-05';
const monday = [{ dayOfWeek: 1, startMinutes: 8 * 60, endMinutes: 12 * 60 }];

describe('validasi jadwal mingguan (FR-TUTOR-04)', () => {
  it('menolak jadwal tumpang tindih di hari yang sama', () => {
    expect(
      findAvailabilityProblem([
        { dayOfWeek: 1, startMinutes: 480, endMinutes: 720 },
        { dayOfWeek: 1, startMinutes: 660, endMinutes: 780 },
      ]),
    ).toMatch(/tumpang tindih/);
  });

  it('menolak jam yang bukan kelipatan 30 menit & jam mulai ≥ selesai', () => {
    expect(findAvailabilityProblem([{ dayOfWeek: 2, startMinutes: 485, endMinutes: 600 }])).toMatch(
      /30 menit/,
    );
    expect(findAvailabilityProblem([{ dayOfWeek: 2, startMinutes: 600, endMinutes: 600 }])).toMatch(
      /lebih awal/,
    );
  });

  it('menerima jadwal valid (hari berbeda boleh jam sama)', () => {
    expect(
      findAvailabilityProblem([
        { dayOfWeek: 1, startMinutes: 480, endMinutes: 720 },
        { dayOfWeek: 2, startMinutes: 480, endMinutes: 720 },
      ]),
    ).toBeNull();
  });
});

describe('slot tersedia (FR-TUTOR-05, FR-BOOK-06)', () => {
  const now = new Date('2026-10-01T00:00:00Z');

  it('membagi jadwal menjadi slot 30 menit dalam WIB', () => {
    const slots = computeAvailableSlots({
      date: DATE,
      dayOfWeek: 1,
      windows: monday,
      isBlocked: false,
      busy: [],
      now,
    });
    expect(slots).toHaveLength(8);
    expect(slots[0].startTime).toBe('08:00');
    expect(slots[0].startAt.toISOString()).toBe('2026-10-05T01:00:00.000Z'); // 08:00 WIB = 01:00 UTC
    expect(slots.at(-1)?.endTime).toBe('12:00');
  });

  it('booking aktif mengurangi slot', () => {
    const busy = [{ start: wibDateTimeToUtc(DATE, '09:00'), end: wibDateTimeToUtc(DATE, '10:30') }];
    const slots = computeAvailableSlots({
      date: DATE,
      dayOfWeek: 1,
      windows: monday,
      isBlocked: false,
      busy,
      now,
    });
    expect(slots.map((slot) => slot.startTime)).toEqual([
      '08:00',
      '08:30',
      '10:30',
      '11:00',
      '11:30',
    ]);
  });

  it('tanggal diblokir → tidak ada slot', () => {
    expect(
      computeAvailableSlots({
        date: DATE,
        dayOfWeek: 1,
        windows: monday,
        isBlocked: true,
        busy: [],
        now,
      }),
    ).toEqual([]);
  });

  it('slot yang sudah lewat tidak ditampilkan', () => {
    const slots = computeAvailableSlots({
      date: DATE,
      dayOfWeek: 1,
      windows: monday,
      isBlocked: false,
      busy: [],
      now: wibDateTimeToUtc(DATE, '10:00'),
    });
    expect(slots[0].startTime).toBe('10:30');
  });
});

describe('booking harus muat di dalam jadwal', () => {
  it('sesi 90 menit mulai 10:30 muat (selesai tepat 12:00)', () => {
    expect(fitsAvailability(wibDateTimeToUtc(DATE, '10:30'), 90, monday)).toBe(true);
  });
  it('sesi melewati jam selesai ditolak', () => {
    expect(fitsAvailability(wibDateTimeToUtc(DATE, '11:00'), 90, monday)).toBe(false);
  });
  it('hari tanpa jadwal ditolak', () => {
    expect(fitsAvailability(wibDateTimeToUtc('2026-10-06', '09:00'), 60, monday)).toBe(false);
  });
});
