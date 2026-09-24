import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';

// Penyimpanan file: Cloudinary (production) atau disk lokal api/uploads (dev).
// File privat (dokumen tutor — NFR-SEC-06) disimpan sebagai "authenticated" di Cloudinary dan
// hanya bisa dibuka lewat signed URL berumur pendek yang dibuat oleh resolveFileUrl().

export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
const PRIVATE_PREFIX = 'cloudinary-private:';

if (env.STORAGE_DRIVER === 'cloudinary') {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export interface StoredFile {
  buffer: Buffer;
  mimeType: string;
  originalName?: string;
}

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

export async function uploadFile(
  file: StoredFile,
  options: { folder: string; isPrivate?: boolean },
): Promise<string> {
  const ext = EXTENSIONS[file.mimeType] ?? 'bin';
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;

  if (env.STORAGE_DRIVER === 'local') {
    const dir = path.join(UPLOAD_DIR, options.folder);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${name}.${ext}`), file.buffer);
    return `${env.API_PUBLIC_URL}/uploads/${options.folder}/${name}.${ext}`;
  }

  const resourceType = file.mimeType === 'application/pdf' ? 'raw' : 'image';
  const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `learnly/${options.folder}`,
        public_id: resourceType === 'raw' ? `${name}.${ext}` : name,
        resource_type: resourceType,
        type: options.isPrivate ? 'authenticated' : 'upload',
      },
      (error, uploaded) => (error || !uploaded ? reject(error) : resolve(uploaded)),
    );
    stream.end(file.buffer);
  });

  return options.isPrivate
    ? `${PRIVATE_PREFIX}${resourceType}/${result.public_id}`
    : result.secure_url;
}

/** Ubah nilai tersimpan menjadi URL yang bisa dibuka (signed URL 10 menit untuk file privat). */
export function resolveFileUrl(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (!stored.startsWith(PRIVATE_PREFIX)) return stored;
  const [resourceType, ...rest] = stored.slice(PRIVATE_PREFIX.length).split('/');
  return cloudinary.url(rest.join('/'), {
    resource_type: resourceType,
    type: 'authenticated',
    sign_url: true,
    secure: true,
    expires_at: Math.floor(Date.now() / 1000) + 600,
  });
}
