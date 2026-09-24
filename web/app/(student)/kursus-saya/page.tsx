'use client';

import { Award, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState, ErrorState, GridSkeleton } from '@/components/common/States';
import { CourseThumbnail } from '@/components/course/CourseCard';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Progress } from '@/components/ui/progress';
import { useMyEnrollments } from '@/hooks/api/courses';
import { useAuth } from '@/lib/auth';
import { formatDate } from '@/lib/format';

export default function MyCoursesPage() {
  const { user } = useAuth();
  const query = useMyEnrollments();
  const [learner, setLearner] = useState('');
  const items = query.data?.items ?? [];
  const learners = [...new Map(items.map((item) => [item.learner.id, item.learner.fullName])).entries()];
  const visible = learner ? items.filter((item) => String(item.learner.id) === learner) : items;

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Kursus saya"
        description="Lanjutkan belajar, pantau progres, dan unduh sertifikat."
        actions={<Button asChild variant="secondary"><Link href="/kursus"><BookOpen /> Jelajahi kursus</Link></Button>}
      />
      {user?.role === 'parent' && learners.length > 1 && (
        <div className="mb-5 space-y-1.5 sm:w-60">
          <Label htmlFor="filter-learner" className="text-body-sm font-semibold text-ink-900">Anak</Label>
          <NativeSelect id="filter-learner" value={learner} onChange={(e) => setLearner(e.target.value)}>
            <option value="">Semua anak</option>
            {learners.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </NativeSelect>
        </div>
      )}
      {query.isPending ? (
        <GridSkeleton count={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : visible.length === 0 ? (
        <EmptyState illustration="book" title="Belum ada kursus yang diikuti." description="Kursus online bisa dipelajari kapan saja, ada yang gratis." action={{ label: 'Lihat katalog kursus', href: '/kursus' }} />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <li key={item.id} className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
              <CourseThumbnail title={item.course.title} url={item.course.thumbnailUrl} />
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {item.hasAccess ? <StatusBadge kind="enrollment" status={item.status} /> : <StatusBadge kind="payment" status={item.paymentStatus} />}
                </div>
                <h2 className="line-clamp-2 font-sans text-heading-md text-ink-900">{item.course.title}</h2>
                <p className="text-body-sm text-ink-500">{item.learner.fullName} · mulai {formatDate(item.enrolledAt, false)}</p>
                {item.hasAccess && (
                  <div>
                    <div className="mb-1 flex justify-between text-body-sm"><span className="text-ink-500">Progres</span><span className="font-semibold text-ink-900">{item.progressPercent}%</span></div>
                    <Progress value={item.progressPercent} aria-label={`Progres ${item.progressPercent}%`} />
                  </div>
                )}
                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  <Button asChild size="sm" variant={item.hasAccess ? 'default' : 'secondary'}>
                    <Link href={`/belajar/${item.id}`}>{!item.hasAccess ? 'Selesaikan pembayaran' : item.progressPercent === 0 ? 'Mulai belajar' : item.status === 'completed' ? 'Buka lagi' : 'Lanjut belajar'}</Link>
                  </Button>
                  {item.certificate && (
                    <Button asChild size="sm" variant="secondary"><Link href={`/belajar/${item.id}?materi=ringkasan`}><Award /> Sertifikat</Link></Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
