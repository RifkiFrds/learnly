// Satu-satunya pemetaan status → warna & label (docs/10-design-system.md §4.1).
// Menunggu aksi = warning, sedang berjalan = info, berhasil = success, gagal/batal = danger.

export type Tone = 'warning' | 'info' | 'success' | 'danger' | 'neutral' | 'brand';

export interface StatusInfo {
  label: string;
  tone: Tone;
}

const BOOKING: Record<string, StatusInfo> = {
  pending_confirmation: { label: 'Menunggu konfirmasi tutor', tone: 'warning' },
  menunggu_pembayaran: { label: 'Menunggu pembayaran', tone: 'warning' },
  dikonfirmasi: { label: 'Dikonfirmasi', tone: 'success' },
  tutor_bersiap: { label: 'Tutor bersiap', tone: 'info' },
  tutor_dalam_perjalanan: { label: 'Tutor dalam perjalanan', tone: 'info' },
  tutor_tiba: { label: 'Tutor sudah tiba', tone: 'info' },
  sesi_berlangsung: { label: 'Sesi berlangsung', tone: 'info' },
  sesi_selesai: { label: 'Sesi selesai', tone: 'success' },
  rejected: { label: 'Ditolak tutor', tone: 'danger' },
  dibatalkan: { label: 'Dibatalkan', tone: 'danger' },
};

const PAYMENT: Record<string, StatusInfo> = {
  menunggu_pembayaran: { label: 'Menunggu pembayaran', tone: 'warning' },
  menunggu_verifikasi: { label: 'Menunggu verifikasi', tone: 'warning' },
  paid: { label: 'Lunas', tone: 'success' },
  ditolak: { label: 'Ditolak', tone: 'danger' },
  expired: { label: 'Kedaluwarsa', tone: 'danger' },
  refunded: { label: 'Dana dikembalikan', tone: 'neutral' },
};

const COURSE: Record<string, StatusInfo> = {
  draft: { label: 'Draf', tone: 'neutral' },
  in_review: { label: 'Menunggu review', tone: 'warning' },
  published: { label: 'Terbit', tone: 'success' },
  archived: { label: 'Diarsipkan', tone: 'neutral' },
};

const ENROLLMENT: Record<string, StatusInfo> = {
  active: { label: 'Sedang belajar', tone: 'info' },
  completed: { label: 'Selesai', tone: 'success' },
};

const LESSON: Record<string, StatusInfo> = {
  not_started: { label: 'Belum dimulai', tone: 'neutral' },
  in_progress: { label: 'Sedang dikerjakan', tone: 'info' },
  completed: { label: 'Selesai', tone: 'success' },
};

const VERIFICATION: Record<string, StatusInfo> = {
  pending_verification: { label: 'Menunggu verifikasi', tone: 'warning' },
  verified: { label: 'Terverifikasi', tone: 'success' },
  rejected: { label: 'Perlu perbaikan', tone: 'danger' },
};

const ACCOUNT: Record<string, StatusInfo> = {
  active: { label: 'Aktif', tone: 'success' },
  suspended: { label: 'Ditangguhkan', tone: 'danger' },
};

export const STATUS_MAPS = {
  booking: BOOKING,
  payment: PAYMENT,
  course: COURSE,
  enrollment: ENROLLMENT,
  lesson: LESSON,
  verification: VERIFICATION,
  account: ACCOUNT,
} as const;

export type StatusKind = keyof typeof STATUS_MAPS;

export function statusInfo(kind: StatusKind, value: string | null | undefined): StatusInfo {
  if (!value) return { label: '-', tone: 'neutral' };
  return STATUS_MAPS[kind][value] ?? { label: value.replace(/_/g, ' '), tone: 'neutral' };
}

export const ROLE_LABEL: Record<string, string> = {
  student: 'Siswa',
  parent: 'Orang tua',
  tutor: 'Tutor',
  admin: 'Admin',
};

/** Urutan tahapan untuk stepper booking (§5 Booking Status Stepper) */
export const BOOKING_STEPS = {
  tatap_muka: [
    'pending_confirmation',
    'menunggu_pembayaran',
    'dikonfirmasi',
    'tutor_bersiap',
    'tutor_dalam_perjalanan',
    'tutor_tiba',
    'sesi_berlangsung',
    'sesi_selesai',
  ],
  online: ['pending_confirmation', 'menunggu_pembayaran', 'dikonfirmasi', 'sesi_berlangsung', 'sesi_selesai'],
} as const;

export const STEP_SHORT_LABEL: Record<string, string> = {
  pending_confirmation: 'Konfirmasi tutor',
  menunggu_pembayaran: 'Pembayaran',
  dikonfirmasi: 'Dikonfirmasi',
  tutor_bersiap: 'Tutor bersiap',
  tutor_dalam_perjalanan: 'Dalam perjalanan',
  tutor_tiba: 'Tutor tiba',
  sesi_berlangsung: 'Sesi berlangsung',
  sesi_selesai: 'Selesai',
};
