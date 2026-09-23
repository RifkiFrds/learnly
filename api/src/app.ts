import cors from 'cors';
import express, { Router } from 'express';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middlewares/error-handler';
import { healthRouter } from './modules/health/health.route';

export function createApp() {
  const app = express();

  // Prisma mengembalikan kolom BIGINT sebagai `bigint`, yang tidak bisa di-serialize JSON.stringify.
  app.set('json replacer', (_key: string, value: unknown) =>
    typeof value === 'bigint' ? value.toString() : value,
  );
  app.set('trust proxy', 1); // di belakang proxy Railway

  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  // /health di root untuk healthcheck platform (Railway), juga tersedia di /api/v1/health.
  app.use('/health', healthRouter);

  const v1 = Router();
  v1.use('/health', healthRouter);
  // Modul Fase 1+ didaftarkan di sini, mis. v1.use('/auth', authRouter);
  app.use('/api/v1', v1);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
