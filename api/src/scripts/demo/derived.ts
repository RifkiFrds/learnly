/** Turunan data demo yang dipakai bersama generator aset & seeder (harga, pemilik, struk). */
import { calculateBookingPrice } from '../../modules/bookings/pricing';
import { ACCOUNTS, BOOKINGS, COURSES, DEMO_SERVICE_FEE, ENROLLMENTS, TUTORS, type DemoAccount, type DemoBooking } from './data';

export const tutorByKey = new Map(TUTORS.map((tutor) => [tutor.key, tutor]));
export const courseBySlug = new Map(COURSES.map((course) => [course.slug, course]));

/** learner key → { akun pemilik, nama learner, jenjang } (siswa mandiri: learner key = key akun) */
export const learnerIndex = new Map<string, { account: DemoAccount; fullName: string; level: string }>();
for (const account of ACCOUNTS) {
  if (account.role === 'student') learnerIndex.set(account.key, { account, fullName: account.fullName, level: account.self!.level });
  for (const child of account.children ?? []) learnerIndex.set(child.key, { account, fullName: child.fullName, level: child.level });
}

export function bookingPrice(booking: DemoBooking) {
  const tutor = tutorByKey.get(booking.tutor)!;
  return calculateBookingPrice(tutor.hourlyRate, booking.duration, { type: 'flat', value: DEMO_SERVICE_FEE });
}

/** Status booking yang punya tagihan (tutor sudah menerima) */
export const hasPayment = (booking: DemoBooking) => !['pending_confirmation', 'rejected'].includes(booking.state.kind);
/** Tagihan yang sudah disertai bukti transfer */
export const hasProof = (booking: DemoBooking) => hasPayment(booking) && booking.state.kind !== 'awaiting_payment';

export interface ReceiptSpec {
  key: string;
  payer: string;
  amount: number;
  note: string;
  reference: string;
}

const firstName = (name: string) => name.split(' ')[0];

export function receiptSpecs(): ReceiptSpec[] {
  const specs: ReceiptSpec[] = [];
  for (const booking of BOOKINGS.filter(hasProof)) {
    const learner = learnerIndex.get(booking.learner)!;
    const amount = booking.state.kind === 'payment_rejected' ? booking.state.transferred : bookingPrice(booking).total;
    specs.push({ key: `struk-${booking.key}`, payer: learner.account.fullName, amount, note: `Les privat ${firstName(learner.fullName)}`, reference: `DEMO-${booking.key.toUpperCase()}` });
  }
  for (const enrollment of ENROLLMENTS.filter((row) => row.payment)) {
    const learner = learnerIndex.get(enrollment.learner)!;
    const course = courseBySlug.get(enrollment.course)!;
    specs.push({
      key: `struk-kursus-${enrollment.learner}-${course.slug}`,
      payer: learner.account.fullName,
      amount: course.price,
      note: `Kursus ${firstName(learner.fullName)}`,
      reference: `DEMO-K-${enrollment.learner.toUpperCase()}`,
    });
  }
  return specs;
}

/** Waktu WIB relatif hari ini: hari + jam "HH:MM" → Date (UTC) */
export function wib(dayOffset: number, time: string, base = new Date()): Date {
  const [h, m] = time.split(':').map(Number);
  const wibNow = new Date(base.getTime() + 7 * 3_600_000);
  const date = Date.UTC(wibNow.getUTCFullYear(), wibNow.getUTCMonth(), wibNow.getUTCDate() + dayOffset, h - 7, m);
  return new Date(date);
}

/** Awal sesi hari ini dibulatkan ke 30 menit (untuk sesi "sedang berjalan") */
export function roundedFromNow(minutes: number, base = new Date()): Date {
  const t = base.getTime() + minutes * 60_000;
  const step = 30 * 60_000;
  return new Date(Math.round(t / step) * step);
}
