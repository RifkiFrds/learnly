import type { BookingMode, BookingStatus } from '@prisma/client';

// Mesin status booking — FR-TRACK-01 (tatap muka) & FR-ONLINE-03 (online).
// Transisi mundur tidak diizinkan; pembatalan hanya sebelum sesi_berlangsung.

const COMMON_START: Partial<Record<BookingStatus, BookingStatus[]>> = {
  pending_confirmation: ['menunggu_pembayaran', 'rejected', 'dibatalkan'],
  menunggu_pembayaran: ['dikonfirmasi', 'dibatalkan'],
  sesi_berlangsung: ['sesi_selesai'],
};

export const BOOKING_TRANSITIONS: Record<
  BookingMode,
  Partial<Record<BookingStatus, BookingStatus[]>>
> = {
  tatap_muka: {
    ...COMMON_START,
    dikonfirmasi: ['tutor_bersiap', 'dibatalkan'],
    tutor_bersiap: ['tutor_dalam_perjalanan', 'dibatalkan'],
    tutor_dalam_perjalanan: ['tutor_tiba', 'dibatalkan'],
    tutor_tiba: ['sesi_berlangsung', 'dibatalkan'],
  },
  online: {
    ...COMMON_START,
    dikonfirmasi: ['sesi_berlangsung', 'dibatalkan'],
  },
};

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending_confirmation: 'Menunggu konfirmasi tutor',
  rejected: 'Ditolak tutor',
  menunggu_pembayaran: 'Menunggu pembayaran',
  dikonfirmasi: 'Dikonfirmasi',
  tutor_bersiap: 'Tutor sedang bersiap',
  tutor_dalam_perjalanan: 'Tutor dalam perjalanan',
  tutor_tiba: 'Tutor sudah tiba',
  sesi_berlangsung: 'Sesi berlangsung',
  sesi_selesai: 'Sesi selesai',
  dibatalkan: 'Dibatalkan',
};

/** Status akhir — FE boleh berhenti polling */
export const FINAL_STATUSES: BookingStatus[] = ['rejected', 'sesi_selesai', 'dibatalkan'];

/** Status perjalanan yang diubah tutor lewat PATCH /bookings/:id/status (khusus tatap muka) */
export const TRAVEL_STATUSES = ['tutor_bersiap', 'tutor_dalam_perjalanan', 'tutor_tiba'] as const;
export type TravelStatus = (typeof TRAVEL_STATUSES)[number];

export function nextStatuses(mode: BookingMode, from: BookingStatus): BookingStatus[] {
  return BOOKING_TRANSITIONS[mode][from] ?? [];
}

export function canTransition(mode: BookingMode, from: BookingStatus, to: BookingStatus): boolean {
  return nextStatuses(mode, from).includes(to);
}

export function isCancellable(mode: BookingMode, status: BookingStatus): boolean {
  return canTransition(mode, status, 'dibatalkan');
}

export function isFinal(status: BookingStatus): boolean {
  return FINAL_STATUSES.includes(status);
}

/** Pesan manusiawi saat transisi tidak valid (dipakai service untuk error 422). */
export function describeInvalidTransition(
  mode: BookingMode,
  from: BookingStatus,
  to: BookingStatus,
): string {
  const allowed = nextStatuses(mode, from).filter((status) => status !== 'dibatalkan');
  const hint = allowed.length
    ? ` Langkah berikutnya yang valid: ${allowed.map((status) => `"${STATUS_LABEL[status]}"`).join(', ')}.`
    : '';
  return `Status tidak bisa diubah dari "${STATUS_LABEL[from]}" ke "${STATUS_LABEL[to]}".${hint}`;
}
