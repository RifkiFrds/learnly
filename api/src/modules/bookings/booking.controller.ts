import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { sendCreated, sendSuccess } from '../../lib/response';
import { currentUser } from '../../middlewares/auth.middleware';
import type { idParam } from '../../middlewares/validate';
import type {
  AdminOverrideStatusBody,
  CancelBookingBody,
  CreateBookingBody,
  ListBookingsQuery,
  MeetingLinkBody,
  RespondBookingBody,
} from './booking.schema';
import { bookingService } from './booking.service';

type IdParam = z.infer<typeof idParam>;

export const bookingController = {
  create: (async (req, res) => {
    sendCreated(
      res,
      await bookingService.create(currentUser(req), req.valid.body as CreateBookingBody),
    );
  }) satisfies RequestHandler,

  list: (async (req, res) => {
    const { items, meta } = await bookingService.list(
      currentUser(req),
      req.valid.query as ListBookingsQuery,
    );
    sendSuccess(res, items, 200, meta);
  }) satisfies RequestHandler,

  getById: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    sendSuccess(res, await bookingService.getById(currentUser(req), id));
  }) satisfies RequestHandler,

  respond: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    sendSuccess(
      res,
      await bookingService.respond(currentUser(req), id, req.valid.body as RespondBookingBody),
    );
  }) satisfies RequestHandler,

  paymentInfo: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    sendSuccess(res, await bookingService.paymentInfo(currentUser(req), id));
  }) satisfies RequestHandler,

  cancel: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    sendSuccess(
      res,
      await bookingService.cancel(currentUser(req), id, req.valid.body as CancelBookingBody),
    );
  }) satisfies RequestHandler,

  setMeetingLink: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    const body = req.valid.body as MeetingLinkBody;
    sendSuccess(res, await bookingService.setMeetingLink(currentUser(req), id, body));
  }) satisfies RequestHandler,

  adminOverrideStatus: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    const body = req.valid.body as AdminOverrideStatusBody;
    sendSuccess(res, await bookingService.adminOverrideStatus(currentUser(req).userId, id, body));
  }) satisfies RequestHandler,
};
