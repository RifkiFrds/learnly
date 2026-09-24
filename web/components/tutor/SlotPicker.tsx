'use client';

import { CalendarX } from 'lucide-react';
import { useMemo } from 'react';
import { cn } from 'cn';
import { ErrorState } from '@/components/common/States';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { useTutorSlots } from '@/hooks/api/catalog';
import { formatDuration, wibDateString } from '@/lib/format';

export const DURATIONS = [60, 90, 120, 150, 180, 240];

/** 14 hari ke depan (WIB) sebagai pilihan tanggal */
export function upcomingDates(days = 14) {
  return Array.from({ length: days }, (_, index) => wibDateString(index));
}

function dateChipLabel(date: string) {
  const d = new Date(`${date}T00:00:00+07:00`);
  return {
    weekday: new Intl.DateTimeFormat('id-ID', { weekday: 'short', timeZone: 'Asia/Jakarta' }).format(d),
    day: new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' }).format(d),
  };
}

/**
 * Pilih tanggal → durasi → jam mulai. Jam mulai hanya aktif bila seluruh blok 30 menit
 * untuk durasi tsb kosong berurutan (FR-TUTOR-05, FR-BOOK-06).
 */
export function SlotPicker({
  tutorId,
  date,
  onDate,
  duration,
  onDuration,
  startAt,
  onStart,
}: {
  tutorId: number | string;
  date: string;
  onDate: (date: string) => void;
  duration: number;
  onDuration: (minutes: number) => void;
  startAt: string | null;
  onStart: (startAt: string | null) => void;
}) {
  const slots = useTutorSlots(tutorId, date);
  const dates = useMemo(() => upcomingDates(), []);

  const startable = useMemo(() => {
    const list = slots.data?.slots ?? [];
    const starts = new Set(list.map((slot) => new Date(slot.startAt).getTime()));
    const blocks = duration / 30;
    return list.map((slot) => {
      const start = new Date(slot.startAt).getTime();
      let fits = true;
      for (let i = 1; i < blocks; i++) {
        if (!starts.has(start + i * 30 * 60_000)) fits = false;
      }
      return { ...slot, fits };
    });
  }, [slots.data, duration]);

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-body-sm font-semibold text-ink-900">Tanggal</legend>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2" role="radiogroup" aria-label="Pilih tanggal">
          {dates.map((value) => {
            const label = dateChipLabel(value);
            const active = value === date;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  onDate(value);
                  onStart(null);
                }}
                className={cn(
                  'flex min-h-14 min-w-16 shrink-0 cursor-pointer flex-col items-center justify-center rounded-lg border px-2 text-center transition-colors',
                  active ? 'border-primary-600 bg-primary-100 text-primary-700' : 'border-border bg-surface text-ink-700 hover:bg-surface-muted',
                )}
              >
                <span className="text-label-sm uppercase">{label.weekday}</span>
                <span className="text-body-sm font-semibold">{label.day}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="max-w-xs space-y-1.5">
        <Label htmlFor="duration" className="text-body-sm font-semibold text-ink-900">Durasi sesi</Label>
        <NativeSelect
          id="duration"
          value={duration}
          onChange={(event) => {
            onDuration(Number(event.target.value));
            onStart(null);
          }}
        >
          {DURATIONS.map((minutes) => (
            <option key={minutes} value={minutes}>{formatDuration(minutes)}</option>
          ))}
        </NativeSelect>
      </div>

      <fieldset>
        <legend className="mb-2 text-body-sm font-semibold text-ink-900">Jam mulai (WIB)</legend>
        {slots.isPending ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {Array.from({ length: 10 }).map((_, index) => (
              <Skeleton key={index} className="h-11" />
            ))}
          </div>
        ) : slots.isError ? (
          <ErrorState error={slots.error} onRetry={() => slots.refetch()} />
        ) : startable.length === 0 ? (
          <p className="flex items-start gap-2 rounded-lg bg-surface-muted px-4 py-3 text-body-sm text-ink-700">
            <CalendarX className="mt-0.5 size-4 shrink-0 text-ink-500" aria-hidden />
            {slots.data.isBlocked ? 'Tutor sedang tidak menerima sesi di tanggal ini.' : 'Tidak ada jam kosong di tanggal ini. Coba tanggal lain.'}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Pilih jam mulai">
            {startable.map((slot) => {
              const active = startAt === slot.startAt;
              return (
                <button
                  key={slot.startAt}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={!slot.fits}
                  title={slot.fits ? undefined : `Tidak cukup waktu untuk sesi ${formatDuration(duration)}`}
                  onClick={() => onStart(slot.startAt)}
                  className={cn(
                    'min-h-11 cursor-pointer rounded-lg border font-mono text-body-sm transition-colors disabled:cursor-not-allowed disabled:border-transparent disabled:bg-surface-muted disabled:text-ink-300 disabled:line-through',
                    active ? 'border-primary-600 bg-primary-600 text-white' : 'border-border bg-surface text-ink-900 hover:border-primary-600',
                  )}
                >
                  {slot.startTime}
                </button>
              );
            })}
          </div>
        )}
      </fieldset>
    </div>
  );
}
