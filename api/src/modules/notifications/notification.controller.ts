import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { sendSuccess } from '../../lib/response';
import { currentUser } from '../../middlewares/auth.middleware';
import type { idParam } from '../../middlewares/validate';
import type { ListNotificationsQuery } from './notification.schema';
import { notificationService } from './notification.service';

type IdParam = z.infer<typeof idParam>;

export const notificationController = {
  list: (async (req, res) => {
    const query = req.valid.query as ListNotificationsQuery;
    const { items, meta } = await notificationService.list(currentUser(req).userId, query);
    sendSuccess(res, items, 200, meta);
  }) satisfies RequestHandler,

  markRead: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    sendSuccess(res, await notificationService.markRead(currentUser(req).userId, id));
  }) satisfies RequestHandler,

  markAllRead: (async (req, res) => {
    sendSuccess(res, await notificationService.markAllRead(currentUser(req).userId));
  }) satisfies RequestHandler,
};
