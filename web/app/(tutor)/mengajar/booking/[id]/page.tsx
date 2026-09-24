'use client';

import { useParams } from 'next/navigation';
import { Panel } from '@/components/common/Bits';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { CardSkeleton, ErrorState, PageSkeleton } from '@/components/common/States';
import { BookingInfo } from '@/components/booking/BookingInfo';
import { BookingStepper } from '@/components/booking/BookingStepper';
import { CancelBookingButton } from '@/components/booking/CancelBookingButton';
import { ReportView } from '@/components/booking/ReportView';
import { TutorBookingControls } from '@/components/booking/TutorBookingControls';
import { MapView } from '@/components/map';
import { BookingReviewSection } from '@/components/review/BookingReviewSection';
import { useBooking, useReport } from '@/hooks/api/bookings';
import type { Booking } from '@/lib/types';

function SubmittedReport({ booking }: { booking: Booking }) {
  const report = useReport(booking.id, booking.hasProgressReport);
  if (!booking.hasProgressReport) return null;
  return (
    <Panel title="Laporan yang kamu kirim">
      {report.isPending ? <CardSkeleton lines={4} className="border-0 p-0" /> : report.isError ? <ErrorState error={report.error} onRetry={() => report.refetch()} /> : <ReportView report={report.data} />}
    </Panel>
  );
}

export default function TutorBookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const query = useBooking(id);

  if (query.isPending) return <PageSkeleton />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} title="Booking tidak bisa dibuka" />;
  const booking = query.data;
  const address = booking.address;

  return (
    <div className="max-w-5xl">
      <PageHeader
        title={`${booking.subject.name} · ${booking.learner.fullName}`}
        description={<span className="inline-flex flex-wrap items-center gap-2">Booking #{booking.id} <StatusBadge kind="booking" status={booking.status} /></span>}
        back={{ href: '/mengajar/booking', label: 'Semua booking' }}
      />
      <Panel className="mb-6">
        <BookingStepper booking={booking} />
      </Panel>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="min-w-0 space-y-6">
          <TutorBookingControls booking={booking} />
          <SubmittedReport booking={booking} />
          {booking.status === 'sesi_selesai' && <BookingReviewSection booking={booking} perspective="tutor" />}
          {address && !booking.isFinal && (
            <Panel title="Lokasi belajar">
              <MapView center={{ lat: address.latitude, lng: address.longitude }} markers={[{ lat: address.latitude, lng: address.longitude, label: address.fullAddress }]} zoom={15} className="h-64 w-full rounded-lg border border-border" />
              <a
                href={`https://www.openstreetmap.org/directions?to=${address.latitude}%2C${address.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex min-h-11 items-center text-body-sm font-semibold text-primary-600 hover:text-primary-700"
              >
                Buka petunjuk arah
              </a>
            </Panel>
          )}
          {booking.availableActions.includes('cancel') && booking.status !== 'pending_confirmation' && (
            <Panel title="Tidak bisa hadir?">
              <p className="mb-4 text-body-sm text-ink-700">Batalkan secepatnya agar siswa sempat mencari jadwal lain. Siswa selalu mendapat refund penuh bila tutor membatalkan.</p>
              <CancelBookingButton booking={booking} by="tutor" />
            </Panel>
          )}
        </div>
        <aside className="lg:sticky lg:top-24">
          <BookingInfo booking={booking} perspective="tutor" />
        </aside>
      </div>
    </div>
  );
}
