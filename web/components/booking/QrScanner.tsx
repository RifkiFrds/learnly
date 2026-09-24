'use client';

import jsQR from 'jsqr';
import { Camera, CameraOff, Keyboard } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Field } from '@/components/form/Field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { parseQrPayload } from '@/lib/booking';

type CameraState = 'idle' | 'starting' | 'scanning' | 'error';

function cameraErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Izin kamera ditolak. Izinkan kamera di pengaturan browser, atau masukkan kode secara manual.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'Kamera tidak ditemukan di perangkat ini. Masukkan kode secara manual.';
  if (name === 'NotReadableError') return 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi itu lalu coba lagi.';
  return 'Kamera tidak bisa dibuka. Masukkan kode secara manual.';
}

/**
 * Pindai QR check-in dari layar siswa (FR-CHECKIN-02). Kamera belakang lewat getUserMedia + jsQR;
 * selalu ada jalur manual (tempel/ketik kode) bila kamera tidak tersedia atau izin ditolak.
 */
export function QrScanner({ bookingId, pending, onToken }: { bookingId: number; pending: boolean; onToken: (token: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const [state, setState] = useState<CameraState>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const cameraSupported = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);

  const stop = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  const submit = useCallback(
    (raw: string, fromCamera: boolean) => {
      const parsed = parseQrPayload(raw);
      if (!parsed) {
        if (!fromCamera) setManualError('Kode tidak dikenali. Salin kode lengkap dari layar siswa.');
        return false;
      }
      if (parsed.bookingId && parsed.bookingId !== bookingId) {
        const message = 'QR ini untuk booking lain. Pastikan siswa membuka booking yang benar.';
        if (fromCamera) setCameraError(message);
        else setManualError(message);
        return false;
      }
      onToken(parsed.qrToken);
      return true;
    },
    [bookingId, onToken],
  );

  async function start() {
    setCameraError(null);
    setState('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setState('scanning');
      let last = 0;
      const tick = (time: number) => {
        frameRef.current = requestAnimationFrame(tick);
        if (time - last < 200 || video.readyState < 2) return;
        last = time;
        const canvas = canvasRef.current!;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true })!;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const code = jsQR(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
        if (code?.data && submit(code.data, true)) {
          stop();
          setState('idle');
        }
      };
      frameRef.current = requestAnimationFrame(tick);
    } catch (err) {
      stop();
      setState('error');
      setCameraError(cameraErrorMessage(err));
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className={state === 'scanning' || state === 'starting' ? 'relative overflow-hidden rounded-lg bg-ink-900' : 'hidden'}>
          <video ref={videoRef} className="aspect-square w-full max-w-sm object-cover sm:aspect-video sm:max-w-none" playsInline muted />
          <span aria-hidden className="pointer-events-none absolute inset-[18%] rounded-lg border-2 border-white/80" />
        </div>
        <canvas ref={canvasRef} className="hidden" />
        {cameraError && (
          <p className="flex items-start gap-2 rounded-lg bg-warning-100 px-4 py-3 text-body-sm text-ink-900" role="alert">
            <CameraOff className="mt-0.5 size-4 shrink-0 text-warning-600" aria-hidden />
            {cameraError}
          </p>
        )}
        {state === 'scanning' ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-body-sm text-ink-700" aria-live="polite">Arahkan kamera ke QR di layar siswa…</p>
            <Button variant="secondary" onClick={() => { stop(); setState('idle'); }}>Tutup kamera</Button>
          </div>
        ) : cameraSupported ? (
          <Button onClick={start} disabled={state === 'starting' || pending}>
            <Camera /> {state === 'starting' ? 'Membuka kamera…' : pending ? 'Memproses check-in…' : 'Pindai QR dengan kamera'}
          </Button>
        ) : (
          <p className="text-body-sm text-ink-500">Browser ini tidak mendukung akses kamera. Gunakan kode manual di bawah.</p>
        )}
      </div>
      <form
        className="space-y-3 border-t border-border pt-4"
        onSubmit={(event) => {
          event.preventDefault();
          setManualError(null);
          submit(manual, false);
        }}
      >
        <p className="flex items-center gap-2 text-body-sm font-semibold text-ink-900">
          <Keyboard className="size-4 text-ink-500" aria-hidden /> Tidak bisa memindai?
        </p>
        <Field label="Kode check-in" hint="Minta siswa menyalin kode dari bawah QR, lalu tempel di sini." error={manualError ?? undefined}>
          {(props) => <Input {...props} value={manual} onChange={(e) => setManual(e.target.value)} autoComplete="off" spellCheck={false} className="font-mono" />}
        </Field>
        <Button type="submit" variant="secondary" disabled={pending || manual.trim().length < 10}>
          {pending ? 'Memproses…' : 'Check-in dengan kode'}
        </Button>
      </form>
    </div>
  );
}
