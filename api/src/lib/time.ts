// Semua jadwal tutor (availability, slot) dinyatakan dalam WIB (UTC+7) — NFR-COMPLY-02.
// Server bisa berjalan di timezone apa pun (Railway = UTC), jadi konversi dilakukan eksplisit.
export const WIB_OFFSET_MINUTES = 7 * 60;
export const APP_TIMEZONE = 'Asia/Jakarta';

const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-10-01" + "09:30" (WIB) → Date UTC */
export function wibDateTimeToUtc(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - WIB_OFFSET_MINUTES * 60_000);
}

/** Date UTC → bagian tanggal & jam dalam WIB */
export function toWibParts(date: Date) {
  const shifted = new Date(date.getTime() + WIB_OFFSET_MINUTES * 60_000);
  const minutesOfDay = shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
  return {
    date: `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`,
    dayOfWeek: shifted.getUTCDay(),
    minutesOfDay,
    time: `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`,
  };
}

/** Kolom MySQL TIME dibaca Prisma sebagai Date 1970-01-01THH:MM:SSZ → menit sejak 00:00 */
export function timeColumnToMinutes(value: Date): number {
  return value.getUTCHours() * 60 + value.getUTCMinutes();
}

/** "09:30" → Date untuk kolom TIME */
export function hhmmToTimeColumn(value: string): Date {
  return new Date(`1970-01-01T${value}:00.000Z`);
}

export function minutesToHhmm(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** Kolom MySQL DATE → "YYYY-MM-DD" */
export function dateColumnToString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** Kolom DATE nullable → "YYYY-MM-DD" | null (untuk response API) */
export function dateOnly(value: Date | null | undefined): string | null {
  return value ? dateColumnToString(value) : null;
}

/** "YYYY-MM-DD" → Date untuk kolom DATE */
export function stringToDateColumn(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function dayOfWeekOf(date: string): number {
  return stringToDateColumn(date).getUTCDay();
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3_600_000);
}
