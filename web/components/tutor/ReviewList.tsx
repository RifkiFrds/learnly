import { CornerDownRight } from 'lucide-react';
import { Avatar, RatingStars } from '@/components/common/Bits';
import { formatRelative } from '@/lib/format';
import type { ReviewItem } from '@/lib/types';

export function ReviewCard({ review, footer }: { review: ReviewItem; footer?: React.ReactNode }) {
  const name = review.reviewerName ?? review.reviewer?.fullName ?? 'Pengguna Learnly';
  return (
    <article className="rounded-lg border border-border bg-surface p-5">
      <header className="flex items-start gap-3">
        <Avatar name={name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-body-sm font-semibold text-ink-900">{name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <RatingStars rating={review.rating} showEmpty={false} />
            <span className="text-body-sm text-ink-500">
              {formatRelative(review.createdAt)}
              {review.subjectName ? ` · ${review.subjectName}` : ''}
            </span>
          </div>
        </div>
      </header>
      {review.comment && <p className="mt-3 text-body-md text-ink-700">{review.comment}</p>}
      {review.replyText && (
        <div className="mt-4 flex gap-2 rounded-lg bg-surface-muted px-4 py-3">
          <CornerDownRight className="mt-0.5 size-4 shrink-0 text-ink-500" aria-hidden />
          <div>
            <p className="text-body-sm font-semibold text-ink-900">Balasan tutor</p>
            <p className="text-body-sm text-ink-700">{review.replyText}</p>
          </div>
        </div>
      )}
      {footer}
    </article>
  );
}
