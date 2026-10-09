'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Avatar, Panel } from '@/components/common/Bits';
import { PageHeader } from '@/components/common/PageHeader';
import { Field, FormError } from '@/components/form/Field';
import { FileInput } from '@/components/form/FileInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUploadAvatar } from '@/hooks/api/account';
import { api, errorMessage } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';
import { applyApiError, passwordField, phoneField } from '@/lib/forms';
import { ROLE_LABEL } from '@/lib/status';

function AvatarPanel({ user }: { user: { fullName: string; avatarUrl: string | null } }) {
  const upload = useUploadAvatar();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | undefined>();
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function save() {
    if (!file) return setError('Pilih foto dulu.');
    try {
      await upload.mutateAsync(file);
      toast.success('Foto profil diperbarui.');
      setFile(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Panel title="Foto profil">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Avatar name={user.fullName} avatarUrl={previewUrl ?? user.avatarUrl} size="lg" />
        <div className="flex-1 space-y-3">
          <FileInput
            label="Unggah foto baru"
            accept={['image/png', 'image/jpeg', 'image/webp']}
            maxSizeMb={5}
            file={file}
            onFile={(next, fileError) => {
              setFile(next);
              setError(fileError);
            }}
            error={error}
            hint="Format persegi lebih pas untuk avatar."
          />
          <Button type="button" variant="secondary" disabled={upload.isPending || !file} onClick={save}>
            {upload.isPending ? 'Mengunggah…' : 'Ganti foto'}
          </Button>
        </div>
      </div>
    </Panel>
  );
}

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
        <AvatarPanel user={user} />
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
