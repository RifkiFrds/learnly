import { Check, CircleX } from 'lucide-react';
import { cn } from 'cn';
import { formatDateTime, formatTime } from '@/lib/format';
import { BOOKING_STEPS, STEP_SHORT_LABEL } from '@/lib/status';
import type { Booking } from '@/lib/types';

/**
 * Stepper status booking (docs/10 §5): horizontal di desktop, vertikal di mobile.
 * Langkah selesai = hijau + centang, langkah aktif = primary, berikutnya = abu.
 */
export function BookingStepper({ booking }: { booking: Booking }) {
  const steps = BOOKING_STEPS[booking.mode] as readonly string[];
  const history = booking.statusHistory ?? [];
  const reachedAt = (status: string) => history.findLast((row) => row.status === status)?.changedAt ?? null;

  if (booking.status === 'dibatalkan' || booking.status === 'rejected') {
    const at = reachedAt(booking.status);
    return (
      <div className="flex items-start gap-3 rounded-lg border border-danger-100 bg-danger-100/50 p-4" role="status">
        <CircleX className="mt-0.5 size-5 shrink-0 text-danger-600" aria-hidden />
        <div className="text-body-sm">
          <p className="font-semibold text-ink-900">
            {booking.status === 'rejected' ? 'Booking ditolak tutor' : 'Booking dibatalkan'}
            {at && <span className="font-normal text-ink-500"> · {formatDateTime(at)}</span>}
          </p>
          {booking.cancelReason && <p className="mt-1 text-ink-700">Alasan: {booking.cancelReason}</p>}
        </div>
      </div>
    );
  }

  const current = steps.indexOf(booking.status);
  return (
    <ol className="flex flex-col gap-0 md:flex-row md:items-start" aria-label="Progres booking">
      {steps.map((step, index) => {
        const done = index < current || booking.status === 'sesi_selesai';
        const active = index === current && booking.status !== 'sesi_selesai';
        const at = done || active ? reachedAt(step) : null;
        const last = index === steps.length - 1;
        return (
          <li
            key={step}
            className="relative flex gap-3 pb-5 md:flex-1 md:flex-col md:items-center md:gap-2 md:pb-0 md:text-center"
            aria-current={active ? 'step' : undefined}
          >
            {!last && (
              <span
                aria-hidden
                className={cn(
                  'absolute top-8 bottom-0 left-[0.9375rem] w-0.5 md:top-[0.9375rem] md:right-[-50%] md:bottom-auto md:left-1/2 md:h-0.5 md:w-auto',
                  done ? 'bg-success-600' : 'bg-border',
                )}
              />
            )}
            <span
              className={cn(
                'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 font-sans text-label-sm',
                done && 'border-success-600 bg-success-600 text-white',
                active && 'border-primary-600 bg-primary-100 text-primary-700',
                !done && !active && 'border-border bg-surface text-ink-500',
              )}
            >
              {done ? <Check className="size-4" aria-hidden /> : index + 1}
            </span>
            <span className="pt-1 md:pt-0">
              <span className={cn('block text-body-sm', active ? 'font-semibold text-ink-900' : done ? 'text-ink-900' : 'text-ink-500')}>
                {STEP_SHORT_LABEL[step]}
              </span>
              {at && <span className="block text-label-sm font-normal tracking-normal text-ink-500">{formatTime(at)} WIB</span>}
              <span className="sr-only">{done ? '(selesai)' : active ? '(sedang berlangsung)' : '(belum)'}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
