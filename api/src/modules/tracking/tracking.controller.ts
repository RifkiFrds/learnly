import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { sendCreated, sendSuccess } from '../../lib/response';
import { currentUser } from '../../middlewares/auth.middleware';
import type { idParam } from '../../middlewares/validate';
import type { LocationPingBody, UpdateTravelStatusBody } from '../bookings/booking.schema';
import { trackingService } from './tracking.service';

type IdParam = z.infer<typeof idParam>;

export const trackingController = {
  updateTravelStatus: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    const body = req.valid.body as UpdateTravelStatusBody;
    sendSuccess(res, await trackingService.updateTravelStatus(currentUser(req), id, body));
  }) satisfies RequestHandler,

  locationPing: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    const body = req.valid.body as LocationPingBody;
    sendCreated(res, await trackingService.locationPing(currentUser(req), id, body));
  }) satisfies RequestHandler,
};
