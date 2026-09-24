'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ExternalLink, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { cn } from 'cn';
import { Panel } from '@/components/common/Bits';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Field, FormError } from '@/components/form/Field';
import { FileInput } from '@/components/form/FileInput';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTutorMutation } from '@/hooks/api/account';
import { useEducationLevels, useSubjects } from '@/hooks/api/catalog';
import { api, errorMessage } from '@/lib/api-client';
import { formatDate, TEACHING_MODE_LABEL } from '@/lib/format';
import { applyApiError } from '@/lib/forms';
import type { TeachingMode, TutorProfile } from '@/lib/types';

const biodataSchema = z.object({
  bio: z.string().trim().min(30, 'Ceritakan dirimu minimal 30 karakter').max(5000),
  educationBackground: z.string().trim().max(255),
  teachingExperienceYears: z.number({ error: 'Isi dengan angka' }).int().min(0).max(60),
  curriculum: z.string().trim().max(255),
  hourlyRate: z.number({ error: 'Isi tarif per jam' }).int().min(10000, 'Tarif minimal Rp10.000').max(5_000_000),
  teachingMode: z.enum(['online', 'tatap_muka', 'both']),
  autoAccept: z.boolean(),
});
type Biodata = z.infer<typeof biodataSchema>;

export function BiodataForm({ profile }: { profile: TutorProfile }) {
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<Biodata>({
    resolver: zodResolver(biodataSchema),
    values: {
      bio: profile.bio ?? '',
      educationBackground: profile.educationBackground ?? '',
      teachingExperienceYears: profile.teachingExperienceYears ?? 0,
      curriculum: profile.curriculum ?? '',
      hourlyRate: profile.hourlyRate || 0,
      teachingMode: profile.teachingMode,
      autoAccept: profile.autoAccept ?? false,
    },
  });
  const save = useTutorMutation((input: Biodata) =>
    api.put<TutorProfile>('/tutors/me', {
      ...input,
      educationBackground: input.educationBackground || null,
      curriculum: input.curriculum || null,
    }),
  );
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await save.mutateAsync(values);
      toast.success('Biodata tersimpan.');
    } catch (err) {
      setFormError(applyApiError(err, form.setError));
    }
  });

  return (
    <Panel title="Biodata & tarif">
      <form id="biodata" onSubmit={onSubmit} className="scroll-mt-24 space-y-4" noValidate>
        <FormError message={formError} />
        <Field label="Bio" hint="Ceritakan latar belakang, gaya mengajar, dan prestasi siswamu." error={errors.bio?.message}>
          {(props) => <Textarea {...props} rows={5} {...form.register('bio')} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pendidikan terakhir" optional error={errors.educationBackground?.message}>
            {(props) => <Input {...props} placeholder="S1 Pendidikan Matematika, UI" {...form.register('educationBackground')} />}
          </Field>
          <Field label="Kurikulum yang dikuasai" optional error={errors.curriculum?.message}>
            {(props) => <Input {...props} placeholder="Kurikulum Merdeka, Cambridge" {...form.register('curriculum')} />}
          </Field>
          <Field label="Pengalaman mengajar (tahun)" error={errors.teachingExperienceYears?.message}>
            {(props) => <Input {...props} type="number" inputMode="numeric" min={0} {...form.register('teachingExperienceYears', { valueAsNumber: true })} />}
          </Field>
          <Field label="Tarif per jam (Rp)" hint="Siswa membayar tarif ini × durasi, ditambah biaya layanan." error={errors.hourlyRate?.message}>
            {(props) => <Input {...props} type="number" inputMode="numeric" min={10000} step={5000} {...form.register('hourlyRate', { valueAsNumber: true })} />}
          </Field>
        </div>
        <fieldset>
          <legend className="mb-2 text-body-sm font-semibold text-ink-900">Cara mengajar</legend>
          <Controller
            control={form.control}
            name="teachingMode"
            render={({ field }) => (
              <div role="radiogroup" className="grid gap-2 sm:grid-cols-3">
                {(['online', 'tatap_muka', 'both'] as TeachingMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={field.value === mode}
                    onClick={() => field.onChange(mode)}
                    className={cn(
                      'min-h-11 cursor-pointer rounded-lg border px-3 text-body-sm font-semibold',
                      field.value === mode ? 'border-primary-600 bg-primary-100/60 text-primary-700' : 'border-border text-ink-700 hover:bg-surface-muted',
                    )}
                  >
                    {TEACHING_MODE_LABEL[mode]}
                  </button>
                ))}
              </div>
            )}
          />
        </fieldset>
        <Controller
          control={form.control}
          name="autoAccept"
          render={({ field }) => (
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border px-4 py-3">
              <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} className="mt-0.5" aria-labelledby="auto-accept-label" aria-describedby="auto-accept-hint" />
              <span>
                <span id="auto-accept-label" className="block text-body-sm font-semibold text-ink-900">Terima booking otomatis</span>
                <span id="auto-accept-hint" className="block text-body-sm text-ink-500">Booking baru langsung diterima tanpa menunggu kamu menekan “Terima”.</span>
              </span>
            </label>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Menyimpan…' : 'Simpan biodata'}
        </Button>
      </form>
    </Panel>
  );
}

function ChipToggle({ items, selected, onToggle }: { items: { id: number; name: string }[]; selected: number[]; onToggle: (id: number) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const active = selected.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(item.id)}
            className={cn(
              'inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-body-sm font-semibold transition-colors',
              active ? 'border-primary-600 bg-primary-100 text-primary-700' : 'border-border bg-surface text-ink-700 hover:bg-surface-muted',
            )}
          >
            {active && <Check className="size-4" aria-hidden />}
            {item.name}
          </button>
        );
      })}
    </div>
  );
}

