'use client';

import { ArrowRight, BookOpen, CreditCard, Search } from 'lucide-react';
import Link from 'next/link';
import { Panel } from '@/components/common/Bits';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/States';
import { BookingCard } from '@/components/booking/BookingCard';
import { Button } from '@/components/ui/button';
import { useLearners } from '@/hooks/api/account';
import { useBookings, useReports } from '@/hooks/api/bookings';
import { useAuth } from '@/lib/auth';
import { formatDate, formatRupiah } from '@/lib/format';

const UPCOMING = 'pending_confirmation,dikonfirmasi,tutor_bersiap,tutor_dalam_perjalanan,tutor_tiba,sesi_berlangsung';

function NeedsPayment() {
  const query = useBookings({ status: 'menunggu_pembayaran', limit: 5 }, { poll: true });
  if (!query.data || query.data.items.length === 0) return null;
  return (
    <section aria-labelledby="pay-title" className="rounded-lg border border-warning-100 bg-warning-100/40 p-5">
      <h2 id="pay-title" className="font-sans text-heading-md text-ink-900">Menunggu pembayaranmu</h2>
      <ul className="mt-3 space-y-3">
        {query.data.items.map((booking) => {
          const verifying = booking.payment?.status === 'menunggu_verifikasi';
          return (
            <li key={booking.id} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-sans text-body-md font-semibold text-ink-900">{booking.subject.name} dengan {booking.tutor.fullName}</p>
                <p className="text-body-sm text-ink-500">
                  {formatDate(booking.scheduledStartAt)} · {formatRupiah(booking.totalAmount)}
                  {verifying ? ' · bukti sedang diverifikasi' : ''}
                </p>
              </div>
              {booking.payment && (
                <Button asChild size="sm" variant={verifying ? 'secondary' : 'default'}>
                  <Link href={`/pembayaran/${booking.payment.id}`}><CreditCard /> {verifying ? 'Lihat' : 'Bayar'}</Link>
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Upcoming() {
  const query = useBookings({ status: UPCOMING, limit: 4 }, { poll: true });
  return (
    <Panel title="Sesi mendatang" action={<Link href="/booking" className="inline-flex min-h-11 items-center gap-1 text-body-sm font-semibold text-primary-600 hover:text-primary-700">Semua <ArrowRight className="size-4" aria-hidden /></Link>}>
      {query.isPending ? (
        <ListSkeleton count={2} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <EmptyState illustration="calendar" title="Belum ada sesi terjadwal." description="Temukan tutor yang cocok berdasarkan mapel dan lokasi." action={{ label: 'Cari tutor', href: '/tutor' }} className="border-0 py-6" />
      ) : (
        <ul className="space-y-3">
          {query.data.items.map((booking) => (
            <li key={booking.id}><BookingCard booking={booking} href={`/booking/${booking.id}`} perspective="owner" /></li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function LatestReports() {
  const query = useReports({ limit: 3 });
  return (
    <Panel title="Laporan terbaru" action={<Link href="/laporan" className="inline-flex min-h-11 items-center gap-1 text-body-sm font-semibold text-primary-600 hover:text-primary-700">Semua <ArrowRight className="size-4" aria-hidden /></Link>}>
      {query.isPending ? (
        <ListSkeleton count={2} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <p className="text-body-sm text-ink-500">Laporan dari tutor akan muncul di sini setelah sesi selesai.</p>
      ) : (
        <ul className="divide-y divide-border">
          {query.data.items.map((report) => (
            <li key={report.id} className="py-3 first:pt-0 last:pb-0">
              <Link href={`/booking/${report.bookingId}`} className="block hover:text-primary-600">
                <p className="font-sans text-body-sm font-semibold text-ink-900">{report.subject.name} · {report.learner.fullName}</p>
                <p className="line-clamp-2 text-body-sm text-ink-700">{report.materialsCovered}</p>
                <p className="text-body-sm text-ink-500">{formatDate(report.createdAt)} · {report.understandingLabel}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const learners = useLearners();
  const isParent = user?.role === 'parent';
  const children = (learners.data ?? []).filter((learner) => !learner.isSelf);

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        title={`Halo, ${user?.fullName.split(' ')[0] ?? ''}`}
        description={isParent ? 'Pantau jadwal les, pembayaran, dan perkembangan anak-anakmu.' : 'Jadwal les, kursus, dan perkembangan belajarmu.'}
        actions={
          <>
            <Button asChild><Link href="/tutor"><Search /> Cari tutor</Link></Button>
            <Button asChild variant="secondary"><Link href="/kursus"><BookOpen /> Kursus online</Link></Button>
          </>
        }
      />
      {isParent && learners.data && children.length === 0 && (
        <EmptyState illustration="people" title="Tambahkan profil anak dulu." description="Booking & kursus selalu atas nama salah satu anak." action={{ label: 'Tambah profil anak', href: '/anak' }} />
      )}
      <NeedsPayment />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <Upcoming />
        <LatestReports />
      </div>
    </div>
  );
}
