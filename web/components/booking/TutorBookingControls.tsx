'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Car, Check, LocateFixed, MapPinned, PackageCheck, Play, Video, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Panel } from '@/components/common/Bits';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { CheckoutReportForm } from '@/components/booking/CheckoutReportForm';
import { QrScanner } from '@/components/booking/QrScanner';
import { Field } from '@/components/form/Field';
import { LocationPicker } from '@/components/map/LocationPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCheckin, useLocationPing, useMeetingLink, useRespondBooking, useTravelStatus } from '@/hooks/api/bookings';
import { errorMessage } from '@/lib/api-client';
import { applyApiError } from '@/lib/forms';
import { formatDateTime, formatRelative } from '@/lib/format';
import type { Booking } from '@/lib/types';

// ---------- terima / tolak ----------

export function RespondControls({ booking, compact = false }: { booking: Booking; compact?: boolean }) {
  const respond = useRespondBooking(booking.id);
  const [rejectOpen, setRejectOpen] = useState(false);

  async function accept() {
    try {
      await respond.mutateAsync({ action: 'accept' });
      toast.success(`Booking diterima. ${booking.bookedBy.fullName} diminta membayar.`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size={compact ? 'sm' : 'default'} onClick={accept} disabled={respond.isPending}>
        <Check /> {respond.isPending ? 'Memproses…' : 'Terima'}
      </Button>
      <Button size={compact ? 'sm' : 'default'} variant="destructive" onClick={() => setRejectOpen(true)} disabled={respond.isPending}>
        <X /> Tolak
      </Button>
      <ConfirmDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title={`Tolak booking ${booking.subject.name} untuk ${booking.learner.fullName}?`}
        consequence="Pemesan menerima notifikasi beserta alasanmu dan slot ini kembali terbuka untuk siswa lain. Keputusan ini tidak bisa dibatalkan."
        confirmLabel="Tolak booking"
        destructive
        reason={{ label: 'Alasan penolakan', placeholder: 'Mis. jadwal bentrok dengan kegiatan lain', minLength: 5 }}
        pending={respond.isPending}
        onConfirm={async (reason) => {
          try {
            await respond.mutateAsync({ action: 'reject', reason });
            toast.success('Booking ditolak.');
            setRejectOpen(false);
          } catch (err) {
            toast.error(errorMessage(err));
          }
        }}
      />
    </div>
  );
}

// ---------- berbagi lokasi saat dalam perjalanan ----------

const PING_INTERVAL_MS = 30_000;

function LocationSharing({ booking }: { booking: Booking }) {
  const ping = useLocationPing(booking.id);
  const [sharing, setSharing] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualPoint, setManualPoint] = useState<{ lat: number; lng: number } | null>(null);
  const watchRef = useRef<number | null>(null);
  const lastSentRef = useRef(0);
  const { mutate } = ping;

  const stop = useCallback(() => {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
    setSharing(false);
  }, []);

  useEffect(() => stop, [stop]);

  function start() {
    setProblem(null);
    if (!('geolocation' in navigator)) {
      setProblem('Browser ini tidak mendukung lokasi otomatis. Tandai posisimu di peta.');
      setManualOpen(true);
      return;
    }
    setSharing(true);
    lastSentRef.current = 0;
    watchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        // kirim paling sering tiap 30 detik agar hemat baterai & kuota
        if (Date.now() - lastSentRef.current < PING_INTERVAL_MS) return;
        lastSentRef.current = Date.now();
        mutate(
          { latitude: position.coords.latitude, longitude: position.coords.longitude },
          { onError: (err) => setProblem(errorMessage(err)) },
        );
      },
      (error) => {
        stop();
        setProblem(
          error.code === error.PERMISSION_DENIED
            ? 'Izin lokasi ditolak. Aktifkan izin lokasi di browser, atau tandai posisimu di peta secara manual.'
            : 'Lokasi belum terdeteksi. Coba lagi di tempat terbuka, atau tandai posisimu di peta.',
        );
        setManualOpen(true);
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 },
    );
  }

  return (
    <div className="space-y-3 rounded-lg bg-surface-muted/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-body-sm">
          <p className="font-semibold text-ink-900">Bagikan lokasi ke {booking.bookedBy.fullName}</p>
          <p className="text-ink-500" aria-live="polite">
            {sharing
              ? 'Lokasi terkirim otomatis tiap 30 detik selama halaman ini terbuka.'
              : booking.latestLocation
                ? `Terakhir terkirim ${formatRelative(booking.latestLocation.recordedAt)}.`
                : 'Siswa bisa melihat posisimu di peta.'}
          </p>
        </div>
        {sharing ? (
          <Button variant="secondary" onClick={stop}>Berhenti berbagi</Button>
        ) : (
          <Button variant="secondary" onClick={start}><LocateFixed /> Bagikan lokasi</Button>
        )}
      </div>
      {problem && <p className="text-body-sm text-warning-600" role="alert">{problem}</p>}
      {!sharing && (
        <button type="button" className="min-h-11 cursor-pointer text-body-sm text-ink-500 underline-offset-4 hover:text-ink-900 hover:underline" onClick={() => setManualOpen((open) => !open)}>
          {manualOpen ? 'Tutup peta manual' : 'Tandai posisi di peta secara manual'}
        </button>
      )}
      {manualOpen && !sharing && (
        <div className="space-y-3">
          <LocationPicker value={manualPoint} onChange={setManualPoint} heightClass="h-56" />
          <Button
            disabled={!manualPoint || ping.isPending}
            onClick={() =>
              ping.mutate(
                { latitude: Number(manualPoint!.lat.toFixed(7)), longitude: Number(manualPoint!.lng.toFixed(7)) },
                { onSuccess: () => toast.success('Posisi terkirim ke siswa.'), onError: (err) => toast.error(errorMessage(err)) },
              )
            }
          >
            <MapPinned /> Kirim posisi ini
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------- link meeting (online) ----------

const meetingSchema = z.object({
  meetingLink: z.string().trim().url('Tempel link lengkap, mis. https://meet.google.com/abc-defg-hij').startsWith('https://', 'Link harus diawali https://'),
});

function MeetingLinkForm({ booking }: { booking: Booking }) {
  const save = useMeetingLink(booking.id);
  const form = useForm<z.infer<typeof meetingSchema>>({ resolver: zodResolver(meetingSchema), values: { meetingLink: booking.meetingLink ?? '' } });
  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync(values.meetingLink);
      toast.success('Link meeting tersimpan & dikirim ke siswa.');
    } catch (err) {
      const message = applyApiError(err, form.setError);
      if (message) toast.error(message);
    }
  });
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-start" noValidate>
      <div className="flex-1">
        <Field label="Link meeting (Google Meet/Zoom)" error={form.formState.errors.meetingLink?.message}>
          {(props) => <Input {...props} type="url" inputMode="url" placeholder="https://meet.google.com/…" {...form.register('meetingLink')} />}
        </Field>
      </div>
      <Button type="submit" variant="secondary" className="sm:mt-7" disabled={form.formState.isSubmitting}>
        <Video /> {booking.meetingLink ? 'Perbarui link' : 'Kirim link'}
      </Button>
    </form>
  );
}

