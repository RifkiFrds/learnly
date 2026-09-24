'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { useCancelBooking, usePublicSettings } from '@/hooks/api/bookings';
import { errorMessage } from '@/lib/api-client';
import { cancellationPreview } from '@/lib/booking';
import { formatRupiah } from '@/lib/format';
import type { Booking } from '@/lib/types';

/** Tombol batal + modal yang menyebut konsekuensi uang secara spesifik (FR-BOOK-08, docs/10 §5). */
export function CancelBookingButton({ booking, by }: { booking: Booking; by: 'student' | 'tutor' }) {
  const [open, setOpen] = useState(false);
  const cancel = useCancelBooking(booking.id);
  const settings = usePublicSettings();
  const policy = settings.data?.cancellationPolicy;

  let consequence: React.ReactNode = 'Booking akan dibatalkan dan slot jadwal ini dibuka kembali.';
  if (policy) {
    const preview = cancellationPreview(booking, by, policy);
    if (by === 'tutor') {
      consequence = preview.paid
        ? `Siswa mendapat refund penuh ${formatRupiah(preview.refund)} dan akan diberi tahu. Pembatalan mendadak memengaruhi kepercayaan siswa.`
        : 'Siswa akan diberi tahu dan slot jadwal ini dibuka kembali.';
    } else if (!preview.paid) {
      consequence = 'Belum ada pembayaran yang masuk, jadi tidak ada dana yang perlu dikembalikan. Slot tutor akan dibuka kembali.';
    } else if (preview.free) {
      consequence = `Kamu membatalkan lebih dari ${policy.freeCancelHours} jam sebelum sesi, jadi dana ${formatRupiah(preview.refund)} dikembalikan penuh lewat transfer manual oleh tim Learnly.`;
    } else {
      consequence = `Sesi dimulai kurang dari ${policy.freeCancelHours} jam lagi. Refund hanya ${policy.lateRefundPercent}% — ${formatRupiah(preview.refund)} dari ${formatRupiah(preview.paid)} — ditransfer manual oleh tim Learnly.`;
    }
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Batalkan booking
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Batalkan booking ini?"
        consequence={consequence}
        confirmLabel="Ya, batalkan booking"
        cancelLabel="Jangan batalkan"
        destructive
        reason={{ label: 'Alasan pembatalan', placeholder: by === 'tutor' ? 'Mis. sakit mendadak' : 'Mis. jadwal sekolah berubah', minLength: 5 }}
        pending={cancel.isPending}
        onConfirm={async (reason) => {
          try {
            const result = await cancel.mutateAsync(reason);
            toast.success(
              result.refundAmount ? `Booking dibatalkan. Refund ${formatRupiah(result.refundAmount)} akan diproses admin.` : 'Booking dibatalkan.',
            );
            setOpen(false);
          } catch (err) {
            toast.error(errorMessage(err));
          }
        }}
      />
    </>
  );
}
