import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { AppError } from '../lib/app-error';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError('NOT_FOUND', `Endpoint ${req.method} ${req.path} tidak ditemukan`, 404));
};

// Satu-satunya tempat error diformat menjadi response (lihat docs/09-coding-standards.md §6).
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.httpStatus).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Data yang dikirim tidak valid',
        details: err.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
    return;
  }

  // Body JSON rusak dari express.json()
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Body JSON tidak valid' },
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
          ? 'Terjadi kesalahan pada server'
          : String((err as Error)?.message ?? err),
    },
  });
};
