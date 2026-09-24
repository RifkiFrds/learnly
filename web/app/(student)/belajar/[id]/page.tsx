'use client';

import { Award, CircleCheck, Circle, CircleDot, Download, ListTree, Lock } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { toast } from 'sonner';
import { cn } from 'cn';
import { Panel, RatingStars } from '@/components/common/Bits';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ErrorState, PageSkeleton } from '@/components/common/States';
import { LESSON_ICON, LESSON_TYPE_LABEL } from '@/components/course/CourseDetailView';
import { LessonContent } from '@/components/course/LessonContent';
import { ReviewForm } from '@/components/review/ReviewForm';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useCertificate, useEnrollment } from '@/hooks/api/courses';
import { useQueryParams } from '@/hooks/useQueryParams';
import { errorMessage } from '@/lib/api-client';
import { formatDate, formatDateTime, formatRupiah } from '@/lib/format';
import type { Enrollment } from '@/lib/types';

function Outline({ enrollment, current, onPick }: { enrollment: Enrollment; current: number | null; onPick: (id: number) => void }) {
  return (
    <nav aria-label="Daftar materi" className="space-y-5">
      {enrollment.modules.map((mod, index) => {
        const done = mod.lessons.filter((lesson) => lesson.progressStatus === 'completed').length;
        return (
          <div key={mod.id}>
            <p className="mb-2 text-label-sm text-ink-500 uppercase">Modul {index + 1} · {done}/{mod.lessons.length}</p>
            <p className="mb-2 font-sans text-body-sm font-semibold text-ink-900">{mod.title}</p>
            <ul className="space-y-1">
              {mod.lessons.map((lesson) => {
                const StatusIcon = lesson.progressStatus === 'completed' ? CircleCheck : lesson.progressStatus === 'in_progress' ? CircleDot : Circle;
                const active = lesson.id === current;
                return (
                  <li key={lesson.id}>
                    <button
                      type="button"
                      onClick={() => onPick(lesson.id)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-body-sm transition-colors',
                        active ? 'bg-primary-100 font-semibold text-ink-900' : 'text-ink-700 hover:bg-surface-muted',
                      )}
                    >
                      <StatusIcon className={cn('size-4 shrink-0', lesson.progressStatus === 'completed' ? 'text-success-600' : 'text-ink-300')} aria-hidden />
                      <span className="min-w-0 flex-1">{lesson.title}</span>
                      <span className="shrink-0 text-label-sm font-normal tracking-normal text-ink-500">{LESSON_TYPE_LABEL[lesson.type]}</span>
                      <span className="sr-only">{lesson.progressStatus === 'completed' ? '(selesai)' : '(belum selesai)'}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function PaymentGate({ enrollment }: { enrollment: Enrollment }) {
  const payment = enrollment.payment;
  const verifying = payment?.status === 'menunggu_verifikasi';
  return (
    <Panel className="max-w-2xl">
      <div className="flex gap-4">
        <Lock className="mt-1 size-6 shrink-0 text-warning-600" aria-hidden />
        <div className="space-y-3">
          <h2 className="font-sans text-heading-md text-ink-900">{verifying ? 'Pembayaran sedang diverifikasi' : 'Materi terbuka setelah pembayaran'}</h2>
          <p className="text-body-md text-ink-700">
            {verifying
              ? 'Tim Learnly sedang memeriksa bukti transfermu. Halaman ini otomatis terbuka begitu pembayaran disetujui.'
              : payment?.status === 'ditolak' || payment?.status === 'expired'
                ? 'Pembayaran sebelumnya tidak berhasil. Daftar ulang dari halaman kursus untuk membuat tagihan baru.'
                : `Bayar ${formatRupiah(enrollment.course.price)} lewat QRIS atau transfer bank, lalu unggah bukti.`}
          </p>
          {payment && (payment.status === 'menunggu_pembayaran' || verifying) ? (
            <Button asChild><Link href={`/pembayaran/${payment.id}`}>{verifying ? 'Lihat pembayaran' : 'Bayar sekarang'}</Link></Button>
          ) : (
            <Button asChild variant="secondary"><Link href={`/kursus/${enrollment.course.slug}`}>Ke halaman kursus</Link></Button>
          )}
        </div>
      </div>
    </Panel>
  );
}

function CompletionPanel({ enrollment }: { enrollment: Enrollment }) {
  const certificate = useCertificate();
  const [editing, setEditing] = useState(false);
  const { evaluation, certificateEligibility } = enrollment;
  const completed = enrollment.status === 'completed';

  async function download() {
    try {
      const info = enrollment.certificate?.fileUrl ? enrollment.certificate : await certificate.mutateAsync(enrollment.id);
      if (!info.fileUrl) throw new Error('File sertifikat belum tersedia.');
      window.open(info.fileUrl, '_blank', 'noopener');
    } catch (err) {
      toast.error(err instanceof Error && !('code' in err) ? err.message : errorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <Panel title="Nilai & kelulusan">
        <dl className="grid gap-4 sm:grid-cols-3">
          <div><dt className="text-body-sm text-ink-500">Progres</dt><dd className="font-display text-heading-lg text-ink-900">{enrollment.progressPercent}%</dd></div>
          <div><dt className="text-body-sm text-ink-500">Rata-rata nilai</dt><dd className="font-display text-heading-lg text-ink-900">{evaluation.averageScore ?? '—'}</dd></div>
          <div><dt className="text-body-sm text-ink-500">Batas lulus</dt><dd className="font-display text-heading-lg text-ink-900">{evaluation.passingGrade}</dd></div>
        </dl>
        {enrollment.course.issuesCertificate && (
          <div className="mt-5 border-t border-border pt-5">
            {enrollment.certificate ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-start gap-2 text-body-md text-ink-700">
                  <Award className="mt-0.5 size-5 shrink-0 text-success-600" aria-hidden />
                  <span>Sertifikat <span className="font-mono text-body-sm">{enrollment.certificate.certificateNumber}</span> terbit {formatDate(enrollment.certificate.issuedAt)}.</span>
                </p>
                <Button onClick={download} disabled={certificate.isPending}><Download /> Unduh sertifikat (PDF)</Button>
              </div>
            ) : (
              <div className="text-body-sm text-ink-700">
                <p className="font-semibold text-ink-900">Sertifikat terbit otomatis setelah syarat terpenuhi:</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {certificateEligibility.reasons.length ? certificateEligibility.reasons.map((reason) => <li key={reason}>{reason}</li>) : <li>Selesaikan semua materi.</li>}
                </ul>
              </div>
            )}
          </div>
        )}
      </Panel>
      {completed && (
        <Panel title={enrollment.review ? 'Ulasanmu untuk kursus ini' : 'Bagaimana kursus ini?'}>
          {enrollment.review && !editing ? (
            <div className="space-y-2 text-body-md text-ink-700">
              <RatingStars rating={enrollment.review.rating} size="md" showEmpty={false} />
              {enrollment.review.comment && <p>“{enrollment.review.comment}”</p>}
              {enrollment.review.editableUntil && new Date(enrollment.review.editableUntil) > new Date() && (
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Ubah ulasan</Button>
                  <span className="text-body-sm text-ink-500">Bisa diubah sampai {formatDateTime(enrollment.review.editableUntil)}</span>
                </div>
              )}
            </div>
          ) : (
            <ReviewForm
              target={{ reviewableType: 'course', reviewableId: enrollment.course.id }}
              existing={enrollment.review ?? undefined}
              subjectLabel={`kursus ${enrollment.course.title}`}
              onDone={() => setEditing(false)}
            />
          )}
        </Panel>
      )}
    </div>
  );
}

function Player() {
  const { id } = useParams<{ id: string }>();
  const query = useEnrollment(id);
  const { values, update } = useQueryParams(['materi'] as const);
  const [outlineOpen, setOutlineOpen] = useState(false);
  // materi awal dipatok saat pertama dibuka: menandai selesai tidak boleh memindahkan halaman diam-diam
  const [pinnedId, setPinnedId] = useState<number | null>(null);

  if (query.isPending) return <PageSkeleton />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} title="Kursus tidak bisa dibuka" />;
  const enrollment = query.data;
  const lessons = enrollment.modules.flatMap((mod) => mod.lessons);
  const summary = values.materi === 'ringkasan';
  const firstOpen = lessons.find((lesson) => lesson.progressStatus !== 'completed') ?? lessons[0];
  if (pinnedId === null && firstOpen) setPinnedId(firstOpen.id);
  const pinned = lessons.find((lesson) => lesson.id === pinnedId) ?? firstOpen;
  const current = summary ? null : lessons.find((lesson) => String(lesson.id) === values.materi) ?? pinned ?? null;
  const index = current ? lessons.findIndex((lesson) => lesson.id === current.id) : -1;
  const next = index >= 0 ? lessons[index + 1] : undefined;
  const pick = (lessonId: number | 'ringkasan') => {
    update({ materi: String(lessonId) });
    setOutlineOpen(false);
    window.scrollTo({ top: 0 });
  };
  const Icon = current ? LESSON_ICON[current.type] : Award;

  const outline = (
    <div className="space-y-5">
      <div>
        <p className="text-body-sm text-ink-500">Progres {enrollment.progressPercent}%</p>
        <Progress value={enrollment.progressPercent} className="mt-2" aria-label={`Progres kursus ${enrollment.progressPercent}%`} />
      </div>
      <Outline enrollment={enrollment} current={current?.id ?? null} onPick={pick} />
      <button
        type="button"
        onClick={() => pick('ringkasan')}
        aria-current={summary ? 'page' : undefined}
        className={cn('flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-left text-body-sm', summary ? 'bg-primary-100 font-semibold text-ink-900' : 'text-ink-700 hover:bg-surface-muted')}
      >
        <Award className="size-4 text-primary-600" aria-hidden /> Nilai & sertifikat
      </button>
    </div>
  );

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link href="/kursus-saya" className="-ml-1 inline-flex min-h-11 items-center px-1 text-body-sm text-ink-500 hover:text-ink-900">‹ Kursus saya</Link>
          <h1 className="text-heading-lg md:text-display-md">{enrollment.course.title}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-body-md text-ink-500">
            {enrollment.learner.fullName}
            <StatusBadge kind="enrollment" status={enrollment.status} />
          </p>
        </div>
        {enrollment.hasAccess && (
          <Sheet open={outlineOpen} onOpenChange={setOutlineOpen}>
            <SheetTrigger asChild>
              <Button variant="secondary" className="lg:hidden"><ListTree /> Daftar materi ({enrollment.progressPercent}%)</Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] max-w-sm overflow-y-auto bg-background p-5">
              <SheetHeader className="p-0 pb-4"><SheetTitle className="font-display text-heading-lg">Daftar materi</SheetTitle></SheetHeader>
              {outline}
            </SheetContent>
          </Sheet>
        )}
      </div>
      {!enrollment.hasAccess ? (
        <PaymentGate enrollment={enrollment} />
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
          <aside className="hidden rounded-lg border border-border bg-surface p-4 lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">{outline}</aside>
          <section className="min-w-0" aria-labelledby="lesson-title">
            {current ? (
              <>
                <p className="flex items-center gap-2 text-label-sm text-primary-700 uppercase">
                  <Icon className="size-4" aria-hidden /> {LESSON_TYPE_LABEL[current.type]} · materi {index + 1} dari {lessons.length}
                </p>
                <h2 id="lesson-title" className="mt-2 mb-6 text-heading-lg">{current.title}</h2>
                <LessonContent
                  key={current.id}
                  lesson={current}
                  enrollment={enrollment}
                  onNext={next ? () => pick(next.id) : () => pick('ringkasan')}
                />
              </>
            ) : (
              <>
                <h2 id="lesson-title" className="mb-6 text-heading-lg">Nilai & sertifikat</h2>
                <CompletionPanel enrollment={enrollment} />
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default function LearnPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Player />
    </Suspense>
  );
}
