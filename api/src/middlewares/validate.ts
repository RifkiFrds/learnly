import type { RequestHandler } from 'express';
import { z } from 'zod';

interface Schemas {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
}

/**
 * Validasi request dengan Zod sebelum masuk controller (docs/09-coding-standards.md §3).
 * Hasil parse disimpan di `req.valid` — ZodError ditangani error-handler (400 VALIDATION_ERROR).
 */
export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    req.valid = {
      body: schemas.body ? schemas.body.parse(req.body ?? {}) : req.body,
      query: schemas.query ? schemas.query.parse(req.query) : req.query,
      params: schemas.params ? schemas.params.parse(req.params) : req.params,
    };
    next();
  };
}

// Skema umum yang dipakai lintas modul
export const idParam = z.object({ id: z.coerce.bigint().positive() });
export const idSchema = z.coerce.bigint().positive();
export const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'format tanggal YYYY-MM-DD');
export const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'format jam HH:MM');
