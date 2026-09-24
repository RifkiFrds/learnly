'use client';

import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { toast } from 'sonner';
import { Pagination, RatingStars } from '@/components/common/Bits';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/States';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminReviews, useReviewVisibility } from '@/hooks/api/admin-platform';
import { useQueryParams } from '@/hooks/useQueryParams';
import { errorMessage } from '@/lib/api-client';
import { formatRelative } from '@/lib/format';
import type { AdminReview } from '@/lib/types';

function ReviewRow({ review }: { review: AdminReview }) {
  const visibility = useReviewVisibility();
  const [hideOpen, setHideOpen] = useState(false);
  const target = review.target;
  const targetHref = target?.type === 'tutor' ? `/tutor/${target.tutorProfileId}` : target?.type === 'course' ? `/kursus/${target.slug}` : null;

  return (
    <li className="flex flex-col gap-3 p-4 sm:px-5 md:flex-row md:items-start">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <RatingStars rating={review.rating} showEmpty={false} />
          {review.isHidden && <Badge variant="neutral"><EyeOff aria-hidden /> Disembunyikan</Badge>}
          <span className="text-body-sm text-ink-500">{formatRelative(review.createdAt)}</span>
        </div>
        {review.comment ? <p className="text-body-md text-ink-900">“{review.comment}”</p> : <p className="text-body-sm text-ink-500">Tanpa komentar.</p>}
        <p className="text-body-sm text-ink-500">
          oleh {review.reviewer.fullName} ({review.reviewer.email}) untuk {target?.type === 'course' ? 'kursus' : 'tutor'}{' '}
          {targetHref ? <Link href={targetHref} className="font-semibold text-primary-600 hover:text-primary-700">{target?.name}</Link> : 'yang sudah dihapus'}
        </p>
        {review.replyText && <p className="border-l-2 border-border pl-3 text-body-sm text-ink-700">Balasan: {review.replyText}</p>}
      </div>
      <div className="shrink-0">
        {review.isHidden ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={visibility.isPending}
            onClick={() =>
              visibility.mutate(
                { id: review.id, isHidden: false },
                { onSuccess: () => toast.success('Ulasan ditampilkan lagi & rating dihitung ulang.'), onError: (err) => toast.error(errorMessage(err)) },
              )
            }
          >
            <Eye /> Tampilkan
          </Button>
        ) : (
          <Button size="sm" variant="destructive" onClick={() => setHideOpen(true)}><EyeOff /> Sembunyikan</Button>
        )}
      </div>
      <ConfirmDialog
        open={hideOpen}
        onOpenChange={setHideOpen}
        title="Sembunyikan ulasan ini?"
        consequence="Ulasan tidak tampil di halaman publik dan tidak dihitung dalam rating. Ulasan tidak dihapus — bisa ditampilkan lagi kapan saja. Penulis ulasan diberi tahu."
        confirmLabel="Sembunyikan ulasan"
        destructive
        reason={{ label: 'Alasan (dikirim ke penulis ulasan)', placeholder: 'Mis. mengandung kata kasar / data pribadi', minLength: 5 }}
        pending={visibility.isPending}
        onConfirm={async (reason) => {
          try {
            await visibility.mutateAsync({ id: review.id, isHidden: true, reason });
            toast.success('Ulasan disembunyikan.');
            setHideOpen(false);
          } catch (err) {
            toast.error(errorMessage(err));
          }
        }}
      />
    </li>
  );
}

function ReviewsContent() {
  const { values, update, page } = useQueryParams(['status', 'jenis'] as const);
  const status = values.status ?? 'tampil';
  const query = useAdminReviews({ hidden: status === 'semua' ? undefined : status === 'disembunyikan' ? 'true' : 'false', reviewableType: values.jenis, page });

  return (
    <div className="max-w-5xl">
      <PageHeader title="Moderasi ulasan" description="Sembunyikan ulasan yang melanggar aturan. Ulasan tidak pernah dihapus." />
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <Tabs value={status} onValueChange={(value) => update({ status: value === 'tampil' ? undefined : value })}>
          <TabsList>
            <TabsTrigger value="tampil">Tampil</TabsTrigger>
            <TabsTrigger value="disembunyikan">Disembunyikan</TabsTrigger>
            <TabsTrigger value="semua">Semua</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="space-y-1.5 md:w-48">
          <Label htmlFor="jenis" className="text-body-sm font-semibold text-ink-900">Jenis</Label>
          <NativeSelect id="jenis" value={values.jenis ?? ''} onChange={(e) => update({ jenis: e.target.value })}>
            <option value="">Tutor & kursus</option>
            <option value="tutor_booking">Sesi tutor</option>
            <option value="course">Kursus</option>
          </NativeSelect>
        </div>
      </div>
      {query.isPending ? (
        <ListSkeleton count={4} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <EmptyState illustration="people" title={status === 'disembunyikan' ? 'Tidak ada ulasan yang disembunyikan.' : 'Belum ada ulasan.'} />
      ) : (
        <>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {query.data.items.map((review) => <ReviewRow key={review.id} review={review} />)}
          </ul>
          <Pagination meta={query.data.meta} onPage={(next) => update({ page: String(next) }, false)} />
        </>
      )}
    </div>
  );
}

export default function AdminReviewsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <ReviewsContent />
    </Suspense>
  );
}
