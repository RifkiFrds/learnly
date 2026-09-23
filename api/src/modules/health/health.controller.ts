import type { RequestHandler } from 'express';
import { sendSuccess } from '../../lib/response';
import { healthService } from './health.service';

export const healthController = {
  check: (async (_req, res) => {
    sendSuccess(res, await healthService.check());
  }) satisfies RequestHandler,
};
