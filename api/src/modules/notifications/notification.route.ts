import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { idParam, validate } from '../../middlewares/validate';
import { notificationController } from './notification.controller';
import { listNotificationsQuery } from './notification.schema';

export const notificationRouter = Router();

notificationRouter.use(authenticate);
notificationRouter.get(
  '/',
  validate({ query: listNotificationsQuery }),
  notificationController.list,
);
notificationRouter.patch('/read-all', notificationController.markAllRead);
notificationRouter.patch(
  '/:id/read',
  validate({ params: idParam }),
  notificationController.markRead,
);
