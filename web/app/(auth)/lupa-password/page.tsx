'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Field, FormError } from '@/components/form/Field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api-client';
import { applyApiError, emailField } from '@/lib/forms';

const schema = z.object({ email: emailField });

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState<{ message: string; devResetToken?: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      setSent(await api.post<{ message: string; devResetToken?: string }>('/auth/forgot-password', values, false));
    } catch (err) {
      setFormError(applyApiError(err, form.setError));
    }
  });

  return (
    <div className="rounded-lg border border-border bg-surface p-6 shadow-sm md:p-8">
      <h1 className="text-heading-lg md:text-display-md">Lupa password</h1>
      {sent ? (
        <div className="mt-5 space-y-4">
          <p className="flex items-start gap-3 text-body-md text-ink-700" role="status">
            <MailCheck className="mt-0.5 size-5 shrink-0 text-success-600" aria-hidden />
            {sent.message} Link berlaku 1 jam.
          </p>
          {sent.devResetToken && (
            <p className="rounded-lg bg-surface-muted px-4 py-3 text-body-sm text-ink-700">
              Server lokal tidak mengirim email sungguhan.{' '}
              <Link href={`/reset-password?token=${encodeURIComponent(sent.devResetToken)}`} className="font-semibold text-primary-700 underline">
                Buka tautan reset
              </Link>
            </p>
          )}
          <Button asChild variant="secondary" className="w-full">
            <Link href="/masuk">Kembali ke halaman masuk</Link>
          </Button>
        </div>
      ) : (
        <>
          <p className="mt-1 text-body-md text-ink-500">Masukkan email akunmu, kami kirimkan link untuk membuat password baru.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <FormError message={formError} />
            <Field label="Email" error={form.formState.errors.email?.message}>
              {(props) => <Input {...props} type="email" autoComplete="email" {...form.register('email')} />}
            </Field>
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Mengirim…' : 'Kirim link reset'}
            </Button>
          </form>
          <p className="mt-6 text-center text-body-sm text-ink-500">
            Ingat passwordnya?{' '}
            <Link href="/masuk" className="font-semibold text-primary-700 hover:underline">
              Masuk
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
