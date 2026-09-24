import type { Prisma } from '@prisma/client';
import { Errors } from '../../lib/app-error';
import { buildMeta, toSkipTake } from '../../lib/pagination';
import { prisma } from '../../lib/prisma';
import { notificationRepository } from './notification.repository';

type Db = Prisma.TransactionClient | typeof prisma;

export interface NotificationInput {
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

// Notifikasi in-app (dibaca FE via polling GET /notifications — docs/06-api-spec.md §13).
export const notificationService = {
  async notify(db: Db, userIds: bigint | bigint[], input: NotificationInput) {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    if (ids.length === 0) return;
    await notificationRepository.createMany(
      db,
      ids.map((userId) => ({
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data
          ? (JSON.parse(JSON.stringify(input.data, bigintReplacer)) as object)
          : undefined,
      })),
    );
  },

  async notifyAdmins(db: Db, input: NotificationInput) {
    const admins = await notificationRepository.adminIds(db);
    await this.notify(
      db,
      admins.map((admin) => admin.id),
      input,
    );
  },

  async list(userId: bigint, query: { unread?: boolean; page: number; limit: number }) {
    const { skip, take } = toSkipTake(query);
    const [items, total, unreadCount] = await notificationRepository.list(
      userId,
      Boolean(query.unread),
      skip,
      take,
    );
    return { items, meta: { ...buildMeta(query.page, query.limit, total), unreadCount } };
  },

  async markRead(userId: bigint, id: bigint) {
    const notification = await notificationRepository.findById(id);
    if (!notification) throw Errors.notFound('Notifikasi tidak ditemukan');
    if (notification.userId !== userId) throw Errors.forbidden();
    if (notification.readAt) return notification;
    return notificationRepository.markRead(id);
  },

  async markAllRead(userId: bigint) {
    const result = await notificationRepository.markAllRead(userId);
    return { updatedCount: result.count };
  },
};

function bigintReplacer(_key: string, value: unknown) {
  return typeof value === 'bigint' ? Number(value) : value;
}
