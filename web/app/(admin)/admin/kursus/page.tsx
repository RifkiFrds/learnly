'use client';

import { ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { Pagination } from '@/components/common/Bits';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/States';
import { CourseThumbnail } from '@/components/course/CourseCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminCourses } from '@/hooks/api/courses';
import { useQueryParams } from '@/hooks/useQueryParams';
import { COURSE_LEVEL_LABEL, formatRelative, formatRupiah } from '@/lib/format';
import type { CourseStatus } from '@/lib/types';

const TABS: [CourseStatus, string][] = [
  ['in_review', 'Menunggu review'],
  ['draft', 'Draf'],
  ['published', 'Terbit'],
  ['archived', 'Diarsipkan'],
];

function CoursesContent() {
  const { values, update, page } = useQueryParams(['status'] as const);
  const status = (values.status as CourseStatus | undefined) ?? 'in_review';
  const query = useAdminCourses(status, page);

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Kursus"
        description="Susun materi, ajukan review, lalu terbitkan ke katalog."
        actions={<Button asChild><Link href="/admin/kursus/baru"><Plus /> Buat kursus</Link></Button>}
      />
      <Tabs value={status} onValueChange={(value) => update({ status: value === 'in_review' ? undefined : value })} className="mb-5">
        <TabsList className="max-w-full overflow-x-auto">
          {TABS.map(([value, label]) => <TabsTrigger key={value} value={value}>{label}</TabsTrigger>)}
        </TabsList>
      </Tabs>
      {query.isPending ? (
        <ListSkeleton count={4} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <EmptyState
          illustration="book"
          title={status === 'in_review' ? 'Tidak ada kursus yang menunggu review.' : 'Belum ada kursus di kategori ini.'}
          action={status === 'draft' ? { label: 'Buat kursus', href: '/admin/kursus/baru' } : undefined}
        />
      ) : (
        <>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {query.data.items.map((course) => (
              <li key={course.id}>
                <Link href={`/admin/kursus/${course.id}`} className="group flex items-center gap-4 p-4 hover:bg-surface-muted/50">
                  <div className="hidden w-28 shrink-0 overflow-hidden rounded-md border border-border sm:block"><CourseThumbnail title={course.title} url={course.thumbnailUrl} /></div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-sans text-body-md font-semibold text-ink-900">{course.title}</p>
                      <StatusBadge kind="course" status={course.status} />
                    </div>
                    <p className="text-body-sm text-ink-500">
                      {course.category.name} · {COURSE_LEVEL_LABEL[course.level]} · {course.isFree ? 'Gratis' : formatRupiah(course.price)} · {course.lessonCount} materi · {course.enrollmentCount} peserta
                    </p>
                    <p className="text-body-sm text-ink-500">oleh {course.instructor.fullName} · diperbarui {formatRelative(course.updatedAt)}</p>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-ink-300 group-hover:text-primary-600" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          <Pagination meta={query.data.meta} onPage={(next) => update({ page: String(next) }, false)} />
        </>
      )}
    </div>
  );
}

export default function AdminCoursesPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <CoursesContent />
    </Suspense>
  );
}
