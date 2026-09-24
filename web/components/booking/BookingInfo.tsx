'use client';

import { MapPin, Phone } from 'lucide-react';
import { InfoRow, Panel } from '@/components/common/Bits';
import { StatusBadge } from '@/components/common/StatusBadge';
import { CostSummary } from '@/components/booking/CostSummary';
import { MapView } from '@/components/map';
import { formatDate, formatDateTime, formatDuration, formatRelative, formatTimeRange } from '@/lib/format';
import type { Booking } from '@/lib/types';

/** Rincian booking + biaya — dipakai halaman detail siswa & tutor. */
export function BookingInfo({ booking, perspective }: { booking: Booking; perspective: 'owner' | 'tutor' }) {
  const contact = perspective === 'owner' ? booking.tutor : booking.bookedBy;
  return (
    <Panel title="Rincian booking">
      <dl className="divide-y divide-border">
        <div className="pb-3">
          <InfoRow label="Mata pelajaran" value={booking.subject.name} />
          <InfoRow label="Siswa" value={booking.learner.fullName} />
          {perspective === 'owner' ? <InfoRow label="Tutor" value={booking.tutor.fullName} /> : <InfoRow label="Dipesan oleh" value={booking.bookedBy.fullName} />}
          <InfoRow label="Jadwal" value={`${formatDate(booking.scheduledStartAt)}, ${formatTimeRange(booking.scheduledStartAt, booking.scheduledEndAt)}`} />
          <InfoRow label="Durasi" value={formatDuration(booking.durationMinutes)} />
          <InfoRow label="Cara belajar" value={booking.mode === 'online' ? 'Online' : 'Tatap muka'} />
          {booking.address && <InfoRow label="Alamat" value={booking.address.fullAddress} />}
          {booking.address?.detailNote && <InfoRow label="Catatan alamat" value={booking.address.detailNote} />}
          {booking.checkedInAt && <InfoRow label="Mulai" value={formatDateTime(booking.checkedInAt)} />}
          {booking.checkedOutAt && <InfoRow label="Selesai" value={formatDateTime(booking.checkedOutAt)} />}
          {booking.actualDurationMinutes != null && <InfoRow label="Durasi aktual" value={formatDuration(booking.actualDurationMinutes)} />}
        </div>
        <div className="py-3">
          <CostSummary
            hourlyRate={booking.hourlyRateSnapshot}
            durationMinutes={booking.durationMinutes}
            subtotal={booking.subtotal}
            serviceFee={booking.serviceFee}
            total={booking.totalAmount}
          />
        </div>
        {booking.payment && (
          <div className="flex items-center justify-between gap-3 pt-3">
            <span className="text-body-sm text-ink-500">Pembayaran</span>
            <StatusBadge kind="payment" status={booking.payment.status} />
          </div>
        )}
      </dl>
      {contact.phone && !booking.isFinal && (
        <a
          href={`tel:${contact.phone}`}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-body-sm font-semibold text-primary-600 hover:text-primary-700"
        >
          <Phone className="size-4" aria-hidden /> Hubungi {perspective === 'owner' ? 'tutor' : 'pemesan'} ({contact.phone})
        </a>
      )}
    </Panel>
  );
}

/** Peta posisi terakhir tutor (dari location-ping) + alamat belajar (FR-TRACK-02). */
export function TrackingMap({ booking }: { booking: Booking }) {
  const location = booking.latestLocation;
  const address = booking.address;
  if (!address && !location) return null;
  const markers = [
    ...(address ? [{ lat: address.latitude, lng: address.longitude, label: `Alamat belajar: ${address.label}`, tone: 'primary' as const }] : []),
    ...(location ? [{ lat: location.latitude, lng: location.longitude, label: 'Posisi terakhir tutor', tone: 'info' as const }] : []),
  ];
  return (
    <div className="space-y-2">
      <MapView center={{ lat: markers[0].lat, lng: markers[0].lng }} markers={markers} zoom={14} className="h-72 w-full rounded-lg border border-border" />
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-ink-500">
        <span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-primary-600" aria-hidden /> Alamat belajar</span>
        {location ? (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4 text-info-600" aria-hidden /> Tutor · diperbarui {formatRelative(location.recordedAt)}
          </span>
        ) : (
          <span>Lokasi tutor muncul setelah tutor membagikannya.</span>
        )}
      </p>
    </div>
  );
}
