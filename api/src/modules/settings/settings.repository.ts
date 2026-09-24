import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export const settingsRepository = {
  findAll() {
    return prisma.platformSetting.findMany();
  },

  async upsertMany(entries: { key: string; value: Prisma.InputJsonValue }[]) {
    await prisma.$transaction(
      entries.map(({ key, value }) =>
        prisma.platformSetting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        }),
      ),
    );
  },
};
