import 'dotenv/config';
import { z } from 'zod';

// Semua env divalidasi saat startup — aplikasi berhenti (fail-fast) jika ada yang wajib tapi kosong/tidak valid.
// Selalu sinkronkan dengan api/.env.example dan docs/03-tech-stack.md §3.
const envSchema = z
  .object({
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
    // SameSite cookie refresh token. lax = FE memanggil API lewat proxy same-origin (rewrite Next.js);
    // none (+Secure) hanya bila FE memanggil API langsung lintas domain (rawan diblokir Safari).
    COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    // Jumlah proxy di depan API: 1 = langsung di belakang Railway; 2 = browser → Vercel (rewrite) → Railway.
    // Dipakai express 'trust proxy' agar rate limit melihat IP asli pengguna.
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(1),
    // URL publik API ini (dipakai untuk membentuk URL file saat STORAGE_DRIVER=local)
    API_PUBLIC_URL: z.url().optional(),
    // URL web app (dipakai untuk link reset password / verifikasi email)
    WEB_APP_URL: z.url().default('http://localhost:3000'),

    DATABASE_URL: z.string().regex(/^mysql:\/\//, 'harus berupa connection string mysql://'),

    JWT_ACCESS_SECRET: z.string().min(32, 'minimal 32 karakter'),
    JWT_REFRESH_SECRET: z.string().min(32, 'minimal 32 karakter'),

    // local = simpan file di api/uploads (dev); cloudinary = Cloudinary (production)
    STORAGE_DRIVER: z.enum(['local', 'cloudinary']).default('local'),
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),

    // log = email hanya ditulis ke console (dev); smtp = kirim via Gmail SMTP
    MAIL_DRIVER: z.enum(['log', 'smtp']).default('log'),
    GMAIL_USER: z.string().optional(),
    GMAIL_APP_PASSWORD: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.STORAGE_DRIVER === 'cloudinary') {
      for (const key of [
        'CLOUDINARY_CLOUD_NAME',
        'CLOUDINARY_API_KEY',
        'CLOUDINARY_API_SECRET',
      ] as const) {
        if (!value[key]) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: 'wajib jika STORAGE_DRIVER=cloudinary',
          });
        }
      }
    }
    if (value.MAIL_DRIVER === 'smtp') {
      if (!z.email().safeParse(value.GMAIL_USER).success) {
        ctx.addIssue({
          code: 'custom',
          path: ['GMAIL_USER'],
          message: 'wajib email valid jika MAIL_DRIVER=smtp',
        });
      }
      if (!value.GMAIL_APP_PASSWORD) {
        ctx.addIssue({
          code: 'custom',
          path: ['GMAIL_APP_PASSWORD'],
          message: 'wajib jika MAIL_DRIVER=smtp',
        });
      }
    }
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

export const env = {
  ...parsed.data,
  API_PUBLIC_URL: parsed.data.API_PUBLIC_URL ?? `http://localhost:${parsed.data.PORT}`,
};
export type Env = typeof env;
