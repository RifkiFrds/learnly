import type { RequestHandler } from 'express';
import { env } from '../config/env';

// NFR-OBS-01: log method, path, status, durasi untuk setiap request.
export const requestLogger: RequestHandler = (req, res, next) => {
  if (env.NODE_ENV === 'test') return next();
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(`[http] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms`);
  });
  next();
};
