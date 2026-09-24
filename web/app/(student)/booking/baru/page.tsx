'use client';

import { Check, CircleCheck, Clock, MapPin, Plus, Video } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { cn } from 'cn';
import { AddressDialog } from '@/components/account/AddressDialog';
import { Avatar, Panel } from '@/components/common/Bits';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState, ErrorState, PageSkeleton } from '@/components/common/States';
import { CostSummary } from '@/components/booking/CostSummary';
import { FormError } from '@/components/form/Field';
import { SlotPicker } from '@/components/tutor/SlotPicker';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { useAddresses, useLearners } from '@/hooks/api/account';
import { useCreateBooking, usePublicSettings } from '@/hooks/api/bookings';
import { useTutor } from '@/hooks/api/catalog';
import { ApiError, errorMessage } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';
import { costBreakdown } from '@/lib/booking';
import { formatDate, formatDuration, formatRupiah, formatTimeRange, wibDateOf, wibDateString } from '@/lib/format';
import type { Booking, TutorProfile } from '@/lib/types';

const STEPS = ['Jadwal', 'Lokasi & metode', 'Ringkasan biaya', 'Bayar'];

function Steps({ current }: { current: number }) {
  return (
    <ol className="mb-6 flex items-center gap-2 overflow-x-auto pb-1" aria-label="Langkah booking">
      {STEPS.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} className="flex shrink-0 items-center gap-2" aria-current={active ? 'step' : undefined}>
            <span
              className={cn(
                'flex size-7 items-center justify-center rounded-full font-sans text-label-sm',
                done && 'bg-success-600 text-white',
                active && 'bg-primary-600 text-white',
                !done && !active && 'border border-border bg-surface text-ink-500',
              )}
            >
              {done ? <Check className="size-4" aria-hidden /> : index + 1}
            </span>
            <span className={cn('text-body-sm', active ? 'font-semibold text-ink-900' : 'hidden text-ink-500 sm:inline')}>{label}</span>
            {index < STEPS.length - 1 && <span aria-hidden className="mx-1 h-px w-4 bg-border xl:w-6" />}
          </li>
        );
      })}
    </ol>
  );
}

function endOf(startAt: string, minutes: number) {
  return new Date(new Date(startAt).getTime() + minutes * 60_000).toISOString();
}

