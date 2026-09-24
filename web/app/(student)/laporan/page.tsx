'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { Pagination } from '@/components/common/Bits';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/States';
import { ReportView } from '@/components/booking/ReportView';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { useLearners } from '@/hooks/api/account';
import { useReports } from '@/hooks/api/bookings';
import { useSubjects } from '@/hooks/api/catalog';
import { useQueryParams } from '@/hooks/useQueryParams';
import { useAuth } from '@/lib/auth';
import { formatDate, formatDuration, formatTime } from '@/lib/format';

const KEYS = ['anak', 'mapel'] as const;

function ReportsContent() {
  const { user } = useAuth();
  const isParent = user?.role === 'parent';
  const { values, update, page } = useQueryParams(KEYS);
  const learners = useLearners();
  const subjects = useSubjects();
  const children = (learners.data ?? []).filter((learner) => !learner.isSelf);
  const query = useReports({ learnerId: values.anak, subjectId: values.mapel, page, limit: 10 });
  const filtered = Boolean(values.anak || values.mapel);

  return (
    <div className="max-w-4xl">
      <PageHeader title="Laporan perkembangan" description="Catatan tutor setelah setiap sesi: materi, tingkat pemahaman, dan pekerjaan rumah." />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 md:max-w-xl">
        {isParent && children.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="filter-anak" className="text-body-sm font-semibold text-ink-900">Anak</Label>
            <NativeSelect id="filter-anak" value={values.anak ?? ''} onChange={(e) => update({ anak: e.target.value })}>
              <option value="">Semua anak</option>
              {children.map((child) => <option key={child.id} value={child.id}>{child.fullName}</option>)}
            </NativeSelect>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="filter-mapel" className="text-body-sm font-semibold text-ink-900">Mata pelajaran</Label>
          <NativeSelect id="filter-mapel" value={values.mapel ?? ''} onChange={(e) => update({ mapel: e.target.value })}>
            <option value="">Semua mapel</option>
            {subjects.data?.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </NativeSelect>
        </div>
      </div>
      {query.isPending ? (
        <ListSkeleton count={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.items.length === 0 ? (
        filtered ? (
          <EmptyState illustration="report" title="Tidak ada laporan untuk filter ini." description="Coba pilih anak atau mapel lain." action={{ label: 'Tampilkan semua', onClick: () => update({ anak: undefined, mapel: undefined }) }} />
        ) : (
          <EmptyState illustration="report" title="Belum ada laporan." description="Laporan muncul otomatis setelah tutor menyelesaikan sesi pertama." action={{ label: 'Cari tutor', href: '/tutor' }} />
        )
      ) : (
        <>
          <ul className="space-y-3">
            {query.data.items.map((report) => (
              <li key={report.id}>
                <details className="group rounded-lg border border-border bg-surface open:border-primary-600/40">
                  <summary className="flex min-h-16 cursor-pointer list-none items-center gap-4 p-5 [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0 flex-1">
                      <p className="font-sans text-body-md font-semibold text-ink-900">{report.subject.name} · {report.learner.fullName}</p>
                      <p className="text-body-sm text-ink-500">
                        {formatDate(report.session.scheduledStartAt)}, {formatTime(report.session.scheduledStartAt)} WIB · {formatDuration(report.session.durationMinutes)} · {report.tutor.fullName}
                      </p>
                      <p className="mt-1 line-clamp-1 text-body-sm text-ink-700 group-open:hidden">{report.materialsCovered}</p>
                    </div>
                    <span className="hidden shrink-0 rounded-full bg-success-100 px-2.5 py-1 text-label-sm text-success-600 sm:inline">{report.understandingLabel}</span>
                    <ChevronDown className="size-5 shrink-0 text-ink-500 transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <div className="border-t border-border p-5">
                    <ReportView report={report} />
                    <Link href={`/booking/${report.bookingId}`} className="mt-4 inline-flex min-h-11 items-center text-body-sm font-semibold text-primary-600 hover:text-primary-700">Lihat detail sesi</Link>
                  </div>
                </details>
              </li>
            ))}
          </ul>
          <Pagination meta={query.data.meta} onPage={(next) => update({ page: String(next) }, false)} />
        </>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <ReportsContent />
    </Suspense>
  );
}
