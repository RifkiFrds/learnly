'use client';

import { Copy, QrCode, RefreshCw } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ErrorState } from '@/components/common/States';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useQrToken } from '@/hooks/api/bookings';

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  return now;
}

/**
 * QR check-in yang ditunjukkan siswa/orang tua ke tutor saat tiba (FR-CHECKIN-02).
 * Token berlaku 10 menit; setelah habis, QR disamarkan dan tombol muat ulang meminta token baru.
 */
export function QrCheckinPanel({ bookingId }: { bookingId: number }) {
  const [open, setOpen] = useState(false);
  const qr = useQrToken(bookingId, open);
  const [image, setImage] = useState<string | null>(null);
  const now = useNow(open && Boolean(qr.data));

  const payload = qr.data?.qrPayload;
  useEffect(() => {
    if (!payload) return;
    let cancelled = false;
    QRCode.toDataURL(payload, { width: 560, margin: 1, color: { dark: '#231F1A', light: '#FFFFFF' } }).then((url) => {
      if (!cancelled) setImage(url);
    });
    return () => {
      cancelled = true;
    };
  }, [payload]);

  if (!open) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-body-sm text-ink-700">Saat tutor tiba, tunjukkan QR ini untuk memulai sesi. QR berlaku 10 menit sejak ditampilkan.</p>
        <Button onClick={() => setOpen(true)}>
          <QrCode /> Tampilkan QR check-in
        </Button>
      </div>
    );
  }

  if (qr.isPending || (qr.data && !image)) {
    return <Skeleton className="mx-auto aspect-square w-full max-w-64 rounded-lg" />;
  }
  if (qr.isError) return <ErrorState error={qr.error} onRetry={() => qr.refetch()} title="QR belum bisa ditampilkan" />;

  // dibatasi 10 menit: jam perangkat bisa sedikit berbeda dari server
  const remaining = Math.min(600, Math.max(0, Math.floor((new Date(qr.data.expiresAt).getTime() - now) / 1000)));
  const expired = remaining === 0;
  const minutes = Math.floor(remaining / 60);
  const seconds = String(remaining % 60).padStart(2, '0');

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="relative rounded-lg border border-border bg-white p-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- data URL hasil generate lokal */}
        <img src={image!} alt={`QR check-in booking #${bookingId}`} className={expired ? 'size-64 opacity-15' : 'size-64'} />
        {expired && (
          <p className="absolute inset-0 flex items-center justify-center px-6 font-sans text-body-md font-semibold text-ink-900">
            QR sudah kedaluwarsa. Muat ulang untuk mendapatkan QR baru.
          </p>
        )}
      </div>
      <p className="text-body-sm text-ink-700" aria-live="polite">
        {expired ? 'QR tidak berlaku lagi.' : (
          <>Berlaku <span className="font-mono font-semibold text-ink-900">{minutes}:{seconds}</span> lagi · minta tutor memindainya</>
        )}
      </p>
      {!expired && (
        <details className="w-full max-w-sm text-left">
          <summary className="min-h-11 cursor-pointer py-2 text-center text-body-sm text-ink-500 hover:text-ink-900">Tutor tidak bisa memindai? Tampilkan kode</summary>
          <div className="flex items-center gap-2 rounded-lg bg-surface-muted p-3">
            <code className="min-w-0 flex-1 font-mono text-body-sm break-all text-ink-900">{qr.data.qrToken}</code>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigator.clipboard?.writeText(qr.data.qrToken).then(() => toast.success('Kode disalin.'), () => toast.error('Tidak bisa menyalin otomatis. Salin manual kode di samping.'))}
            >
              <Copy /> Salin
            </Button>
          </div>
        </details>
      )}
      <Button variant={expired ? 'default' : 'secondary'} onClick={() => qr.refetch()} disabled={qr.isFetching}>
        <RefreshCw className={qr.isFetching ? 'animate-spin' : undefined} /> {qr.isFetching ? 'Memuat…' : 'Muat ulang QR'}
      </Button>
    </div>
  );
}