function BookingFlow({ tutor }: { tutor: TutorProfile }) {
  const params = useSearchParams();
  const { user } = useAuth();
  const learners = useLearners();
  const addresses = useAddresses();
  const settings = usePublicSettings();
  const create = useCreateBooking();

  const initialStart = params.get('mulai');
  const [step, setStep] = useState(0);
  const [date, setDate] = useState(initialStart ? wibDateOf(initialStart) : wibDateString(1));
  const [duration, setDuration] = useState(Number(params.get('durasi')) || 90);
  const [startAt, setStartAt] = useState<string | null>(initialStart);
  const [learnerId, setLearnerId] = useState<string>('');
  const [subjectId, setSubjectId] = useState<string>(tutor.subjects.length === 1 ? String(tutor.subjects[0].id) : '');
  const modes = tutor.teachingMode === 'both' ? (['tatap_muka', 'online'] as const) : ([tutor.teachingMode] as const);
  const [mode, setMode] = useState<'tatap_muka' | 'online'>(modes[0]);
  const [addressId, setAddressId] = useState<number | null>(null);
  const [addressOpen, setAddressOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Booking | null>(null);

  const isParent = user?.role === 'parent';
  const children = (learners.data ?? []).filter((learner) => (isParent ? !learner.isSelf : learner.isSelf));
  const effectiveLearner = learnerId || (children.length === 1 ? String(children[0].id) : '');
  const effectiveAddress = addressId ?? (addresses.data?.length === 1 ? addresses.data[0].id : null);
  const address = addresses.data?.find((row) => row.id === effectiveAddress) ?? null;
  const learner = children.find((row) => String(row.id) === effectiveLearner);
  const subject = tutor.subjects.find((row) => String(row.id) === subjectId);
  const cost = settings.data ? costBreakdown(tutor.hourlyRate, duration, settings.data.serviceFee) : null;
  const feeNote = settings.data?.serviceFee.type === 'percent' ? `${settings.data.serviceFee.value}%` : undefined;

  function next() {
    setError(null);
    if (step === 0) {
      if (!startAt) return setError('Pilih tanggal dan jam mulai sesi.');
      if (!effectiveLearner) return setError(isParent ? 'Pilih anak yang akan belajar.' : 'Profil belajarmu belum siap. Muat ulang halaman.');
      if (!subjectId) return setError('Pilih mata pelajaran.');
    }
    if (step === 1 && mode === 'tatap_muka' && !effectiveAddress) return setError('Pilih atau tambahkan alamat belajar.');
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit() {
    setError(null);
    try {
      const booking = await create.mutateAsync({
        learnerId: Number(effectiveLearner),
        tutorProfileId: tutor.id,
        subjectId: Number(subjectId),
        mode,
        scheduledStartAt: startAt!,
        durationMinutes: duration,
        addressId: mode === 'tatap_muka' ? effectiveAddress! : undefined,
      });
      setCreated(booking);
      setStep(3);
    } catch (err) {
      // arahkan ke langkah yang relevan supaya pengguna bisa langsung memperbaiki
      const fields = err instanceof ApiError ? err.details?.map((detail) => detail.field) ?? [] : [];
      if (err instanceof ApiError && (err.status === 409 || fields.some((field) => ['scheduledStartAt', 'durationMinutes', 'subjectId', 'learnerId'].includes(field ?? '')))) {
        setStep(0);
        setStartAt(null);
      } else if (fields.some((field) => ['addressId', 'mode'].includes(field ?? ''))) {
        setStep(1);
      }
      setError(errorMessage(err));
    }
  }

  if (learners.isPending) return <PageSkeleton />;
  if (isParent && children.length === 0) {
    return (
      <EmptyState
        illustration="people"
        title="Tambahkan profil anak dulu."
        description="Booking selalu atas nama salah satu anak, supaya laporan perkembangannya tersimpan rapi."
        action={{ label: 'Tambah profil anak', href: '/anak' }}
      />
    );
  }

  const summary = (
    <Panel title="Ringkasan booking">
      <div className="flex items-center gap-3">
        <Avatar name={tutor.fullName} size="sm" />
        <div className="min-w-0">
          <p className="truncate font-sans text-body-md font-semibold text-ink-900">{tutor.fullName}</p>
          <p className="text-body-sm text-ink-500">{subject?.name ?? 'Mapel belum dipilih'}</p>
        </div>
      </div>
      <ul className="mt-4 space-y-2 text-body-sm text-ink-700">
        <li className="flex gap-2">
          <Clock className="mt-0.5 size-4 shrink-0 text-ink-500" aria-hidden />
          {startAt ? `${formatDate(startAt)}, ${formatTimeRange(startAt, endOf(startAt, duration))}` : 'Jadwal belum dipilih'}
        </li>
        <li className="flex gap-2">
          {mode === 'online' ? <Video className="mt-0.5 size-4 shrink-0 text-ink-500" aria-hidden /> : <MapPin className="mt-0.5 size-4 shrink-0 text-ink-500" aria-hidden />}
          {mode === 'online' ? 'Online (link meeting dari tutor)' : address ? address.label : 'Tatap muka · alamat belum dipilih'}
        </li>
        {learner && <li className="text-ink-500">Untuk {learner.fullName}</li>}
      </ul>
      <div className="mt-4 border-t border-border pt-3">
        {cost ? (
          <CostSummary hourlyRate={tutor.hourlyRate} durationMinutes={duration} subtotal={cost.subtotal} serviceFee={cost.serviceFee} total={cost.total} feeNote={feeNote} />
        ) : (
          <p className="text-body-sm text-ink-500">Menghitung biaya…</p>
        )}
      </div>
    </Panel>
  );

  if (step === 3 && created) {
    const needsPayment = created.status === 'menunggu_pembayaran' && created.payment;
    return (
      <div className="max-w-2xl">
        <Steps current={3} />
        <Panel>
          <div className="flex flex-col items-start gap-4">
            <CircleCheck className="size-10 text-success-600" aria-hidden />
            {needsPayment ? (
              <>
                <div>
                  <h2 className="font-sans text-heading-md text-ink-900">Tutor sudah menerima. Tinggal bayar.</h2>
                  <p className="mt-1 text-body-md text-ink-700">
                    Selesaikan pembayaran {formatRupiah(created.totalAmount)} dalam {settings.data?.paymentWindowHours ?? 24} jam agar jadwal tidak dilepas.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild><Link href={`/pembayaran/${created.payment!.id}`}>Bayar sekarang</Link></Button>
                  <Button asChild variant="secondary"><Link href={`/booking/${created.id}`}>Lihat detail booking</Link></Button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h2 className="font-sans text-heading-md text-ink-900">Permintaan terkirim ke {tutor.fullName}.</h2>
                  <p className="mt-1 text-body-md text-ink-700">
                    Tutor punya waktu {settings.data?.bookingResponseHours ?? 24} jam untuk menerima. Begitu diterima, kamu mendapat notifikasi dan bisa langsung membayar {formatRupiah(created.totalAmount)}.
                  </p>
                </div>
                <Button asChild><Link href={`/booking/${created.id}`}>Pantau status booking</Link></Button>
              </>
            )}
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div className="min-w-0">
        <Steps current={step} />
        <FormError message={error} />
        <div className="mt-4 space-y-6">
          {step === 0 && (
            <>
              <Panel title="Pilih jadwal">
                <SlotPicker tutorId={tutor.id} date={date} onDate={setDate} duration={duration} onDuration={setDuration} startAt={startAt} onStart={setStartAt} />
              </Panel>
              <Panel title="Siapa yang belajar?">
                <div className="grid gap-4 sm:grid-cols-2">
                  {isParent ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="learner" className="text-body-sm font-semibold text-ink-900">Anak</Label>
                      <NativeSelect id="learner" value={effectiveLearner} onChange={(e) => setLearnerId(e.target.value)}>
                        <option value="">Pilih anak</option>
                        {children.map((child) => <option key={child.id} value={child.id}>{child.fullName}</option>)}
                      </NativeSelect>
                    </div>
                  ) : (
                    <p className="text-body-sm text-ink-700">Sesi untuk <span className="font-semibold">{learner?.fullName ?? user?.fullName}</span>.</p>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="subject" className="text-body-sm font-semibold text-ink-900">Mata pelajaran</Label>
                    <NativeSelect id="subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                      <option value="">Pilih mapel</option>
                      {tutor.subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </NativeSelect>
                  </div>
                </div>
              </Panel>
            </>
          )}

          {step === 1 && (
            <>
              <Panel title="Cara belajar">
                <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Cara belajar">
                  {modes.map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={mode === value}
                      onClick={() => setMode(value)}
                      className={cn(
                        'flex min-h-16 cursor-pointer items-start gap-3 rounded-lg border p-4 text-left transition-colors',
                        mode === value ? 'border-primary-600 bg-primary-100/60' : 'border-border bg-surface hover:border-primary-600',
                      )}
                    >
                      {value === 'online' ? <Video className="mt-0.5 size-5 text-primary-600" aria-hidden /> : <MapPin className="mt-0.5 size-5 text-primary-600" aria-hidden />}
                      <span>
                        <span className="block font-sans text-body-md font-semibold text-ink-900">{value === 'online' ? 'Online' : 'Tutor datang ke rumah'}</span>
                        <span className="block text-body-sm text-ink-500">
                          {value === 'online' ? 'Link meeting dikirim tutor sebelum sesi.' : 'Check-in dengan QR saat tutor tiba.'}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </Panel>
              {mode === 'tatap_muka' && (
                <Panel title="Alamat belajar" action={<Button size="sm" variant="secondary" onClick={() => setAddressOpen(true)}><Plus /> Alamat baru</Button>}>
                  {addresses.isPending ? (
                    <p className="text-body-sm text-ink-500">Memuat alamat…</p>
                  ) : addresses.isError ? (
                    <ErrorState error={addresses.error} onRetry={() => addresses.refetch()} />
                  ) : addresses.data.length === 0 ? (
                    <EmptyState illustration="map" title="Belum ada alamat tersimpan." description="Tambahkan alamat dengan titik di peta agar tutor bisa menemukan rumahmu." action={{ label: 'Tambah alamat', onClick: () => setAddressOpen(true) }} />
                  ) : (
                    <div className="space-y-2" role="radiogroup" aria-label="Pilih alamat">
                      {addresses.data.map((row) => (
                        <button
                          key={row.id}
                          type="button"
                          role="radio"
                          aria-checked={effectiveAddress === row.id}
                          onClick={() => setAddressId(row.id)}
                          className={cn(
                            'flex w-full cursor-pointer items-start gap-3 rounded-lg border p-4 text-left transition-colors',
                            effectiveAddress === row.id ? 'border-primary-600 bg-primary-100/60' : 'border-border bg-surface hover:border-primary-600',
                          )}
                        >
                          <MapPin className="mt-0.5 size-5 shrink-0 text-primary-600" aria-hidden />
                          <span className="min-w-0">
                            <span className="block font-sans text-body-md font-semibold text-ink-900">{row.label}</span>
                            <span className="block text-body-sm text-ink-700">{row.fullAddress}</span>
                          </span>
                        </button>
                      ))}
                      <p className="pt-1 text-body-sm text-ink-500">Alamat harus berada di wilayah layanan tutor. Kalau di luar, sistem akan memberi tahu saat booking dikirim.</p>
                    </div>
                  )}
                </Panel>
              )}
              {addressOpen && <AddressDialog open={addressOpen} onOpenChange={setAddressOpen} onSaved={(saved) => setAddressId(saved.id)} />}
            </>
          )}

          {step === 2 && (
            <Panel title="Periksa sebelum mengirim">
              <dl className="grid gap-4 text-body-sm sm:grid-cols-2">
                <div><dt className="text-ink-500">Tutor</dt><dd className="font-semibold text-ink-900">{tutor.fullName}</dd></div>
                <div><dt className="text-ink-500">Mata pelajaran</dt><dd className="font-semibold text-ink-900">{subject?.name}</dd></div>
                <div><dt className="text-ink-500">Jadwal</dt><dd className="font-semibold text-ink-900">{startAt && `${formatDate(startAt)}, ${formatTimeRange(startAt, endOf(startAt, duration))}`}</dd></div>
                <div><dt className="text-ink-500">Durasi</dt><dd className="font-semibold text-ink-900">{formatDuration(duration)}</dd></div>
                <div><dt className="text-ink-500">Siswa</dt><dd className="font-semibold text-ink-900">{learner?.fullName}</dd></div>
                <div><dt className="text-ink-500">Lokasi</dt><dd className="font-semibold text-ink-900">{mode === 'online' ? 'Online' : address?.fullAddress}</dd></div>
              </dl>
              {settings.data && (
                <div className="mt-5 rounded-lg bg-surface-muted p-4 text-body-sm text-ink-700">
                  <p className="font-semibold text-ink-900">Sebelum mengirim</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    <li>{tutor.autoAccept ? 'Tutor ini menerima booking otomatis — kamu bisa langsung membayar.' : `Tutor mengonfirmasi dalam ${settings.data.bookingResponseHours} jam. Pembayaran dilakukan setelah diterima.`}</li>
                    <li>Bayar via QRIS atau transfer bank, lalu unggah bukti. Tim Learnly memverifikasi manual.</li>
                    <li>Batal lebih dari {settings.data.cancellationPolicy.freeCancelHours} jam sebelum sesi: refund penuh. Kurang dari itu: refund {settings.data.cancellationPolicy.lateRefundPercent}%.</li>
                  </ul>
                </div>
              )}
            </Panel>
          )}

          <div className="flex flex-wrap justify-between gap-3">
            {step > 0 ? (
              <Button variant="secondary" onClick={() => { setError(null); setStep(step - 1); }}>Kembali</Button>
            ) : (
              <Button asChild variant="ghost"><Link href={`/tutor/${tutor.id}`}>Batal</Link></Button>
            )}
            {step < 2 ? (
              <Button onClick={next}>Lanjut</Button>
            ) : (
              <Button onClick={submit} disabled={create.isPending}>{create.isPending ? 'Mengirim…' : `Kirim booking${cost ? ` · ${formatRupiah(cost.total)}` : ''}`}</Button>
            )}
          </div>
        </div>
      </div>
      <aside className="lg:sticky lg:top-24">{summary}</aside>
    </div>
  );
}

function NewBookingContent() {
  const tutorId = useSearchParams().get('tutor') ?? undefined;
  const tutor = useTutor(tutorId);
  if (!tutorId) {
    return <EmptyState illustration="search" title="Pilih tutor dulu." description="Mulai dari halaman pencarian, pilih tutor dan jadwal yang cocok." action={{ label: 'Cari tutor', href: '/tutor' }} />;
  }
  if (tutor.isPending) return <PageSkeleton />;
  if (tutor.isError) return <ErrorState error={tutor.error} onRetry={() => tutor.refetch()} title="Profil tutor tidak bisa dibuka" />;
  return (
    <>
      <PageHeader title="Pesan sesi" description={`Bersama ${tutor.data.fullName} · ${formatRupiah(tutor.data.hourlyRate)} per jam`} back={{ href: `/tutor/${tutor.data.id}`, label: 'Profil tutor' }} />
      <BookingFlow tutor={tutor.data} />
    </>
  );
}

export default function NewBookingPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewBookingContent />
    </Suspense>
  );
}
