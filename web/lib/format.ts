// Format IDR & tanggal/jam WIB (NFR-COMPLY-02). Semua timestamp dari API berupa ISO UTC.

const TZ = 'Asia/Jakarta';

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

/** 150000 → "Rp150.000" */
export function formatRupiah(value: number | null | undefined): string {
  return rupiah.format(value ?? 0).replace(/\s/g, '');
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  })
    .format(new Date(iso))
    .replace(/\./g, ':')
    .concat(' WIB');
}

/** "Sen, 28 Sep 2026" */
export function formatDate(iso: string | null | undefined, withWeekday = true): string {
  if (!iso) return '-';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00+07:00`) : new Date(iso);
  return new Intl.DateTimeFormat('id-ID', {
    ...(withWeekday ? { weekday: 'short' } : {}),
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: TZ,
  }).format(date);
}

export function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return '-';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00+07:00`) : new Date(iso);
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ }).format(date);
}

/** "09:00" (WIB) */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ })
    .format(new Date(iso))
    .replace('.', ':');
}

/** "09:00–10:30 WIB" */
export function formatTimeRange(startIso: string, endIso: string): string {
  return `${formatTime(startIso)}–${formatTime(endIso)} WIB`;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} menit`;
  return rest ? `${hours} jam ${rest} menit` : `${hours} jam`;
}

/** "3 menit lalu", "2 jam lalu", "kemarin" */
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'kemarin';
  if (days < 30) return `${days} hari lalu`;
  return formatDate(iso, false);
}

/** Tanggal hari ini (WIB) "YYYY-MM-DD" + offset hari */
export function wibDateString(offsetDays = 0): string {
  const shifted = new Date(Date.now() + 7 * 3_600_000 + offsetDays * 86_400_000);
  return shifted.toISOString().slice(0, 10);
}

export const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export const TEACHING_MODE_LABEL = {
  online: 'Online',
  tatap_muka: 'Tatap muka',
  both: 'Online & tatap muka',
} as const;

export const COURSE_LEVEL_LABEL = { pemula: 'Pemula', menengah: 'Menengah', lanjut: 'Lanjut' } as const;

/** ISO → tanggal WIB "YYYY-MM-DD" */
export function wibDateOf(iso: string): string {
  return new Date(new Date(iso).getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
}