// ---------- panel aksi utama tutor ----------

const TRAVEL_NEXT = {
  'update_status:tutor_bersiap': { status: 'tutor_bersiap', label: 'Saya sedang bersiap', icon: PackageCheck },
  'update_status:tutor_dalam_perjalanan': { status: 'tutor_dalam_perjalanan', label: 'Berangkat sekarang', icon: Car },
  'update_status:tutor_tiba': { status: 'tutor_tiba', label: 'Saya sudah tiba', icon: MapPinned },
} as const;

export function TutorBookingControls({ booking }: { booking: Booking }) {
  const travel = useTravelStatus(booking.id);
  const checkin = useCheckin(booking.id);
  const actions = booking.availableActions;
  const travelAction = actions.map((action) => TRAVEL_NEXT[action as keyof typeof TRAVEL_NEXT]).find(Boolean);

  async function doCheckin(token?: string) {
    try {
      await checkin.mutateAsync(token);
      toast.success('Check-in berhasil. Sesi dimulai — selamat mengajar!');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  if (actions.includes('accept')) {
    return (
      <Panel title="Permintaan baru">
        <p className="mb-4 text-body-sm text-ink-700">
          Terima jika jadwal & lokasi cocok. Setelah diterima, pemesan diminta membayar sebelum sesi dikonfirmasi.
        </p>
        <RespondControls booking={booking} />
      </Panel>
    );
  }

  const panels: React.ReactNode[] = [];

  if (booking.status === 'menunggu_pembayaran') {
    panels.push(
      <Panel key="pay" title="Menunggu pembayaran">
        <p className="text-body-sm text-ink-700">Pemesan sedang membayar. Kamu akan diberi tahu begitu admin memverifikasi pembayaran.</p>
        {booking.mode === 'online' && <div className="mt-4"><MeetingLinkForm booking={booking} /></div>}
      </Panel>,
    );
  }

  if (travelAction) {
    const Icon = travelAction.icon;
    panels.push(
      <Panel key="travel" title="Status perjalanan">
        <p className="mb-4 text-body-sm text-ink-700">Perbarui status supaya {booking.bookedBy.fullName} tahu kapan harus bersiap.</p>
        <Button
          onClick={() =>
            travel.mutate(travelAction.status, {
              onSuccess: () => toast.success('Status diperbarui.'),
              onError: (err) => toast.error(errorMessage(err)),
            })
          }
          disabled={travel.isPending}
        >
          <Icon /> {travel.isPending ? 'Menyimpan…' : travelAction.label}
        </Button>
        {actions.includes('location_ping') && <div className="mt-4"><LocationSharing booking={booking} /></div>}
      </Panel>,
    );
  }

  if (actions.includes('checkin')) {
    panels.push(
      booking.mode === 'tatap_muka' ? (
        <Panel key="checkin" title="Check-in dengan QR">
          <p className="mb-4 text-body-sm text-ink-700">Minta siswa/orang tua membuka booking ini dan menampilkan QR check-in, lalu pindai.</p>
          <QrScanner bookingId={booking.id} pending={checkin.isPending} onToken={doCheckin} />
        </Panel>
      ) : (
        <Panel key="checkin" title="Sesi online">
          <MeetingLinkForm booking={booking} />
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <Button onClick={() => doCheckin()} disabled={checkin.isPending || !booking.meetingLink}>
              <Play /> {checkin.isPending ? 'Memulai…' : 'Mulai sesi'}
            </Button>
            {!booking.meetingLink && <p className="text-body-sm text-ink-500">Kirim link meeting dulu sebelum memulai sesi.</p>}
          </div>
        </Panel>
      ),
    );
  }

  if (actions.includes('checkout_session')) {
    panels.push(
      <Panel key="checkout" title="Selesaikan sesi">
        {booking.checkedInAt && <p className="mb-4 text-body-sm text-ink-500">Sesi dimulai {formatDateTime(booking.checkedInAt)}.</p>}
        {booking.mode === 'online' && booking.meetingLink && (
          <p className="mb-4 text-body-sm">
            <a href={booking.meetingLink} target="_blank" rel="noreferrer" className="font-semibold text-primary-600 hover:text-primary-700">Buka link meeting</a>
          </p>
        )}
        <CheckoutReportForm bookingId={booking.id} learnerName={booking.learner.fullName} />
      </Panel>,
    );
  }

  return panels.length ? <div className="space-y-6">{panels}</div> : null;
}
