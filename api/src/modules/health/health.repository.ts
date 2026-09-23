import { prisma } from '../../lib/prisma';

export const healthRepository = {
  async pingDatabase(): Promise<void> {
    await prisma.$queryRaw`SELECT 1`;
  },
};
