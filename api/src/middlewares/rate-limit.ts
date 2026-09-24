import type { Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { env } from '../config/env';

// NFR-SEC-05: rate limiting endpoint sensitif. Store in-memory cukup untuk satu instance Railway
// (tanpa Redis — docs/03-tech-stack.md §5).
function limiter(
  limit: number,
  windowMinutes: number,
  message: string,
  keyGenerator?: (req: Request) => string,
) {
  return rateLimit({
    windowMs: windowMinutes * 60_000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => env.NODE_ENV === 'test',
    keyGenerator,
    handler: (_req, res) => {
      res.status(429).json({ success: false, error: { code: 'TOO_MANY_REQUESTS', message } });
    },
  });
}

/** Kunci = IP + email → brute force satu akun terhambat, tanpa mengunci semua user di balik NAT yang sama. */
const ipAndEmail = (req: Request) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  return `${ipKeyGenerator(req.ip ?? '')}:${email}`;
};

export const loginRateLimit = limiter(
  10,
  15,
  'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.',
  ipAndEmail,
);

const RESET_MESSAGE = 'Terlalu banyak permintaan reset password. Coba lagi dalam 15 menit.';

export const forgotPasswordRateLimit = limiter(5, 15, RESET_MESSAGE, ipAndEmail);

/** Reset dikunci per IP + token → percobaan menebak/memakai ulang satu token dibatasi. */
export const resetPasswordRateLimit = limiter(5, 15, RESET_MESSAGE, (req) => {
  const token = typeof req.body?.token === 'string' ? req.body.token.slice(-32) : '';
  return `${ipKeyGenerator(req.ip ?? '')}:${token}`;
});
