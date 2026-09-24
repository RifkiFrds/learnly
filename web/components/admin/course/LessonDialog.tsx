'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { toast } from 'sonner';
import { cn } from 'cn';
import { FormError } from '@/components/form/Field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { useAddLesson, useUpdateLesson, type LessonInput } from '@/hooks/api/courses';
import { ApiError, errorMessage } from '@/lib/api-client';
import type { Lesson, LessonType } from '@/lib/types';

interface QuestionDraft {
  questionText: string;
  options: { optionText: string; isCorrect: boolean }[];
}

const emptyQuestion = (): QuestionDraft => ({
  questionText: '',
  options: [
    { optionText: '', isCorrect: true },
    { optionText: '', isCorrect: false },
    { optionText: '', isCorrect: false },
  ],
});

const TYPE_OPTIONS: [LessonType, string][] = [
  ['video', 'Video'],
  ['article', 'Bacaan'],
  ['quiz', 'Kuis (dinilai otomatis)'],
  ['assignment', 'Tugas (dinilai instruktur)'],
];

/** Tambah/ubah lesson (FR-COURSE-02/03). Tipe tidak bisa diubah setelah dibuat — sesuai aturan backend. */
export function LessonDialog({
  open,
  onOpenChange,
  courseId,
  moduleId,
  lesson,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: number;
  moduleId: number;
  lesson?: Lesson;
}) {
  const id = useId();
  const add = useAddLesson(courseId);
  const update = useUpdateLesson(courseId);
  const [type, setType] = useState<LessonType>(lesson?.type ?? 'video');
  const [title, setTitle] = useState(lesson?.title ?? '');
  const [contentUrl, setContentUrl] = useState(lesson?.contentUrl ?? '');
  const [contentBody, setContentBody] = useState(lesson?.contentBody ?? '');
  const [attachmentUrl, setAttachmentUrl] = useState(lesson?.type === 'article' ? (lesson.contentUrl ?? '') : '');
  const [minutes, setMinutes] = useState(lesson?.durationSeconds ? String(Math.round(lesson.durationSeconds / 60)) : '');
  const [questions, setQuestions] = useState<QuestionDraft[]>(
    lesson?.questions?.map((q) => ({ questionText: q.questionText, options: q.options.map((o) => ({ optionText: o.optionText, isCorrect: Boolean(o.isCorrect) })) })) ?? [emptyQuestion()],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const pending = add.isPending || update.isPending;
  const [originalQuestions] = useState(() => JSON.stringify(questions));

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (title.trim().length < 2) next.title = 'Judul minimal 2 karakter';
    if (type === 'video') {
      try {
        new URL(contentUrl);
      } catch {
        next.contentUrl = 'Masukkan URL video lengkap (YouTube, Vimeo, atau file .mp4)';
      }
    }
    if (type === 'article' && attachmentUrl.trim()) {
      try {
        new URL(attachmentUrl);
      } catch {
        next.attachmentUrl = 'Masukkan URL lengkap berkas PDF (https://…)';
      }
    }
    if ((type === 'article' || type === 'assignment') && contentBody.trim().length < 1) {
      next.contentBody = type === 'article' ? 'Tulis isi bacaan' : 'Tulis instruksi tugas';
    }
    if (type === 'quiz') {
      questions.forEach((question, qi) => {
        if (question.questionText.trim().length < 3) next[`q${qi}`] = 'Tulis pertanyaan (minimal 3 karakter)';
        else if (question.options.some((option) => !option.optionText.trim())) next[`q${qi}`] = 'Semua pilihan jawaban harus diisi';
      });
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;
    const input: LessonInput = {
      title: title.trim(),
      type,
      ...(type === 'video' ? { contentUrl: contentUrl.trim(), ...(minutes ? { durationSeconds: Number(minutes) * 60 } : {}) } : {}),
      ...(type === 'article' || type === 'assignment' ? { contentBody: contentBody.trim() } : {}),
      // lampiran PDF bacaan ikut dikirim agar tidak hilang saat lesson diedit
      ...(type === 'article' && attachmentUrl.trim() ? { contentUrl: attachmentUrl.trim() } : {}),
      // soal lama dipertahankan bila tidak diubah (soal yang sudah dikerjakan peserta tidak bisa diganti)
      ...(type === 'quiz' && (!lesson || JSON.stringify(questions) !== originalQuestions) ? { questions: questions.map((q) => ({ questionText: q.questionText.trim(), options: q.options.map((o) => ({ optionText: o.optionText.trim(), isCorrect: o.isCorrect })) })) } : {}),
    };
    try {
      if (lesson) await update.mutateAsync({ lessonId: lesson.id, ...input });
      else await add.mutateAsync({ moduleId, ...input });
      toast.success(lesson ? 'Materi diperbarui.' : 'Materi ditambahkan.');
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors);
      setFormError(errorMessage(err));
    }
  }

  const setQuestion = (qi: number, patch: Partial<QuestionDraft>) =>
    setQuestions((list) => list.map((q, i) => (i === qi ? { ...q, ...patch } : q)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-heading-lg">{lesson ? 'Ubah materi' : 'Tambah materi'}</DialogTitle>
          <DialogDescription>
            {lesson ? 'Jenis materi tidak bisa diubah. Soal kuis yang sudah dikerjakan peserta tidak bisa diganti.' : 'Pilih jenis materi, lalu isi kontennya.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <FormError message={formError} />
          <div className="grid gap-4 sm:grid-cols-[1fr_14rem]">
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-title`} className="text-body-sm font-semibold text-ink-900">Judul materi</Label>
              <Input id={`${id}-title`} value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? `${id}-title-error` : undefined} />
              {errors.title && <p id={`${id}-title-error`} className="text-body-sm text-danger-600" role="alert">{errors.title}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-type`} className="text-body-sm font-semibold text-ink-900">Jenis</Label>
              <NativeSelect id={`${id}-type`} value={type} disabled={Boolean(lesson)} onChange={(e) => setType(e.target.value as LessonType)}>
                {TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </NativeSelect>
            </div>
          </div>

          {type === 'video' && (
            <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-url`} className="text-body-sm font-semibold text-ink-900">URL video</Label>
                <Input id={`${id}-url`} type="url" placeholder="https://www.youtube.com/watch?v=…" value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} aria-invalid={Boolean(errors.contentUrl)} />
                {errors.contentUrl && <p className="text-body-sm text-danger-600" role="alert">{errors.contentUrl}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-min`} className="text-body-sm font-semibold text-ink-900">Durasi (menit)</Label>
                <Input id={`${id}-min`} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))} />
              </div>
            </div>
          )}

          {(type === 'article' || type === 'assignment') && (
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-body`} className="text-body-sm font-semibold text-ink-900">{type === 'article' ? 'Isi bacaan' : 'Instruksi tugas'}</Label>
              <Textarea id={`${id}-body`} rows={8} value={contentBody} onChange={(e) => setContentBody(e.target.value)} aria-invalid={Boolean(errors.contentBody)} placeholder={type === 'assignment' ? 'Mis. Kerjakan 5 soal cerita di bawah, foto hasilnya, lalu unggah sebagai PDF/JPG.' : undefined} />
              {errors.contentBody && <p className="text-body-sm text-danger-600" role="alert">{errors.contentBody}</p>}
            </div>
          )}

          {type === 'article' && (
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-pdf`} className="text-body-sm font-semibold text-ink-900">
                URL lampiran PDF <span className="font-normal text-ink-500">(opsional)</span>
              </Label>
              <Input id={`${id}-pdf`} type="url" placeholder="https://…/materi.pdf" value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} aria-invalid={Boolean(errors.attachmentUrl)} />
              {errors.attachmentUrl && <p className="text-body-sm text-danger-600" role="alert">{errors.attachmentUrl}</p>}
            </div>
          )}

          {type === 'quiz' && (
            <div className="space-y-4">
              {questions.map((question, qi) => (
                <fieldset key={qi} className="space-y-3 rounded-lg border border-border p-4">
                  <legend className="px-1 text-body-sm font-semibold text-ink-900">Soal {qi + 1}</legend>
                  <div className="flex gap-2">
                    <Textarea rows={2} aria-label={`Pertanyaan soal ${qi + 1}`} value={question.questionText} onChange={(e) => setQuestion(qi, { questionText: e.target.value })} placeholder="Tulis pertanyaan" />
                    {questions.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" aria-label={`Hapus soal ${qi + 1}`} onClick={() => setQuestions((list) => list.filter((_, i) => i !== qi))}><Trash2 /></Button>
                    )}
                  </div>
                  <div className="space-y-2" role="radiogroup" aria-label={`Jawaban benar soal ${qi + 1}`}>
                    {question.options.map((option, oi) => (
                      <div key={oi} className={cn('flex items-center gap-2 rounded-lg border px-3', option.isCorrect ? 'border-success-600 bg-success-100/40' : 'border-border')}>
                        <input
                          type="radio"
                          name={`${id}-correct-${qi}`}
                          checked={option.isCorrect}
                          onChange={() => setQuestion(qi, { options: question.options.map((o, i) => ({ ...o, isCorrect: i === oi })) })}
                          className="size-4 accent-success-600"
                          aria-label={`Tandai pilihan ${oi + 1} sebagai jawaban benar`}
                        />
                        <Input
                          className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                          aria-label={`Pilihan ${oi + 1} soal ${qi + 1}`}
                          value={option.optionText}
                          onChange={(e) => setQuestion(qi, { options: question.options.map((o, i) => (i === oi ? { ...o, optionText: e.target.value } : o)) })}
                          placeholder={`Pilihan ${oi + 1}`}
                        />
                        {question.options.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Hapus pilihan ${oi + 1}`}
                            onClick={() => {
                              const rest = question.options.filter((_, i) => i !== oi);
                              if (!rest.some((o) => o.isCorrect)) rest[0] = { ...rest[0], isCorrect: true };
                              setQuestion(qi, { options: rest });
                            }}
                          >
                            <Trash2 />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-body-sm text-ink-500">Pilih lingkaran di samping jawaban yang benar.</p>
                  {question.options.length < 6 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setQuestion(qi, { options: [...question.options, { optionText: '', isCorrect: false }] })}>
                      <Plus /> Tambah pilihan
                    </Button>
                  )}
                  {errors[`q${qi}`] && <p className="text-body-sm text-danger-600" role="alert">{errors[`q${qi}`]}</p>}
                </fieldset>
              ))}
              {questions.length < 50 && (
                <Button type="button" variant="secondary" onClick={() => setQuestions((list) => [...list, emptyQuestion()])}><Plus /> Tambah soal</Button>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Menyimpan…' : lesson ? 'Simpan materi' : 'Tambah materi'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
