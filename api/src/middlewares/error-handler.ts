import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { AppError } from '../lib/app-error';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError('NOT_FOUND', `Endpoint ${req.method} ${req.path} tidak ditemukan`, 404));
};

function toAppError(err: unknown): AppError | null {
  if (err instanceof AppError) return err;

  if (err instanceof ZodError) {
    return new AppError(
      'VALIDATION_ERROR',
      'Data yang dikirim belum sesuai. Cek kembali isian yang ditandai.',
      400,
      err.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    );
  }

  // Body JSON rusak dari express.json()
  if (err instanceof SyntaxError && 'body' in err) {
    return new AppError('VALIDATION_ERROR', 'Body JSON tidak valid', 400);
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? 'Ukuran file terlalu besar' : `Upload gagal: ${err.message}`;
    return new AppError('VALIDATION_ERROR', message, 400, [{ field: 'file', message: err.code }]);
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return new AppError('CONFLICT', 'Data yang sama sudah ada', 409);
    if (err.code === 'P2003') {
      return new AppError(
        'CONFLICT',
        'Data ini masih dipakai oleh data lain sehingga tidak bisa diubah/dihapus',
        409,
      );
    }
    if (err.code === 'P2025') return new AppError('NOT_FOUND', 'Data tidak ditemukan', 404);
  }

  // Error HTTP bawaan Express/body-parser/serve-static (mis. 404 file upload, 413 body terlalu besar)
  const status =
    (err as { status?: unknown; statusCode?: unknown })?.status ??
    (err as { statusCode?: unknown })?.statusCode;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    if (status === 404) return new AppError('NOT_FOUND', 'File atau endpoint tidak ditemukan', 404);
    if (status === 413)
      return new AppError('VALIDATION_ERROR', 'Ukuran data yang dikirim terlalu besar', 413);
    return new AppError('VALIDATION_ERROR', 'Permintaan tidak valid', status);
  }

  return null;
}

// Satu-satunya tempat error diformat menjadi response (lihat docs/09-coding-standards.md §6).
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const appError = toAppError(err);
  if (appError) {
    res.status(appError.httpStatus).json({
      success: false,
      error: { code: appError.code, message: appError.message, details: appError.details },
    });
    return;
  }

  console.error('[error]', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message:
        env.NODE_ENV === 'production'
          ? 'Terjadi kesalahan pada server. Coba lagi beberapa saat lagi.'
          : String((err as Error)?.message ?? err),
    },
  });
};
