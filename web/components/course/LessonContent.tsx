'use client';

import { CircleAlert, CircleCheck, CircleX, ExternalLink, FileText, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from 'cn';
import { FileInput } from '@/components/form/FileInput';
import { Button } from '@/components/ui/button';
import { useCompleteLesson, useSubmitAssignment, useSubmitQuiz } from '@/hooks/api/courses';
import { errorMessage } from '@/lib/api-client';
import { formatDateTime } from '@/lib/format';
import type { Enrollment, Lesson, QuizResult } from '@/lib/types';

/** YouTube/Vimeo → URL embed; selain itu diputar langsung dengan <video>. */
function embedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return `https://www.youtube-nocookie.com/embed/${parsed.pathname.slice(1)}`;
    if (host.endsWith('youtube.com')) {
      const id = parsed.searchParams.get('v') ?? parsed.pathname.split('/').pop();
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (host === 'vimeo.com') return `https://player.vimeo.com/video/${parsed.pathname.split('/').filter(Boolean)[0]}`;
  } catch {
    return null;
  }
  return null;
}

function VideoLesson({ lesson }: { lesson: Lesson }) {
  const [failed, setFailed] = useState(false);
  if (!lesson.contentUrl) return <p className="text-body-md text-ink-500">Video belum tersedia.</p>;
  const embed = embedUrl(lesson.contentUrl);
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg bg-ink-900">
        {embed ? (
          <iframe
            src={embed}
            title={lesson.title}
            className="aspect-video w-full"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : failed ? (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 p-6 text-center text-white">
            <CircleAlert className="size-8" aria-hidden />
            <p className="max-w-sm text-body-md">Video tidak bisa diputar di sini. Buka tautan aslinya, lalu tandai selesai setelah menonton.</p>
          </div>
        ) : (
          <video src={lesson.contentUrl} controls preload="metadata" className="aspect-video w-full" onError={() => setFailed(true)}>
            Browser ini tidak mendukung pemutar video.
          </video>
        )}
      </div>
      <a href={lesson.contentUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-body-sm font-semibold text-primary-600 hover:text-primary-700">
        Buka video di tab baru <ExternalLink className="size-4" aria-hidden />
      </a>
    </div>
  );
}

function ArticleLesson({ lesson }: { lesson: Lesson }) {
  return (
    <div className="space-y-5">
      <article className="max-w-prose space-y-4 text-body-lg whitespace-pre-line text-ink-900">
        {lesson.contentBody ?? 'Materi bacaan belum tersedia.'}
      </article>
      {lesson.contentUrl && (
        <a
          href={lesson.contentUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-body-sm font-semibold text-ink-900 hover:border-primary-600"
        >
          <FileText className="size-4 text-primary-600" aria-hidden /> Unduh materi (PDF)
        </a>
      )}
    </div>
  );
}

function QuizLesson({ lesson, enrollment }: { lesson: Lesson; enrollment: Enrollment }) {
  const submit = useSubmitQuiz(enrollment.id);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const questions = lesson.questions ?? [];
  const history = enrollment.evaluation.quizzes.find((quiz) => quiz.lessonId === lesson.id);
  const byQuestion = new Map(result?.results.map((row) => [row.questionId, row]));

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const unanswered = questions.filter((question) => !answers[question.id]).length;
    if (unanswered) return setError(`Masih ada ${unanswered} soal yang belum dijawab.`);
    try {
      const response = await submit.mutateAsync({
        lessonId: lesson.id,
        answers: questions.map((question) => ({ questionId: question.id, optionId: answers[question.id] })),
      });
      setResult(response);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      {history && history.attempts > 0 && !result && (
        <p className="rounded-lg bg-surface-muted px-4 py-3 text-body-sm text-ink-700">
          Sudah dikerjakan {history.attempts}× · nilai terbaik <span className="font-semibold text-ink-900">{history.bestScore ?? '-'}</span>
          {history.passed ? ' · lulus' : ` · belum mencapai ${enrollment.evaluation.passingGrade}`}. Kamu boleh mengulang untuk memperbaiki nilai.
        </p>
      )}
      {result && (
        <div
          className={cn('flex flex-col gap-3 rounded-lg border p-5 sm:flex-row sm:items-center sm:justify-between', result.passed ? 'border-success-100 bg-success-100/60' : 'border-warning-100 bg-warning-100/60')}
          role="status"
        >
          <div>
            <p className="font-display text-display-md text-ink-900">{result.score}</p>
            <p className="text-body-md text-ink-700">
              {result.correctCount} dari {result.totalQuestions} benar · {result.passed ? `Lulus (batas ${result.passingGrade}).` : `Belum lulus — butuh ${result.passingGrade}.`}
            </p>
          </div>
          <Button variant="secondary" onClick={() => { setResult(null); setAnswers({}); }}>
            <RotateCcw /> Kerjakan ulang
          </Button>
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        {questions.map((question, index) => {
          const graded = byQuestion.get(question.id);
          return (
            <fieldset key={question.id} className="rounded-lg border border-border bg-surface p-5" disabled={Boolean(result)}>
              <legend className="sr-only">Soal {index + 1}</legend>
              <p className="mb-3 font-sans text-body-md font-semibold text-ink-900">
                <span className="text-ink-500">{index + 1}. </span>{question.questionText}
              </p>
              <div className="space-y-2" role="radiogroup" aria-label={`Pilihan jawaban soal ${index + 1}`}>
                {question.options.map((option) => {
                  const selected = answers[question.id] === option.id;
                  const isCorrectAnswer = graded?.correctOptionId === option.id;
                  const wrongPick = graded && selected && !graded.isCorrect;
                  return (
                    <label
                      key={option.id}
                      className={cn(
                        'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 text-body-md transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary-600',
                        selected && !graded && 'border-primary-600 bg-primary-100/60',
                        !selected && !graded && 'border-border hover:border-primary-600',
                        isCorrectAnswer && 'border-success-600 bg-success-100/60',
                        wrongPick && 'border-danger-600 bg-danger-100/50',
                        graded && !isCorrectAnswer && !wrongPick && 'border-border opacity-70',
                      )}
                    >
                      <input
                        type="radio"
                        name={`q-${question.id}`}
                        className="size-4 accent-primary-600"
                        checked={selected}
                        onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: option.id }))}
                      />
                      <span className="flex-1">{option.optionText}</span>
                      {isCorrectAnswer && <CircleCheck className="size-5 text-success-600" aria-label="Jawaban benar" />}
                      {wrongPick && <CircleX className="size-5 text-danger-600" aria-label="Jawabanmu salah" />}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
        {error && <p className="text-body-sm text-danger-600" role="alert">{error}</p>}
        {!result && (
          <Button type="submit" disabled={submit.isPending}>{submit.isPending ? 'Menilai…' : 'Kirim jawaban'}</Button>
        )}
      </form>
    </div>
  );
}

const ASSIGNMENT_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

function AssignmentLesson({ lesson, enrollment }: { lesson: Lesson; enrollment: Enrollment }) {
  const submit = useSubmitAssignment(enrollment.id);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | undefined>();
  const submission = enrollment.evaluation.assignments.find((item) => item.lessonId === lesson.id)?.submission ?? null;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-surface p-5">
        <p className="mb-2 text-body-sm font-semibold text-ink-900">Instruksi tugas</p>
        <p className="text-body-md whitespace-pre-line text-ink-700">{lesson.contentBody}</p>
      </div>
      {submission && (
        <div className="rounded-lg border border-border bg-surface-muted/60 p-5 text-body-md">
          <p className="font-semibold text-ink-900">Sudah dikumpulkan {formatDateTime(submission.submittedAt)}</p>
          {submission.fileUrl && (
            <a href={submission.fileUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-body-sm font-semibold text-primary-600 hover:text-primary-700">
              <FileText className="size-4" aria-hidden /> Lihat file yang dikirim
            </a>
          )}
          {submission.score != null ? (
            <div className="mt-3 border-t border-border pt-3">
              <p>Nilai: <span className="font-display text-heading-lg text-ink-900">{submission.score}</span></p>
              {submission.feedback && <p className="mt-1 text-ink-700">Catatan instruktur: {submission.feedback}</p>}
            </div>
          ) : (
            <p className="mt-2 text-body-sm text-ink-500">Menunggu dinilai instruktur. Kamu akan diberi tahu lewat notifikasi.</p>
          )}
        </div>
      )}
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!file) return setError('Pilih file tugasmu dulu.');
          try {
            const result = await submit.mutateAsync({ lessonId: lesson.id, file });
            toast.success(result.message);
            setFile(null);
          } catch (err) {
            setError(errorMessage(err));
          }
        }}
      >
        <FileInput
          label={submission ? 'Kirim ulang tugas' : 'File tugas'}
          accept={ASSIGNMENT_TYPES}
          maxSizeMb={10}
          file={file}
          onFile={(next, fileError) => {
            setFile(next);
            setError(fileError);
          }}
          error={error}
          hint="PDF atau foto hasil pengerjaan, maksimal 10 MB."
        />
        <Button type="submit" disabled={submit.isPending || !file}>{submit.isPending ? 'Mengunggah…' : 'Kumpulkan tugas'}</Button>
      </form>
    </div>
  );
}

/** Isi materi + tombol "tandai selesai" untuk video/bacaan (FR-COURSE-05). */
export function LessonContent({ lesson, enrollment, onNext }: { lesson: Lesson; enrollment: Enrollment; onNext?: () => void }) {
  const complete = useCompleteLesson(enrollment.id);
  const done = lesson.progressStatus === 'completed';

  return (
    <div className="space-y-6">
      {lesson.type === 'video' && <VideoLesson lesson={lesson} />}
      {lesson.type === 'article' && <ArticleLesson lesson={lesson} />}
      {lesson.type === 'quiz' && <QuizLesson key={lesson.id} lesson={lesson} enrollment={enrollment} />}
      {lesson.type === 'assignment' && <AssignmentLesson key={lesson.id} lesson={lesson} enrollment={enrollment} />}
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
        {(lesson.type === 'video' || lesson.type === 'article') &&
          (done ? (
            <span className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-success-600"><CircleCheck className="size-4" aria-hidden /> Sudah selesai</span>
          ) : (
            <Button
              onClick={() =>
                complete.mutate(lesson.id, {
                  onSuccess: () => toast.success('Materi ditandai selesai.'),
                  onError: (err) => toast.error(errorMessage(err)),
                })
              }
              disabled={complete.isPending}
            >
              <CircleCheck /> {complete.isPending ? 'Menyimpan…' : 'Tandai selesai'}
            </Button>
          ))}
        {onNext && <Button variant="secondary" onClick={onNext}>Materi berikutnya</Button>}
      </div>
    </div>
  );
}
