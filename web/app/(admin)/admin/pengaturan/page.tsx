'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Panel } from '@/components/common/Bits';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState, PageSkeleton } from '@/components/common/States';
import { Field, FormError } from '@/components/form/Field';
import { FileInput } from '@/components/form/FileInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { useAdminSettings, useUpdateSettings, useUploadQris } from '@/hooks/api/admin-platform';
import { errorMessage } from '@/lib/api-client';
import { applyApiError } from '@/lib/forms';
import { formatRupiah } from '@/lib/format';
import type { PlatformSettings } from '@/lib/types';

const int = (min: number, max: number, message: string) =>
  z.string().refine((value) => /^\d+$/.test(value) && Number(value) >= min && Number(value) <= max, message);

const schema = z
  .object({
    feeType: z.enum(['flat', 'percent']),
    feeValue: z.string().refine((value) => value !== '' && !Number.isNaN(Number(value)) && Number(value) >= 0, 'Isi angka 0 atau lebih'),
    freeCancelHours: int(0, 168, 'Isi 0–168 jam'),
    lateRefundPercent: int(0, 100, 'Isi 0–100%'),
    bookingResponseHours: int(1, 168, 'Isi 1–168 jam'),
    paymentWindowHours: int(1, 168, 'Isi 1–168 jam'),
    defaultPassingGrade: int(0, 100, 'Isi 0–100'),
    reviewEditDays: int(0, 90, 'Isi 0–90 hari'),
    meetingLinkVisibleHours: int(0, 168, 'Isi 0–168 jam'),
    bankName: z.string().trim(),
    accountNumber: z.string().trim(),
    accountName: z.string().trim(),
  })
  .refine((v) => v.feeType === 'flat' || Number(v.feeValue) <= 100, { message: 'Persentase maksimal 100', path: ['feeValue'] })
  .refine((v) => (!v.bankName && !v.accountNumber && !v.accountName) || (v.bankName.length >= 2 && v.accountNumber.length >= 4 && v.accountName.length >= 2), {
    message: 'Lengkapi nama bank, nomor (min. 4 digit), dan nama pemilik — atau kosongkan ketiganya',
    path: ['accountNumber'],
  });
type Values = z.infer<typeof schema>;

const toValues = (s: PlatformSettings): Values => ({
  feeType: s.serviceFee.type,
  feeValue: String(s.serviceFee.value),
  freeCancelHours: String(s.cancellationPolicy.freeCancelHours),
  lateRefundPercent: String(s.cancellationPolicy.lateRefundPercent),
  bookingResponseHours: String(s.bookingResponseHours),
  paymentWindowHours: String(s.paymentWindowHours),
  defaultPassingGrade: String(s.defaultPassingGrade),
  reviewEditDays: String(s.reviewEditDays),
  meetingLinkVisibleHours: String(s.meetingLinkVisibleHours),
  bankName: s.bankTransfer?.bankName ?? '',
  accountNumber: s.bankTransfer?.accountNumber ?? '',
  accountName: s.bankTransfer?.accountName ?? '',
});

