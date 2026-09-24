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
