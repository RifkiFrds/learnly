import { CalendarClock, ChevronRight, MapPin, Video } from 'lucide-react';
import Link from 'next/link';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatDate, formatDuration, formatRupiah, formatTimeRange } from '@/lib/format';
import type { Booking } from '@/lib/types';

/** Baris booking di daftar — siswa/orang tua melihat nama tutor, tutor melihat nama siswa. */
export function BookingCard({ booking, href, perspective }: { booking: Booking; href: string; perspective: 'owner' | 'tutor' }) {
  const counterpart = perspective === 'owner' ? `dengan ${booking.tutor.fullName}` : `${booking.learner.fullName}`;
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-primary-600 sm:p-5"
    >
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-sans text-body-md font-semibold text-ink-900">{booking.subject.name}</p>
          <StatusBadge kind="booking" status={booking.status} />
        </div>
        <p className="truncate text-body-sm text-ink-700">
          {counterpart}
          {perspective === 'owner' && <span className="text-ink-500"> · untuk {booking.learner.fullName}</span>}
        </p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-ink-500">
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="size-4" aria-hidden />
            {formatDate(booking.scheduledStartAt)}, {formatTimeRange(booking.scheduledStartAt, booking.scheduledEndAt)} · {formatDuration(booking.durationMinutes)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            {booking.mode === 'online' ? <Video className="size-4" aria-hidden /> : <MapPin className="size-4" aria-hidden />}
            {booking.mode === 'online' ? 'Online' : 'Tatap muka'}
          </span>
        </p>
      </div>
      <div className="hidden text-right sm:block">
        <p className="font-sans text-body-md font-semibold text-ink-900">{formatRupiah(booking.totalAmount)}</p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-ink-300 group-hover:text-primary-600" aria-hidden />
    </Link>
  );
}
