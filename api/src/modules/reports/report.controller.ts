import type { RequestHandler } from 'express';
import { sendSuccess } from '../../lib/response';
import { currentUser } from '../../middlewares/auth.middleware';
import type { BookingIdParam, ListReportsQuery } from './report.schema';
import { reportService } from './report.service';

export const reportController = {
  list: (async (req, res) => {
    const { items, meta } = await reportService.list(
      currentUser(req),
      req.valid.query as ListReportsQuery,
    );
    sendSuccess(res, items, 200, meta);
  }) satisfies RequestHandler,

  getByBookingId: (async (req, res) => {
    const { bookingId } = req.valid.params as BookingIdParam;
    sendSuccess(res, await reportService.getByBookingId(currentUser(req), bookingId));
  }) satisfies RequestHandler,
};
