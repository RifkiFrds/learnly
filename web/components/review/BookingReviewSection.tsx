'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Panel, RatingStars } from '@/components/common/Bits';
import { ReviewForm } from '@/components/review/ReviewForm';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useReplyReview } from '@/hooks/api/reviews';
import { errorMessage } from '@/lib/api-client';
import { formatDate, formatDateTime } from '@/lib/format';
import type { Booking, BookingReview } from '@/lib/types';

function ReviewDisplay({ review }: { review: BookingReview }) {
  return (
    <div className="space-y-2">
      <RatingStars rating={review.rating} size="md" showEmpty={false} />
      {review.comment ? <p className="text-body-md text-ink-700">“{review.comment}”</p> : <p className="text-body-sm text-ink-500">Tanpa komentar.</p>}
      <p className="text-body-sm text-ink-500">Dikirim {formatDate(review.createdAt)}</p>
      {review.isHidden && <p className="text-body-sm text-warning-600">Ulasan ini disembunyikan tim Learnly dan tidak tampil di profil tutor.</p>}
      {review.replyText && (
        <div className="mt-3 border-l-2 border-primary-600 pl-4">
          <p className="text-body-sm font-semibold text-ink-900">Balasan tutor</p>
          <p className="text-body-md text-ink-700">{review.replyText}</p>
        </div>
      )}
    </div>
  );
}

function ReplyForm({ review }: { review: BookingReview }) {
  const reply = useReplyReview();
  const [text, setText] = useState('');
  return (
    <form
      className="mt-4 space-y-3 border-t border-border pt-4"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          await reply.mutateAsync({ id: review.id, replyText: text.trim() });
          toast.success('Balasan terkirim.');
        } catch (err) {
          toast.error(errorMessage(err));
        }
      }}
    >
      <Label htmlFor={`reply-${review.id}`} className="text-body-sm font-semibold text-ink-900">Balas ulasan (hanya sekali, tampil publik)</Label>
      <Textarea id={`reply-${review.id}`} rows={2} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Terima kasih atas masukannya…" />
      <Button type="submit" variant="secondary" disabled={reply.isPending || text.trim().length < 2}>{reply.isPending ? 'Mengirim…' : 'Kirim balasan'}</Button>
    </form>
  );
}

/** Ulasan sesi di halaman detail booking: tulis/edit (siswa/orang tua) atau baca & balas (tutor). */
export function BookingReviewSection({ booking, perspective = 'owner' }: { booking: Booking; perspective?: 'owner' | 'tutor' }) {
  const [editing, setEditing] = useState(false);
  const review = booking.review ?? null;

  if (perspective === 'tutor') {
    if (!review) return null;
    return (
      <Panel title="Ulasan dari siswa">
        <ReviewDisplay review={review} />
        {!review.replyText && <ReplyForm review={review} />}
      </Panel>
    );
  }

  const canWrite = booking.availableActions.includes('write_review');
  const canEdit = booking.availableActions.includes('edit_review');
  if (!review && !canWrite) return null;

  return (
    <Panel title={review ? 'Ulasanmu' : `Beri ulasan untuk ${booking.tutor.fullName}`}>
      {!review || editing ? (
        <ReviewForm
          target={{ reviewableType: 'tutor_booking', reviewableId: booking.id }}
          existing={review ?? undefined}
          subjectLabel={`sesi ${booking.subject.name} bersama ${booking.tutor.fullName}`}
          onDone={() => setEditing(false)}
        />
      ) : (
        <>
          <ReviewDisplay review={review} />
          {canEdit && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Ubah ulasan</Button>
              {review.editableUntil && <span className="text-body-sm text-ink-500">Bisa diubah sampai {formatDateTime(review.editableUntil)}</span>}
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
