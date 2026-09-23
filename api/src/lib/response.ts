import type { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Response envelope sukses sesuai docs/06-api-spec.md §1.1.
export function sendSuccess<T>(res: Response, data: T, status = 200, meta?: PaginationMeta) {
  return res.status(status).json(meta ? { success: true, data, meta } : { success: true, data });
}
