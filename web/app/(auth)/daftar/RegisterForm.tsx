'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { GraduationCap, Presentation, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { cn } from 'cn';
import { Field, FormError } from '@/components/form/Field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';
import { applyApiError, emailField, passwordField, phoneField, safeNext } from '@/lib/forms';

const ROLES = [
  { value: 'parent', label: 'Orang tua', description: 'Cari tutor & pantau perkembangan anak', icon: Users },
  { value: 'student', label: 'Siswa', description: 'Belajar sendiri, les atau kursus', icon: GraduationCap },
  { value: 'tutor', label: 'Tutor', description: 'Mengajar online atau datang ke rumah', icon: Presentation },
] as const;

const schema = z
  .object({
    role: z.enum(['parent', 'student', 'tutor'], { error: 'Pilih peranmu dulu' }),
    fullName: z.string().trim().min(2, 'Nama minimal 2 karakter').max(191),
    email: emailField,
    phone: phoneField,
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Konfirmasi password belum sama',
    path: ['confirmPassword'],
  });
type Values = z.infer<typeof schema>;

export function RegisterForm() {
  const { register: registerAccount } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const initialRole = searchParams.get('peran');
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: initialRole === 'tutor' || initialRole === 'student' || initialRole === 'parent' ? initialRole : undefined,
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const { me } = await registerAccount({
        role: values.role,
        fullName: values.fullName,
        email: values.email,
        phone: values.phone || undefined,
        password: values.password,
      });
      toast.success('Akunmu sudah aktif. Selamat datang di Learnly!');
      if (me.role === 'tutor') router.replace('/mengajar/profil');
      else if (me.role === 'parent') router.replace(next ?? '/anak?baru=1');
      else router.replace(next ?? '/beranda');
    } catch (err) {
      setFormError(applyApiError(err, form.setError));
    }
  });

  return (
    <div className="rounded-lg border border-border bg-surface p-6 shadow-sm md:p-8">
      <h1 className="text-heading-lg md:text-display-md">Buat akun Learnly</h1>
      <p className="mt-1 text-body-md text-ink-500">Gratis dan langsung aktif — tidak perlu menunggu verifikasi email.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
        <FormError message={formError} />
        <fieldset>
          <legend className="mb-2 text-body-sm font-semibold text-ink-900">Saya mendaftar sebagai</legend>
          <Controller
            control={form.control}
            name="role"
            render={({ field }) => (
              <div role="radiogroup" aria-describedby={errors.role ? 'role-error' : undefined} className="grid gap-2 sm:grid-cols-3">
                {ROLES.map((role) => {
                  const selected = field.value === role.value;
                  const Icon = role.icon;
                  return (
                    <button
                      key={role.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => field.onChange(role.value)}
                      className={cn(
                        'flex min-h-11 flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors',
                        selected ? 'border-primary-600 bg-primary-100/60' : 'border-border bg-surface hover:bg-surface-muted',
                      )}
                    >
                      <Icon className={cn('size-5', selected ? 'text-primary-700' : 'text-ink-500')} aria-hidden />
                      <span className="text-body-sm font-semibold text-ink-900">{role.label}</span>
                      <span className="text-[0.8125rem] leading-snug text-ink-500">{role.description}</span>
                    </button>
                  );
                })}
              </div>
            )}
          />
          {errors.role && (
            <p id="role-error" className="mt-1.5 text-body-sm text-danger-600" role="alert">
              {errors.role.message}
            </p>
          )}
        </fieldset>

        <Field label="Nama lengkap" error={errors.fullName?.message}>
          {(props) => <Input {...props} autoComplete="name" {...form.register('fullName')} />}
        </Field>
        <Field label="Email" error={errors.email?.message}>
          {(props) => <Input {...props} type="email" autoComplete="email" {...form.register('email')} />}
        </Field>
        <Field label="Nomor HP" optional hint="Dipakai tutor/orang tua untuk koordinasi setelah sesi dikonfirmasi." error={errors.phone?.message}>
          {(props) => <Input {...props} type="tel" inputMode="tel" autoComplete="tel" placeholder="081234567890" {...form.register('phone')} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password" hint="Minimal 8 karakter." error={errors.password?.message}>
            {(props) => <Input {...props} type="password" autoComplete="new-password" {...form.register('password')} />}
          </Field>
          <Field label="Ulangi password" error={errors.confirmPassword?.message}>
            {(props) => <Input {...props} type="password" autoComplete="new-password" {...form.register('confirmPassword')} />}
          </Field>
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Membuat akun…' : 'Daftar'}
        </Button>
      </form>

      <p className="mt-6 text-center text-body-sm text-ink-500">
        Sudah punya akun?{' '}
        <Link href={next ? `/masuk?next=${encodeURIComponent(next)}` : '/masuk'} className="font-semibold text-primary-700 hover:underline">
          Masuk
        </Link>
      </p>
    </div>
  );
}
