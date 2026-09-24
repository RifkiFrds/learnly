'use client';

import { ExternalLink, FileText } from 'lucide-react';
import { useId, useState } from 'react';
import { toast } from 'sonner';
import { FormError } from '@/components/form/Field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { useOverrideBookingStatus, useRefundPayment } from '@/hooks/api/admin';
import { errorMessage } from '@/lib/api-client';
import { formatRupiah } from '@/lib/format';
import { STATUS_MAPS } from '@/lib/status';

const isPdf = (url: string) => /\.pdf($|\?)/i.test(url);

/** Pratinjau bukti transfer/dokumen: gambar tampil inline, PDF dibuka di tab baru. */
export function ProofThumb({ url, label }: { url: string; label: string }) {
  const [open, setOpen] = useState(false);
  if (isPdf(url)) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="flex size-20 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-surface-muted text-label-sm text-ink-700 hover:border-primary-600">
        <FileText className="size-6 text-primary-600" aria-hidden />
        PDF
        <span className="sr-only">Buka {label} (PDF) di tab baru</span>
      </a>
    );
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="size-20 shrink-0 cursor-zoom-in overflow-hidden rounded-lg border border-border bg-surface-muted hover:border-primary-600" aria-label={`Perbesar ${label}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- file unggahan dari API */}
        <img src={url} alt="" className="size-full object-cover" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-heading-lg">{label}</DialogTitle>
            <DialogDescription>Periksa nominal, tanggal, dan rekening tujuan.</DialogDescription>
          </DialogHeader>
          {/* eslint-disable-next-line @next/next/no-img-element -- file unggahan dari API */}
          <img src={url} alt={label} className="max-h-[70vh] w-full rounded-lg object-contain" />
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-body-sm font-semibold text-primary-600">
            Buka ukuran asli <ExternalLink className="size-4" aria-hidden />
          </a>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Catat refund manual (FR-PAY-06): admin transfer dulu di luar sistem, lalu catat di sini. */
export function RefundDialog({
  open,
  onOpenChange,
  payment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: { id: number; amount: number; refundAmount: number | null; payerName: string };
}) {
  const id = useId();
  const refund = useRefundPayment();
  const [amount, setAmount] = useState(String(payment.refundAmount ?? payment.amount));
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const value = Number(amount);
  const invalid = !Number.isInteger(value) || value < 0 || value > payment.amount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-heading-lg">Catat refund ke {payment.payerName}</DialogTitle>
          <DialogDescription>
            Transfer dana ke pembayar dulu, lalu catat di sini. Status tagihan berubah menjadi Dikembalikan dan pembayar menerima notifikasi — tidak bisa diurungkan.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            try {
              await refund.mutateAsync({ id: payment.id, refundAmount: value, note: note.trim() });
              toast.success(`Refund ${formatRupiah(value)} tercatat.`);
              onOpenChange(false);
            } catch (err) {
              setError(errorMessage(err));
            }
          }}
        >
          <FormError message={error} />
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-amount`} className="text-body-sm font-semibold text-ink-900">Nominal refund (Rp)</Label>
            <Input id={`${id}-amount`} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} aria-invalid={invalid} aria-describedby={`${id}-amount-hint`} />
            <p id={`${id}-amount-hint`} className="text-body-sm text-ink-500">Dibayar {formatRupiah(payment.amount)}{payment.refundAmount != null ? ` · sesuai kebijakan: ${formatRupiah(payment.refundAmount)}` : ''}.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-note`} className="text-body-sm font-semibold text-ink-900">Catatan / nomor referensi transfer</Label>
            <Textarea id={`${id}-note`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Mis. BCA ref 0923XXXX, 24 Sep 2026" />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={refund.isPending || invalid || note.trim().length < 5}>{refund.isPending ? 'Menyimpan…' : 'Catat refund'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const OVERRIDE_TARGETS = ['dikonfirmasi', 'sesi_berlangsung', 'sesi_selesai', 'dibatalkan'] as const;

/** Override status booking untuk dispute (FR-ADMIN-06). Tercatat di riwayat status. */
export function OverrideStatusDialog({
  open,
  onOpenChange,
  booking,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: { id: number; status?: string; summary: string };
}) {
  const id = useId();
  const override = useOverrideBookingStatus();
  const [status, setStatus] = useState<string>('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const consequence: Record<string, string> = {
    dikonfirmasi: 'Booking kembali ke Dikonfirmasi; tutor bisa melanjutkan alur check-in.',
    sesi_berlangsung: 'Sesi dianggap sudah dimulai. Tutor perlu check-out & mengisi laporan.',
    sesi_selesai: 'Sesi dianggap selesai dan masuk pendapatan tutor. Laporan perkembangan tidak otomatis dibuat.',
    dibatalkan: 'Booking dibatalkan oleh sistem. Bila sudah dibayar, pembayar berhak refund penuh yang harus dicatat terpisah.',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-heading-lg">Ubah status booking #{booking.id}</DialogTitle>
          <DialogDescription>{booking.summary}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            try {
              await override.mutateAsync({ id: booking.id, status, reason: reason.trim() });
              toast.success('Status booking diubah.');
              onOpenChange(false);
            } catch (err) {
              setError(errorMessage(err));
            }
          }}
        >
          <FormError message={error} />
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-status`} className="text-body-sm font-semibold text-ink-900">Status baru</Label>
            <NativeSelect id={`${id}-status`} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Pilih status</option>
              {OVERRIDE_TARGETS.filter((target) => target !== booking.status).map((target) => (
                <option key={target} value={target}>{STATUS_MAPS.booking[target]?.label ?? target}</option>
              ))}
            </NativeSelect>
            {status && <p className="text-body-sm text-warning-600">{consequence[status]}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-reason`} className="text-body-sm font-semibold text-ink-900">Alasan (dicatat di riwayat & dikirim ke pihak terkait)</Label>
            <Textarea id={`${id}-reason`} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Mis. tutor & orang tua mengonfirmasi sesi sudah berlangsung via telepon" />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={override.isPending || !status || reason.trim().length < 5}>{override.isPending ? 'Menyimpan…' : 'Ubah status'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
