'use client';

import { ExternalLink, Send } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { toast } from 'sonner';
import { CourseInfoForm } from '@/components/admin/course/CourseInfoForm';
import { CurriculumEditor } from '@/components/admin/course/CurriculumEditor';
import { GradesPanel } from '@/components/admin/course/GradesPanel';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ErrorState, PageSkeleton } from '@/components/common/States';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminCourse, useCourseWorkflow } from '@/hooks/api/courses';
import { useQueryParams } from '@/hooks/useQueryParams';
import { errorMessage } from '@/lib/api-client';
import type { CourseDetail } from '@/lib/types';

/** Alur draft → in_review → published / kembali ke draf (FR-ADMIN-04). */
function Workflow({ course }: { course: CourseDetail }) {
  const workflow = useCourseWorkflow(course.id);
  const [confirm, setConfirm] = useState<'publish' | 'reject' | null>(null);
  const run = async (action: 'submit-review' | 'publish' | 'reject', notes?: string, success?: string) => {
    try {
      await workflow.mutateAsync({ action, notes });
      toast.success(success ?? 'Status kursus diperbarui.');
      setConfirm(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
  const lessonCount = course.modules.reduce((sum, mod) => sum + mod.lessons.length, 0);

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-body-sm text-ink-700">
        {course.status === 'draft' && (lessonCount ? 'Draf — ajukan review bila kurikulum sudah siap.' : 'Draf — tambahkan minimal satu materi sebelum mengajukan review.')}
        {course.status === 'in_review' && 'Menunggu review. Periksa kurikulum & materi, lalu terbitkan atau kembalikan dengan catatan.'}
        {course.status === 'published' && `Terbit di katalog · ${course.enrollmentCount} peserta. Perubahan langsung terlihat peserta.`}
        {course.status === 'archived' && 'Diarsipkan — tidak tampil di katalog dan tidak bisa diubah.'}
      </p>
      <div className="flex flex-wrap gap-2">
        {course.status === 'draft' && (
          <Button onClick={() => run('submit-review', undefined, 'Kursus diajukan untuk review.')} disabled={workflow.isPending || !lessonCount}><Send /> Ajukan review</Button>
        )}
        {course.status === 'in_review' && (
          <>
            <Button onClick={() => setConfirm('publish')} disabled={workflow.isPending}>Terbitkan</Button>
            <Button variant="destructive" onClick={() => setConfirm('reject')} disabled={workflow.isPending}>Kembalikan ke draf</Button>
          </>
        )}
        {course.status === 'published' && (
          <Button asChild variant="secondary"><Link href={`/kursus/${course.slug}`} target="_blank">Lihat di katalog <ExternalLink /></Link></Button>
        )}
      </div>
      <ConfirmDialog
        open={confirm === 'publish'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={`Terbitkan “${course.title}”?`}
        consequence={`Kursus langsung tampil di katalog publik dan bisa didaftari siswa${course.isFree ? '' : ' (berbayar)'}. Pembuat kursus menerima notifikasi.`}
        confirmLabel="Terbitkan kursus"
        pending={workflow.isPending}
        onConfirm={() => run('publish', undefined, 'Kursus terbit di katalog.')}
      />
      <ConfirmDialog
        open={confirm === 'reject'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Kembalikan ke draf?"
        consequence="Kursus tidak terbit. Pembuat menerima catatanmu lewat notifikasi dan bisa mengajukan review lagi setelah memperbaiki."
        confirmLabel="Kembalikan dengan catatan"
        destructive
        reason={{ label: 'Catatan untuk pembuat kursus', placeholder: 'Mis. video modul 2 belum bisa diputar; tambahkan kuis di akhir modul', minLength: 5 }}
        pending={workflow.isPending}
        onConfirm={(notes) => run('reject', notes, 'Kursus dikembalikan ke draf.')}
      />
    </div>
  );
}

function Editor({ id }: { id: string }) {
  const query = useAdminCourse(id);
  const { values, update } = useQueryParams(['tab'] as const);
  const tab = values.tab ?? 'info';

  if (query.isPending) return <PageSkeleton />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} title="Kursus tidak bisa dibuka" />;
  const course = query.data;

  return (
    <div className="max-w-5xl">
      <PageHeader
        title={course.title}
        description={<span className="inline-flex flex-wrap items-center gap-2">oleh {course.instructor.fullName} <StatusBadge kind="course" status={course.status} /></span>}
        back={{ href: '/admin/kursus', label: 'Semua kursus' }}
      />
      <Workflow course={course} />
      <Tabs value={tab} onValueChange={(value) => update({ tab: value === 'info' ? undefined : value })}>
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="info">Info kursus</TabsTrigger>
          <TabsTrigger value="kurikulum">Kurikulum ({course.lessonCount})</TabsTrigger>
          <TabsTrigger value="nilai">Peserta & nilai ({course.enrollmentCount})</TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="pt-6"><CourseInfoForm course={course} /></TabsContent>
        <TabsContent value="kurikulum" className="pt-6"><CurriculumEditor course={course} /></TabsContent>
        <TabsContent value="nilai" className="pt-6">{tab === 'nilai' && <GradesPanel courseId={course.id} />}</TabsContent>
      </Tabs>
    </div>
  );
}

function CourseEditorPage() {
  const { id } = useParams<{ id: string }>();
  if (id === 'baru') {
    return (
      <div className="max-w-5xl">
        <PageHeader title="Buat kursus" description="Isi info dasar dulu. Kurikulum disusun setelah kursus tersimpan sebagai draf." back={{ href: '/admin/kursus', label: 'Semua kursus' }} />
        <CourseInfoForm />
      </div>
    );
  }
  return <Editor id={id} />;
}

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CourseEditorPage />
    </Suspense>
  );
}
