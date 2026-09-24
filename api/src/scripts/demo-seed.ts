/**
 * Data demo Learnly (tutor di 7 kota, keluarga, kursus, transaksi di semua status, sertifikat).
 *
 *   npm run db:seed:demo    menambah / menimpa data demo (akun @demo.learnly.id & kursus demo dibuat ulang)
 *   npm run db:reset:demo   KOSONGKAN SEMUA TABEL + file unggahan lokal, lalu isi ulang data dasar & demo
 *
 * Production (mis. Railway untuk presentasi): node dist/scripts/demo-seed.js [--reset]
 * dengan ALLOW_DEMO_SEED=true — tanpa env itu skrip menolak jalan di NODE_ENV=production.
 * Tanggal relatif terhadap waktu seeding: jalankan ulang sebelum demo agar jadwal "hari ini" tetap segar.
 */
import 'dotenv/config';
import fs from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';
import { UPLOAD_DIR } from '../lib/storage';
import { ACCOUNTS, DEMO_PASSWORD, demoEmail, TUTORS } from './demo/data';
import { purgeDemo, seedDemo } from './demo/seed';
import { seedBase } from './seed-base';

const reset = process.argv.includes('--reset');

if (env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
  console.error('[demo] Ditolak: NODE_ENV=production. Set ALLOW_DEMO_SEED=true secara eksplisit jika memang ingin data demo di server ini.');
  process.exit(1);
}

const prisma = new PrismaClient();

async function truncateAll() {
  const tables = (await prisma.$queryRawUnsafe<Record<string, string>[]>('SHOW TABLES')).map((row) => Object.values(row)[0]).filter((name) => name !== '_prisma_migrations');
  // satu koneksi untuk seluruh urutan (FOREIGN_KEY_CHECKS berlaku per sesi)
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of tables) await tx.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\``);
    await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
  }, { timeout: 60_000 });
  if (env.STORAGE_DRIVER === 'local') await fs.rm(UPLOAD_DIR, { recursive: true, force: true });
  return tables.length;
}

async function main() {
  const started = Date.now();
  if (reset) {
    const count = await truncateAll();
    console.log(`[demo] reset: ${count} tabel dikosongkan${env.STORAGE_DRIVER === 'local' ? ' + folder uploads dihapus' : ' (file lama di Cloudinary tidak dihapus)'}`);
    await seedBase(prisma);
  } else {
    await seedBase(prisma);
    const purged = await purgeDemo(prisma);
    if (purged.users) console.log(`[demo] data demo lama dihapus: ${purged.users} akun, ${purged.bookings} booking, ${purged.courses} kursus`);
  }
  const summary = await seedDemo(prisma);
  console.log(`[demo] selesai dalam ${((Date.now() - started) / 1000).toFixed(1)} dtk`);
  console.log(`[demo] ${summary.tutors} tutor, ${summary.parents} orang tua (${summary.children} anak), ${summary.students} siswa mandiri, ${summary.courses} kursus`);
  console.log(`[demo] ${summary.bookings} booking: ${Object.entries(summary.bookingStatus).map(([s, n]) => `${s}=${n}`).join(', ')}`);
  console.log(`[demo] ${summary.enrollments} enrollment (0%: ${summary.enrollmentStats.none}, sebagian: ${summary.enrollmentStats.partial}, selesai: ${summary.enrollmentStats.full}, sertifikat: ${summary.enrollmentStats.certificates})`);
  console.log(`[demo] password semua akun demo: ${DEMO_PASSWORD}`);
  console.log(`[demo] admin: ${summary.admin} · tutor: ${demoEmail(TUTORS[0].key)} · orang tua: ${demoEmail(ACCOUNTS[0].key)} · siswa: ${demoEmail(ACCOUNTS.find((a) => a.role === 'student')!.key)}`);
}

main()
  .catch((err) => {
    console.error('[demo] gagal:', err instanceof Error ? err.stack : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
