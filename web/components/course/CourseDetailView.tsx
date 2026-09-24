'use client';

import { Award, BookOpen, CircleCheck, ClipboardCheck, FileText, ListChecks, PlayCircle, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Pagination, RatingStars } from '@/components/common/Bits';
import { EmptyState, ErrorState, ListSkeleton, PageSkeleton } from '@/components/common/States';
import { CourseThumbnail } from '@/components/course/CourseCard';
import { ReviewCard } from '@/components/tutor/ReviewList';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLearners } from '@/hooks/api/account';
import { useCourse, useCourseReviews } from '@/hooks/api/catalog';
import { useEnroll, useMyEnrollments } from '@/hooks/api/courses';
import { errorMessage } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';
import { COURSE_LEVEL_LABEL, formatRupiah } from '@/lib/format';
import type { CourseDetail, LessonType } from '@/lib/types';

export const LESSON_ICON: Record<LessonType, typeof PlayCircle> = {
  video: PlayCircle,
  article: FileText,
  quiz: ListChecks,
  assignment: ClipboardCheck,
};
export const LESSON_TYPE_LABEL: Record<LessonType, string> = { video: 'Video', article: 'Bacaan', quiz: 'Kuis', assignment: 'Tugas' };

export function formatSeconds(seconds: number | null | undefined) {
  if (!seconds) return null;
  const minutes = Math.round(seconds / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)} jam ${minutes % 60 ? `${minutes % 60} mnt` : ''}`.trim() : `${minutes} mnt`;
}

function Curriculum({ course }: { course: CourseDetail }) {
  if (course.modules.length === 0) return <p className="text-body-md text-ink-500">Kurikulum sedang disusun.</p>;
  return (
    <ol className="space-y-4">
      {course.modules.map((mod, index) => (
        <li key={mod.id} className="rounded-lg border border-border bg-surface">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
            <h3 className="font-sans text-body-md font-semibold text-ink-900">
              <span className="text-ink-500">Modul {index + 1} · </span>{mod.title}
            </h3>
            <span className="shrink-0 text-body-sm text-ink-500">{mod.lessons.length} materi</span>
          </div>
          <ul className="divide-y divide-border">
            {mod.lessons.map((lesson) => {
              const Icon = LESSON_ICON[lesson.type];
              return (
                <li key={lesson.id} className="flex items-center gap-3 px-5 py-3 text-body-sm">
                  <Icon className="size-4 shrink-0 text-primary-600" aria-hidden />
                  <span className="min-w-0 flex-1 text-ink-900">{lesson.title}</span>
                  <span className="shrink-0 text-ink-500">
                    {LESSON_TYPE_LABEL[lesson.type]}
                    {lesson.type === 'quiz' && lesson.questionCount ? ` · ${lesson.questionCount} soal` : ''}
                    {formatSeconds(lesson.durationSeconds) ? ` · ${formatSeconds(lesson.durationSeconds)}` : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ol>
  );
}

function Reviews({ course }: { course: CourseDetail }) {
  const [page, setPage] = useState(1);
  const reviews = useCourseReviews(course.id, page);
  return (
    <div className="max-w-3xl">
      <div className="mb-5 flex items-center gap-3">
        <span className="font-display text-display-md text-ink-900">{course.avgRating.toFixed(1)}</span>
        <RatingStars rating={course.avgRating} count={course.reviewCount} size="md" />
      </div>
      {reviews.isPending ? (
        <ListSkeleton />
      ) : reviews.isError ? (
        <ErrorState error={reviews.error} onRetry={() => reviews.refetch()} />
      ) : reviews.data.items.length === 0 ? (
        <EmptyState illustration="book" title="Belum ada ulasan." description="Ulasan muncul setelah peserta menyelesaikan kursus ini." />
      ) : (
        <div className="space-y-3">
          {reviews.data.items.map((review) => <ReviewCard key={review.id} review={review} />)}
          <Pagination meta={reviews.data.meta} onPage={setPage} />
        </div>
      )}
    </div>
  );
}

/** Kotak daftar yang menempel (sticky): harga + CTA sesuai status login & enrollment. */
function EnrollBox({ course }: { course: CourseDetail }) {
  const router = useRouter();
  const { user, status } = useAuth();
  const isLearner = user?.role === 'student' || user?.role === 'parent';
  const enrollments = useMyEnrollments(1, isLearner);
  const learners = useLearners(isLearner);
  const enroll = useEnroll(course.id);
  const [learnerId, setLearnerId] = useState('');
  const isParent = user?.role === 'parent';
  const mine = (enrollments.data?.items ?? []).filter((item) => item.course.id === course.id);
  const children = (learners.data ?? []).filter((learner) => (isParent ? !learner.isSelf : learner.isSelf));
  const available = children.filter((child) => !mine.some((item) => item.learner.id === child.id));
  const chosen = learnerId || (available.length === 1 ? String(available[0].id) : '');

  async function submit() {
    try {
      const result = await enroll.mutateAsync(isParent ? Number(chosen) : undefined);
      if (result.requiresPayment && result.payment) {
        toast.success('Pendaftaran tercatat. Selesaikan pembayaran untuk membuka materi.');
        router.push(`/pembayaran/${result.payment.id}`);
      } else {
        toast.success('Kamu sudah terdaftar. Selamat belajar!');
        router.push(`/belajar/${result.enrollment.id}`);
      }
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  let action: React.ReactNode;
  if (status === 'loading' || (isLearner && (enrollments.isPending || learners.isPending))) {
    action = <Button disabled className="w-full">Memuat…</Button>;
  } else if (!user) {
    action = (
      <Button asChild className="w-full">
        <Link href={`/masuk?next=${encodeURIComponent(`/kursus/${course.slug}`)}`}>Masuk untuk mendaftar</Link>
      </Button>
    );
  } else if (!isLearner) {
    action = <p className="text-body-sm text-ink-500">Pendaftaran kursus hanya untuk akun siswa atau orang tua.</p>;
  } else {
    action = (
      <div className="space-y-3">
        {mine.map((item) => (
          <Button key={item.id} asChild variant={item.hasAccess ? 'default' : 'secondary'} className="w-full">
            <Link href={`/belajar/${item.id}`}>
              {item.hasAccess ? `Lanjut belajar${isParent ? ` · ${item.learner.fullName}` : ''} (${item.progressPercent}%)` : `Selesaikan pembayaran${isParent ? ` · ${item.learner.fullName}` : ''}`}
            </Link>
          </Button>
        ))}
        {available.length > 0 && (
          <>
            {isParent && available.length > 1 && (
              <div className="space-y-1.5">
                <Label htmlFor="enroll-learner" className="text-body-sm font-semibold text-ink-900">Daftarkan untuk</Label>
                <NativeSelect id="enroll-learner" value={chosen} onChange={(e) => setLearnerId(e.target.value)}>
                  <option value="">Pilih anak</option>
                  {available.map((child) => <option key={child.id} value={child.id}>{child.fullName}</option>)}
                </NativeSelect>
              </div>
            )}
            <Button className="w-full" variant={mine.length ? 'secondary' : 'default'} onClick={submit} disabled={enroll.isPending || (isParent && !chosen)}>
              {enroll.isPending ? 'Mendaftarkan…' : course.isFree ? 'Daftar gratis' : `Daftar & bayar ${formatRupiah(course.price)}`}
            </Button>
            {isParent && available.length === 1 && <p className="text-body-sm text-ink-500">Didaftarkan atas nama {available[0].fullName}.</p>}
          </>
        )}
        {isParent && children.length === 0 && (
          <Button asChild variant="secondary" className="w-full"><Link href="/anak">Tambah profil anak dulu</Link></Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <p className="font-display text-display-md text-ink-900">{course.isFree ? 'Gratis' : formatRupiah(course.price)}</p>
      {!course.isFree && <p className="mb-4 text-body-sm text-ink-500">Bayar sekali, akses selamanya. Pembayaran via QRIS/transfer, diverifikasi manual.</p>}
      {course.isFree && <p className="mb-4 text-body-sm text-ink-500">Langsung bisa dipelajari setelah mendaftar.</p>}
      {action}
      <ul className="mt-5 space-y-2 border-t border-border pt-4 text-body-sm text-ink-700">
        <li className="flex items-center gap-2"><BookOpen className="size-4 text-ink-500" aria-hidden /> {course.lessonCount} materi dalam {course.modules.length} modul</li>
        {formatSeconds(course.totalDurationSeconds) && <li className="flex items-center gap-2"><PlayCircle className="size-4 text-ink-500" aria-hidden /> {formatSeconds(course.totalDurationSeconds)} video</li>}
        <li className="flex items-center gap-2"><CircleCheck className="size-4 text-ink-500" aria-hidden /> Nilai lulus {course.passingGrade}</li>
        {course.issuesCertificate && <li className="flex items-center gap-2"><Award className="size-4 text-ink-500" aria-hidden /> Sertifikat setelah lulus</li>}
        <li className="flex items-center gap-2"><Users className="size-4 text-ink-500" aria-hidden /> {course.enrollmentCount} peserta</li>
      </ul>
    </div>
  );
}

export function CourseDetailView({ slug }: { slug: string }) {
  const { data: course, isPending, isError, error, refetch } = useCourse(slug);
  const [tab, setTab] = useState('overview');

  if (isPending) return <div className="mx-auto max-w-content px-4 py-8 md:px-8"><PageSkeleton /></div>;
  if (isError) return <div className="mx-auto max-w-content px-4 py-8 md:px-8"><ErrorState error={error} onRetry={() => refetch()} title="Kursus tidak bisa dibuka" /></div>;

  return (
    <div className="mx-auto max-w-content px-4 py-8 md:px-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="min-w-0">
          <p className="text-label-sm text-primary-700 uppercase">{course.category.name}</p>
          <h1 className="mt-2 text-display-md">{course.title}</h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-md text-ink-500">
            <span>oleh {course.instructor.fullName}</span>
            <span>{COURSE_LEVEL_LABEL[course.level]}</span>
            {course.educationLevel && <span>{course.educationLevel.name}</span>}
            <RatingStars rating={course.avgRating} count={course.reviewCount} />
          </p>
          <div className="mt-6 overflow-hidden rounded-lg border border-border lg:hidden">
            <CourseThumbnail title={course.title} url={course.thumbnailUrl} />
          </div>
          <Tabs value={tab} onValueChange={setTab} className="mt-8">
            <TabsList>
              <TabsTrigger value="overview">Ringkasan</TabsTrigger>
              <TabsTrigger value="kurikulum">Kurikulum</TabsTrigger>
              <TabsTrigger value="ulasan">Ulasan ({course.reviewCount})</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="pt-6">
              <div className="max-w-3xl space-y-6">
                <p className="text-body-lg whitespace-pre-line text-ink-700">{course.description ?? 'Deskripsi kursus belum tersedia.'}</p>
                <div className="rounded-lg bg-surface-muted p-5">
                  <h2 className="font-sans text-heading-md text-ink-900">Cara belajarnya</h2>
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-body-md text-ink-700">
                    <li>Belajar mandiri kapan saja: video, bacaan, kuis dengan nilai otomatis, dan tugas yang dinilai instruktur.</li>
                    <li>Progres tersimpan per materi — lanjutkan dari perangkat mana pun.</li>
                    <li>Lulus bila rata-rata nilai kuis & tugas minimal {course.passingGrade}{course.issuesCertificate ? ', lalu unduh sertifikat PDF.' : '.'}</li>
                  </ul>
                </div>
                <button type="button" onClick={() => setTab('kurikulum')} className="min-h-11 cursor-pointer text-body-md font-semibold text-primary-600 hover:text-primary-700">
                  Lihat {course.lessonCount} materi di kurikulum
                </button>
              </div>
            </TabsContent>
            <TabsContent value="kurikulum" className="pt-6"><Curriculum course={course} /></TabsContent>
            <TabsContent value="ulasan" className="pt-6"><Reviews course={course} /></TabsContent>
          </Tabs>
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="hidden overflow-hidden rounded-lg border border-border lg:block">
            <CourseThumbnail title={course.title} url={course.thumbnailUrl} />
          </div>
          <EnrollBox course={course} />
        </aside>
      </div>
    </div>
  );
}
