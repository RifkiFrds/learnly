'use client';

import { Search, SlidersHorizontal } from 'lucide-react';
import { useId, useState } from 'react';
import { Pagination } from '@/components/common/Bits';
import { EmptyState, ErrorState, GridSkeleton } from '@/components/common/States';
import { CourseCard } from '@/components/course/CourseCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useCategories, useCourseSearch, useEducationLevels } from '@/hooks/api/catalog';
import { useQueryParams } from '@/hooks/useQueryParams';

const KEYS = ['categoryId', 'educationLevelId', 'level', 'priceType', 'minRating', 'q', 'sort'] as const;
type Values = Record<(typeof KEYS)[number], string | undefined>;
type Update = ReturnType<typeof useQueryParams<(typeof KEYS)[number]>>['update'];

function Filters({ values, update }: { values: Values; update: Update }) {
  const id = useId();
  const categories = useCategories();
  const levels = useEducationLevels();
  const select = (key: keyof Values, label: string, options: [string, string][], placeholder: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`${id}-${key}`} className="text-body-sm font-semibold text-ink-900">{label}</Label>
      <NativeSelect id={`${id}-${key}`} value={values[key] ?? ''} onChange={(e) => update({ [key]: e.target.value })}>
        <option value="">{placeholder}</option>
        {options.map(([value, text]) => (
          <option key={value} value={value}>{text}</option>
        ))}
      </NativeSelect>
    </div>
  );
  return (
    <div className="space-y-5">
      {select('categoryId', 'Kategori', (categories.data ?? []).map((c) => [String(c.id), c.name]), 'Semua kategori')}
      {select('educationLevelId', 'Jenjang', (levels.data ?? []).map((l) => [String(l.id), l.name]), 'Semua jenjang')}
      {select('level', 'Tingkat kesulitan', [['pemula', 'Pemula'], ['menengah', 'Menengah'], ['lanjut', 'Lanjut']], 'Semua tingkat')}
      {select('priceType', 'Harga', [['free', 'Gratis'], ['paid', 'Berbayar']], 'Gratis & berbayar')}
      {select('minRating', 'Rating minimal', [['4.5', '4,5 ke atas'], ['4', '4 ke atas'], ['3.5', '3,5 ke atas']], 'Semua rating')}
    </div>
  );
}

export function CourseCatalog() {
  const { values, update, page } = useQueryParams(KEYS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState(values.q ?? '');
  const { data, isPending, isError, error, refetch, isFetching } = useCourseSearch({ ...values, sort: values.sort ?? 'newest', page, limit: 12 });
  const activeFilters = ['categoryId', 'educationLevelId', 'level', 'priceType', 'minRating'].filter((key) => values[key as keyof Values]).length;
  const reset = () => {
    setQuery('');
    update({ categoryId: undefined, educationLevelId: undefined, level: undefined, priceType: undefined, minRating: undefined, q: undefined, sort: undefined });
  };

  return (
    <div className="mx-auto max-w-content px-4 py-8 md:px-8">
      <h1 className="text-heading-lg md:text-display-md">Kursus online</h1>
      <p className="mt-1 text-body-md text-ink-500">Belajar mandiri dengan video, materi, kuis, dan tugas — lengkap dengan sertifikat.</p>

      <form
        className="mt-6 flex max-w-2xl gap-2"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          update({ q: query.trim() || undefined });
        }}
      >
        <label htmlFor="course-q" className="sr-only">Cari kursus</label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-500" aria-hidden />
          <Input id="course-q" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari topik atau judul kursus" className="pl-10" />
        </div>
        <Button type="submit">Cari</Button>
      </form>

      <div className="mt-8 grid gap-8 md:grid-cols-[15rem_1fr]">
        <aside className="hidden md:block" aria-label="Filter kursus">
          <div className="sticky top-24 rounded-lg border border-border bg-surface-muted/60 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-sans text-body-md font-semibold text-ink-900">Filter</h2>
              {activeFilters > 0 && (
                <button type="button" onClick={reset} className="rounded-sm text-body-sm font-semibold text-primary-700 hover:underline">Reset</button>
              )}
            </div>
            <Filters values={values} update={update} />
          </div>
        </aside>

        <section aria-label="Daftar kursus" aria-busy={isFetching} className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-body-sm text-ink-500" aria-live="polite">
              {data ? `${data.meta.total} kursus${values.q ? ` untuk “${values.q}”` : ''}` : 'Memuat kursus…'}
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
                    <SheetTitle className="font-display text-heading-lg">Filter kursus</SheetTitle>
                  </SheetHeader>
                  <div className="px-4 pb-4">
                    <Filters values={values} update={update} />
                    <div className="mt-6 grid grid-cols-2 gap-2">
                      <Button variant="secondary" onClick={reset}>Reset</Button>
                      <Button onClick={() => setSheetOpen(false)}>Lihat {data?.meta.total ?? ''} kursus</Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              <label htmlFor="course-sort" className="sr-only">Urutkan</label>
              <NativeSelect id="course-sort" value={values.sort ?? 'newest'} onChange={(e) => update({ sort: e.target.value })} wrapperClassName="min-w-0 flex-1 sm:w-44 sm:flex-none" className="h-11 text-body-sm md:h-9">
                <option value="newest">Terbaru</option>
                <option value="popular">Terpopuler</option>
                <option value="rating">Rating tertinggi</option>
                <option value="price_asc">Harga terendah</option>
                <option value="price_desc">Harga tertinggi</option>
              </NativeSelect>
            </div>
          </div>
          {isPending ? (
            <GridSkeleton count={6} />
          ) : isError ? (
            <ErrorState error={error} onRetry={() => refetch()} />
          ) : data.items.length === 0 ? (
            <EmptyState illustration="book" title="Belum ada kursus yang cocok." description="Coba kata kunci lain atau longgarkan filter." action={{ label: 'Reset filter', onClick: reset }} />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.items.map((course) => (
                  <CourseCard key={course.id} course={course} />
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
