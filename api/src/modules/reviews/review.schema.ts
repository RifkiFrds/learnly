import { z } from 'zod';
import { idSchema } from '../../middlewares/validate';

export const createReviewBody = z.object({
  // tutor_booking → reviewableId = id booking; course → reviewableId = id kursus
  reviewableType: z.enum(['tutor_booking', 'course']),
  reviewableId: idSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
});
export type CreateReviewBody = z.infer<typeof createReviewBody>;

export const updateReviewBody = z
  .object({
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((body) => body.rating !== undefined || body.comment !== undefined, {
    message: 'Kirim rating atau comment yang ingin diubah',
  });
export type UpdateReviewBody = z.infer<typeof updateReviewBody>;

export const replyReviewBody = z.object({ replyText: z.string().trim().min(2).max(2000) });
export type ReplyReviewBody = z.infer<typeof replyReviewBody>;

export const reviewVisibilityBody = z.object({
  isHidden: z.boolean(),
  reason: z.string().trim().max(500).optional(),
});
export type ReviewVisibilityBody = z.infer<typeof reviewVisibilityBody>;