function SettingsForm({ settings }: { settings: PlatformSettings }) {
  const update = useUpdateSettings();
  const [formError, setFormError] = useState<string | null>(null);
  // defaultValues (bukan values): refetch di latar tidak boleh menghapus isian yang sedang diketik
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(settings) });
  const { errors, isDirty, isSubmitting } = form.formState;
  const [feeType, feeValue] = useWatch({ control: form.control, name: ['feeType', 'feeValue'] });

  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    try {
      const saved = await update.mutateAsync({
        serviceFee: { type: v.feeType, value: Number(v.feeValue) },
        cancellationPolicy: { freeCancelHours: Number(v.freeCancelHours), lateRefundPercent: Number(v.lateRefundPercent) },
        bookingResponseHours: Number(v.bookingResponseHours),
        paymentWindowHours: Number(v.paymentWindowHours),
        defaultPassingGrade: Number(v.defaultPassingGrade),
        reviewEditDays: Number(v.reviewEditDays),
        meetingLinkVisibleHours: Number(v.meetingLinkVisibleHours),
        bankTransfer: v.bankName ? { bankName: v.bankName, accountNumber: v.accountNumber, accountName: v.accountName } : null,
      });
      form.reset(toValues(saved));
      toast.success('Pengaturan tersimpan. Berlaku untuk booking & tagihan baru.');
    } catch (err) {
      setFormError(applyApiError(err, form.setError));
    }
  });

  const example = feeType === 'flat' ? Number(feeValue) || 0 : Math.round((150_000 * (Number(feeValue) || 0)) / 100);
  const num = (name: keyof Values, label: string, hint?: string) => (
    <Field label={label} hint={hint} error={errors[name]?.message}>
      {(props) => <Input {...props} inputMode="numeric" {...form.register(name)} />}
    </Field>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <FormError message={formError} />
      <Panel title="Biaya layanan">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Jenis biaya">
            {(props) => (
              <NativeSelect {...props} {...form.register('feeType')}>
                <option value="flat">Nominal tetap per booking</option>
                <option value="percent">Persentase dari subtotal</option>
              </NativeSelect>
            )}
          </Field>
          {num('feeValue', feeType === 'flat' ? 'Nominal (Rp)' : 'Persentase (%)')}
        </div>
        <p className="mt-3 text-body-sm text-ink-500">Contoh: sesi 1,5 jam × Rp100.000 → biaya layanan {formatRupiah(example)}.</p>
      </Panel>
      <Panel title="Pembatalan & batas waktu">
        <div className="grid gap-4 sm:grid-cols-2">
          {num('freeCancelHours', 'Batal gratis (jam sebelum sesi)', 'Batal lebih awal dari ini → refund penuh.')}
          {num('lateRefundPercent', 'Refund batal mendadak (%)', 'Persentase refund bila batal lebih mepet.')}
          {num('bookingResponseHours', 'Batas tutor merespons (jam)', 'Lewat dari ini booking otomatis batal.')}
          {num('paymentWindowHours', 'Batas pembayaran (jam)', 'Lewat dari ini tagihan kedaluwarsa.')}
          {num('meetingLinkVisibleHours', 'Link meeting tampil (jam sebelum sesi)')}
          {num('reviewEditDays', 'Ulasan bisa diedit (hari)')}
          {num('defaultPassingGrade', 'Nilai lulus default kursus')}
        </div>
      </Panel>
      <Panel title="Rekening transfer">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Nama bank" error={errors.bankName?.message}>{(props) => <Input {...props} {...form.register('bankName')} />}</Field>
          <Field label="Nomor rekening" error={errors.accountNumber?.message}>{(props) => <Input {...props} inputMode="numeric" {...form.register('accountNumber')} />}</Field>
          <Field label="Atas nama" error={errors.accountName?.message}>{(props) => <Input {...props} {...form.register('accountName')} />}</Field>
        </div>
        <p className="mt-3 text-body-sm text-ink-500">Kosongkan ketiganya bila hanya menerima QRIS.</p>
      </Panel>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting || !isDirty}>{isSubmitting ? 'Menyimpan…' : 'Simpan pengaturan'}</Button>
        {!isDirty && <span className="text-body-sm text-ink-500">Belum ada perubahan.</span>}
      </div>
    </form>
  );
}

function QrisPanel({ settings }: { settings: PlatformSettings }) {
  const upload = useUploadQris();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | undefined>();
  return (
    <Panel title="Gambar QRIS">
      <div className="flex flex-col gap-5 sm:flex-row">
        {settings.qrisImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- gambar dari penyimpanan API
          <img src={settings.qrisImageUrl} alt="QRIS yang sedang dipakai" className="size-40 shrink-0 rounded-lg border border-border bg-white object-contain p-2" />
        ) : (
          <div className="flex size-40 shrink-0 items-center justify-center rounded-lg border border-dashed border-border px-3 text-center text-body-sm text-ink-500">Belum ada QRIS</div>
        )}
        <form
          className="flex-1 space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!file) return setError('Pilih gambar QRIS dulu.');
            try {
              await upload.mutateAsync(file);
              toast.success('QRIS diperbarui. Tagihan baru langsung memakai gambar ini.');
              setFile(null);
            } catch (err) {
              setError(errorMessage(err));
            }
          }}
        >
          <FileInput label="Unggah QRIS baru" accept={['image/png', 'image/jpeg', 'image/webp']} maxSizeMb={5} file={file} onFile={(next, fileError) => { setFile(next); setError(fileError); }} error={error} hint="Pastikan QR terbaca jelas dan nama merchant terlihat." />
          <Button type="submit" variant="secondary" disabled={upload.isPending || !file}>{upload.isPending ? 'Mengunggah…' : 'Ganti QRIS'}</Button>
        </form>
      </div>
    </Panel>
  );
}

export default function AdminSettingsPage() {
  const query = useAdminSettings();
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Pengaturan platform" description="Aturan biaya, pembatalan, batas waktu, dan metode pembayaran manual." />
      {query.isPending ? (
        <PageSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <>
          <QrisPanel settings={query.data} />
          <SettingsForm settings={query.data} />
        </>
      )}
    </div>
  );
}
