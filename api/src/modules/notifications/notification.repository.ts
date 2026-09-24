import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

type Db = Prisma.TransactionClient | typeof prisma;

export const notificationRepository = {
  createMany(db: Db, data: Prisma.NotificationCreateManyInput[]) {
    return db.notification.createMany({ data });
  },

  list(userId: bigint, unreadOnly: boolean, skip: number, take: number) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(unreadOnly ? { readAt: null } : {}),
    };
    return prisma.$transaction([
      prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
  },

  findById(id: bigint) {
    return prisma.notification.findUnique({ where: { id } });
  },

  markRead(id: bigint) {
    return prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  },

  markAllRead(userId: bigint) {
    return prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  },

  adminIds(db: Db) {
    return db.user.findMany({ where: { role: 'admin', status: 'active' }, select: { id: true } });
  },
};
