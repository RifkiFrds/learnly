'use client';

import { LocateFixed, MapPin, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { useSubjects } from '@/hooks/api/catalog';
import { currentPosition, geocode } from '@/lib/geo';

type Target = 'tutor' | 'kursus';
type Mode = 'tatap_muka' | 'online';

/** §8 Landing: search bar tutor/kursus langsung di hero, benar-benar mengarah ke pencarian */
export function HeroSearch() {
  const id = useId();
  const router = useRouter();
  const subjects = useSubjects();
  const [target, setTarget] = useState<Target>('tutor');
  const [mode, setMode] = useState<Mode>('tatap_muka');
  const [subjectId, setSubjectId] = useState('');
  const [location, setLocation] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function useMyLocation() {
    setMessage(null);
    try {
      const position = await currentPosition();
      setCoords(position);
      setLocation('Lokasiku saat ini');
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (target === 'kursus') {
      router.push(query.trim() ? `/kursus?q=${encodeURIComponent(query.trim())}` : '/kursus');
      return;
    }
    const params = new URLSearchParams();
    if (subjectId) params.set('subjectId', subjectId);
    params.set('mode', mode);
    if (mode === 'tatap_muka') {
      let point = coords;
      let label = location.trim();
      if (!point && label) {
        setBusy(true);
        const found = await geocode(label);
        setBusy(false);
        if (!found) {
          setMessage(`Lokasi "${label}" belum ketemu. Coba tulis nama kecamatan atau kota, mis. "Tebet, Jakarta".`);
          return;
        }
        point = found;
        label = found.label.split(',').slice(0, 2).join(',');
      }
      if (point) {
        params.set('lat', point.lat.toFixed(6));
        params.set('lng', point.lng.toFixed(6));
        params.set('lokasi', label || 'Lokasiku');
        params.set('sort', 'distance');
      }
    }
    router.push(`/tutor?${params.toString()}`);
  }

  const tabClass = (active: boolean) =>
    cn(
      'h-11 cursor-pointer rounded-md px-4 text-body-sm font-semibold transition-colors',
      active ? 'bg-surface text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-900',
    );

  return (
    <div className="w-full">
      <div className="mb-3 inline-flex rounded-lg bg-surface-muted p-1" role="group" aria-label="Yang ingin dicari">
        <button type="button" aria-pressed={target === 'tutor'} className={tabClass(target === 'tutor')} onClick={() => setTarget('tutor')}>
          Tutor
        </button>
        <button type="button" aria-pressed={target === 'kursus'} className={tabClass(target === 'kursus')} onClick={() => setTarget('kursus')}>
          Kursus online
        </button>
      </div>

      <form onSubmit={onSubmit} className="rounded-lg border border-border bg-surface p-3 shadow-md">
        {target === 'tutor' ? (
          <div className="grid gap-3 sm:grid-cols-[1fr_11rem] sm:items-end">
            <div>
              <label htmlFor={`${id}-subject`} className="mb-1.5 block text-label-sm text-ink-500 uppercase">
                Mau belajar apa?
              </label>
              <NativeSelect id={`${id}-subject`} value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
                <option value="">Semua mata pelajaran</option>
                {subjects.data?.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <fieldset>
              <legend className="mb-1.5 block text-label-sm text-ink-500 uppercase">Cara belajar</legend>
              <div className="grid grid-cols-2 rounded-lg border border-border p-0.5">
                {(['tatap_muka', 'online'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={mode === value}
                    onClick={() => setMode(value)}
                    className={cn(
                      'min-h-11 cursor-pointer rounded-md text-body-sm font-semibold',
                      mode === value ? 'bg-primary-100 text-primary-700' : 'text-ink-500 hover:text-ink-900',
                    )}
                  >
                    {value === 'online' ? 'Online' : 'Ke rumah'}
                  </button>
                ))}
              </div>
            </fieldset>
            {mode === 'tatap_muka' && (
              <div>
                <label htmlFor={`${id}-loc`} className="mb-1.5 block text-label-sm text-ink-500 uppercase">
                  Lokasi belajar
                </label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-500" aria-hidden />
                  <Input
                    id={`${id}-loc`}
                    value={location}
                    onChange={(event) => {
                      setLocation(event.target.value);
                      setCoords(null);
                    }}
                    placeholder="Kecamatan atau kota"
                    className="pr-12 pl-10"
                  />
                  <button
                    type="button"
                    onClick={useMyLocation}
                    className="absolute top-1/2 right-0 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-r-lg text-ink-500 hover:bg-surface-muted hover:text-primary-700"
                    aria-label="Gunakan lokasiku saat ini"
                    title="Gunakan lokasiku"
                  >
                    <LocateFixed className="size-4.5" />
                  </button>
                </div>
              </div>
            )}
            <Button type="submit" disabled={busy} className={mode === 'online' ? 'sm:col-span-2' : ''}>
              <Search aria-hidden /> {busy ? 'Mencari lokasi…' : 'Cari tutor'}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor={`${id}-q`} className="mb-1.5 block text-label-sm text-ink-500 uppercase">
                Topik atau judul kursus
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-500" aria-hidden />
                <Input id={`${id}-q`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Mis. aljabar, UTBK, bahasa Inggris" className="pl-10" />
              </div>
            </div>
            <Button type="submit">
              <Search aria-hidden /> Cari kursus
            </Button>
          </div>
        )}
      </form>
      <p aria-live="polite" className="mt-2 min-h-6 text-body-sm text-danger-600">
        {message}
      </p>
    </div>
  );
}
