import type { Request, RequestHandler } from 'express';
import { Errors } from '../lib/app-error';
import { verifyAccessToken } from '../lib/jwt';
import { prisma } from '../lib/prisma';

function readBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

async function resolveUser(token: string) {
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw Errors.unauthenticated('Sesi kamu sudah berakhir, silakan login ulang');
  }
  // Cek status terbaru di DB agar akun yang di-suspend langsung kehilangan akses (FR-ADMIN-02).
  const user = await prisma.user.findUnique({
    where: { id: BigInt(payload.sub) },
    select: { id: true, role: true, status: true },
  });
  if (!user) throw Errors.unauthenticated('Akun tidak ditemukan, silakan login ulang');
  if (user.status === 'suspended') {
    throw Errors.forbidden('Akun kamu sedang ditangguhkan. Hubungi admin Learnly.');
  }
  return { userId: user.id, role: user.role };
}

/** Wajib login (401 jika token tidak ada/invalid/expired). */
export const authenticate: RequestHandler = async (req, _res, next) => {
  const token = readBearer(req);
  if (!token) throw Errors.unauthenticated();
  req.auth = await resolveUser(token);
  next();
};

/** Untuk endpoint publik yang menampilkan data ekstra jika login (mis. admin). */
export const optionalAuth: RequestHandler = async (req, _res, next) => {
  const token = readBearer(req);
  if (token) {
    try {
      req.auth = await resolveUser(token);
    } catch {
      req.auth = undefined;
    }
  }
  next();
};

/** Ambil identitas user yang sudah diautentikasi (dipakai di controller). */
export function currentUser(req: Request) {
  if (!req.auth) throw Errors.unauthenticated();
  return req.auth;
}
