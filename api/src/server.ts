import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`[api] Learnly API berjalan di http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

async function shutdown(signal: string) {
  console.log(`[api] ${signal} diterima, menutup server...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