export function SubjectsForm({ profile }: { profile: TutorProfile }) {
  const subjects = useSubjects();
  const levels = useEducationLevels();
  const [subjectIds, setSubjectIds] = useState(profile.subjects.map((s) => s.id));
  const [levelIds, setLevelIds] = useState(profile.educationLevels.map((l) => l.id));
  const saveSubjects = useTutorMutation((ids: number[]) => api.put('/tutors/me/subjects', { subjectIds: ids }));
  const saveLevels = useTutorMutation((ids: number[]) => api.put('/tutors/me/education-levels', { educationLevelIds: ids }));
  const toggle = (list: number[], id: number) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  async function save() {
    if (!subjectIds.length || !levelIds.length) {
      toast.error('Pilih minimal satu mata pelajaran dan satu jenjang.');
      return;
    }
    try {
      await saveSubjects.mutateAsync(subjectIds);
      await saveLevels.mutateAsync(levelIds);
      toast.success('Mapel & jenjang tersimpan.');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Panel title="Mata pelajaran & jenjang">
      <div id="mapel" className="scroll-mt-24 space-y-5">
        <div>
          <p className="mb-2 text-body-sm font-semibold text-ink-900">Mata pelajaran yang kamu ajarkan</p>
          <ChipToggle items={subjects.data ?? []} selected={subjectIds} onToggle={(id) => setSubjectIds((list) => toggle(list, id))} />
        </div>
        <div>
          <p className="mb-2 text-body-sm font-semibold text-ink-900">Jenjang siswa</p>
          <ChipToggle items={levels.data ?? []} selected={levelIds} onToggle={(id) => setLevelIds((list) => toggle(list, id))} />
        </div>
        <Button onClick={save} disabled={saveSubjects.isPending || saveLevels.isPending}>
          {saveSubjects.isPending || saveLevels.isPending ? 'Menyimpan…' : 'Simpan mapel & jenjang'}
        </Button>
      </div>
    </Panel>
  );
}

export function DocumentsPanel({ profile }: { profile: TutorProfile }) {
  const [title, setTitle] = useState('');
  const [issuer, setIssuer] = useState('');
  const [issuedAt, setIssuedAt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | undefined>();
  const [titleError, setTitleError] = useState<string | undefined>();
  const [toDelete, setToDelete] = useState<{ id: number; title: string } | null>(null);

  const upload = useTutorMutation((form: FormData) => api.upload('/tutors/me/certifications', form));
  const remove = useTutorMutation((id: number) => api.delete(`/tutors/me/certifications/${id}`));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setTitleError(title.trim().length < 2 ? 'Nama dokumen wajib diisi' : undefined);
    if (!file) setFileError('Pilih file dokumen dulu');
    if (title.trim().length < 2 || !file) return;
    const form = new FormData();
    form.append('title', title.trim());
    if (issuer.trim()) form.append('issuer', issuer.trim());
    if (issuedAt) form.append('issuedAt', issuedAt);
    form.append('file', file);
    try {
      await upload.mutateAsync(form);
      toast.success('Dokumen terunggah. Admin akan memeriksanya.');
      setTitle('');
      setIssuer('');
      setIssuedAt('');
      setFile(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Panel title="Dokumen verifikasi">
      <div id="dokumen" className="scroll-mt-24 space-y-5">
        <p className="text-body-sm text-ink-500">
          Unggah ijazah, sertifikat, atau dokumen pendukung lain. File disimpan privat — hanya kamu dan admin yang bisa membukanya. Siswa hanya melihat judulnya.
        </p>
        {profile.certifications.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {profile.certifications.map((cert) => (
              <li key={cert.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-semibold text-ink-900">{cert.title}</p>
                  <p className="text-body-sm text-ink-500">
                    {[cert.issuer, cert.issuedAt && formatDate(cert.issuedAt, false)].filter(Boolean).join(' · ') || 'Tanpa keterangan'}
                  </p>
                </div>
                {cert.fileUrl && (
                  <Button asChild variant="ghost" size="sm">
                    <a href={cert.fileUrl} target="_blank" rel="noreferrer">
                      <ExternalLink /> Lihat
                    </a>
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => setToDelete({ id: cert.id, title: cert.title })} aria-label={`Hapus ${cert.title}`}>
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={submit} className="space-y-4 rounded-lg bg-surface-muted/60 p-4" noValidate>
          <p className="text-body-sm font-semibold text-ink-900">Tambah dokumen</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama dokumen" error={titleError}>
              {(props) => <Input {...props} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ijazah S1" />}
            </Field>
            <Field label="Penerbit" optional>
              {(props) => <Input {...props} value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="Universitas Indonesia" />}
            </Field>
            <Field label="Tanggal terbit" optional>
              {(props) => <Input {...props} type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} />}
            </Field>
          </div>
          <FileInput
            label="File dokumen"
            accept={['application/pdf', 'image/png', 'image/jpeg', 'image/webp']}
            file={file}
            onFile={(next, error) => {
              setFile(next);
              setFileError(error);
            }}
            error={fileError}
          />
          <Button type="submit" disabled={upload.isPending}>
            {upload.isPending ? 'Mengunggah…' : 'Unggah dokumen'}
          </Button>
        </form>
      </div>
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Hapus dokumen?"
        consequence={`“${toDelete?.title}” akan dihapus dari profilmu dan tidak bisa dilihat admin lagi. Unggah ulang jika masih dibutuhkan untuk verifikasi.`}
        confirmLabel="Hapus dokumen"
        destructive
        pending={remove.isPending}
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await remove.mutateAsync(toDelete.id);
            toast.success('Dokumen dihapus.');
          } catch (err) {
            toast.error(errorMessage(err));
          }
          setToDelete(null);
        }}
      />
    </Panel>
  );
}
