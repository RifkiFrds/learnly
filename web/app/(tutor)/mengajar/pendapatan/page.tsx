'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Panel } from '@/components/common/Bits';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/States';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { useEarnings } from '@/hooks/api/account';
import { formatDate, formatDuration, formatRupiah, formatTime, wibDateString } from '@/lib/format';

/** 6 bulan terakhir (WIB) sebagai pilihan periode */
function recentMonths() {
  const [year, month] = wibDateString().split('-').map(Number);
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - index, 1));
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth() + 1;
    const next = new Date(Date.UTC(y, m, 1));
    return {
      key: `${y}-${String(m).padStart(2, '0')}`,
      label: new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date),
      from: `${y}-${String(m).padStart(2, '0')}-01T00:00:00+07:00`,
      to: `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01T00:00:00+07:00`,
    };
  });
}

export default function EarningsPage() {
  const [months] = useState(recentMonths);
  const [key, setKey] = useState(months[0].key);
  const period = months.find((month) => month.key === key)!;
  const query = useEarnings({ from: period.from, to: period.to });

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Pendapatan"
        description="Dihitung dari sesi yang sudah dibayar siswa. Biaya layanan platform tidak termasuk."
        actions={
          <div className="w-52 space-y-1.5">
            <Label htmlFor="periode" className="sr-only">Periode</Label>
            <NativeSelect id="periode" value={key} onChange={(e) => setKey(e.target.value)}>
              {months.map((month) => <option key={month.key} value={month.key}>{month.label}</option>)}
            </NativeSelect>
          </div>
        }
      />
      {query.isPending ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>
          <ListSkeleton count={3} />
        </>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <>
          <dl className="grid gap-4 sm:grid-cols-3">
            {[
              ['Pendapatan sesi selesai', formatRupiah(query.data.totalEarnings)],
              ['Menunggu sesi berlangsung', formatRupiah(query.data.upcomingEarnings)],
              ['Sesi selesai', `${query.data.completedSessions} sesi · ${formatDuration(Math.round(query.data.completedHours * 60)) || '0 jam'}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border bg-surface p-5">
                <dt className="text-body-sm text-ink-500">{label}</dt>
                <dd className="mt-1 font-display text-heading-lg text-ink-900">{value}</dd>
              </div>
            ))}
          </dl>
          <Panel title={`Rincian ${period.label}`}>
            {query.data.items.length === 0 ? (
              <EmptyState illustration="receipt" title="Belum ada sesi berbayar di periode ini." description="Pendapatan tercatat begitu pembayaran siswa terverifikasi." className="border-0 py-6" />
            ) : (
              <div className="-mx-5 overflow-x-auto">
                <table className="w-full min-w-[36rem] text-left text-body-sm">
                  <thead className="border-b border-border text-ink-500">
                    <tr>
                      <th scope="col" className="px-5 py-2 font-semibold">Jadwal</th>
                      <th scope="col" className="px-2 py-2 font-semibold">Sesi</th>
                      <th scope="col" className="px-2 py-2 font-semibold">Status</th>
                      <th scope="col" className="px-5 py-2 text-right font-semibold">Untukmu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {query.data.items.map((item) => (
                      <tr key={item.bookingId}>
                        <td className="px-5 py-3 whitespace-nowrap text-ink-700">{formatDate(item.scheduledStartAt)}, {formatTime(item.scheduledStartAt)}</td>
                        <td className="px-2 py-3">
                          <Link href={`/mengajar/booking/${item.bookingId}`} className="font-semibold text-ink-900 hover:text-primary-600">{item.subjectName}</Link>
                          <span className="block text-ink-500">{item.learnerName} · {formatDuration(item.durationMinutes)}</span>
                        </td>
                        <td className="px-2 py-3"><StatusBadge kind="booking" status={item.status} /></td>
                        <td className="px-5 py-3 text-right font-semibold whitespace-nowrap text-ink-900">{formatRupiah(item.earning)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
