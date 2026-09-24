import { z } from 'zod';

const email = z
  .email('format email tidak valid')
  .max(191)
  .transform((value) => value.trim().toLowerCase());
// bcrypt hanya memakai 72 byte pertama
const password = z.string().min(8, 'minimal 8 karakter').max(72, 'maksimal 72 karakter');

export const registerBody = z.object({
  email,
  password,
  fullName: z.string().trim().min(2, 'minimal 2 karakter').max(191),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{9,15}$/, 'nomor HP 9–15 digit')
    .optional(),
  // admin tidak bisa daftar sendiri (dibuat lewat seed)
  role: z.enum(['student', 'parent', 'tutor']),
});
export type RegisterBody = z.infer<typeof registerBody>;

export const loginBody = z.object({ email, password: z.string().min(1, 'wajib diisi') });
export type LoginBody = z.infer<typeof loginBody>;

// Refresh token dibaca dari cookie httpOnly; body hanya fallback untuk klien non-browser.
export const refreshBody = z.object({ refreshToken: z.string().min(20).optional() });
export type RefreshBody = z.infer<typeof refreshBody>;

export const forgotPasswordBody = z.object({ email });
export type ForgotPasswordBody = z.infer<typeof forgotPasswordBody>;

export const resetPasswordBody = z.object({ token: z.string().min(20), newPassword: password });
export type ResetPasswordBody = z.infer<typeof resetPasswordBody>;

export const verifyEmailBody = z.object({ token: z.string().min(20) });
export type VerifyEmailBody = z.infer<typeof verifyEmailBody>;
