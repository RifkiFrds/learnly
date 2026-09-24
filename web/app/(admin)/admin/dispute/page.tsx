'use client';

import { CircleAlert } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { OverrideStatusDialog, RefundDialog } from '@/components/admin/AdminDialogs';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/States';
import { Button } from '@/components/ui/button';
import { useDisputes, useVerifyPayment } from '@/hooks/api/admin';
import { errorMessage } from '@/lib/api-client';
import { formatDateTime, formatRupiah } from '@/lib/format';
import type { DisputeItem, DisputeType } from '@/lib/types';

const TYPE_LABEL: Record<DisputeType, string> = {
  refund_pending: 'Refund belum ditransfer',
  verify_before_refund: 'Bukti masuk setelah batal',
  payment_rejected: 'Pembayaran ditolak',
  session_not_started: 'Sesi lewat belum dimulai',
  session_not_checked_out: 'Sesi belum check-out',
};

// Deskripsi dari API menyebut path endpoint; untuk admin ganti dengan instruksi yang bisa dilakukan di halaman ini
const ACTION_HINT: Record<DisputeType, string> = {
  refund_pending: 'Transfer manual ke pembayar, lalu catat refund di sini.',
  verify_before_refund: 'Pastikan uang benar-benar masuk (setujui bukti), lalu catat refund penuh.',
  payment_rejected: 'Hubungi pembayar bila ada keberatan. Jika perlu, ubah status booking terkait.',
  session_not_started: 'Konfirmasi ke tutor & pemesan, lalu tandai selesai atau batalkan.',
  session_not_checked_out: 'Konfirmasi ke tutor. Tandai selesai bila sesi memang berlangsung.',
};

function DisputeCard({ item }: { item: DisputeItem }) {
  const [refundOpen, setRefundOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const verify = useVerifyPayment();
  const payment = item.payment;
  const related = item.related;

  return (
    <li className="rounded-lg border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={item.severity === 'high' ? 'inline-flex items-center gap-1 rounded-full bg-danger-100 px-2.5 py-1 text-label-sm text-danger-600' : 'inline-flex items-center gap-1 rounded-full bg-warning-100 px-2.5 py-1 text-label-sm text-warning-600'}>
              <CircleAlert className="size-3.5" aria-hidden />
              {item.severity === 'high' ? 'Prioritas tinggi' : 'Perlu dipantau'}
            </span>
            <span className="text-body-sm font-semibold text-ink-900">{TYPE_LABEL[item.type]}</span>
          </div>
          <p className="font-sans text-body-md font-semibold text-ink-900">{item.title}</p>
          {related && (
            <p className="flex flex-wrap items-center gap-2 text-body-sm text-ink-700">
              {related.type === 'booking' ? `Booking #${related.id}` : `Pendaftaran kursus #${related.id}`} · {related.summary}
              {related.status && <StatusBadge kind="booking" status={related.status} />}
            </p>
          )}
          {related?.scheduledStartAt && <p className="text-body-sm text-ink-500">Jadwal {formatDateTime(related.scheduledStartAt)}</p>}
          {payment && (
            <p className="flex flex-wrap items-center gap-2 text-body-sm text-ink-500">
              Tagihan #{payment.id} · {formatRupiah(payment.amount)} · {payment.payer.fullName}{payment.payer.phone ? ` (${payment.payer.phone})` : ''}
              <StatusBadge kind="payment" status={payment.status} />
            </p>
          )}
          {item.type === 'payment_rejected' && <p className="text-body-sm text-ink-700">{item.description}</p>}
          <p className="text-body-sm text-ink-500">{ACTION_HINT[item.type]}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {item.type === 'refund_pending' && payment && <Button size="sm" onClick={() => setRefundOpen(true)}>Catat refund</Button>}
          {item.type === 'verify_before_refund' && payment && (
            <Button
              size="sm"
              disabled={verify.isPending}
              onClick={() =>
                verify.mutate(
                  { id: payment.id, action: 'approve' },
                  { onSuccess: () => toast.success('Bukti disetujui. Lanjutkan dengan mencatat refund.'), onError: (err) => toast.error(errorMessage(err)) },
                )
              }
            >
              Setujui bukti
            </Button>
          )}
          {related?.type === 'booking' && related.status !== 'dibatalkan' && (
            <Button size="sm" variant="secondary" onClick={() => setOverrideOpen(true)}>Ubah status booking</Button>
          )}
        </div>
      </div>
      {refundOpen && payment && (
        <RefundDialog open={refundOpen} onOpenChange={setRefundOpen} payment={{ id: payment.id, amount: payment.amount, refundAmount: payment.refundAmount, payerName: payment.payer.fullName }} />
      )}
      {overrideOpen && related && <OverrideStatusDialog open={overrideOpen} onOpenChange={setOverrideOpen} booking={{ id: related.id, status: related.status, summary: related.summary }} />}
    </li>
  );
}

export default function DisputesPage() {
  const query = useDisputes();
  return (
    <div className="max-w-5xl">
      <PageHeader title="Dispute & refund" description="Booking dan pembayaran yang butuh tindakan manual: refund, sesi macet, atau pembayaran ditolak 30 hari terakhir." />
      {query.isPending ? (
        <ListSkeleton count={4} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <EmptyState illustration="receipt" title="Tidak ada kasus yang perlu ditangani." description="Refund tertunda, sesi macet, dan pembayaran ditolak akan muncul di sini." />
      ) : (
        <>
          <dl className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ['Refund tertunda', query.data.summary.refundPending],
              ['Bukti setelah batal', query.data.summary.verifyBeforeRefund],
              ['Sesi macet', query.data.summary.stuckBookings],
              ['Pembayaran ditolak', query.data.summary.paymentRejected],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border bg-surface p-4">
                <dt className="text-body-sm text-ink-500">{label}</dt>
                <dd className="font-display text-heading-lg text-ink-900">{value}</dd>
              </div>
            ))}
          </dl>
          <ul className="space-y-3">
            {query.data.items.map((item, index) => <DisputeCard key={`${item.type}-${item.payment?.id ?? item.related?.id ?? index}`} item={item} />)}
          </ul>
        </>
      )}
    </div>
  );
}
