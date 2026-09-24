'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { Pagination } from '@/components/common/Bits';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/States';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePayments } from '@/hooks/api/bookings';
import { useQueryParams } from '@/hooks/useQueryParams';
import { formatDate, formatRupiah } from '@/lib/format';

const KEYS = ['jenis'] as const;

function TransactionsContent() {
  const { values, update, page } = useQueryParams(KEYS);
  const payableType = values.jenis === 'kursus' ? 'course_enrollment' : values.jenis === 'les' ? 'booking' : undefined;
  const query = usePayments({ payableType, page, limit: 10 });

  return (
    <div className="max-w-4xl">
      <PageHeader title="Transaksi" description="Semua tagihan les dan kursus beserta status verifikasinya." />
      <Tabs value={values.jenis ?? 'semua'} onValueChange={(value) => update({ jenis: value === 'semua' ? undefined : value })} className="mb-5">
        <TabsList>
          <TabsTrigger value="semua">Semua</TabsTrigger>
          <TabsTrigger value="les">Les privat</TabsTrigger>
          <TabsTrigger value="kursus">Kursus</TabsTrigger>
        </TabsList>
      </Tabs>
      {query.isPending ? (
        <ListSkeleton count={4} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <EmptyState illustration="receipt" title="Belum ada transaksi." description="Tagihan muncul setelah tutor menerima booking atau kamu mendaftar kursus berbayar." />
      ) : (
        <>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {query.data.items.map((payment) => {
              const title = payment.booking
                ? `Les ${payment.booking.subjectName} · ${payment.booking.tutorName}`
                : payment.enrollment
                  ? `Kursus ${payment.enrollment.courseTitle}`
                  : `Tagihan #${payment.id}`;
              const learner = payment.booking?.learnerName ?? payment.enrollment?.learnerName;
              return (
                <li key={payment.id}>
                  <Link href={`/pembayaran/${payment.id}`} className="group flex items-center gap-4 p-4 hover:bg-surface-muted/50 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-sans text-body-md font-semibold text-ink-900">{title}</p>
                      <p className="text-body-sm text-ink-500">
                        {formatDate(payment.createdAt)}{learner ? ` · ${learner}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-sans text-body-md font-semibold text-ink-900">{formatRupiah(payment.amount)}</span>
                      <StatusBadge kind="payment" status={payment.status} />
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-ink-300 group-hover:text-primary-600" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
          <Pagination meta={query.data.meta} onPage={(next) => update({ page: String(next) }, false)} />
        </>
      )}
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <TransactionsContent />
    </Suspense>
  );
}
