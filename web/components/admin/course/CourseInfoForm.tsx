'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Field, FormError } from '@/components/form/Field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { useCategories, useEducationLevels } from '@/hooks/api/catalog';
import { useSaveCourse } from '@/hooks/api/courses';
import { applyApiError } from '@/lib/forms';
import type { CourseDetail } from '@/lib/types';

const schema = z
  .object({
    title: z.string().trim().min(5, 'Judul minimal 5 karakter').max(191),
    description: z.string().trim().max(10_000),
    categoryId: z.string().min(1, 'Pilih kategori'),
    educationLevelId: z.string(),
    level: z.enum(['pemula', 'menengah', 'lanjut']),
    isFree: z.boolean(),
    price: z.string(),
    thumbnailUrl: z.union([z.literal(''), z.string().trim().url('Masukkan URL gambar yang lengkap (https://…)')]),
    passingGrade: z.string().refine((value) => value === '' || (Number(value) >= 0 && Number(value) <= 100), 'Nilai lulus 0–100'),
    issuesCertificate: z.boolean(),
  })
  .refine((values) => values.isFree || Number(values.price) >= 1000, { message: 'Harga kursus berbayar minimal Rp1.000', path: ['price'] });
type Values = z.infer<typeof schema>;

/** Metadata kursus (FR-COURSE-01). Dipakai untuk membuat kursus baru & mengedit. */
export function CourseInfoForm({ course }: { course?: CourseDetail }) {
  const router = useRouter();
  const categories = useCategories();
  const levels = useEducationLevels();
  const save = useSaveCourse(course?.id);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      title: course?.title ?? '',
      description: course?.description ?? '',
      categoryId: course ? String(course.category.id) : '',
      educationLevelId: course?.educationLevel ? String(course.educationLevel.id) : '',
      level: course?.level ?? 'pemula',
      isFree: course?.isFree ?? false,
      price: course && !course.isFree ? String(course.price) : '',
      thumbnailUrl: course?.thumbnailUrl ?? '',
      passingGrade: course ? String(course.passingGrade) : '',
      issuesCertificate: course?.issuesCertificate ?? true,
    },
  });
  const { errors } = form.formState;
  const isFree = useWatch({ control: form.control, name: 'isFree' });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const saved = await save.mutateAsync({
        title: values.title,
        description: values.description || null,
        categoryId: Number(values.categoryId),
        educationLevelId: values.educationLevelId ? Number(values.educationLevelId) : null,
        level: values.level,
        isFree: values.isFree,
        price: values.isFree ? 0 : Number(values.price),
        thumbnailUrl: values.thumbnailUrl || null,
        passingGrade: values.passingGrade === '' ? null : Number(values.passingGrade),
        issuesCertificate: values.issuesCertificate,
      });
      if (course) {
        toast.success('Info kursus tersimpan.');
      } else {
        toast.success('Kursus dibuat sebagai draf. Lanjutkan dengan menyusun kurikulum.');
        router.replace(`/admin/kursus/${saved.id}?tab=kurikulum`);
      }
    } catch (err) {
      setFormError(applyApiError(err, form.setError, { categoryId: 'categoryId', educationLevelId: 'educationLevelId' }));
    }
  });

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-5" noValidate>
      <FormError message={formError} />
      <Field label="Judul kursus" error={errors.title?.message}>
        {(props) => <Input {...props} placeholder="Mis. Aljabar Dasar untuk SMP" {...form.register('title')} />}
      </Field>
      <Field label="Deskripsi" optional hint="Jelaskan untuk siapa kursus ini dan apa yang akan dikuasai setelahnya.">
        {(props) => <Textarea {...props} rows={5} {...form.register('description')} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Kategori" error={errors.categoryId?.message}>
          {(props) => (
            <NativeSelect {...props} {...form.register('categoryId')}>
              <option value="">Pilih kategori</option>
              {categories.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </NativeSelect>
          )}
        </Field>
        <Field label="Jenjang" optional>
          {(props) => (
            <NativeSelect {...props} {...form.register('educationLevelId')}>
              <option value="">Umum</option>
              {levels.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </NativeSelect>
          )}
        </Field>
        <Field label="Tingkat kesulitan">
          {(props) => (
            <NativeSelect {...props} {...form.register('level')}>
              <option value="pemula">Pemula</option>
              <option value="menengah">Menengah</option>
              <option value="lanjut">Lanjut</option>
            </NativeSelect>
          )}
        </Field>
      </div>
      <fieldset className="space-y-3 rounded-lg border border-border p-4">
        <legend className="px-1 text-body-sm font-semibold text-ink-900">Harga</legend>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-body-md text-ink-900">
          <input type="checkbox" className="size-5 accent-primary-600" {...form.register('isFree')} />
          Kursus gratis
        </label>
        {!isFree && (
          <Field label="Harga (Rp)" error={errors.price?.message}>
            {(props) => <Input {...props} inputMode="numeric" placeholder="149000" {...form.register('price', { setValueAs: (value: string) => value.replace(/\D/g, '') })} />}
          </Field>
        )}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nilai lulus" optional hint="Kosongkan untuk memakai nilai default platform." error={errors.passingGrade?.message}>
          {(props) => <Input {...props} inputMode="numeric" {...form.register('passingGrade')} />}
        </Field>
        <Field label="URL gambar sampul" optional error={errors.thumbnailUrl?.message}>
          {(props) => <Input {...props} type="url" placeholder="https://…" {...form.register('thumbnailUrl')} />}
        </Field>
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-body-md text-ink-900">
        <input type="checkbox" className="size-5 accent-primary-600" {...form.register('issuesCertificate')} />
        Terbitkan sertifikat PDF untuk peserta yang lulus
      </label>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Menyimpan…' : course ? 'Simpan info kursus' : 'Buat kursus (draf)'}
      </Button>
    </form>
  );
}
