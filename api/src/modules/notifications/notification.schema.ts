import { z } from 'zod';
import { paginationQuery } from '../../lib/pagination';

export const listNotificationsQuery = z.object({
  unread: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  ...paginationQuery,
});
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuery>;
