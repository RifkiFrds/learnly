import type { RequestHandler } from 'express';
import multer from 'multer';
import { Errors } from '../lib/app-error';
import type { StoredFile } from '../lib/storage';

type AllowedType = 'image/png' | 'image/jpeg' | 'image/webp' | 'application/pdf';

interface UploadOptions {
  allowed: AllowedType[];
  maxSizeMb?: number;
  required?: boolean;
}

/** Deteksi tipe file dari magic bytes — jangan percaya mimetype kiriman klien. */
function sniffMimeType(buffer: Buffer): AllowedType | null {
  if (buffer.subarray(0, 4).toString('hex') === '89504e47') return 'image/png';
  if (buffer.subarray(0, 3).toString('hex') === 'ffd8ff') return 'image/jpeg';
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  )
    return 'image/webp';
  if (buffer.subarray(0, 4).toString('ascii') === '%PDF') return 'application/pdf';
  return null;
}

const LABEL: Record<AllowedType, string> = {
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
  'image/webp': 'WEBP',
  'application/pdf': 'PDF',
};

/**
 * Menerima satu file lewat:
 * - `multipart/form-data` field `file` (cara utama dari web app), atau
 * - JSON `{ "fileBase64": "data:image/png;base64,..." }` (untuk Postman/klien API tanpa file picker).
 * File tervalidasi disimpan di `req.uploadedFile`; field teks lain tetap ada di `req.body`.
 */
export function acceptUpload({ allowed, maxSizeMb = 5, required = true }: UploadOptions) {
  const maxBytes = maxSizeMb * 1024 * 1024;
  const parser = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxBytes } }).single(
    'file',
  );

  const handler: RequestHandler = (req, _res, next) => {
    let buffer: Buffer | undefined = req.file?.buffer;
    let originalName = req.file?.originalname;

    if (!buffer && typeof req.body?.fileBase64 === 'string') {
      const raw = req.body.fileBase64.replace(/^data:[^;]+;base64,/, '');
      buffer = Buffer.from(raw, 'base64');
      originalName = typeof req.body.fileName === 'string' ? req.body.fileName : undefined;
      if (buffer.length > maxBytes) {
        throw Errors.validation(`Ukuran file maksimal ${maxSizeMb} MB`);
      }
    }
    if (req.body) {
      delete req.body.fileBase64;
      delete req.body.fileName;
    }

    if (!buffer || buffer.length === 0) {
      if (required) {
        throw Errors.validation('File wajib diunggah', [{ field: 'file', message: 'required' }]);
      }
      return next();
    }

    const mimeType = sniffMimeType(buffer);
    if (!mimeType || !allowed.includes(mimeType)) {
      throw Errors.validation(
        `Format file tidak didukung. Gunakan ${allowed.map((type) => LABEL[type]).join(', ')}`,
        [{ field: 'file', message: 'invalid_type' }],
      );
    }
    const file: StoredFile = { buffer, mimeType, originalName };
    req.uploadedFile = file;
    next();
  };

  return [parser, handler];
}
