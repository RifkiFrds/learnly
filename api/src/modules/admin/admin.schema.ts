import { z } from 'zod';

export const suspendUserBody = z.object({
  status: z.enum(['suspended', 'active']),
  reason: z.string().trim().max(500).optional(),
});
export type SuspendUserBody = z.infer<typeof suspendUserBody>;

export const dashboardQuery = z
  .object({
    from: z.iso.datetime({ offset: true }).optional(),
    to: z.iso.datetime({ offset: true }).optional(),
  })
  .refine((query) => !query.from || !query.to || new Date(query.from) < new Date(query.to), {
    message: '`from` harus sebelum `to`',
    path: ['from'],
  });
export type DashboardQuery = z.infer<typeof dashboardQuery>;

export const adminUsersQuery = z.object({
  role: z.enum(['student', 'parent', 'tutor', 'admin']).optional(),
  status: z.enum(['active', 'suspended']).optional(),
  q: z.string().trim().min(2).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type AdminUsersQuery = z.infer<typeof adminUsersQuery>;

export const adminReviewsQuery = z.object({
  reviewableType: z.enum(['tutor_booking', 'course']).optional(),
  hidden: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type AdminReviewsQuery = z.infer<typeof adminReviewsQuery>;
