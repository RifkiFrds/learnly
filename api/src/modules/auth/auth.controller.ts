import type { CookieOptions, Request, RequestHandler, Response } from 'express';
import { env } from '../../config/env';
import { sendCreated, sendSuccess } from '../../lib/response';
import { currentUser } from '../../middlewares/auth.middleware';
import type {
  ForgotPasswordBody,
  LoginBody,
  RefreshBody,
  RegisterBody,
  ResetPasswordBody,
  VerifyEmailBody,
} from './auth.schema';
import { authService } from './auth.service';

export const REFRESH_COOKIE = 'learnly_refresh_token';

// FE memanggil API lewat proxy same-origin (rewrite /api/v1/* di Next.js) → cookie first-party, SameSite=Lax,
// tanpa atribut Domain (terikat ke host FE). SameSite=None (wajib Secure) hanya untuk mode lintas domain langsung.
const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production' || env.COOKIE_SAME_SITE === 'none',
  sameSite: env.COOKIE_SAME_SITE,
  path: '/api/v1/auth',
};

function setRefreshCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(REFRESH_COOKIE, token, { ...cookieOptions, expires: expiresAt });
}

function readRefreshToken(req: Request): string | undefined {
  return (
    (req.cookies?.[REFRESH_COOKIE] as string | undefined) ??
    (req.valid.body as RefreshBody)?.refreshToken
  );
}

export const authController = {
  register: (async (req, res) => {
    const result = await authService.register(req.valid.body as RegisterBody);
    setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);
    sendCreated(res, result);
  }) satisfies RequestHandler,

  login: (async (req, res) => {
    const result = await authService.login(req.valid.body as LoginBody);
    setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);
    sendSuccess(res, result);
  }) satisfies RequestHandler,

  refresh: (async (req, res) => {
    const result = await authService.refresh(readRefreshToken(req));
    setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);
    sendSuccess(res, result);
  }) satisfies RequestHandler,

  logout: (async (req, res) => {
    const result = await authService.logout(readRefreshToken(req));
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    sendSuccess(res, result);
  }) satisfies RequestHandler,

  forgotPassword: (async (req, res) => {
    sendSuccess(res, await authService.forgotPassword(req.valid.body as ForgotPasswordBody));
  }) satisfies RequestHandler,

  resetPassword: (async (req, res) => {
    sendSuccess(res, await authService.resetPassword(req.valid.body as ResetPasswordBody));
  }) satisfies RequestHandler,

  verifyEmail: (async (req, res) => {
    sendSuccess(res, await authService.verifyEmail(req.valid.body as VerifyEmailBody));
  }) satisfies RequestHandler,

  me: (async (req, res) => {
    sendSuccess(res, await authService.me(currentUser(req).userId));
  }) satisfies RequestHandler,
};
