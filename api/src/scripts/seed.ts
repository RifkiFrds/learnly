/**
 * Seed data dasar Learnly — aman dijalankan berulang (idempotent: hanya membuat yang belum ada).
 *
 *   npm run db:seed            (dev, via tsx)
 *   node dist/scripts/seed.js  (production — otomatis dijalankan oleh `npm run start`)
 *
 * Isi: akun admin operator, master data (jenjang, mapel, kategori), pengaturan platform default.
 * Data demo lengkap (tutor, keluarga, kursus, transaksi) terpisah: `npm run db:seed:demo` / `db:reset:demo`.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { seedBase } from './seed-base';

const prisma = new PrismaClient();

seedBase(prisma)
  .catch((err) => {
    console.error('[seed] gagal:', err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
