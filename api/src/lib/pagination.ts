import { z } from 'zod';
import type { PaginationMeta } from './response';

// Query ?page=1&limit=20 (docs/06-api-spec.md §1.3)
export const paginationQuery = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

export function toSkipTake({ page, limit }: { page: number; limit: number }) {
  return { skip: (page - 1) * limit, take: limit };
}

export function buildMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
