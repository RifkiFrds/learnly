'use client';

import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { LessonDialog } from '@/components/admin/course/LessonDialog';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/States';
import { LESSON_ICON, LESSON_TYPE_LABEL, formatSeconds } from '@/components/course/CourseDetailView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDeleteLesson, useSetModules } from '@/hooks/api/courses';
import { errorMessage } from '@/lib/api-client';
import type { CourseDetail, Lesson } from '@/lib/types';

/** Susun modul (tambah/ubah nama/urutkan/hapus) & materi di dalamnya (FR-COURSE-02). */
export function CurriculumEditor({ course }: { course: CourseDetail }) {
  const setModules = useSetModules(course.id);
  const removeLesson = useDeleteLesson(course.id);
  const [newModule, setNewModule] = useState('');
  const [renaming, setRenaming] = useState<{ id: number; title: string } | null>(null);
  const [lessonDialog, setLessonDialog] = useState<{ moduleId: number; lesson?: Lesson } | null>(null);
  const [toDelete, setToDelete] = useState<Lesson | null>(null);
  const [moduleToDelete, setModuleToDelete] = useState<{ id: number; title: string } | null>(null);
  const modules = course.modules.map((mod) => ({ id: mod.id, title: mod.title }));

  async function saveModules(list: { id?: number; title: string }[], success: string) {
    try {
      await setModules.mutateAsync(list);
      toast.success(success);
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    }
  }

  function move(index: number, delta: number) {
    const list = [...modules];
    const [item] = list.splice(index, 1);
    list.splice(index + delta, 0, item);
    saveModules(list, 'Urutan modul diperbarui.');
  }

  return (
    <div className="space-y-5">
      {course.modules.length === 0 && (
        <EmptyState illustration="book" title="Belum ada modul." description="Mulai dengan membuat modul pertama, lalu isi dengan video, bacaan, kuis, atau tugas." />
      )}
      {course.modules.map((mod, index) => (
        <section key={mod.id} className="rounded-lg border border-border bg-surface" aria-label={`Modul ${index + 1}`}>
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
            {renaming?.id === mod.id ? (
              <form
                className="flex flex-1 flex-wrap items-center gap-2"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (renaming.title.trim().length < 2) return;
                  const ok = await saveModules(modules.map((m) => (m.id === mod.id ? { ...m, title: renaming.title.trim() } : m)), 'Nama modul diperbarui.');
                  if (ok) setRenaming(null);
                }}
              >
                <Input aria-label="Nama modul" value={renaming.title} onChange={(e) => setRenaming({ ...renaming, title: e.target.value })} className="h-10 max-w-md flex-1" autoFocus />
                <Button type="submit" size="sm" disabled={setModules.isPending}>Simpan</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setRenaming(null)}>Batal</Button>
              </form>
            ) : (
              <>
                <h3 className="min-w-0 flex-1 font-sans text-body-md font-semibold text-ink-900">
                  <span className="text-ink-500">Modul {index + 1} · </span>{mod.title}
                </h3>
                <div className="flex">
                  <Button variant="ghost" size="icon" aria-label={`Naikkan modul ${mod.title}`} disabled={index === 0 || setModules.isPending} onClick={() => move(index, -1)}><ArrowUp /></Button>
                  <Button variant="ghost" size="icon" aria-label={`Turunkan modul ${mod.title}`} disabled={index === course.modules.length - 1 || setModules.isPending} onClick={() => move(index, 1)}><ArrowDown /></Button>
                  <Button variant="ghost" size="icon" aria-label={`Ubah nama modul ${mod.title}`} onClick={() => setRenaming({ id: mod.id, title: mod.title })}><Pencil /></Button>
                  <Button variant="ghost" size="icon" aria-label={`Hapus modul ${mod.title}`} disabled={course.modules.length === 1} onClick={() => setModuleToDelete({ id: mod.id, title: mod.title })}><Trash2 /></Button>
                </div>
              </>
            )}
          </div>
          <ul className="divide-y divide-border">
            {mod.lessons.map((lesson) => {
              const Icon = LESSON_ICON[lesson.type];
              return (
                <li key={lesson.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Icon className="size-4 shrink-0 text-primary-600" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-semibold text-ink-900">{lesson.title}</p>
                    <p className="text-body-sm text-ink-500">
                      {LESSON_TYPE_LABEL[lesson.type]}
                      {lesson.type === 'quiz' ? ` · ${lesson.questionCount} soal` : ''}
                      {formatSeconds(lesson.durationSeconds) ? ` · ${formatSeconds(lesson.durationSeconds)}` : ''}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" aria-label={`Ubah materi ${lesson.title}`} onClick={() => setLessonDialog({ moduleId: mod.id, lesson })}><Pencil /></Button>
                  <Button variant="ghost" size="icon" aria-label={`Hapus materi ${lesson.title}`} onClick={() => setToDelete(lesson)}><Trash2 /></Button>
                </li>
              );
            })}
          </ul>
          <div className="px-4 py-3">
            <Button variant="secondary" size="sm" onClick={() => setLessonDialog({ moduleId: mod.id })}><Plus /> Tambah materi</Button>
          </div>
        </section>
      ))}
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
        onSubmit={async (event) => {
          event.preventDefault();
          if (newModule.trim().length < 2) return;
          const ok = await saveModules([...modules, { title: newModule.trim() }], 'Modul ditambahkan.');
          if (ok) setNewModule('');
        }}
      >
        <Input aria-label="Nama modul baru" placeholder="Nama modul baru, mis. Modul 2 — Persamaan linear" value={newModule} onChange={(e) => setNewModule(e.target.value)} className="sm:max-w-md" />
        <Button type="submit" variant="secondary" disabled={setModules.isPending || newModule.trim().length < 2}><Plus /> Tambah modul</Button>
      </form>

      {lessonDialog && (
        <LessonDialog
          open
          onOpenChange={(open) => !open && setLessonDialog(null)}
          courseId={course.id}
          moduleId={lessonDialog.moduleId}
          lesson={lessonDialog.lesson}
        />
      )}
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Hapus materi “${toDelete?.title}”?`}
        consequence="Materi hilang dari kurikulum dan tidak bisa dikembalikan. Materi yang sudah dipelajari atau dikerjakan peserta tidak bisa dihapus."
        confirmLabel="Hapus materi"
        destructive
        pending={removeLesson.isPending}
        onConfirm={async () => {
          try {
            await removeLesson.mutateAsync(toDelete!.id);
            toast.success('Materi dihapus.');
          } catch (err) {
            toast.error(errorMessage(err));
          }
          setToDelete(null);
        }}
      />
      <ConfirmDialog
        open={Boolean(moduleToDelete)}
        onOpenChange={(open) => !open && setModuleToDelete(null)}
        title={`Hapus modul “${moduleToDelete?.title}”?`}
        consequence="Modul beserta semua materinya dihapus. Modul yang sudah dipelajari peserta tidak bisa dihapus."
        confirmLabel="Hapus modul"
        destructive
        pending={setModules.isPending}
        onConfirm={async () => {
          await saveModules(modules.filter((m) => m.id !== moduleToDelete!.id), 'Modul dihapus.');
          setModuleToDelete(null);
        }}
      />
    </div>
  );
}
