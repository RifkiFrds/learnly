import { minutesToHhmm, toWibParts, wibDateTimeToUtc } from '../../lib/time';

// Logika murni ketersediaan & slot tutor (FR-TUTOR-04/05, FR-BOOK-06) — tanpa akses DB agar mudah dites.

export const SLOT_MINUTES = 30;

export interface TimeWindow {
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
}

export interface BusyRange {
  start: Date;
  end: Date;
}

export const rangesOverlap = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) =>
  aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();

/** Validasi daftar jadwal mingguan: jam kelipatan 30 menit, mulai < selesai, tidak tumpang tindih per hari. */
export function findAvailabilityProblem(windows: TimeWindow[]): string | null {
  for (const window of windows) {
    if (window.startMinutes >= window.endMinutes)
      return 'Jam mulai harus lebih awal dari jam selesai';
    if (window.startMinutes % SLOT_MINUTES || window.endMinutes % SLOT_MINUTES) {
      return 'Jam ketersediaan harus kelipatan 30 menit (mis. 08:00, 08:30)';
    }
  }
  const sorted = [...windows].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek || a.startMinutes - b.startMinutes,
  );
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (prev.dayOfWeek === cur.dayOfWeek && cur.startMinutes < prev.endMinutes) {
      return 'Ada jadwal yang tumpang tindih di hari yang sama';
    }
  }
  return null;
}

/** Apakah sesi [start, start+duration) seluruhnya berada di dalam salah satu jadwal mingguan (WIB)? */
export function fitsAvailability(start: Date, durationMinutes: number, windows: TimeWindow[]) {
  const startWib = toWibParts(start);
  const endMinutes = startWib.minutesOfDay + durationMinutes;
  if (endMinutes > 24 * 60) return false; // sesi tidak boleh melewati tengah malam
  return windows.some(
    (window) =>
      window.dayOfWeek === startWib.dayOfWeek &&
      window.startMinutes <= startWib.minutesOfDay &&
      endMinutes <= window.endMinutes,
  );
}

export interface Slot {
  startTime: string;
  endTime: string;
  startAt: Date;
  endAt: Date;
}

/**
 * Slot 30 menit yang masih kosong pada tanggal (WIB) tertentu:
 * jadwal mingguan hari itu − tanggal diblokir − booking aktif − waktu yang sudah lewat.
 */
export function computeAvailableSlots(params: {
  date: string;
  dayOfWeek: number;
  windows: TimeWindow[];
  isBlocked: boolean;
  busy: BusyRange[];
  now: Date;
}): Slot[] {
  if (params.isBlocked) return [];
  const slots: Slot[] = [];
  const windows = params.windows
    .filter((window) => window.dayOfWeek === params.dayOfWeek)
    .sort((a, b) => a.startMinutes - b.startMinutes);

  for (const window of windows) {
    for (let m = window.startMinutes; m + SLOT_MINUTES <= window.endMinutes; m += SLOT_MINUTES) {
      const startAt = wibDateTimeToUtc(params.date, minutesToHhmm(m));
      const endAt = new Date(startAt.getTime() + SLOT_MINUTES * 60_000);
      if (startAt <= params.now) continue;
      if (params.busy.some((range) => rangesOverlap(startAt, endAt, range.start, range.end))) {
        continue;
      }
      slots.push({
        startTime: minutesToHhmm(m),
        endTime: minutesToHhmm(m + SLOT_MINUTES),
        startAt,
        endAt,
      });
    }
  }
  return slots;
}
