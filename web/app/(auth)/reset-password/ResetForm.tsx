'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CircleCheck } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Field, FormError } from '@/components/form/Field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api-client';
import { applyApiError, passwordField } from '@/lib/forms';

const schema = z
  .object({ newPassword: passwordField, confirmPassword: z.string() })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Konfirmasi password belum sama',
    path: ['confirmPassword'],
  });

export function ResetForm() {
  const token = useSearchParams().get('token');
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await api.post('/auth/reset-password', { token, newPassword: values.newPassword }, false);
      setDone(true);
    } catch (err) {
      setFormError(applyApiError(err, form.setError));
    }
  });

  if (!token) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 shadow-sm md:p-8">
        <h1 className="text-heading-lg">Link tidak lengkap</h1>
        <p className="mt-2 text-body-md text-ink-700">Buka link dari email reset password, atau minta link baru.</p>
        <Button asChild className="mt-6 w-full">
          <Link href="/lupa-password">Minta link baru</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-6 shadow-sm md:p-8">
      <h1 className="text-heading-lg md:text-display-md">Buat password baru</h1>
      {done ? (
        <div className="mt-5 space-y-5">
          <p className="flex items-start gap-3 text-body-md text-ink-700" role="status">
            <CircleCheck className="mt-0.5 size-5 shrink-0 text-success-600" aria-hidden />
            Password berhasil diganti. Semua sesi lama sudah kami keluarkan demi keamanan.
          </p>
          <Button asChild className="w-full">
            <Link href="/masuk">Masuk dengan password baru</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <FormError message={formError} />
          {formError && (
            <p className="text-body-sm text-ink-500">
              Link sudah dipakai atau kedaluwarsa?{' '}
              <Link href="/lupa-password" className="font-semibold text-primary-700 underline">
                Minta link baru
              </Link>
            </p>
          )}
          <Field label="Password baru" hint="Minimal 8 karakter." error={form.formState.errors.newPassword?.message}>
            {(props) => <Input {...props} type="password" autoComplete="new-password" {...form.register('newPassword')} />}
          </Field>
          <Field label="Ulangi password baru" error={form.formState.errors.confirmPassword?.message}>
            {(props) => <Input {...props} type="password" autoComplete="new-password" {...form.register('confirmPassword')} />}
          </Field>
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Menyimpan…' : 'Simpan password'}
          </Button>
        </form>
      )}
    </div>
  );
}
