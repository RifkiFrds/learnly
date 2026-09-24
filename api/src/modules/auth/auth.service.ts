import bcrypt from 'bcryptjs';
import type { UserRole } from '@prisma/client';
import { env } from '../../config/env';
import { Errors } from '../../lib/app-error';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  generateOpaqueToken,
  peekTokenSubject,
  REFRESH_TOKEN_TTL_DAYS,
  sha256,
  signAccessToken,
  signPurposeToken,
  verifyPurposeToken,
} from '../../lib/jwt';
import { isMailLogDriver, sendMail } from '../../lib/mailer';
import { dateOnly } from '../../lib/time';
import { authRepository } from './auth.repository';
import type {
  ForgotPasswordBody,
  LoginBody,
  RegisterBody,
  ResetPasswordBody,
  VerifyEmailBody,
} from './auth.schema';

const BCRYPT_ROUNDS = 10;
const RESET_TOKEN_TTL_SECONDS = 60 * 60; // FR-AUTH-05: kedaluwarsa 1 jam
const VERIFY_EMAIL_TTL_SECONDS = 24 * 60 * 60;

export const hashPassword = (plain: string) => bcrypt.hash(plain, BCRYPT_ROUNDS);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

async function issueTokens(user: { id: bigint; role: UserRole }) {
  const refreshToken = generateOpaqueToken();
  const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 86_400_000);
  await authRepository.createRefreshToken(user.id, sha256(refreshToken), refreshTokenExpiresAt);
  return {
    accessToken: signAccessToken({ sub: user.id.toString(), role: user.role }),
    accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
    refreshToken,
    refreshTokenExpiresAt,
  };
}

async function sendVerificationEmail(user: { id: bigint; email: string; fullName: string }) {
  const token = signPurposeToken(
    'verify_email',
    user.id.toString(),
    VERIFY_EMAIL_TTL_SECONDS,
    user.email,
  );
  const link = `${env.WEB_APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
  // Verifikasi email tidak memblokir apa pun (FR-AUTH-02) — kegagalan kirim cukup dicatat.
  try {
    await sendMail({
      to: user.email,
      subject: 'Selamat datang di Learnly — konfirmasi email kamu',
      text: `Halo ${user.fullName},\n\nAkunmu sudah aktif dan bisa langsung dipakai. Kalau mau, konfirmasi email kamu lewat link berikut (berlaku 24 jam):\n${link}\n\nSalam,\nTim Learnly`,
    });
  } catch (err) {
    console.error('[auth] gagal mengirim email verifikasi:', (err as Error).message);
  }
  return token;
}

/** Hanya di dev (MAIL_DRIVER=log): token ikut dikembalikan agar alur bisa dites tanpa inbox. */
const exposeDevToken = () => isMailLogDriver() && env.NODE_ENV !== 'production';

export const authService = {
  async register(input: RegisterBody) {
    if (await authRepository.findByEmail(input.email)) {
      throw Errors.conflict('Email ini sudah terdaftar. Coba login atau pakai email lain.');
    }
    // FR-AUTH-02: akun langsung aktif
    const user = await authRepository.createUser({
      email: input.email,
      passwordHash: await hashPassword(input.password),
      fullName: input.fullName,
      phone: input.phone,
      role: input.role,
    });
    const verifyToken = await sendVerificationEmail(user);
    return {
      user,
      ...(await issueTokens(user)),
      ...(exposeDevToken() ? { devEmailVerificationToken: verifyToken } : {}),
    };
  },

  async login(input: LoginBody) {
    const user = await authRepository.findByEmail(input.email);
    // Pesan sengaja sama untuk email/password salah agar tidak membocorkan email terdaftar
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw Errors.unauthenticated('Email atau password salah');
    }
    if (user.status === 'suspended') {
      throw Errors.forbidden('Akun kamu sedang ditangguhkan. Hubungi admin Learnly.');
    }
    const { passwordHash: _omit, ...publicUser } = user;
    return { user: publicUser, ...(await issueTokens(user)) };
  },

  /** Rotasi refresh token: token lama dicabut, token baru diterbitkan. */
  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw Errors.unauthenticated('Refresh token tidak ditemukan');
    const stored = await authRepository.findActiveRefreshToken(sha256(refreshToken));
    if (!stored) throw Errors.unauthenticated('Sesi sudah berakhir, silakan login ulang');
    if (stored.user.status === 'suspended') {
      throw Errors.forbidden('Akun kamu sedang ditangguhkan. Hubungi admin Learnly.');
    }
    await authRepository.revokeRefreshToken(stored.tokenHash);
    return { user: stored.user, ...(await issueTokens(stored.user)) };
  },

  async logout(refreshToken: string | undefined) {
    if (refreshToken) await authRepository.revokeRefreshToken(sha256(refreshToken));
    return { loggedOut: true };
  },

  async forgotPassword(input: ForgotPasswordBody) {
    const user = await authRepository.findByEmail(input.email);
    const response: { message: string; devResetToken?: string } = {
      message: 'Jika email terdaftar, link reset password sudah kami kirim. Cek inbox/spam kamu.',
    };
    if (!user) return response;

    // Token diikat ke password hash saat ini → otomatis tidak berlaku setelah dipakai (sekali pakai)
    const token = signPurposeToken(
      'reset_password',
      user.id.toString(),
      RESET_TOKEN_TTL_SECONDS,
      user.passwordHash,
    );
    const link = `${env.WEB_APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
    await sendMail({
      to: user.email,
      subject: 'Reset password akun Learnly',
      text: `Halo ${user.fullName},\n\nKami menerima permintaan reset password. Buka link berikut untuk membuat password baru (berlaku 1 jam):\n${link}\n\nKalau kamu tidak merasa meminta ini, abaikan saja email ini.\n\nSalam,\nTim Learnly`,
    });
    // Hanya di dev (MAIL_DRIVER=log): token dikembalikan agar alur bisa dites tanpa inbox
    if (exposeDevToken()) response.devResetToken = token;
    return response;
  },

  async resetPassword(input: ResetPasswordBody) {
    const invalid = Errors.validation('Link reset password tidak valid atau sudah kedaluwarsa');
    const userId = peekTokenSubject(input.token);
    if (!userId || !/^\d+$/.test(userId)) throw invalid;
    const user = await authRepository.findById(BigInt(userId));
    if (!user || !verifyPurposeToken('reset_password', input.token, user.passwordHash))
      throw invalid;

    await authRepository.updatePassword(user.id, await hashPassword(input.newPassword));
    // Semua sesi lama dicabut setelah password diganti
    await authRepository.revokeAllRefreshTokens(user.id);
    return { message: 'Password berhasil diganti. Silakan login dengan password baru.' };
  },

  async verifyEmail(input: VerifyEmailBody) {
    const invalid = Errors.validation('Link verifikasi tidak valid atau sudah kedaluwarsa');
    const userId = peekTokenSubject(input.token);
    if (!userId || !/^\d+$/.test(userId)) throw invalid;
    const user = await authRepository.findById(BigInt(userId));
    if (!user || !verifyPurposeToken('verify_email', input.token, user.email)) throw invalid;
    return authRepository.markEmailVerified(user.id);
  },

  async me(userId: bigint) {
    const user = await authRepository.findProfile(userId);
    if (!user) throw Errors.notFound('Akun tidak ditemukan');
    return {
      ...user,
      learners: user.learners.map((learner) => ({
        ...learner,
        dateOfBirth: dateOnly(learner.dateOfBirth),
      })),
    };
  },
};
