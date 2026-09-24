'use client';

import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { Pagination, RatingStars } from '@/components/common/Bits';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/States';
import { ReviewCard } from '@/components/tutor/ReviewList';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMyTutorProfile } from '@/hooks/api/account';
import { useTutorReviews } from '@/hooks/api/catalog';
import { useReplyReview } from '@/hooks/api/reviews';
import { errorMessage } from '@/lib/api-client';
import type { ReviewItem } from '@/lib/types';

function ReplyBox({ review }: { review: ReviewItem }) {
  const reply = useReplyReview();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  if (review.replyText) return null;
  if (!open) {
    return <Button variant="ghost" size="sm" className="mt-3" onClick={() => setOpen(true)}>Balas ulasan</Button>;
  }
  return (
    <form
      className="mt-4 space-y-2 border-t border-border pt-4"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          await reply.mutateAsync({ id: review.id, replyText: text.trim() });
          toast.success('Balasan terkirim dan tampil di profilmu.');
        } catch (err) {
          toast.error(errorMessage(err));
        }
      }}
    >
      <Label htmlFor={`reply-${review.id}`} className="text-body-sm font-semibold text-ink-900">Balasanmu (tampil publik, hanya sekali)</Label>
      <Textarea id={`reply-${review.id}`} rows={2} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Terima kasih atas masukannya…" />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={reply.isPending || text.trim().length < 2}>{reply.isPending ? 'Mengirim…' : 'Kirim balasan'}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
      </div>
    </form>
  );
}

export default function TutorReviewsPage() {
  const profile = useMyTutorProfile();
  const [page, setPage] = useState(1);
  const reviews = useTutorReviews(profile.data?.id, page);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Ulasan" description="Ulasan dari siswa & orang tua setelah sesi. Balasanmu tampil di profil publik." />
      {profile.data && (
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-border bg-surface p-5">
          <span className="font-display text-display-md text-ink-900">{profile.data.avgRating.toFixed(1)}</span>
          <RatingStars rating={profile.data.avgRating} count={profile.data.reviewCount} size="md" />
          <Link href={`/tutor/${profile.data.id}`} className="ml-auto inline-flex min-h-11 items-center text-body-sm font-semibold text-primary-600 hover:text-primary-700">Lihat profil publik</Link>
        </div>
      )}
      {profile.isPending || (profile.data && reviews.isPending) ? (
        <ListSkeleton count={3} />
      ) : profile.isError ? (
        <ErrorState error={profile.error} onRetry={() => profile.refetch()} />
      ) : reviews.isError ? (
        <ErrorState error={reviews.error} onRetry={() => reviews.refetch()} />
      ) : !reviews.data || reviews.data.items.length === 0 ? (
        <EmptyState illustration="people" title="Belum ada ulasan." description="Ulasan muncul setelah siswa menyelesaikan sesi bersamamu. Laporan perkembangan yang jelas biasanya berbuah ulasan baik." />
      ) : (
        <div className="space-y-3">
          {reviews.data.items.map((review) => <ReviewCard key={review.id} review={review} footer={<ReplyBox review={review} />} />)}
          <Pagination meta={reviews.data.meta} onPage={setPage} />
        </div>
      )}
    </div>
  );
}
