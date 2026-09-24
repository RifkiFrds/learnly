import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { z } from 'zod';
import { ApiError, errorMessage } from './api-client';

/**
 * Petakan error API ke form: `details[].field` → error di field yang sama,
 * sisanya dikembalikan sebagai pesan tingkat form.
 */
export function applyApiError<T extends FieldValues>(
  err: unknown,
  setError: UseFormSetError<T>,
  fieldMap: Record<string, Path<T>> = {},
): string | null {
  if (err instanceof ApiError && err.details.length) {
    let unmapped = false;
    for (const [field, message] of Object.entries(err.fieldErrors)) {
      const target = fieldMap[field] ?? (field as Path<T>);
      try {
        setError(target, { type: 'server', message });
      } catch {
        unmapped = true;
      }
    }
    return unmapped || !Object.keys(err.fieldErrors).length ? err.message : null;
  }
  return errorMessage(err);
}

// Skema validasi umum (pesan Bahasa Indonesia, sinkron dengan aturan backend)
export const emailField = z.email('Format email belum benar, contoh: nama@email.com');
export const passwordField = z
  .string()
  .min(8, 'Password minimal 8 karakter')
  .max(72, 'Password maksimal 72 karakter');
export const phoneField = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{9,15}$/, 'Nomor HP 9–15 digit angka, contoh 081234567890')
  .or(z.literal(''));

/** Hanya izinkan redirect internal (hindari open redirect) */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}
