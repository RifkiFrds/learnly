import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { sendCreated, sendSuccess } from '../../lib/response';
import { currentUser } from '../../middlewares/auth.middleware';
import type { idParam } from '../../middlewares/validate';
import type {
  CreateReviewBody,
  ReplyReviewBody,
  ReviewVisibilityBody,
  UpdateReviewBody,
} from './review.schema';
import { reviewService } from './review.service';

type IdParam = z.infer<typeof idParam>;
type PageQuery = { page: number; limit: number };

export const reviewController = {
  create: (async (req, res) => {
    sendCreated(
      res,
      await reviewService.create(currentUser(req), req.valid.body as CreateReviewBody),
    );
  }) satisfies RequestHandler,

  update: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    sendSuccess(
      res,
      await reviewService.update(currentUser(req), id, req.valid.body as UpdateReviewBody),
    );
  }) satisfies RequestHandler,

  reply: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    sendSuccess(
      res,
      await reviewService.reply(currentUser(req), id, req.valid.body as ReplyReviewBody),
    );
  }) satisfies RequestHandler,

  listForCourse: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    const { page, limit } = req.valid.query as PageQuery;
    const { items, meta } = await reviewService.listForCourse(id, page, limit);
    sendSuccess(res, items, 200, meta);
  }) satisfies RequestHandler,

  setVisibility: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    sendSuccess(res, await reviewService.setVisibility(id, req.valid.body as ReviewVisibilityBody));
  }) satisfies RequestHandler,
};
