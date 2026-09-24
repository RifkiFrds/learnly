import type { UserRole } from '@prisma/client';
import type { StoredFile } from '../lib/storage';

declare global {
  namespace Express {
    interface Request {
      /** Diisi middleware authenticate/optionalAuth */
      auth?: { userId: bigint; role: UserRole };
      /** Hasil validasi Zod (middleware validate) */
      valid: { body: unknown; query: unknown; params: unknown };
      /** File hasil middleware acceptUpload (multipart `file` atau JSON `fileBase64`) */
      uploadedFile?: StoredFile;
    }
  }
}

export {};
