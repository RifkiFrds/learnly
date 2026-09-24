'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Suspense, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/States';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDeleteMasterData, useMasterData, useSaveMasterData, type MasterKind } from '@/hooks/api/admin-platform';
import { useQueryParams } from '@/hooks/useQueryParams';
import { errorMessage } from '@/lib/api-client';
import type { MasterItem } from '@/lib/types';

const KINDS: [MasterKind, string, string][] = [
  ['subjects', 'Mata pelajaran', 'Dipakai di profil tutor, pencarian, dan booking.'],
  ['education-levels', 'Jenjang', 'Dipakai di profil anak, tutor, dan kursus.'],
  ['categories', 'Kategori kursus', 'Dipakai untuk mengelompokkan katalog kursus.'],
];

function MasterList({ kind, label, hint }: { kind: MasterKind; label: string; hint: string }) {
  const query = useMasterData(kind);
  const save = useSaveMasterData(kind);
  const remove = useDeleteMasterData(kind);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [toDelete, setToDelete] = useState<MasterItem | null>(null);

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-body-sm text-ink-500">{hint}</p>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={async (event) => {
          event.preventDefault();
          try {
            await save.mutateAsync({ name: name.trim() });
            toast.success(`${label} “${name.trim()}” ditambahkan.`);
            setName('');
          } catch (err) {
            toast.error(errorMessage(err));
          }
        }}
      >
        <Input aria-label={`Nama ${label.toLowerCase()} baru`} placeholder={`Tambah ${label.toLowerCase()}…`} value={name} onChange={(e) => setName(e.target.value)} className="sm:max-w-sm" />
        <Button type="submit" variant="secondary" disabled={save.isPending || name.trim().length < 2}><Plus /> Tambah</Button>
      </form>
      {query.isPending ? (
        <ListSkeleton count={4} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState illustration="book" title={`Belum ada ${label.toLowerCase()}.`} />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {query.data.map((item) => (
            <li key={item.id} className="flex min-h-14 items-center gap-2 px-4 py-2">
              {editing?.id === item.id ? (
                <form
                  className="flex flex-1 flex-wrap items-center gap-2"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    try {
                      await save.mutateAsync({ id: item.id, name: editing.name.trim() });
                      toast.success('Nama diperbarui.');
                      setEditing(null);
                    } catch (err) {
                      toast.error(errorMessage(err));
                    }
                  }}
                >
                  <Input aria-label={`Ubah nama ${item.name}`} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="h-10 max-w-sm flex-1" autoFocus />
                  <Button type="submit" size="sm" disabled={save.isPending || editing.name.trim().length < 2}>Simpan</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>Batal</Button>
                </form>
              ) : (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body-md text-ink-900">{item.name}</span>
                    <span className="block font-mono text-label-sm font-normal tracking-normal text-ink-500">{item.slug}</span>
                  </span>
                  <Button variant="ghost" size="icon" aria-label={`Ubah ${item.name}`} onClick={() => setEditing({ id: item.id, name: item.name })}><Pencil /></Button>
                  <Button variant="ghost" size="icon" aria-label={`Hapus ${item.name}`} onClick={() => setToDelete(item)}><Trash2 /></Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Hapus “${toDelete?.name}”?`}
        consequence={`Pilihan ini hilang dari filter & formulir. Jika masih dipakai tutor, anak, booking, atau kursus, penghapusan ditolak agar data lama tetap utuh.`}
        confirmLabel="Hapus"
        destructive
        pending={remove.isPending}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(toDelete!.id);
            toast.success(`“${toDelete!.name}” dihapus.`);
          } catch (err) {
            toast.error(errorMessage(err));
          }
          setToDelete(null);
        }}
      />
    </div>
  );
}

function MasterDataContent() {
  const { values, update } = useQueryParams(['jenis'] as const);
  const tab = (values.jenis as MasterKind | undefined) ?? 'subjects';
  return (
    <div className="max-w-4xl">
      <PageHeader title="Master data" description="Daftar pilihan yang dipakai di seluruh aplikasi." />
      <Tabs value={tab} onValueChange={(value) => update({ jenis: value === 'subjects' ? undefined : value })}>
        <TabsList className="max-w-full overflow-x-auto">
          {KINDS.map(([kind, label]) => <TabsTrigger key={kind} value={kind}>{label}</TabsTrigger>)}
        </TabsList>
        {KINDS.map(([kind, label, hint]) => (
          <TabsContent key={kind} value={kind} className="pt-6">
            <MasterList kind={kind} label={label} hint={hint} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default function MasterDataPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <MasterDataContent />
    </Suspense>
  );
}
