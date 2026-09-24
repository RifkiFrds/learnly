import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { sendSuccess } from '../../lib/response';
import { currentUser } from '../../middlewares/auth.middleware';
import type { idParam } from '../../middlewares/validate';
import type { CheckinBody, CheckoutSessionBody } from '../bookings/booking.schema';
import { checkinService } from './checkin.service';

type IdParam = z.infer<typeof idParam>;

export const checkinController = {
  getQrToken: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    sendSuccess(res, await checkinService.getQrToken(currentUser(req), id));
  }) satisfies RequestHandler,

  checkin: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    sendSuccess(
      res,
      await checkinService.checkin(currentUser(req), id, req.valid.body as CheckinBody),
    );
  }) satisfies RequestHandler,

  checkoutSession: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    const body = req.valid.body as CheckoutSessionBody;
    sendSuccess(res, await checkinService.checkoutSession(currentUser(req), id, body));
  }) satisfies RequestHandler,
};
