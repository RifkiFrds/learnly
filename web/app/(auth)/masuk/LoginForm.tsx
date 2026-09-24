'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Info } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Field, FormError } from '@/components/form/Field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { homeFor, useAuth } from '@/lib/auth';
import { applyApiError, emailField, safeNext } from '@/lib/forms';

const schema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password wajib diisi'),
});
type Values = z.infer<typeof schema>;

export function LoginForm() {
  const { login, status, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  // Sudah login → langsung ke tujuan
  useEffect(() => {
    if (status === 'authenticated' && user) router.replace(next ?? homeFor(user.role));
  }, [status, user, next, router]);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const me = await login(values.email, values.password);
      router.replace(next ?? homeFor(me.role));
    } catch (err) {
      setFormError(applyApiError(err, form.setError));
    }
  });

  const { errors, isSubmitting } = form.formState;

  return (
    <div className="rounded-lg border border-border bg-surface p-6 shadow-sm md:p-8">
      <h1 className="text-heading-lg md:text-display-md">Masuk ke Learnly</h1>
      <p className="mt-1 text-body-md text-ink-500">Lanjutkan jadwal les dan kursusmu.</p>

      {searchParams.get('alasan') === 'sesi-berakhir' && (
        <p className="mt-5 flex items-start gap-2 rounded-lg bg-info-100 px-4 py-3 text-body-sm text-info-600" role="status">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          Sesimu sudah berakhir. Silakan masuk lagi untuk melanjutkan.
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <FormError message={formError} />
        <Field label="Email" error={errors.email?.message}>
          {(props) => <Input {...props} type="email" autoComplete="email" {...form.register('email')} />}
        </Field>
        <Field label="Password" error={errors.password?.message}>
          {(props) => <Input {...props} type="password" autoComplete="current-password" {...form.register('password')} />}
        </Field>
        <div className="flex justify-end">
          <Link href="/lupa-password" className="rounded-sm text-body-sm font-semibold text-primary-700 hover:underline">
            Lupa password?
          </Link>
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Memeriksa…' : 'Masuk'}
        </Button>
      </form>

      <p className="mt-6 text-center text-body-sm text-ink-500">
        Belum punya akun?{' '}
        <Link href={next ? `/daftar?next=${encodeURIComponent(next)}` : '/daftar'} className="font-semibold text-primary-700 hover:underline">
          Daftar gratis
        </Link>
      </p>

      {process.env.NODE_ENV !== 'production' && (
        <details className="mt-6 rounded-lg bg-surface-muted px-4 py-3 text-body-sm text-ink-700">
          <summary className="cursor-pointer font-semibold">Akun demo (server lokal, setelah npm run db:reset:demo)</summary>
          <ul className="mt-2 space-y-1 font-mono text-[0.8125rem]">
            <li>Password semua akun: Demo#2026</li>
            <li>Orang tua: sari@demo.learnly.id</li>
            <li>Siswa: putri@demo.learnly.id</li>
            <li>Tutor: rizky@demo.learnly.id</li>
            <li>Admin: admin@demo.learnly.id</li>
          </ul>
        </details>
      )}
    </div>
  );
}
