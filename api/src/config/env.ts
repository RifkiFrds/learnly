import 'dotenv/config';
import { z } from 'zod';

// Semua env divalidasi saat startup — aplikasi berhenti (fail-fast) jika ada yang wajib tapi kosong/tidak valid.
// Selalu sinkronkan dengan api/.env.example dan docs/03-tech-stack.md §3.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:3000')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),

  DATABASE_URL: z.string().regex(/^mysql:\/\//, 'harus berupa connection string mysql://'),

  JWT_ACCESS_SECRET: z.string().min(32, 'minimal 32 karakter'),
  JWT_REFRESH_SECRET: z.string().min(32, 'minimal 32 karakter'),

  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),

  GMAIL_USER: z.email(),
  GMAIL_APP_PASSWORD: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[env] Environment variables tidak valid:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  console.error('[env] Lihat api/.env.example untuk daftar variabel yang dibutuhkan.');
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
