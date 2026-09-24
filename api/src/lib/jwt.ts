import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';
import { env } from '../config/env';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_DAYS = 30;

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
  if (decoded.purpose) throw new Error('bukan access token');
  return { sub: String(decoded.sub), role: decoded.role as UserRole };
}

/** Refresh token = string acak; hanya hash SHA-256 yang disimpan di DB (docs/04-architecture.md §5). */
export function generateOpaqueToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

// Token sekali pakai untuk tujuan tertentu (reset password, verifikasi email, QR check-in).
// `extraSecret` mengikat token ke state tertentu (mis. password hash) sehingga otomatis
// tidak berlaku lagi setelah state berubah.
type Purpose = 'reset_password' | 'verify_email' | 'checkin_qr';

export function signPurposeToken(
  purpose: Purpose,
  subject: string,
  expiresInSeconds: number,
  extraSecret = '',
): string {
  return jwt.sign({ purpose }, env.JWT_REFRESH_SECRET + extraSecret, {
    subject,
    expiresIn: expiresInSeconds,
  });
}

/** Membaca subject tanpa verifikasi — hanya untuk mencari state yang dibutuhkan verifikasi. */
export function peekTokenSubject(token: string): string | null {
  const decoded = jwt.decode(token);
  return decoded && typeof decoded === 'object' && decoded.sub ? String(decoded.sub) : null;
}

export function verifyPurposeToken(
  purpose: Purpose,
  token: string,
  extraSecret = '',
): { sub: string; exp: number } | null {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET + extraSecret) as jwt.JwtPayload;
    if (decoded.purpose !== purpose || !decoded.sub || !decoded.exp) return null;
    return { sub: String(decoded.sub), exp: decoded.exp };
  } catch {
    return null;
  }
}
