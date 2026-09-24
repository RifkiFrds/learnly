'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Field, FormError } from '@/components/form/Field';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCheckout } from '@/hooks/api/bookings';
import { UNDERSTANDING_LABEL } from '@/lib/booking';
import { applyApiError } from '@/lib/forms';
import { cn } from 'cn';

const optional = z.string().trim().max(5000);
const schema = z.object({
  materialsCovered: z.string().trim().min(10, 'Jelaskan materi yang dibahas, minimal 10 karakter').max(5000),
  understandingLevel: z.number({ error: 'Pilih tingkat pemahaman siswa' }).int().min(1, 'Pilih tingkat pemahaman siswa').max(5),
  masteredSkills: optional,
  areasToImprove: optional,
  homeworkGiven: optional,
  recommendationNotes: optional,
});
type Values = z.infer<typeof schema>;

/** Check-out sesi + laporan perkembangan wajib (FR-CHECKIN-03, FR-REPORT-01). */
export function CheckoutReportForm({ bookingId, learnerName }: { bookingId: number; learnerName: string }) {
  const checkout = useCheckout(bookingId);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { materialsCovered: '', understandingLevel: 0, masteredSkills: '', areasToImprove: '', homeworkGiven: '', recommendationNotes: '' },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await checkout.mutateAsync({
        materialsCovered: values.materialsCovered,
        understandingLevel: values.understandingLevel,
        masteredSkills: values.masteredSkills || undefined,
        areasToImprove: values.areasToImprove || undefined,
        homeworkGiven: values.homeworkGiven || undefined,
        recommendationNotes: values.recommendationNotes || undefined,
      });
      toast.success('Sesi selesai. Laporan terkirim ke orang tua/siswa.');
    } catch (err) {
      setFormError(applyApiError(err, form.setError));
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <p className="text-body-sm text-ink-700">
        Sesi baru tercatat selesai setelah laporan ini dikirim. Laporan langsung bisa dibaca {learnerName} dan orang tuanya.
      </p>
      <FormError message={formError} />
      <Field label="Materi yang dibahas" error={errors.materialsCovered?.message}>
        {(props) => <Textarea {...props} rows={3} placeholder="Mis. Persamaan linear satu variabel: memindahkan suku, soal cerita umur." {...form.register('materialsCovered')} />}
      </Field>
      <Controller
        control={form.control}
        name="understandingLevel"
        render={({ field }) => (
          <fieldset aria-describedby={errors.understandingLevel ? 'understanding-error' : undefined}>
            <legend className="mb-2 text-body-sm font-semibold text-ink-900">Tingkat pemahaman siswa</legend>
            <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Tingkat pemahaman">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  type="button"
                  role="radio"
                  aria-checked={field.value === level}
                  onClick={() => field.onChange(level)}
                  className={cn(
                    'flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-lg border px-1 py-2 text-center transition-colors',
                    field.value === level ? 'border-primary-600 bg-primary-100 text-ink-900' : 'border-border bg-surface text-ink-700 hover:border-primary-600',
                  )}
                >
                  <span className="font-sans text-body-md font-semibold">{level}</span>
                  <span className="text-label-sm font-normal tracking-normal">{UNDERSTANDING_LABEL[level]}</span>
                </button>
              ))}
            </div>
            {errors.understandingLevel && (
              <p id="understanding-error" className="mt-1.5 text-body-sm text-danger-600" role="alert">{errors.understandingLevel.message}</p>
            )}
          </fieldset>
        )}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Sudah dikuasai" optional>
          {(props) => <Textarea {...props} rows={2} {...form.register('masteredSkills')} />}
        </Field>
        <Field label="Perlu ditingkatkan" optional>
          {(props) => <Textarea {...props} rows={2} {...form.register('areasToImprove')} />}
        </Field>
        <Field label="Pekerjaan rumah" optional>
          {(props) => <Textarea {...props} rows={2} {...form.register('homeworkGiven')} />}
        </Field>
        <Field label="Saran sesi berikutnya" optional>
          {(props) => <Textarea {...props} rows={2} {...form.register('recommendationNotes')} />}
        </Field>
      </div>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Mengirim laporan…' : 'Selesaikan sesi & kirim laporan'}
      </Button>
    </form>
  );
}
