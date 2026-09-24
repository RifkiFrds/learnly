import type { UserRole } from '@prisma/client';
import type { RequestHandler } from 'express';
import { Errors } from '../lib/app-error';

const ROLE_LABEL: Record<UserRole, string> = {
  student: 'siswa',
  parent: 'orang tua',
  tutor: 'tutor',
  admin: 'admin',
};

/** RBAC (FR-AUTH-07). Dipasang setelah `authenticate`: role di luar daftar → 403. */
export function authorize(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) throw Errors.unauthenticated();
    if (!roles.includes(req.auth.role)) {
      throw Errors.forbidden(
        `Fitur ini hanya untuk ${roles.map((role) => ROLE_LABEL[role]).join(' / ')}`,
      );
    }
    next();
  };
}
