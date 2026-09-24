'use client';

import {
  ArrowRight,
  Atom,
  BookA,
  BookOpen,
  Code,
  FlaskConical,
  Languages,
  Leaf,
  NotebookPen,
  Sigma,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { CourseCard } from '@/components/course/CourseCard';
import { EmptyState, ErrorState, GridSkeleton } from '@/components/common/States';
import { TutorCard } from '@/components/tutor/TutorCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useCourseSearch, useSubjects, useTutorSearch } from '@/hooks/api/catalog';

const SUBJECT_ICON: Record<string, LucideIcon> = {
  matematika: Sigma,
  fisika: Atom,
  kimia: FlaskConical,
  biologi: Leaf,
  'bahasa-inggris': Languages,
  'bahasa-indonesia': BookA,
  pemrograman: Code,
  'persiapan-utbk': NotebookPen,
};

function SectionHeader({ title, description, href, linkLabel }: { title: string; description: string; href: string; linkLabel: string }) {
  return (
    <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-heading-lg md:text-display-md">{title}</h2>
        <p className="mt-1 text-body-md text-ink-500">{description}</p>
      </div>
      <Link href={href} className="inline-flex min-h-11 items-center gap-1 rounded-md text-body-sm font-semibold text-primary-700 hover:underline">
        {linkLabel} <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}

/** §8: kategori mapel populer — grid ikon+label, bukan carousel */
export function SubjectGrid() {
  const { data, isPending, isError, refetch, error } = useSubjects();
  return (
    <section className="mx-auto max-w-content px-4 py-12 md:px-8" aria-labelledby="mapel-title">
      <h2 id="mapel-title" className="text-heading-lg md:text-display-md">Mata pelajaran populer</h2>
      <p className="mt-1 mb-6 text-body-md text-ink-500">Pilih mapel untuk melihat tutor yang mengajarkannya.</p>
      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {isPending
            ? Array.from({ length: 8 }).map((_, index) => (
                <li key={index}>
                  <Skeleton className="h-20 rounded-lg" />
                </li>
              ))
            : data.map((subject) => {
                const Icon = SUBJECT_ICON[subject.slug] ?? BookOpen;
                return (
                  <li key={subject.id}>
                    <Link
                      href={`/tutor?subjectId=${subject.id}`}
                      className="flex min-h-20 items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:border-primary-600 hover:bg-primary-100/40"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <span className="text-body-sm font-semibold text-ink-900">{subject.name}</span>
                    </Link>
                  </li>
                );
              })}
        </ul>
      )}
    </section>
  );
}

/** §8: tutor terverifikasi pilihan (data asli, diurutkan rating) */
export function FeaturedTutors() {
  const { data, isPending, isError, error, refetch } = useTutorSearch({ sort: 'rating', limit: 6 });
  return (
    <section className="border-y border-border bg-surface-muted/60" aria-labelledby="tutor-title">
      <div className="mx-auto max-w-content px-4 py-12 md:px-8">
        <SectionHeader
          title="Tutor terverifikasi pilihan"
          description="Semua tutor di bawah sudah lolos pemeriksaan dokumen oleh tim Learnly."
          href="/tutor"
          linkLabel="Lihat semua tutor"
        />
        {isPending ? (
          <GridSkeleton count={3} />
        ) : isError ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : data.items.length === 0 ? (
          <EmptyState illustration="people" title="Tutor pertama sedang kami verifikasi." description="Sebentar lagi daftar tutor akan muncul di sini." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((tutor) => (
              <TutorCard key={tutor.id} tutor={tutor} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function PopularCourses() {
  const { data, isPending, isError, error, refetch } = useCourseSearch({ sort: 'popular', limit: 6 });
  return (
    <section className="mx-auto max-w-content px-4 py-12 md:px-8" aria-labelledby="kursus-title">
      <SectionHeader
        title="Kursus online populer"
        description="Belajar mandiri sesuai ritmemu, lengkap dengan kuis dan sertifikat."
        href="/kursus"
        linkLabel="Lihat katalog"
      />
      {isPending ? (
        <GridSkeleton count={3} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState illustration="book" title="Belum ada kursus yang terbit." description="Kursus pertama sedang disiapkan tim kami." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </section>
  );
}
