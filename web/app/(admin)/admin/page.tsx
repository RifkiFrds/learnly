'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Panel } from '@/components/common/Bits';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState } from '@/components/common/States';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardSummary } from '@/hooks/api/admin-platform';
import { formatDate, formatRupiah } from '@/lib/format';
import { BOOKING_STEPS } from '@/lib/status';

const PERIODS = [
  ['30', '30 hari terakhir'],
  ['7', '7 hari terakhir'],
  ['90', '90 hari terakhir'],
] as const;

function Stat({ label, value, hint }: { label: string; value: string; hint?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <dt className="text-body-sm text-ink-500">{label}</dt>
      <dd className="mt-1 font-display text-heading-lg text-ink-900">{value}</dd>
      {hint && <dd className="mt-1 text-body-sm text-ink-500">{hint}</dd>}
    </div>
  );
}

function ActionItem({ href, count, label }: { href: string; count: number; label: string }) {
  return (
    <Link href={href} className="group flex min-h-14 items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 hover:border-primary-600">
      <span className="text-body-md text-ink-900">
        <span className={count ? 'font-display text-heading-md text-warning-600' : 'font-display text-heading-md text-ink-500'}>{count}</span> {label}
      </span>
      <ArrowRight className="size-4 text-ink-300 group-hover:text-primary-600" aria-hidden />
    </Link>
  );
}

const STATUS_ORDER = [...BOOKING_STEPS.tatap_muka, 'rejected', 'dibatalkan'];

export default function AdminDashboardPage() {
  const [days, setDays] = useState('30');
  const [range] = useState(() => new Map<string, { from: string; to: string }>(PERIODS.map(([d]) => [d, { from: new Date(Date.now() - Number(d) * 86_400_000).toISOString(), to: new Date().toISOString() }])));
  const query = useDashboardSummary(range.get(days)!);
  const data = query.data;

  return (
    <div className="max-w-6xl space-y-6">
      <PageHeader
        title="Ringkasan"
        description={data ? `${formatDate(data.period.from, false)} – ${formatDate(data.period.to, false)}` : 'Kinerja platform dan pekerjaan yang menunggu.'}
        actions={
          <div className="w-52">
            <Label htmlFor="periode" className="sr-only">Periode</Label>
            <NativeSelect id="periode" value={days} onChange={(e) => setDays(e.target.value)}>
              {PERIODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </NativeSelect>
          </div>
        }
      />
      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : (
        <>
          <section aria-labelledby="todo-title">
            <h2 id="todo-title" className="mb-3 font-sans text-heading-md text-ink-900">Perlu ditindaklanjuti</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ActionItem href="/admin/pembayaran" count={data.payments.awaitingVerification} label="bukti bayar" />
              <ActionItem href="/admin/tutor" count={data.tutors.pendingVerification} label="tutor menunggu" />
              <ActionItem href="/admin/dispute" count={data.refunds.pendingCount} label="refund tertunda" />
              <ActionItem href="/admin/kursus" count={data.courses.inReview} label="kursus direview" />
            </div>
          </section>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="GMV (lunas)" value={formatRupiah(data.gmv.total)} hint={`Les ${formatRupiah(data.gmv.bookings)} · kursus ${formatRupiah(data.gmv.courses)}`} />
            <Stat label="Pendapatan platform" value={formatRupiah(data.platformRevenue.bookingServiceFee)} hint="Biaya layanan booking" />
            <Stat label="Sesi selesai" value={`${data.bookings.completed} / ${data.bookings.total}`} hint="dari total booking periode ini" />
            <Stat label="Refund" value={formatRupiah(data.refunds.refundedAmount)} hint={`${data.refunds.refundedCount} sudah ditransfer · ${formatRupiah(data.refunds.pendingAmount)} tertunda`} />
          </dl>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel title="Booking per status">
              {data.bookings.total === 0 ? (
                <p className="text-body-sm text-ink-500">Belum ada booking di periode ini.</p>
              ) : (
                <ul className="space-y-2.5">
                  {STATUS_ORDER.filter((status) => data.bookings.byStatus[status]).map((status) => {
                    const count = data.bookings.byStatus[status];
                    return (
                      <li key={status} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <StatusBadge kind="booking" status={status} />
                          <span className="text-body-sm font-semibold text-ink-900">{count}</span>
                        </div>
                        <span className="block h-2 rounded-full bg-surface-muted" aria-hidden>
                          <span className="block h-2 rounded-full bg-primary-600" style={{ width: `${(count / data.bookings.total) * 100}%` }} />
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
            <Panel title="Kursus terlaris">
              {data.topCourses.length === 0 ? (
                <p className="text-body-sm text-ink-500">Belum ada pendaftaran kursus di periode ini.</p>
              ) : (
                <ol className="divide-y divide-border">
                  {data.topCourses.map((course, index) => (
                    <li key={course.courseId} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                      <span className="w-5 text-body-sm text-ink-500">{index + 1}</span>
                      <Link href={`/admin/kursus/${course.courseId}`} className="min-w-0 flex-1 truncate text-body-sm font-semibold text-ink-900 hover:text-primary-600">{course.title}</Link>
                      <span className="shrink-0 text-body-sm text-ink-500">{course.enrollments} peserta · {formatRupiah(course.revenue)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Tutor aktif" value={String(data.tutors.active)} hint={`${data.users.tutors} akun tutor`} />
            <Stat label="Orang tua" value={String(data.users.parents)} />
            <Stat label="Siswa mandiri" value={String(data.users.students)} />
            <Stat label="Kursus terbit" value={String(data.courses.published)} hint={`${data.courses.draft} draf`} />
          </dl>
        </>
      )}
    </div>
  );
}
