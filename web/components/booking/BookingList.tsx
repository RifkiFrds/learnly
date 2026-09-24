'use client';

import { Pagination } from '@/components/common/Bits';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/States';
import { BookingCard } from '@/components/booking/BookingCard';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLearners } from '@/hooks/api/account';
import { useBookings } from '@/hooks/api/bookings';
import { useQueryParams } from '@/hooks/useQueryParams';

export const ACTIVE_STATUSES = 'pending_confirmation,menunggu_pembayaran,dikonfirmasi,tutor_bersiap,tutor_dalam_perjalanan,tutor_tiba,sesi_berlangsung';
const HISTORY_STATUSES = 'sesi_selesai,dibatalkan,rejected';
const KEYS = ['tab', 'anak'] as const;

/** Daftar booking dengan tab Aktif/Riwayat; orang tua bisa memfilter per anak. */
export function BookingList({ perspective, showLearnerFilter = false }: { perspective: 'owner' | 'tutor'; showLearnerFilter?: boolean }) {
  const { values, update, page } = useQueryParams(KEYS);
  const tab = values.tab === 'riwayat' ? 'riwayat' : 'aktif';
  const learners = useLearners(showLearnerFilter);
  const children = (learners.data ?? []).filter((learner) => !learner.isSelf);
  const query = useBookings(
    { status: tab === 'aktif' ? ACTIVE_STATUSES : HISTORY_STATUSES, learnerId: values.anak, page, limit: 10 },
    { poll: tab === 'aktif' },
  );
  const base = perspective === 'owner' ? '/booking' : '/mengajar/booking';

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Tabs value={tab} onValueChange={(value) => update({ tab: value === 'aktif' ? undefined : value })}>
          <TabsList>
            <TabsTrigger value="aktif">Aktif</TabsTrigger>
            <TabsTrigger value="riwayat">Selesai & dibatalkan</TabsTrigger>
          </TabsList>
        </Tabs>
        {showLearnerFilter && children.length > 1 && (
          <div className="space-y-1.5 sm:w-56">
            <Label htmlFor="filter-anak" className="text-body-sm font-semibold text-ink-900">Anak</Label>
            <NativeSelect id="filter-anak" value={values.anak ?? ''} onChange={(e) => update({ anak: e.target.value || undefined })}>
              <option value="">Semua anak</option>
              {children.map((child) => <option key={child.id} value={child.id}>{child.fullName}</option>)}
            </NativeSelect>
          </div>
        )}
      </div>
      {query.isPending ? (
        <ListSkeleton count={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.items.length === 0 ? (
        tab === 'aktif' ? (
          perspective === 'owner' ? (
            <EmptyState illustration="calendar" title="Belum ada sesi yang berjalan." description="Cari tutor yang cocok, pilih jadwal, dan sesi pertamamu akan muncul di sini." action={{ label: 'Cari tutor', href: '/tutor' }} />
          ) : (
            <EmptyState illustration="calendar" title="Belum ada booking aktif." description="Pastikan jadwal mingguan & wilayah layananmu lengkap agar siswa bisa memesan." action={{ label: 'Atur jadwal', href: '/mengajar/jadwal' }} />
          )
        ) : (
          <EmptyState illustration="receipt" title="Belum ada riwayat sesi." description="Sesi yang selesai atau dibatalkan akan tersimpan di sini." />
        )
      ) : (
        <>
          <ul className="space-y-3">
            {query.data.items.map((booking) => (
              <li key={booking.id}>
                <BookingCard booking={booking} href={`${base}/${booking.id}`} perspective={perspective} />
              </li>
            ))}
          </ul>
          <Pagination meta={query.data.meta} onPage={(next) => update({ page: String(next) }, false)} />
        </>
      )}
    </div>
  );
}
