'use client';

import { CircleAlert, CircleCheck, Copy, FileText, Hourglass, Landmark, QrCode } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { InfoRow, Panel } from '@/components/common/Bits';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ErrorState, PageSkeleton } from '@/components/common/States';
import { FileInput } from '@/components/form/FileInput';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePayment, useUploadProof } from '@/hooks/api/bookings';
import { errorMessage } from '@/lib/api-client';
import { formatDate, formatDateTime, formatRupiah, formatTimeRange } from '@/lib/format';
import type { Payment } from '@/lib/types';

const PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

function copy(text: string, what: string) {
  navigator.clipboard?.writeText(text).then(
    () => toast.success(`${what} disalin.`),
    () => toast.error('Tidak bisa menyalin otomatis. Salin manual.'),
  );
}

function useCountdown(target: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [target]);
  if (!target) return null;
  const minutes = Math.max(0, Math.round((new Date(target).getTime() - now) / 60_000));
  if (minutes >= 60) return `${Math.floor(minutes / 60)} jam ${minutes % 60} menit`;
  return `${minutes} menit`;
}

function PaymentMethodsPanel({ payment }: { payment: Payment }) {
  const methods = payment.paymentMethods;
  if (!methods || (!methods.qris && !methods.bankTransfer)) {
    return <p className="text-body-sm text-ink-700">Metode pembayaran belum diatur admin. Hubungi tim Learnly sebelum mentransfer.</p>;
  }
  const first = methods.qris ? 'qris' : 'bank';
  return (
    <Tabs defaultValue={first}>
      <TabsList>
        {methods.qris && <TabsTrigger value="qris"><QrCode /> QRIS</TabsTrigger>}
        {methods.bankTransfer && <TabsTrigger value="bank"><Landmark /> Transfer bank</TabsTrigger>}
      </TabsList>
      {methods.qris && (
        <TabsContent value="qris" className="pt-5">
          <div className="flex flex-col items-center gap-3 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- gambar QRIS dari penyimpanan API */}
            <img src={methods.qris.imageUrl} alt="Kode QRIS Learnly" className="size-64 rounded-lg border border-border bg-white object-contain p-2" />
            <p className="max-w-sm text-body-sm text-ink-700">Pindai dengan aplikasi bank atau e-wallet, lalu masukkan nominal <span className="font-semibold text-ink-900">{formatRupiah(payment.amount)}</span> persis.</p>
          </div>
        </TabsContent>
      )}
      {methods.bankTransfer && (
        <TabsContent value="bank" className="pt-5">
          <dl className="rounded-lg border border-border bg-surface-muted/50 px-4 py-2">
            <InfoRow label="Bank" value={methods.bankTransfer.bankName} />
            <div className="flex items-center justify-between gap-4 py-1.5">
              <dt className="text-body-sm text-ink-500">Nomor rekening</dt>
              <dd className="flex items-center gap-1">
                <span className="font-mono text-body-md font-semibold text-ink-900">{methods.bankTransfer.accountNumber}</span>
                <Button variant="ghost" size="icon" aria-label="Salin nomor rekening" onClick={() => copy(methods.bankTransfer!.accountNumber, 'Nomor rekening')}><Copy /></Button>
              </dd>
            </div>
            <InfoRow label="Atas nama" value={methods.bankTransfer.accountName} />
          </dl>
        </TabsContent>
      )}
    </Tabs>
  );
}

function ProofUpload({ payment }: { payment: Payment }) {
  const upload = useUploadProof(payment.id);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | undefined>();
  const replacing = payment.status === 'menunggu_verifikasi';
  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!file) return setError('Pilih foto atau PDF bukti transfer.');
        try {
          await upload.mutateAsync(file);
          setFile(null);
          toast.success('Bukti terkirim. Kami akan memverifikasi secepatnya.');
        } catch (err) {
          setError(errorMessage(err));
        }
      }}
    >
      <FileInput
        label={replacing ? 'Ganti bukti transfer' : 'Bukti transfer'}
        accept={PROOF_TYPES}
        maxSizeMb={5}
        file={file}
        onFile={(next, fileError) => {
          setFile(next);
          setError(fileError);
        }}
        error={error}
        hint="Tangkapan layar atau foto struk yang menampilkan nominal, tanggal, dan rekening tujuan."
      />
      <Button type="submit" disabled={upload.isPending || !file}>{upload.isPending ? 'Mengunggah…' : replacing ? 'Kirim bukti baru' : 'Kirim bukti pembayaran'}</Button>
    </form>
  );
}

