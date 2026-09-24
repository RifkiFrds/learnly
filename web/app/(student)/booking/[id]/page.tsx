'use client';

import { CreditCard, ExternalLink, Hourglass, Video } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Panel } from '@/components/common/Bits';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { CardSkeleton, ErrorState, PageSkeleton } from '@/components/common/States';
import { BookingInfo, TrackingMap } from '@/components/booking/BookingInfo';
import { BookingStepper } from '@/components/booking/BookingStepper';
import { CancelBookingButton } from '@/components/booking/CancelBookingButton';
import { QrCheckinPanel } from '@/components/booking/QrCheckinPanel';
import { ReportView } from '@/components/booking/ReportView';
import { BookingReviewSection } from '@/components/review/BookingReviewSection';
import { Button } from '@/components/ui/button';
import { useBooking, usePublicSettings, useReport } from '@/hooks/api/bookings';
import { formatDateTime, formatRupiah } from '@/lib/format';
import type { Booking } from '@/lib/types';

function StatusPanel({ booking }: { booking: Booking }) {
  const settings = usePublicSettings();
  const actions = booking.availableActions;

  switch (booking.status) {
    case 'pending_confirmation':
      return (
        <Panel>
          <div className="flex gap-3">
            <Hourglass className="mt-0.5 size-5 shrink-0 text-warning-600" aria-hidden />
            <p className="text-body-md text-ink-700">
              Menunggu {booking.tutor.fullName} menerima permintaan. Tutor punya waktu {settings.data?.bookingResponseHours ?? 24} jam; kamu akan diberi tahu begitu ada jawaban.
            </p>
          </div>
        </Panel>
      );
    case 'menunggu_pembayaran': {
      const payment = booking.payment;
      const verifying = payment?.status === 'menunggu_verifikasi';
      return (
        <Panel title={verifying ? 'Bukti bayar sedang diverifikasi' : 'Selesaikan pembayaran'}>
          <p className="text-body-md text-ink-700">
            {verifying
              ? 'Tim Learnly sedang memeriksa bukti transfermu. Biasanya selesai dalam beberapa jam kerja; status di halaman ini diperbarui otomatis.'
              : `Tutor sudah menerima. Bayar ${formatRupiah(booking.totalAmount)} lewat QRIS atau transfer bank, lalu unggah buktinya.`}
          </p>
          {payment && (
            <Button asChild className="mt-4" variant={verifying ? 'secondary' : 'default'}>
              <Link href={`/pembayaran/${payment.id}`}><CreditCard /> {verifying ? 'Lihat pembayaran' : 'Bayar sekarang'}</Link>
            </Button>
          )}
        </Panel>
      );
    }
    case 'dikonfirmasi':
    case 'tutor_bersiap':
    case 'tutor_dalam_perjalanan':
    case 'tutor_tiba':
      if (booking.mode === 'online') return <OnlinePanel booking={booking} />;
      return (
        <div className="space-y-6">
          {(booking.status === 'tutor_dalam_perjalanan' || booking.status === 'tutor_tiba' || booking.latestLocation) && (
            <Panel title={booking.status === 'tutor_tiba' ? 'Tutor sudah tiba' : 'Posisi tutor'}>
              <TrackingMap booking={booking} />
            </Panel>
          )}
          {actions.includes('show_checkin_qr') && (
            <Panel title="QR check-in">
              <QrCheckinPanel bookingId={booking.id} />
            </Panel>
          )}
        </div>
      );
    case 'sesi_berlangsung':
      return (
        <Panel title="Sesi sedang berlangsung">
          <p className="text-body-md text-ink-700">
            Dimulai {formatDateTime(booking.checkedInAt)}. Setelah sesi, tutor mengisi laporan perkembangan dan laporan itu muncul di halaman ini.
          </p>
          {booking.mode === 'online' && booking.meetingLink && (
            <Button asChild className="mt-4"><a href={booking.meetingLink} target="_blank" rel="noreferrer"><Video /> Buka link meeting <ExternalLink /></a></Button>
          )}
        </Panel>
      );
    case 'sesi_selesai':
      return <ReportPanel booking={booking} />;
    default:
      return null;
  }
}

function OnlinePanel({ booking }: { booking: Booking }) {
  return (
    <Panel title="Sesi online">
      {booking.meetingLink ? (
        <div className="space-y-3">
          <p className="text-body-md text-ink-700">Link meeting sudah tersedia. Masuk beberapa menit sebelum jadwal.</p>
          <Button asChild><a href={booking.meetingLink} target="_blank" rel="noreferrer"><Video /> Buka link meeting <ExternalLink /></a></Button>
        </div>
      ) : (
        <p className="text-body-md text-ink-700">
          {booking.meetingLinkAvailableAt
            ? `Link meeting bisa dibuka mulai ${formatDateTime(booking.meetingLinkAvailableAt)}. Tutor akan melampirkannya sebelum sesi.`
            : 'Tutor akan melampirkan link meeting sebelum sesi dimulai. Kamu akan menerima notifikasi.'}
        </p>
      )}
    </Panel>
  );
}

function ReportPanel({ booking }: { booking: Booking }) {
  const report = useReport(booking.id, booking.hasProgressReport);
  return (
    <Panel title="Laporan perkembangan">
      {!booking.hasProgressReport ? (
        <p className="text-body-md text-ink-700">Laporan belum tersedia untuk sesi ini.</p>
      ) : report.isPending ? (
        <CardSkeleton lines={4} className="border-0 p-0" />
      ) : report.isError ? (
        <ErrorState error={report.error} onRetry={() => report.refetch()} />
      ) : (
        <ReportView report={report.data} />
      )}
    </Panel>
  );
}

export default function StudentBookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const query = useBooking(id);

  if (query.isPending) return <PageSkeleton />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} title="Booking tidak bisa dibuka" />;
  const booking = query.data;

  return (
    <div className="max-w-5xl">
      <PageHeader
        title={`${booking.subject.name} dengan ${booking.tutor.fullName}`}
        description={<span className="inline-flex flex-wrap items-center gap-2">Booking #{booking.id} <StatusBadge kind="booking" status={booking.status} /></span>}
        back={{ href: '/booking', label: 'Semua booking' }}
      />
      <Panel className="mb-6">
        <BookingStepper booking={booking} />
        {booking.polling.shouldPoll && <p className="mt-4 text-body-sm text-ink-500">Status diperbarui otomatis.</p>}
      </Panel>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="min-w-0 space-y-6">
          <StatusPanel booking={booking} />
          {booking.status === 'sesi_selesai' && <BookingReviewSection booking={booking} />}
          {booking.payment?.refundAmount ? (
            <Panel title="Refund">
              <p className="text-body-md text-ink-700">
                Refund {formatRupiah(booking.payment.refundAmount)} {booking.payment.status === 'refunded' ? 'sudah ditransfer oleh tim Learnly.' : 'sedang diproses tim Learnly lewat transfer manual.'}
              </p>
            </Panel>
          ) : null}
          {booking.availableActions.includes('cancel') && (
            <Panel title="Perlu membatalkan?">
              <p className="mb-4 text-body-sm text-ink-700">Pembatalan tidak bisa diurungkan. Besaran refund mengikuti kebijakan pembatalan dan akan ditampilkan sebelum kamu mengonfirmasi.</p>
              <CancelBookingButton booking={booking} by="student" />
            </Panel>
          )}
        </div>
        <aside className="lg:sticky lg:top-24">
          <BookingInfo booking={booking} perspective="owner" />
        </aside>
      </div>
    </div>
  );
}
