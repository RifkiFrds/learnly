'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Avatar } from '@/components/common/Bits';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/States';
import { Field, FormError } from '@/components/form/Field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { useDeleteLearner, useLearners, useSaveLearner } from '@/hooks/api/account';
import { useEducationLevels } from '@/hooks/api/catalog';
import { errorMessage } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { applyApiError } from '@/lib/forms';
import type { Learner } from '@/lib/types';

const schema = z.object({
  fullName: z.string().trim().min(2, 'Nama minimal 2 karakter').max(191),
  dateOfBirth: z.string(),
  educationLevelId: z.string(),
});
type Values = z.infer<typeof schema>;

function LearnerDialog({ open, onOpenChange, learner }: { open: boolean; onOpenChange: (open: boolean) => void; learner: Learner | null }) {
  const levels = useEducationLevels();
  const save = useSaveLearner();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      fullName: learner?.fullName ?? '',
      dateOfBirth: learner?.dateOfBirth ?? '',
      educationLevelId: learner?.educationLevel ? String(learner.educationLevel.id) : '',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await save.mutateAsync({
        id: learner?.id,
        fullName: values.fullName,
        dateOfBirth: values.dateOfBirth || null,
        educationLevelId: values.educationLevelId ? Number(values.educationLevelId) : null,
      });
      toast.success(learner ? 'Profil anak diperbarui.' : 'Profil anak ditambahkan.');
      onOpenChange(false);
      form.reset();
    } catch (err) {
      setFormError(applyApiError(err, form.setError));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-heading-lg">{learner ? 'Ubah profil anak' : 'Tambah profil anak'}</DialogTitle>
          <DialogDescription>Profil ini dipakai saat memesan tutor dan mengikuti kursus atas nama anak.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormError message={formError} />
          <Field label="Nama lengkap anak" error={form.formState.errors.fullName?.message}>
            {(props) => <Input {...props} {...form.register('fullName')} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tanggal lahir" optional>
              {(props) => <Input {...props} type="date" {...form.register('dateOfBirth')} />}
            </Field>
            <Field label="Jenjang" optional>
              {(props) => (
                <NativeSelect {...props} {...form.register('educationLevelId')}>
                  <option value="">Belum dipilih</option>
                  {levels.data?.map((level) => (
                    <option key={level.id} value={level.id}>{level.name}</option>
                  ))}
                </NativeSelect>
              )}
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Menyimpan…' : 'Simpan'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LearnersContent() {
  const { user } = useAuth();
  const isNew = useSearchParams().get('baru') === '1';
  const { data, isPending, isError, error, refetch } = useLearners();
  const remove = useDeleteLearner();
  const [editing, setEditing] = useState<Learner | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Learner | null>(null);
  const isParent = user?.role === 'parent';
  const children = data?.filter((learner) => !learner.isSelf) ?? [];

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={isParent ? 'Profil anak' : 'Profil belajar'}
        description={isParent ? 'Kelola anak yang belajar lewat akunmu. Booking & kursus selalu atas nama salah satu anak.' : 'Profil belajarmu sebagai siswa mandiri.'}
        actions={isParent ? <Button onClick={openNew}><Plus /> Tambah anak</Button> : undefined}
      />
      {isNew && isParent && children.length === 0 && (
        <p className="mb-5 rounded-lg border border-primary-100 bg-primary-100/50 px-5 py-4 text-body-md text-ink-700">
          Selamat datang! Langkah pertama: tambahkan profil anak yang akan belajar, lalu cari tutor yang cocok.
        </p>
      )}
      {isPending ? (
        <ListSkeleton count={2} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (isParent ? children : data).length === 0 ? (
        <EmptyState illustration="people" title="Belum ada profil anak." description="Tambahkan anak yang akan belajar agar bisa memesan tutor atau mendaftar kursus." action={{ label: 'Tambah anak', onClick: openNew }} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {(isParent ? children : data).map((learner) => (
            <li key={learner.id} className="flex items-start gap-4 rounded-lg border border-border bg-surface p-5">
              <Avatar name={learner.fullName} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-sans text-heading-md text-ink-900">{learner.fullName}</p>
                <p className="text-body-sm text-ink-500">
                  {[learner.educationLevel?.name, learner.dateOfBirth && `Lahir ${formatDate(learner.dateOfBirth, false)}`].filter(Boolean).join(' · ') || (learner.isSelf ? 'Profil diri sendiri' : 'Data belum lengkap')}
                </p>
              </div>
              {!learner.isSelf && (
                <div className="flex">
                  <Button variant="ghost" size="icon" aria-label={`Ubah ${learner.fullName}`} onClick={() => { setEditing(learner); setDialogOpen(true); }}>
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Hapus ${learner.fullName}`} onClick={() => setToDelete(learner)}>
                    <Trash2 />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <LearnerDialog open={dialogOpen} onOpenChange={setDialogOpen} learner={editing} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Hapus profil ${toDelete?.fullName}?`}
        consequence="Profil ini akan dihapus permanen. Anak yang sudah punya riwayat booking atau kursus tidak bisa dihapus demi menjaga riwayat belajarnya."
        confirmLabel="Hapus profil"
        destructive
        pending={remove.isPending}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(toDelete!.id);
            toast.success('Profil anak dihapus.');
          } catch (err) {
            toast.error(errorMessage(err));
          }
          setToDelete(null);
        }}
      />
    </div>
  );
}

export default function LearnersPage() {
  return (
    <Suspense>
      <LearnersContent />
    </Suspense>
  );
}
