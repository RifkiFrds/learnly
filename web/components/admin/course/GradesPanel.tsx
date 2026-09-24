'use client';

import { Award, FileText } from 'lucide-react';
import { useId, useState } from 'react';
import { toast } from 'sonner';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/States';
import { StatusBadge } from '@/components/common/StatusBadge';
import { FormError } from '@/components/form/Field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useGradeAssignment, useGrades, type GradeRecap } from '@/hooks/api/courses';
import { errorMessage } from '@/lib/api-client';
import { formatDateTime } from '@/lib/format';

type Submission = NonNullable<GradeRecap['participants'][number]['assignments'][number]['submission']>;

function GradeDialog({ courseId, target, onClose }: { courseId: number; target: { submission: Submission; learner: string; title: string }; onClose: () => void }) {
  const id = useId();
  const grade = useGradeAssignment(courseId);
  const [score, setScore] = useState(target.submission.score != null ? String(target.submission.score) : '');
  const [feedback, setFeedback] = useState(target.submission.feedback ?? '');
  const [error, setError] = useState<string | null>(null);
  const value = Number(score);
  const invalid = score === '' || Number.isNaN(value) || value < 0 || value > 100;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-heading-lg">Nilai tugas {target.learner}</DialogTitle>
          <DialogDescription>{target.title} · dikumpulkan {formatDateTime(target.submission.submittedAt)}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            try {
              await grade.mutateAsync({ submissionId: target.submission.id, score: value, feedback: feedback.trim() });
              toast.success('Nilai tersimpan dan peserta diberi tahu.');
              onClose();
            } catch (err) {
              setError(errorMessage(err));
            }
          }}
        >
          <FormError message={error} />
          {target.submission.fileUrl && (
            <a href={target.submission.fileUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-body-sm font-semibold text-primary-600 hover:text-primary-700">
              <FileText className="size-4" aria-hidden /> Buka file tugas
            </a>
          )}
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-score`} className="text-body-sm font-semibold text-ink-900">Nilai (0–100)</Label>
            <Input id={`${id}-score`} inputMode="decimal" value={score} onChange={(e) => setScore(e.target.value.replace(/[^\d.]/g, ''))} aria-invalid={score !== '' && invalid} className="max-w-32" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-feedback`} className="text-body-sm font-semibold text-ink-900">Catatan untuk peserta</Label>
            <Textarea id={`${id}-feedback`} rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Apa yang sudah baik dan apa yang perlu diperbaiki" />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={grade.isPending || invalid || feedback.trim().length < 3}>{grade.isPending ? 'Menyimpan…' : 'Simpan nilai'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Rekap nilai peserta + penilaian tugas manual (FR-EVAL-02, FR-COURSE-06). */
export function GradesPanel({ courseId }: { courseId: number }) {
  const query = useGrades(courseId);
  const [target, setTarget] = useState<{ submission: Submission; learner: string; title: string } | null>(null);

  if (query.isPending) return <ListSkeleton count={3} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (query.data.participants.length === 0) {
    return <EmptyState illustration="people" title="Belum ada peserta." description="Rekap nilai muncul setelah ada yang mendaftar kursus ini." />;
  }
  const ungraded = query.data.participants.flatMap((p) => p.assignments.filter((a) => a.submission && a.submission.score == null)).length;

  return (
    <div className="space-y-4">
      {ungraded > 0 && <p className="rounded-lg bg-warning-100/60 px-4 py-3 text-body-sm text-ink-900">{ungraded} tugas menunggu dinilai.</p>}
      <ul className="space-y-3">
        {query.data.participants.map((participant) => (
          <li key={participant.enrollmentId} className="rounded-lg border border-border bg-surface p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-sans text-body-md font-semibold text-ink-900">
                  {participant.learner.fullName}
                  <StatusBadge kind="enrollment" status={participant.status} />
                  {participant.certificate && <span className="inline-flex items-center gap-1 text-body-sm font-normal text-success-600"><Award className="size-4" aria-hidden /> Bersertifikat</span>}
                </p>
                <p className="text-body-sm text-ink-500">Akun {participant.account.fullName} · {participant.account.email}</p>
              </div>
              <div className="w-40">
                <p className="mb-1 text-right text-body-sm text-ink-500">Progres {participant.progressPercent}%</p>
                <Progress value={participant.progressPercent} aria-label={`Progres ${participant.progressPercent}%`} />
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-1 text-body-sm font-semibold text-ink-900">Kuis</p>
                {participant.quizzes.length === 0 ? <p className="text-body-sm text-ink-500">Tidak ada kuis.</p> : (
                  <ul className="space-y-1 text-body-sm text-ink-700">
                    {participant.quizzes.map((quiz) => (
                      <li key={quiz.lessonId} className="flex justify-between gap-3">
                        <span className="min-w-0 truncate">{quiz.title}</span>
                        <span className="shrink-0">{quiz.attempts ? `${quiz.bestScore} (${quiz.attempts}×)` : 'belum'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="mb-1 text-body-sm font-semibold text-ink-900">Tugas</p>
                {participant.assignments.length === 0 ? <p className="text-body-sm text-ink-500">Tidak ada tugas.</p> : (
                  <ul className="space-y-1.5 text-body-sm text-ink-700">
                    {participant.assignments.map((assignment) => (
                      <li key={assignment.lessonId} className="flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate">{assignment.title}</span>
                        {!assignment.submission ? (
                          <span className="shrink-0 text-ink-500">belum mengumpulkan</span>
                        ) : (
                          <Button
                            size="sm"
                            variant={assignment.submission.score == null ? 'default' : 'ghost'}
                            onClick={() => setTarget({ submission: assignment.submission!, learner: participant.learner.fullName, title: assignment.title })}
                          >
                            {assignment.submission.score == null ? 'Beri nilai' : `Nilai ${assignment.submission.score} · ubah`}
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {target && <GradeDialog courseId={courseId} target={target} onClose={() => setTarget(null)} />}
    </div>
  );
}
