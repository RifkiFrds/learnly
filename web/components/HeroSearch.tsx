'use client';

import { MapPin, Search } from 'lucide-react';
import { useId, useState } from 'react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type SearchTarget = 'tutor' | 'kursus';

const POPULAR_TOPICS = ['Matematika', 'Bahasa Inggris', 'Persiapan UTBK', 'Pemrograman'];

// Placeholder pencarian (belum terhubung ke API). Pencarian tutor dibangun di Fase 2,
// katalog kursus di Fase 4 — lihat docs/08-roadmap.md.
export function HeroSearch() {
  const id = useId();
  const [target, setTarget] = useState<SearchTarget>('tutor');
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="w-full">
      <div
        className="mb-3 inline-flex rounded-lg bg-surface-muted p-1"
        role="group"
        aria-label="Cari apa"
      >
        {(['tutor', 'kursus'] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={target === option}
            onClick={() => {
              setTarget(option);
              setSubmitted(false);
            }}
            className={cn(
              'h-9 cursor-pointer rounded-md px-4 text-body-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-600',
              target === option
                ? 'bg-surface text-ink-900 shadow-sm'
                : 'text-ink-500 hover:text-ink-900',
            )}
          >
            {option === 'tutor' ? 'Tutor' : 'Kursus online'}
          </button>
        ))}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
        }}
        className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 shadow-md sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor={`${id}-q`} className="mb-1.5 block text-label-sm text-ink-500 uppercase">
            Mau belajar apa?
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-500"
              aria-hidden
            />
            <Input
              id={`${id}-q`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                target === 'tutor' ? 'Mapel, jenjang, atau nama tutor' : 'Topik atau judul kursus'
              }
              className="pl-10"
            />
          </div>
        </div>

        {target === 'tutor' && (
          <div className="sm:w-56">
            <label
              htmlFor={`${id}-loc`}
              className="mb-1.5 block text-label-sm text-ink-500 uppercase"
            >
              Lokasi
            </label>
            <div className="relative">
              <MapPin
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-500"
                aria-hidden
              />
              <Input id={`${id}-loc`} placeholder="Kecamatan atau kota" className="pl-10" />
            </div>
          </div>
        )}

        <Button type="submit" className="sm:w-auto">
          {target === 'tutor' ? 'Cari tutor' : 'Cari kursus'}
        </Button>
      </form>

      <p aria-live="polite" className="mt-2 min-h-6 text-body-sm text-ink-500">
        {submitted &&
          (target === 'tutor'
            ? 'Pencarian tutor sedang kami siapkan. Sebentar lagi bisa dipakai.'
            : 'Katalog kursus sedang kami siapkan. Sebentar lagi bisa dipakai.')}
      </p>

      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span className="text-body-sm text-ink-500">Sering dicari:</span>
        {POPULAR_TOPICS.map((topic) => (
          <button
            key={topic}
            type="button"
            onClick={() => setQuery(topic)}
            className="h-8 cursor-pointer rounded-full border border-border bg-surface px-3 text-body-sm text-ink-700 transition-colors outline-none hover:border-primary-600 hover:text-primary-700 focus-visible:ring-2 focus-visible:ring-primary-600"
          >
            {topic}
          </button>
        ))}
      </div>
    </div>
  );
}