function StatusMessage({ payment }: { payment: Payment }) {
  const target = payment.booking ? `/booking/${payment.booking.id}` : payment.enrollment ? `/kursus-saya` : '/transaksi';
  switch (payment.status) {
    case 'menunggu_verifikasi':
      return (
        <div className="flex gap-3 rounded-lg border border-info-100 bg-info-100/60 p-4" role="status">
          <Hourglass className="mt-0.5 size-5 shrink-0 text-info-600" aria-hidden />
          <p className="text-body-md text-ink-700">
            Bukti dikirim {formatDateTime(payment.submittedAt)}. Tim Learnly sedang memverifikasi; halaman ini diperbarui otomatis begitu selesai.
          </p>
        </div>
      );
    case 'paid':
      return (
        <div className="flex flex-col gap-4 rounded-lg border border-success-100 bg-success-100/60 p-4 sm:flex-row sm:items-center sm:justify-between" role="status">
          <p className="flex gap-3 text-body-md text-ink-700">
            <CircleCheck className="mt-0.5 size-5 shrink-0 text-success-600" aria-hidden />
            Pembayaran terverifikasi {formatDateTime(payment.paidAt)}. {payment.booking ? 'Sesi sudah dikonfirmasi.' : 'Kursus sudah bisa diakses.'}
          </p>
          <Button asChild><Link href={payment.enrollment ? `/belajar/${payment.enrollment.id}` : target}>{payment.booking ? 'Lihat booking' : 'Mulai belajar'}</Link></Button>
        </div>
      );
    case 'ditolak':
      return (
        <div className="flex gap-3 rounded-lg border border-danger-100 bg-danger-100/50 p-4" role="alert">
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-danger-600" aria-hidden />
          <div className="text-body-md text-ink-700">
            <p className="font-semibold text-ink-900">Pembayaran ditolak.</p>
            {payment.rejectionReason && <p>Alasan: {payment.rejectionReason}</p>}
            <p className="mt-1">
              {payment.booking ? 'Booking ini otomatis dibatalkan. Kalau kamu sudah mentransfer, hubungi tim Learnly; kalau belum, pesan ulang jadwal yang tersedia.' : 'Silakan daftar ulang kursus dan unggah bukti yang sesuai.'}
            </p>
          </div>
        </div>
      );
    case 'expired':
      return (
        <div className="flex gap-3 rounded-lg border border-border bg-surface-muted p-4" role="status">
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-ink-500" aria-hidden />
          <p className="text-body-md text-ink-700">Batas waktu pembayaran lewat, jadi tagihan ini ditutup. Pesan ulang jadwal yang masih tersedia.</p>
        </div>
      );
    case 'refunded':
      return (
        <div className="flex gap-3 rounded-lg border border-border bg-surface-muted p-4" role="status">
          <CircleCheck className="mt-0.5 size-5 shrink-0 text-success-600" aria-hidden />
          <p className="text-body-md text-ink-700">Refund {formatRupiah(payment.refundAmount)} sudah ditransfer {formatDateTime(payment.refundedAt)}.{payment.refundNote ? ` Catatan: ${payment.refundNote}` : ''}</p>
        </div>
      );
    default:
      return null;
  }
}

export default function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  const query = usePayment(id);
  const remaining = useCountdown(query.data?.status === 'menunggu_pembayaran' ? query.data.expiresAt : null);

  if (query.isPending) return <PageSkeleton />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} title="Tagihan tidak bisa dibuka" />;
  const payment = query.data;
  const booking = payment.booking;
  const enrollment = payment.enrollment;

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Pembayaran"
        description={<span className="inline-flex flex-wrap items-center gap-2">Tagihan #{payment.id} <StatusBadge kind="payment" status={payment.status} /></span>}
        back={booking ? { href: `/booking/${booking.id}`, label: 'Detail booking' } : { href: '/transaksi', label: 'Transaksi' }}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="min-w-0 space-y-6">
          <StatusMessage payment={payment} />
          {payment.canUploadProof && (
            <>
              {payment.status === 'menunggu_pembayaran' && (
                <Panel title="1. Transfer sesuai nominal">
                  {remaining && (
                    <p className="mb-4 text-body-sm text-ink-700">
                      Bayar dalam <span className="font-semibold text-ink-900">{remaining}</span> (sampai {formatDateTime(payment.expiresAt)}). Setelah itu jadwal dilepas untuk siswa lain.
                    </p>
                  )}
                  <PaymentMethodsPanel payment={payment} />
                  {payment.instructions && payment.instructions.length > 0 && (
                    <ol className="mt-5 list-decimal space-y-1 pl-5 text-body-sm text-ink-700">
                      {payment.instructions.map((line) => <li key={line}>{line}</li>)}
                    </ol>
                  )}
                </Panel>
              )}
              <Panel title={payment.status === 'menunggu_pembayaran' ? '2. Unggah bukti transfer' : 'Salah unggah bukti?'}>
                <ProofUpload payment={payment} />
              </Panel>
            </>
          )}
          {payment.proofImageUrl && (
            <Panel title="Bukti yang kamu kirim">
              <a href={payment.proofImageUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-body-sm font-semibold text-primary-600 hover:text-primary-700">
                <FileText className="size-4" aria-hidden /> Buka bukti transfer
              </a>
            </Panel>
          )}
        </div>
        <aside className="lg:sticky lg:top-24">
          <Panel title="Ringkasan tagihan">
            <dl>
              {booking && (
                <>
                  <InfoRow label="Sesi" value={`${booking.subjectName} · ${booking.tutorName}`} />
                  <InfoRow label="Siswa" value={booking.learnerName} />
                  <InfoRow label="Jadwal" value={`${formatDate(booking.scheduledStartAt)}, ${formatTimeRange(booking.scheduledStartAt, new Date(new Date(booking.scheduledStartAt).getTime() + booking.durationMinutes * 60_000).toISOString())}`} />
                </>
              )}
              {enrollment && (
                <>
                  <InfoRow label="Kursus" value={enrollment.courseTitle} />
                  <InfoRow label="Peserta" value={enrollment.learnerName} />
                </>
              )}
              <div className="mt-2 border-t border-border pt-2">
                <InfoRow label="Total dibayar" value={formatRupiah(payment.amount)} strong />
              </div>
            </dl>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => copy(String(payment.amount), 'Nominal')}><Copy /> Salin nominal</Button>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
