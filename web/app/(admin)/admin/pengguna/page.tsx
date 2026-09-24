'use client';

import { Search } from 'lucide-react';
import { Suspense, useState } from 'react';
import { toast } from 'sonner';
import { Avatar, Pagination } from '@/components/common/Bits';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/States';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { useAdminUsers, useSuspendUser } from '@/hooks/api/admin-platform';
import { useQueryParams } from '@/hooks/useQueryParams';
import { errorMessage } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { ROLE_LABEL } from '@/lib/status';
import type { AdminUser } from '@/lib/types';

function UserRow({ user, self }: { user: AdminUser; self: boolean }) {
  const suspend = useSuspendUser();
  const [open, setOpen] = useState(false);
  const suspended = user.status === 'suspended';

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={user.fullName} size="sm" />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-body-md font-semibold text-ink-900">
            {user.fullName}
            <StatusBadge kind="account" status={user.status} />
            {user.tutorProfile && <StatusBadge kind="verification" status={user.tutorProfile.verificationStatus} />}
          </p>
          <p className="truncate text-body-sm text-ink-500">
            {ROLE_LABEL[user.role]} · {user.email}{user.phone ? ` · ${user.phone}` : ''} · bergabung {formatDate(user.createdAt, false)}
          </p>
        </div>
      </div>
      {user.role !== 'admin' && !self && (
        <Button size="sm" variant={suspended ? 'secondary' : 'destructive'} className="shrink-0 self-start sm:self-auto" onClick={() => setOpen(true)}>
          {suspended ? 'Aktifkan lagi' : 'Tangguhkan'}
        </Button>
      )}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={suspended ? `Aktifkan lagi akun ${user.fullName}?` : `Tangguhkan akun ${user.fullName}?`}
        consequence={
          suspended
            ? 'Pengguna bisa masuk dan memakai Learnly seperti biasa lagi.'
            : `Pengguna langsung keluar dari semua perangkat dan tidak bisa masuk.${user.role === 'tutor' ? ' Profil tutor hilang dari pencarian.' : ''} Booking yang sedang berjalan tidak otomatis dibatalkan — cek di halaman dispute.`
        }
        confirmLabel={suspended ? 'Aktifkan akun' : 'Tangguhkan akun'}
        destructive={!suspended}
        reason={suspended ? undefined : { label: 'Alasan (dikirim ke pengguna)', placeholder: 'Mis. laporan penipuan berulang', minLength: 5 }}
        pending={suspend.isPending}
        onConfirm={async (reason) => {
          try {
            await suspend.mutateAsync({ id: user.id, status: suspended ? 'active' : 'suspended', reason: reason || undefined });
            toast.success(suspended ? 'Akun aktif kembali.' : 'Akun ditangguhkan.');
            setOpen(false);
          } catch (err) {
            toast.error(errorMessage(err));
          }
        }}
      />
    </li>
  );
}

function UsersContent() {
  const { user: me } = useAuth();
  const { values, update, page } = useQueryParams(['peran', 'status', 'q'] as const);
  const [q, setQ] = useState(values.q ?? '');
  const query = useAdminUsers({ role: values.peran, status: values.status, q: values.q, page });

  return (
    <div className="max-w-5xl">
      <PageHeader title="Pengguna" description="Cari akun, lalu tangguhkan atau aktifkan kembali bila perlu." />
      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_12rem_12rem] md:items-end">
        <form
          className="space-y-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            update({ q: q.trim().length >= 2 ? q.trim() : undefined });
          }}
        >
          <Label htmlFor="cari-pengguna" className="text-body-sm font-semibold text-ink-900">Cari nama atau email</Label>
          <div className="flex gap-2">
            <Input id="cari-pengguna" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Minimal 2 huruf" />
            <Button type="submit" variant="secondary" size="icon" aria-label="Cari"><Search /></Button>
          </div>
        </form>
        <div className="space-y-1.5">
          <Label htmlFor="peran" className="text-body-sm font-semibold text-ink-900">Peran</Label>
          <NativeSelect id="peran" value={values.peran ?? ''} onChange={(e) => update({ peran: e.target.value })}>
            <option value="">Semua peran</option>
            {Object.entries(ROLE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status-akun" className="text-body-sm font-semibold text-ink-900">Status</Label>
          <NativeSelect id="status-akun" value={values.status ?? ''} onChange={(e) => update({ status: e.target.value })}>
            <option value="">Semua status</option>
            <option value="active">Aktif</option>
            <option value="suspended">Ditangguhkan</option>
          </NativeSelect>
        </div>
      </div>
      {query.isPending ? (
        <ListSkeleton count={5} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <EmptyState illustration="people" title="Tidak ada akun yang cocok." description="Coba kata kunci atau filter lain." action={{ label: 'Hapus filter', onClick: () => { setQ(''); update({ q: undefined, peran: undefined, status: undefined }); } }} />
      ) : (
        <>
          <p className="mb-2 text-body-sm text-ink-500">{query.data.meta.total} akun</p>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {query.data.items.map((user) => <UserRow key={user.id} user={user} self={user.id === me?.id} />)}
          </ul>
          <Pagination meta={query.data.meta} onPage={(next) => update({ page: String(next) }, false)} />
        </>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <UsersContent />
    </Suspense>
  );
}
