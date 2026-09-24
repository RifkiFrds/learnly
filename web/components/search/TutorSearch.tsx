'use client';

import { LocateFixed, Map as MapIcon, MapPin, SlidersHorizontal, X } from 'lucide-react';
import { useId, useState } from 'react';
import { Pagination } from '@/components/common/Bits';
import { EmptyState, ErrorState, GridSkeleton } from '@/components/common/States';
import { MapView } from '@/components/map';
import { TutorCard } from '@/components/tutor/TutorCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useEducationLevels, useSubjects, useTutorSearch } from '@/hooks/api/catalog';
import { useQueryParams } from '@/hooks/useQueryParams';
import { currentPosition, geocode } from '@/lib/geo';

const KEYS = ['subjectId', 'educationLevelId', 'mode', 'minRate', 'maxRate', 'minRating', 'lat', 'lng', 'radiusKm', 'lokasi', 'sort', 'q'] as const;
type Values = Record<(typeof KEYS)[number], string | undefined>;
type Update = ReturnType<typeof useQueryParams<(typeof KEYS)[number]>>['update'];

function Filters({ values, update }: { values: Values; update: Update }) {
  const id = useId();
  const subjects = useSubjects();
  const levels = useEducationLevels();
  const [place, setPlace] = useState('');
  const [locMessage, setLocMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const hasLocation = Boolean(values.lat && values.lng);

  async function setLocationFromText() {
    if (!place.trim()) return;
    setBusy(true);
    setLocMessage(null);
    const found = await geocode(place.trim());
    setBusy(false);
    if (!found) {
      setLocMessage('Lokasi belum ketemu. Coba nama kecamatan atau kota.');
      return;
    }
    update({
      lat: found.lat.toFixed(6),
      lng: found.lng.toFixed(6),
      lokasi: found.label.split(',').slice(0, 2).join(','),
      mode: 'tatap_muka',
      sort: 'distance',
    });
    setPlace('');
  }

  async function useMyLocation() {
    setLocMessage(null);
    try {
      const point = await currentPosition();
      update({ lat: point.lat.toFixed(6), lng: point.lng.toFixed(6), lokasi: 'Lokasiku saat ini', mode: 'tatap_muka', sort: 'distance' });
    } catch (err) {
      setLocMessage((err as Error).message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-subject`} className="text-body-sm font-semibold text-ink-900">Mata pelajaran</Label>
        <NativeSelect id={`${id}-subject`} value={values.subjectId ?? ''} onChange={(e) => update({ subjectId: e.target.value })}>
          <option value="">Semua mapel</option>
          {subjects.data?.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-level`} className="text-body-sm font-semibold text-ink-900">Jenjang</Label>
        <NativeSelect id={`${id}-level`} value={values.educationLevelId ?? ''} onChange={(e) => update({ educationLevelId: e.target.value })}>
          <option value="">Semua jenjang</option>
          {levels.data?.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </NativeSelect>
      </div>
      <fieldset className="space-y-1.5">
        <legend className="mb-1.5 text-body-sm font-semibold text-ink-900">Cara belajar</legend>
        <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-surface p-1">
          {[
            ['', 'Semua'],
            ['tatap_muka', 'Ke rumah'],
            ['online', 'Online'],
          ].map(([value, label]) => {
            const active = (values.mode ?? '') === value;
            return (
              <button
                key={value || 'all'}
                type="button"
                aria-pressed={active}
                onClick={() => update(value === 'online' ? { mode: value, lat: undefined, lng: undefined, lokasi: undefined, sort: values.sort === 'distance' ? undefined : values.sort } : { mode: value })}
                className={`min-h-11 cursor-pointer rounded-md text-body-sm font-semibold ${active ? 'bg-primary-100 text-primary-700' : 'text-ink-500 hover:text-ink-900'}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {values.mode !== 'online' && (
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-place`} className="text-body-sm font-semibold text-ink-900">Lokasi belajar</Label>
          {hasLocation ? (
            <div className="flex items-start justify-between gap-2 rounded-lg border border-primary-100 bg-primary-100/50 px-3 py-2.5">
              <span className="flex items-start gap-2 text-body-sm text-ink-900">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary-600" aria-hidden />
                {values.lokasi || 'Titik di peta'}
              </span>
              <button
                type="button"
                onClick={() => update({ lat: undefined, lng: undefined, lokasi: undefined, sort: values.sort === 'distance' ? undefined : values.sort })}
                className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-500 hover:bg-surface"
                aria-label="Hapus lokasi"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <Input
                  id={`${id}-place`}
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setLocationFromText();
                    }
                  }}
                  placeholder="Kecamatan atau kota"
                />
                <Button type="button" variant="secondary" size="icon" onClick={useMyLocation} aria-label="Pakai lokasiku">
                  <LocateFixed />
                </Button>
              </div>
              <Button type="button" variant="secondary" size="sm" className="w-full" onClick={setLocationFromText} disabled={busy || !place.trim()}>
                {busy ? 'Mencari…' : 'Terapkan lokasi'}
              </Button>
            </>
          )}
          {locMessage && <p className="text-body-sm text-danger-600" role="alert">{locMessage}</p>}
          {hasLocation && (
            <div className="space-y-1.5 pt-1">
              <Label htmlFor={`${id}-radius`} className="text-body-sm text-ink-700">Jarak maksimal</Label>
              <NativeSelect id={`${id}-radius`} value={values.radiusKm ?? ''} onChange={(e) => update({ radiusKm: e.target.value })}>
                <option value="">Sesuai wilayah tutor</option>
                {[3, 5, 10, 20].map((km) => (
                  <option key={km} value={km}>≤ {km} km</option>
                ))}
              </NativeSelect>
            </div>
          )}
        </div>
      )}

      <fieldset>
        <legend className="mb-1.5 text-body-sm font-semibold text-ink-900">Tarif per jam (Rp)</legend>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor={`${id}-min`} className="sr-only">Tarif minimum</Label>
            <Input
              id={`${id}-min`}
              type="number"
              inputMode="numeric"
              min={0}
              step={10000}
              placeholder="Min"
              defaultValue={values.minRate}
              onBlur={(e) => update({ minRate: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor={`${id}-max`} className="sr-only">Tarif maksimum</Label>
            <Input
              id={`${id}-max`}
              type="number"
              inputMode="numeric"
              min={0}
              step={10000}
              placeholder="Maks"
              defaultValue={values.maxRate}
              onBlur={(e) => update({ maxRate: e.target.value })}
            />
          </div>
        </div>
      </fieldset>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-rating`} className="text-body-sm font-semibold text-ink-900">Rating minimal</Label>
        <NativeSelect id={`${id}-rating`} value={values.minRating ?? ''} onChange={(e) => update({ minRating: e.target.value })}>
          <option value="">Semua rating</option>
          {[4.5, 4, 3.5].map((r) => (
            <option key={r} value={r}>{r.toLocaleString('id-ID')} ke atas</option>
          ))}
        </NativeSelect>
      </div>
    </div>
  );
}

export function TutorSearch() {
  const { values, update, page } = useQueryParams(KEYS);
  const [showMap, setShowMap] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const hasLocation = Boolean(values.lat && values.lng);
  const sort = values.sort ?? (hasLocation ? 'distance' : 'relevance');

  const { data, isPending, isError, error, refetch, isFetching } = useTutorSearch({
    subjectId: values.subjectId,
    educationLevelId: values.educationLevelId,
    mode: values.mode,
    minRate: values.minRate,
    maxRate: values.maxRate,
    minRating: values.minRating,
    lat: values.lat,
    lng: values.lng,
    radiusKm: values.radiusKm,
    q: values.q,
    sort,
    page,
    limit: 12,
  });

  const activeFilters = ['subjectId', 'educationLevelId', 'mode', 'minRate', 'maxRate', 'minRating', 'lat'].filter(
    (key) => values[key as keyof Values],
  ).length;
  const reset = () =>
    update({ subjectId: undefined, educationLevelId: undefined, mode: undefined, minRate: undefined, maxRate: undefined, minRating: undefined, lat: undefined, lng: undefined, lokasi: undefined, radiusKm: undefined, sort: undefined, q: undefined });

  return (
    <div className="mx-auto max-w-content px-4 py-8 md:px-8">
      <h1 className="text-heading-lg md:text-display-md">Cari tutor</h1>
      <p className="mt-1 text-body-md text-ink-500">
        {hasLocation ? `Tutor yang melayani ${!values.lokasi || values.lokasi === 'Titik di peta' ? 'titik yang kamu pilih' : values.lokasi}, terdekat di atas.` : 'Filter berdasarkan mapel, jenjang, tarif, dan lokasi belajar.'}
      </p>

      <div className="mt-6 grid gap-8 md:grid-cols-[16rem_1fr]">
        {/* §8: sidebar filter kiri (sticky) di md+, bottom-sheet di mobile */}
        <aside className="hidden md:block" aria-label="Filter pencarian">
          <div className="sticky top-24 rounded-lg border border-border bg-surface-muted/60 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-sans text-body-md font-semibold text-ink-900">Filter</h2>
              {activeFilters > 0 && (
                <button type="button" onClick={reset} className="rounded-sm text-body-sm font-semibold text-primary-700 hover:underline">
                  Reset
                </button>
              )}
            </div>
            <Filters values={values} update={update} />
          </div>
        </aside>

        <section aria-label="Hasil pencarian" aria-busy={isFetching} className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-body-sm text-ink-500" aria-live="polite">
              {data ? `${data.meta.total} tutor ditemukan` : 'Mencari tutor…'}
            </p>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="secondary" size="sm" className="md:hidden">
                    <SlidersHorizontal /> Filter{activeFilters ? ` (${activeFilters})` : ''}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl bg-background">
                  <SheetHeader>
                    <SheetTitle className="font-display text-heading-lg">Filter tutor</SheetTitle>
                  </SheetHeader>
                  <div className="px-4 pb-4">
                    <Filters values={values} update={update} />
                    <div className="mt-6 grid grid-cols-2 gap-2">
                      <Button variant="secondary" onClick={reset}>Reset</Button>
                      <Button onClick={() => setSheetOpen(false)}>
                        Lihat {data?.meta.total ?? ''} tutor
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              {values.mode !== 'online' && (
                <Button variant="secondary" size="sm" onClick={() => setShowMap((v) => !v)} aria-pressed={showMap}>
                  <MapIcon /> {showMap ? 'Sembunyikan peta' : 'Pilih di peta'}
                </Button>
              )}
              <label htmlFor="sort" className="sr-only">Urutkan</label>
              <NativeSelect id="sort" value={sort} onChange={(e) => update({ sort: e.target.value })} wrapperClassName="min-w-0 flex-1 sm:w-44 sm:flex-none" className="h-11 text-body-sm md:h-9">
                <option value="relevance">Paling relevan</option>
                {hasLocation && <option value="distance">Jarak terdekat</option>}
                <option value="rating">Rating tertinggi</option>
                <option value="price_asc">Tarif termurah</option>
                <option value="price_desc">Tarif termahal</option>
              </NativeSelect>
            </div>
          </div>

          {showMap && values.mode !== 'online' && (
            <div className="mb-5">
              <div className="h-72 overflow-hidden rounded-lg border border-border">
                <MapView
                  className="h-full w-full"
                  center={hasLocation ? { lat: Number(values.lat), lng: Number(values.lng) } : { lat: -6.2088, lng: 106.8456 }}
                  markers={hasLocation ? [{ lat: Number(values.lat), lng: Number(values.lng), label: values.lokasi ?? 'Titik belajar' }] : []}
                  circles={hasLocation && values.radiusKm ? [{ lat: Number(values.lat), lng: Number(values.lng), radiusKm: Number(values.radiusKm) }] : []}
                  onMapClick={(point) =>
                    update({ lat: point.lat.toFixed(6), lng: point.lng.toFixed(6), lokasi: 'Titik di peta', mode: 'tatap_muka', sort: 'distance' })
                  }
                />
              </div>
              <p className="mt-2 text-body-sm text-ink-500">Klik peta untuk memindahkan titik belajar. Hasil otomatis diurutkan dari yang terdekat.</p>
            </div>
          )}

          {isPending ? (
            <GridSkeleton count={4} />
          ) : isError ? (
            <ErrorState error={error} onRetry={() => refetch()} />
          ) : data.items.length === 0 ? (
            <EmptyState
              illustration="search"
              title="Belum ada tutor yang cocok."
              description={hasLocation ? 'Coba perluas jarak, pindahkan titik lokasi, atau ubah filter lainnya.' : 'Coba longgarkan filter tarif atau rating.'}
              action={{ label: 'Reset filter', onClick: reset }}
            />
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                {data.items.map((tutor) => (
                  <TutorCard key={tutor.id} tutor={tutor} />
                ))}
              </div>
              <Pagination meta={data.meta} onPage={(p) => update({ page: p }, false)} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
