import {
  BadgeCheck,
  BookOpen,
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  CreditCard,
  Gauge,
  GraduationCap,
  Home,
  LayoutList,
  MapPin,
  MessageSquareText,
  ReceiptText,
  Search,
  Settings,
  ShieldAlert,
  Tags,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from './types';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** true = aktif hanya bila path persis sama */
  exact?: boolean;
}

export function navFor(role: Role): NavItem[] {
  if (role === 'tutor') {
    return [
      { href: '/mengajar', label: 'Dasbor', icon: Gauge, exact: true },
      { href: '/mengajar/booking', label: 'Booking', icon: CalendarCheck },
      { href: '/mengajar/profil', label: 'Profil & dokumen', icon: UserRound },
      { href: '/mengajar/jadwal', label: 'Jadwal & wilayah', icon: CalendarClock },
      { href: '/mengajar/pendapatan', label: 'Pendapatan', icon: Wallet },
      { href: '/mengajar/ulasan', label: 'Ulasan', icon: MessageSquareText },
    ];
  }
  if (role === 'admin') {
    return [
      { href: '/admin', label: 'Ringkasan', icon: Gauge, exact: true },
      { href: '/admin/tutor', label: 'Verifikasi tutor', icon: BadgeCheck },
      { href: '/admin/pembayaran', label: 'Verifikasi pembayaran', icon: CreditCard },
      { href: '/admin/dispute', label: 'Dispute & refund', icon: ShieldAlert },
      { href: '/admin/kursus', label: 'Kursus', icon: BookOpen },
      { href: '/admin/pengguna', label: 'Pengguna', icon: Users },
      { href: '/admin/ulasan', label: 'Moderasi ulasan', icon: MessageSquareText },
      { href: '/admin/master-data', label: 'Master data', icon: Tags },
      { href: '/admin/pengaturan', label: 'Pengaturan', icon: Settings },
    ];
  }
  const items: NavItem[] = [
    { href: '/beranda', label: 'Beranda', icon: Home, exact: true },
    { href: '/tutor', label: 'Cari tutor', icon: Search, exact: true },
    { href: '/booking', label: 'Jadwal les', icon: CalendarCheck },
    { href: '/kursus-saya', label: 'Kursus saya', icon: GraduationCap },
    { href: '/laporan', label: 'Laporan belajar', icon: ClipboardList },
    { href: '/transaksi', label: 'Transaksi', icon: ReceiptText },
  ];
  if (role === 'parent') items.push({ href: '/anak', label: 'Profil anak', icon: Users });
  items.push({ href: '/alamat', label: 'Alamat', icon: MapPin });
  return items;
}

export const PUBLIC_NAV: NavItem[] = [
  { href: '/tutor', label: 'Cari tutor', icon: Search },
  { href: '/kursus', label: 'Kursus online', icon: LayoutList },
];

/** Tujuan saat notifikasi diklik, berdasarkan data yang dibawa */
/** Tujuan klik notifikasi berdasarkan tipe + data (ID terkait) dari API */
export function notificationHref(role: Role, type: string, data: Record<string, unknown> | null): string | null {
  const d = data ?? {};
  if (role === 'admin') {
    if (type === 'payment_proof_submitted') return '/admin/pembayaran';
    if (type === 'refund_required' || type === 'booking_cancelled') return '/admin/dispute';
    if (type === 'tutor' || type.startsWith('tutor_')) return '/admin/tutor';
    if (type === 'review_received' || type === 'review_hidden') return '/admin/ulasan';
    if (d.courseId) return `/admin/kursus/${d.courseId}${d.submissionId ? '?tab=nilai' : ''}`;
    if (d.bookingId) return '/admin/dispute';
    return null;
  }
  if (role === 'tutor') {
    if (type === 'tutor_verified' || type === 'tutor_rejected') return '/mengajar/profil';
    if (type.startsWith('review')) return '/mengajar/ulasan';
    if (d.bookingId) return `/mengajar/booking/${d.bookingId}`;
    if (d.paymentId) return '/mengajar/pendapatan';
    return null;
  }
  if (d.bookingId) return `/booking/${d.bookingId}`;
  if (d.enrollmentId) return `/belajar/${d.enrollmentId}${type === 'certificate_issued' || type === 'course_completed' ? '?materi=ringkasan' : ''}`;
  if (d.paymentId) return `/pembayaran/${d.paymentId}`;
  if (type.startsWith('review')) return '/booking?tab=riwayat';
  return null;
}
