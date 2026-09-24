/**
 * Seed data dasar Learnly — aman dijalankan berulang (idempotent: hanya membuat yang belum ada).
 *
 *   npm run db:seed            (dev, via tsx)
 *   node dist/scripts/seed.js  (production — otomatis dijalankan oleh `npm run start`)
 *
 * Isi:
 * - Akun admin (admin tidak bisa daftar lewat /auth/register)
 * - Master data: jenjang, mapel, kategori kursus
 * - Pengaturan platform default (biaya layanan, window pembatalan, dsb.)
 * - Non-production saja: data demo (tutor terverifikasi + kursus terbit) agar tim FE langsung punya data
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { seedDemo } from './seed-demo';

const prisma = new PrismaClient();
const isProduction = process.env.NODE_ENV === 'production';

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@learnly.id';
// Password default HANYA untuk dev lokal. Di production wajib lewat env (tidak ada secret ter-hardcode).
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? (isProduction ? '' : 'AdminLearnly#2026');

const EDUCATION_LEVELS = [
  ['SD', 'sd'],
  ['SMP', 'smp'],
  ['SMA/SMK', 'sma'],
  ['Mahasiswa', 'kuliah'],
  ['Umum', 'umum'],
];

const SUBJECTS = [
  ['Matematika', 'matematika'],
  ['Fisika', 'fisika'],
  ['Kimia', 'kimia'],
  ['Biologi', 'biologi'],
  ['Bahasa Inggris', 'bahasa-inggris'],
  ['Bahasa Indonesia', 'bahasa-indonesia'],
  ['Pemrograman', 'pemrograman'],
  ['Persiapan UTBK', 'persiapan-utbk'],
];

const CATEGORIES = [
  ['Mata Pelajaran Sekolah', 'mata-pelajaran-sekolah'],
  ['Persiapan Ujian', 'persiapan-ujian'],
  ['Bahasa Asing', 'bahasa-asing'],
  ['Keterampilan Digital', 'keterampilan-digital'],
  ['Pengembangan Diri', 'pengembangan-diri'],
  ['Kursus & Hobi', 'kursus-hobi'],
];

async function seedAdmin() {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) return existing;
  if (ADMIN_PASSWORD.length < 12) {
    throw new Error(
      'SEED_ADMIN_PASSWORD wajib diisi (minimal 12 karakter) untuk membuat akun admin pertama di production.',
    );
  }
  return prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
      fullName: 'Admin Learnly',
      role: 'admin',
      emailVerifiedAt: new Date(),
    },
  });
}

async function main() {
  const admin = await seedAdmin();

  for (const [name, slug] of EDUCATION_LEVELS) {
    await prisma.educationLevel.upsert({ where: { slug }, create: { name, slug }, update: {} });
  }
  for (const [name, slug] of SUBJECTS) {
    await prisma.subject.upsert({ where: { slug }, create: { name, slug }, update: {} });
  }
  for (const [name, slug] of CATEGORIES) {
    await prisma.category.upsert({ where: { slug }, create: { name, slug }, update: {} });
  }

  const settings: Record<string, unknown> = {
    service_fee: { type: 'flat', value: 10000 },
    cancellation_policy: { freeCancelHours: 24, lateRefundPercent: 50 },
    booking_response_hours: 24,
    payment_window_hours: 24,
    default_passing_grade: 70,
    review_edit_days: 7,
    meeting_link_visible_hours: 24,
  };
  if (!isProduction) {
    // Rekening contoh untuk dev — di production admin wajib mengisi data asli lewat PATCH /admin/settings
    settings.bank_transfer = {
      bankName: 'BCA',
      accountNumber: '0000000000',
      accountName: 'Learnly (rekening contoh dev)',
    };
  }
  for (const [key, value] of Object.entries(settings)) {
    // create-only: jangan menimpa pengaturan yang sudah diubah admin
    await prisma.platformSetting.upsert({
      where: { key },
      create: { key, value: value as object },
      update: {},
    });
  }

  console.log(`[seed] admin: ${ADMIN_EMAIL}`);
  console.log(
    `[seed] master data: ${EDUCATION_LEVELS.length} jenjang, ${SUBJECTS.length} mapel, ${CATEGORIES.length} kategori`,
  );

  if (!isProduction) await seedDemo(prisma, admin.id);
}

main()
  .catch((err) => {
    console.error('[seed] gagal:', err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
