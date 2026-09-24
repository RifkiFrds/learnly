'use client';

import { ArrowRight, CalendarClock, MapPin, Video } from 'lucide-react';
import Link from 'next/link';
import { Panel } from '@/components/common/Bits';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/States';
import { BookingCard } from '@/components/booking/BookingCard';
import { RespondControls } from '@/components/booking/TutorBookingControls';
import { VerificationBanner } from '@/components/tutor/onboarding/VerificationBanner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useEarnings, useMyTutorProfile } from '@/hooks/api/account';
import { useBookings } from '@/hooks/api/bookings';
import { useAuth } from '@/lib/auth';
import { formatDate, formatDuration, formatRelative, formatRupiah, formatTimeRange } from '@/lib/format';

const UPCOMING = 'menunggu_pembayaran,dikonfirmasi,tutor_bersiap,tutor_dalam_perjalanan,tutor_tiba,sesi_berlangsung';

function IncomingRequests() {
  const query = useBookings({ status: 'pending_confirmation', limit: 20 }, { poll: true });
  if (query.isPending) return <ListSkeleton count={1} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (query.data.items.length === 0) return null;
  return (
    <section aria-labelledby="incoming-title" className="rounded-lg border border-warning-100 bg-warning-100/40 p-5">
      <h2 id="incoming-title" className="font-sans text-heading-md text-ink-900">
        {query.data.meta.total} permintaan menunggu jawabanmu
      </h2>
      <p className="mt-1 text-body-sm text-ink-700">Jawab secepatnya — permintaan yang tidak dijawab akan kedaluwarsa otomatis.</p>
      <ul className="mt-4 space-y-3">
        {query.data.items.map((booking) => (
          <li key={booking.id} className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 space-y-1">
              <Link href={`/mengajar/booking/${booking.id}`} className="font-sans text-body-md font-semibold text-ink-900 hover:text-primary-600">
                {booking.subject.name} · {booking.learner.fullName}
              </Link>
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-ink-500">
                <span className="inline-flex items-center gap-1.5"><CalendarClock className="size-4" aria-hidden />{formatDate(booking.scheduledStartAt)}, {formatTimeRange(booking.scheduledStartAt, booking.scheduledEndAt)}</span>
                <span className="inline-flex items-center gap-1.5">
                  {booking.mode === 'online' ? <Video className="size-4" aria-hidden /> : <MapPin className="size-4" aria-hidden />}
                  {booking.mode === 'online' ? 'Online' : booking.address?.label ?? 'Tatap muka'}
                </span>
                <span>{formatRupiah(booking.subtotal)} untukmu</span>
                <span>masuk {formatRelative(booking.createdAt)}</span>
              </p>
            </div>
            <RespondControls booking={booking} compact />
          </li>
        ))}
      </ul>
    </section>
  );
}

function UpcomingSessions() {
  const query = useBookings({ status: UPCOMING, limit: 5 }, { poll: true });
  return (
    <Panel title="Sesi mendatang" action={<Link href="/mengajar/booking" className="inline-flex min-h-11 items-center gap-1 text-body-sm font-semibold text-primary-600 hover:text-primary-700">Semua <ArrowRight className="size-4" aria-hidden /></Link>}>
      {query.isPending ? (
        <ListSkeleton count={2} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <EmptyState illustration="calendar" title="Belum ada sesi terjadwal." description="Sesi yang sudah diterima akan muncul di sini, lengkap dengan status pembayarannya." className="border-0 py-6" />
      ) : (
        <ul className="space-y-3">
          {query.data.items.map((booking) => (
            <li key={booking.id}><BookingCard booking={booking} href={`/mengajar/booking/${booking.id}`} perspective="tutor" /></li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function EarningsCard() {
  const query = useEarnings();
  return (
    <Panel title="Bulan ini" action={<Link href="/mengajar/pendapatan" className="inline-flex min-h-11 items-center gap-1 text-body-sm font-semibold text-primary-600 hover:text-primary-700">Rincian <ArrowRight className="size-4" aria-hidden /></Link>}>
      {query.isPending ? (
        <Skeleton className="h-20 w-full" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-body-sm text-ink-500">Pendapatan</dt>
            <dd className="font-display text-heading-lg text-ink-900">{formatRupiah(query.data.totalEarnings)}</dd>
          </div>
          <div>
            <dt className="text-body-sm text-ink-500">Sesi selesai</dt>
            <dd className="font-display text-heading-lg text-ink-900">{query.data.completedSessions}</dd>
          </div>
          <div className="col-span-2 text-body-sm text-ink-500">
            {query.data.upcomingEarnings > 0
              ? `${formatRupiah(query.data.upcomingEarnings)} lagi dari sesi yang sudah dibayar tapi belum berlangsung.`
              : `${formatDuration(Math.round(query.data.completedHours * 60)) || '0 jam'} mengajar tercatat.`}
          </div>
        </dl>
      )}
    </Panel>
  );
}

export default function TutorDashboardPage() {
  const { user } = useAuth();
  const profile = useMyTutorProfile();
  const verified = profile.data?.verificationStatus === 'verified';

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        title={`Halo, ${user?.fullName.split(' ')[0] ?? 'Tutor'}`}
        description="Permintaan baru, jadwal terdekat, dan pendapatanmu."
        actions={profile.data && <StatusBadge kind="verification" status={profile.data.verificationStatus} />}
      />
      {profile.data && !verified && <VerificationBanner profile={profile.data} />}
      <IncomingRequests />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <UpcomingSessions />
        <div className="space-y-6">
          <EarningsCard />
          <Panel title="Profil publik">
            <p className="text-body-sm text-ink-700">Lihat profilmu seperti yang dilihat siswa, lalu perbarui jadwal bila ada perubahan.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.data && <Button asChild variant="secondary" size="sm"><Link href={`/tutor/${profile.data.id}`}>Lihat profil</Link></Button>}
              <Button asChild variant="secondary" size="sm"><Link href="/mengajar/jadwal">Atur jadwal</Link></Button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
