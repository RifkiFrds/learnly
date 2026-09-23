import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

// Singleton: `tsx watch` me-reload modul saat dev, jadi instance disimpan di globalThis
// agar tidak membuka connection pool baru di setiap reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
