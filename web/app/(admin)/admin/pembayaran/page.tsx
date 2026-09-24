'use client';

import { Check, X } from 'lucide-react';
import { Suspense, useState } from 'react';
import { toast } from 'sonner';
import { ProofThumb, RefundDialog } from '@/components/admin/AdminDialogs';
import { Pagination } from '@/components/common/Bits';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/States';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminPayments, useVerifyPayment } from '@/hooks/api/admin';
import { useQueryParams } from '@/hooks/useQueryParams';
import { errorMessage } from '@/lib/api-client';
import { formatDate, formatDateTime, formatRelative, formatRupiah, formatTime } from '@/lib/format';
import type { Payment } from '@/lib/types';

const TABS = [
  ['menunggu_verifikasi', 'Perlu diverifikasi'],
  ['paid', 'Lunas'],
  ['ditolak', 'Ditolak'],
  ['refunded', 'Dikembalikan'],
] as const;
const KEYS = ['status', 'jenis'] as const;

function PaymentRow({ payment }: { payment: Payment }) {
  const verify = useVerifyPayment();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const payer = payment.payer?.fullName ?? 'Pembayar';
  const what = payment.booking
    ? `Les ${payment.booking.subjectName} · ${payment.booking.learnerName} dengan ${payment.booking.tutorName}`
    : payment.enrollment
      ? `Kursus ${payment.enrollment.courseTitle} · ${payment.enrollment.learnerName}`
      : `Tagihan #${payment.id}`;

  async function approve() {
    try {
      await verify.mutateAsync({ id: payment.id, action: 'approve' });
      toast.success(`Pembayaran ${payer} disetujui. ${payment.booking ? 'Booking dikonfirmasi.' : 'Kursus terbuka.'}`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <li className="flex flex-col gap-4 p-4 sm:px-5 md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 gap-4">
        {payment.proofImageUrl ? <ProofThumb url={payment.proofImageUrl} label={`Bukti transfer ${payer}`} /> : <span className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-center text-label-sm font-normal tracking-normal text-ink-500">Tanpa bukti</span>}
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-sans text-body-md font-semibold text-ink-900">{formatRupiah(payment.amount)}</p>
            <StatusBadge kind="payment" status={payment.status} />
          </div>
          <p className="text-body-sm text-ink-700">{what}</p>
          <p className="text-body-sm text-ink-500">
            {payer}{payment.payer?.phone ? ` · ${payment.payer.phone}` : ''}
            {payment.submittedAt && ` · bukti ${formatRelative(payment.submittedAt)}`}
            {payment.booking && ` · sesi ${formatDate(payment.booking.scheduledStartAt)} ${formatTime(payment.booking.scheduledStartAt)} WIB`}
          </p>
          {payment.rejectionReason && <p className="text-body-sm text-danger-600">Ditolak: {payment.rejectionReason}</p>}
          {payment.status === 'refunded' && <p className="text-body-sm text-ink-500">Refund {formatRupiah(payment.refundAmount)} · {formatDateTime(payment.refundedAt)}{payment.refundNote ? ` · ${payment.refundNote}` : ''}</p>}
          {payment.status === 'paid' && payment.refundAmount != null && <p className="text-body-sm text-warning-600">Booking dibatalkan — refund {formatRupiah(payment.refundAmount)} belum dicatat.</p>}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {payment.status === 'menunggu_verifikasi' && (
          <>
            <Button size="sm" onClick={approve} disabled={verify.isPending}><Check /> Setujui</Button>
            <Button size="sm" variant="destructive" onClick={() => setRejectOpen(true)} disabled={verify.isPending}><X /> Tolak</Button>
          </>
        )}
        {payment.status === 'paid' && (
          <Button size="sm" variant={payment.refundAmount != null ? 'default' : 'secondary'} onClick={() => setRefundOpen(true)}>Catat refund</Button>
        )}
      </div>
      <ConfirmDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title={`Tolak pembayaran ${formatRupiah(payment.amount)} dari ${payer}?`}
        consequence={payment.booking ? 'Booking terkait langsung dibatalkan dan slot tutor dibuka lagi. Pembayar menerima alasanmu lewat notifikasi.' : 'Pendaftaran kursus dibatalkan. Pembayar menerima alasanmu lewat notifikasi.'}
        confirmLabel="Tolak pembayaran"
        destructive
        reason={{ label: 'Alasan penolakan', placeholder: 'Mis. nominal transfer Rp60.000 tidak sesuai tagihan', minLength: 5 }}
        pending={verify.isPending}
        onConfirm={async (reason) => {
          try {
            await verify.mutateAsync({ id: payment.id, action: 'reject', rejectionReason: reason });
            toast.success('Pembayaran ditolak.');
            setRejectOpen(false);
          } catch (err) {
            toast.error(errorMessage(err));
          }
        }}
      />
      {refundOpen && <RefundDialog open={refundOpen} onOpenChange={setRefundOpen} payment={{ id: payment.id, amount: payment.amount, refundAmount: payment.refundAmount, payerName: payer }} />}
    </li>
  );
}

function PaymentsContent() {
  const { values, update, page } = useQueryParams(KEYS);
  const status = values.status ?? 'menunggu_verifikasi';
  const query = useAdminPayments({ status, payableType: values.jenis, page });

  return (
    <div className="max-w-5xl">
      <PageHeader title="Verifikasi pembayaran" description="Cocokkan bukti transfer dengan mutasi rekening/QRIS sebelum menyetujui." />
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <Tabs value={status} onValueChange={(value) => update({ status: value === 'menunggu_verifikasi' ? undefined : value })}>
          <TabsList className="max-w-full overflow-x-auto">
            {TABS.map(([value, label]) => <TabsTrigger key={value} value={value}>{label}</TabsTrigger>)}
          </TabsList>
        </Tabs>
        <div className="space-y-1.5 md:w-48">
          <Label htmlFor="jenis" className="text-body-sm font-semibold text-ink-900">Jenis</Label>
          <NativeSelect id="jenis" value={values.jenis ?? ''} onChange={(e) => update({ jenis: e.target.value })}>
            <option value="">Les & kursus</option>
            <option value="booking">Les privat</option>
            <option value="course_enrollment">Kursus</option>
          </NativeSelect>
        </div>
      </div>
      {query.isPending ? (
        <ListSkeleton count={4} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <EmptyState illustration="receipt" title={status === 'menunggu_verifikasi' ? 'Antrian kosong. Semua bukti sudah diperiksa.' : 'Tidak ada pembayaran di kategori ini.'} description={status === 'menunggu_verifikasi' ? 'Bukti baru muncul otomatis; halaman ini diperbarui tiap 30 detik.' : undefined} />
      ) : (
        <>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {query.data.items.map((payment) => <PaymentRow key={payment.id} payment={payment} />)}
          </ul>
          <Pagination meta={query.data.meta} onPage={(next) => update({ page: String(next) }, false)} />
        </>
      )}
    </div>
  );
}

export default function AdminPaymentsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <PaymentsContent />
    </Suspense>
  );
}
