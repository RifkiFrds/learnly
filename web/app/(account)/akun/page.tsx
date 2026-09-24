'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Panel } from '@/components/common/Bits';
import { PageHeader } from '@/components/common/PageHeader';
import { Field, FormError } from '@/components/form/Field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';
import { applyApiError, passwordField, phoneField } from '@/lib/forms';
import { ROLE_LABEL } from '@/lib/status';

const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Nama minimal 2 karakter').max(191),
  phone: phoneField,
});

const passwordSchema = z
  .object({ currentPassword: z.string().min(1, 'Password lama wajib diisi'), newPassword: passwordField, confirmPassword: z.string() })
  .refine((values) => values.newPassword === values.confirmPassword, { message: 'Konfirmasi password belum sama', path: ['confirmPassword'] });

export default function AccountPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const profile = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    values: { fullName: user?.fullName ?? '', phone: user?.phone ?? '' },
  });
  const password = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const saveProfile = profile.handleSubmit(async (values) => {
    setProfileError(null);
    try {
      await api.patch('/users/me', { fullName: values.fullName, phone: values.phone || null });
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Profil tersimpan.');
    } catch (err) {
      setProfileError(applyApiError(err, profile.setError));
    }
  });

  const savePassword = password.handleSubmit(async (values) => {
    setPasswordError(null);
    try {
      await api.patch('/users/me', { currentPassword: values.currentPassword, newPassword: values.newPassword });
      password.reset();
      toast.success('Password berhasil diganti.');
    } catch (err) {
      setPasswordError(applyApiError(err, password.setError));
    }
  });

  if (!user) return null;

  return (
    <div className="max-w-2xl">
      <PageHeader title="Pengaturan akun" description={`${ROLE_LABEL[user.role]} · ${user.email}`} />
      <div className="space-y-6">
        <Panel title="Data diri">
          <form onSubmit={saveProfile} className="space-y-4" noValidate>
            <FormError message={profileError} />
            <Field label="Nama lengkap" error={profile.formState.errors.fullName?.message}>
              {(props) => <Input {...props} autoComplete="name" {...profile.register('fullName')} />}
            </Field>
            <Field label="Nomor HP" optional error={profile.formState.errors.phone?.message}>
              {(props) => <Input {...props} type="tel" inputMode="tel" autoComplete="tel" {...profile.register('phone')} />}
            </Field>
            <Button type="submit" disabled={profile.formState.isSubmitting}>
              {profile.formState.isSubmitting ? 'Menyimpan…' : 'Simpan perubahan'}
            </Button>
          </form>
        </Panel>

        <Panel title="Ganti password">
          <form onSubmit={savePassword} className="space-y-4" noValidate>
            <FormError message={passwordError} />
            <Field label="Password lama" error={password.formState.errors.currentPassword?.message}>
              {(props) => <Input {...props} type="password" autoComplete="current-password" {...password.register('currentPassword')} />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Password baru" hint="Minimal 8 karakter." error={password.formState.errors.newPassword?.message}>
                {(props) => <Input {...props} type="password" autoComplete="new-password" {...password.register('newPassword')} />}
              </Field>
              <Field label="Ulangi password baru" error={password.formState.errors.confirmPassword?.message}>
                {(props) => <Input {...props} type="password" autoComplete="new-password" {...password.register('confirmPassword')} />}
              </Field>
            </div>
            <Button type="submit" variant="secondary" disabled={password.formState.isSubmitting}>
              {password.formState.isSubmitting ? 'Menyimpan…' : 'Ganti password'}
            </Button>
          </form>
        </Panel>
      </div>
    </div>
  );
}
