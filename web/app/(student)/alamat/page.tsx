'use client';

import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { AddressDialog } from '@/components/account/AddressDialog';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/States';
import { Button } from '@/components/ui/button';
import { useAddresses, useDeleteAddress } from '@/hooks/api/account';
import { errorMessage } from '@/lib/api-client';
import type { Address } from '@/lib/types';

export default function AddressesPage() {
  const { data, isPending, isError, error, refetch } = useAddresses();
  const remove = useDeleteAddress();
  const [editing, setEditing] = useState<Address | null>(null);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Address | null>(null);
  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Alamat belajar"
        description="Alamat untuk sesi tutor yang datang ke rumah."
        actions={<Button onClick={openNew}><Plus /> Tambah alamat</Button>}
      />
      {isPending ? (
        <ListSkeleton count={2} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : data.length === 0 ? (
        <EmptyState illustration="map" title="Belum ada alamat tersimpan." description="Simpan alamat rumah agar lebih cepat saat memesan tutor tatap muka." action={{ label: 'Tambah alamat', onClick: openNew }} />
      ) : (
        <ul className="space-y-3">
          {data.map((address) => (
            <li key={address.id} className="flex items-start gap-4 rounded-lg border border-border bg-surface p-5">
              <MapPin className="mt-1 size-5 shrink-0 text-primary-600" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-sans text-body-md font-semibold text-ink-900">{address.label}</p>
                <p className="text-body-sm text-ink-700">{address.fullAddress}</p>
                {address.detailNote && <p className="mt-1 text-body-sm text-ink-500">Catatan: {address.detailNote}</p>}
              </div>
              <div className="flex">
                <Button variant="ghost" size="icon" aria-label={`Ubah alamat ${address.label}`} onClick={() => { setEditing(address); setOpen(true); }}>
                  <Pencil />
                </Button>
                <Button variant="ghost" size="icon" aria-label={`Hapus alamat ${address.label}`} onClick={() => setToDelete(address)}>
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {open && <AddressDialog open={open} onOpenChange={setOpen} address={editing} />}
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(value) => !value && setToDelete(null)}
        title={`Hapus alamat “${toDelete?.label}”?`}
        consequence="Alamat ini tidak bisa dipilih lagi untuk booking baru. Alamat yang pernah dipakai di booking tidak bisa dihapus agar riwayat sesi tetap lengkap."
        confirmLabel="Hapus alamat"
        destructive
        pending={remove.isPending}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(toDelete!.id);
            toast.success('Alamat dihapus.');
          } catch (err) {
            toast.error(errorMessage(err));
          }
          setToDelete(null);
        }}
      />
    </div>
  );
}
