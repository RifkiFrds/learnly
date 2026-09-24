'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Field, FormError } from '@/components/form/Field';
import { LocationPicker } from '@/components/map/LocationPicker';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSaveAddress } from '@/hooks/api/account';
import { applyApiError } from '@/lib/forms';
import type { Address } from '@/lib/types';

const schema = z.object({
  label: z.string().trim().min(1, 'Beri nama alamat, mis. Rumah').max(100),
  fullAddress: z.string().trim().min(5, 'Tulis alamat lengkap').max(500),
  detailNote: z.string().trim().max(500),
});
type Values = z.infer<typeof schema>;

/** Form alamat + pin peta (FR-BOOK-02). Dipakai di buku alamat & langkah lokasi pada alur booking. */
export function AddressDialog({
  open,
  onOpenChange,
  address,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address?: Address | null;
  onSaved?: (address: Address) => void;
}) {
  const save = useSaveAddress();
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(address ? { lat: address.latitude, lng: address.longitude } : null);
  const [pointError, setPointError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: { label: address?.label ?? 'Rumah', fullAddress: address?.fullAddress ?? '', detailNote: address?.detailNote ?? '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    if (!point) {
      setPointError('Tentukan titik lokasi di peta agar tutor bisa menemukan alamatmu.');
      return;
    }
    try {
      const saved = await save.mutateAsync({
        id: address?.id,
        label: values.label,
        fullAddress: values.fullAddress,
        detailNote: values.detailNote || null,
        latitude: Number(point.lat.toFixed(7)),
        longitude: Number(point.lng.toFixed(7)),
      });
      toast.success(address ? 'Alamat diperbarui.' : 'Alamat tersimpan.');
      onSaved?.(saved);
      onOpenChange(false);
    } catch (err) {
      setFormError(applyApiError(err, form.setError));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-heading-lg">{address ? 'Ubah alamat' : 'Tambah alamat belajar'}</DialogTitle>
          <DialogDescription>Titik di peta dipakai untuk mencocokkan wilayah layanan tutor dan memandu tutor ke lokasimu.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormError message={formError} />
          <LocationPicker
            value={point}
            onChange={(next) => {
              setPoint(next);
              setPointError(null);
            }}
            onAddress={(text) => {
              if (!form.getValues('fullAddress')) form.setValue('fullAddress', text, { shouldValidate: true });
            }}
          />
          {pointError && <p className="text-body-sm text-danger-600" role="alert">{pointError}</p>}
          <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
            <Field label="Nama alamat" error={form.formState.errors.label?.message}>
              {(props) => <Input {...props} {...form.register('label')} />}
            </Field>
            <Field label="Alamat lengkap" error={form.formState.errors.fullAddress?.message}>
              {(props) => <Input {...props} {...form.register('fullAddress')} />}
            </Field>
          </div>
          <Field label="Catatan untuk tutor" optional hint="Mis. warna pagar, patokan, atau tempat parkir.">
            {(props) => <Textarea {...props} rows={2} {...form.register('detailNote')} />}
          </Field>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Menyimpan…' : 'Simpan alamat'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
