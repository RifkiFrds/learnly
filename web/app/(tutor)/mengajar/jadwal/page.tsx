'use client';

import { CalendarOff, MapPin, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Panel } from '@/components/common/Bits';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState, PageSkeleton } from '@/components/common/States';
import { Field } from '@/components/form/Field';
import { LocationPicker } from '@/components/map/LocationPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { useMyTutorProfile, useTutorMutation } from '@/hooks/api/account';
import { api, errorMessage } from '@/lib/api-client';
import { DAY_NAMES, formatDateLong, wibDateString } from '@/lib/format';
import type { ServiceArea, TutorProfile } from '@/lib/types';

const TIMES = Array.from({ length: 36 }, (_, i) => {
  const minutes = 6 * 60 + i * 30; // 06:00 – 23:30
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});

type Window = { dayOfWeek: number; startTime: string; endTime: string };

function overlapProblem(windows: Window[]): string | null {
  for (const w of windows) if (w.startTime >= w.endTime) return `${DAY_NAMES[w.dayOfWeek]}: jam mulai harus lebih awal dari jam selesai.`;
  const sorted = [...windows].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].dayOfWeek === sorted[i - 1].dayOfWeek && sorted[i].startTime < sorted[i - 1].endTime) {
      return `${DAY_NAMES[sorted[i].dayOfWeek]}: ada rentang jam yang tumpang tindih.`;
    }
  }
  return null;
}

function AvailabilityEditor({ profile }: { profile: TutorProfile }) {
  const [windows, setWindows] = useState<Window[]>(
    profile.availabilities.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime })),
  );
  const [problem, setProblem] = useState<string | null>(null);
  const save = useTutorMutation((list: Window[]) => api.put('/tutors/me/availabilities', { availabilities: list }));

  const update = (index: number, patch: Partial<Window>) => setWindows((list) => list.map((w, i) => (i === index ? { ...w, ...patch } : w)));

  async function submit() {
    const issue = overlapProblem(windows);
    setProblem(issue);
    if (issue) return;
    try {
      await save.mutateAsync(windows);
      toast.success('Jadwal mingguan tersimpan.');
    } catch (err) {
      setProblem(errorMessage(err));
    }
  }

  return (
    <Panel title="Jadwal mingguan (WIB)">
      <div id="jadwal" className="scroll-mt-24">
        <p className="mb-4 text-body-sm text-ink-500">Siswa hanya bisa memesan di dalam rentang jam ini. Boleh beberapa rentang per hari, mis. pagi dan sore.</p>
        <div className="divide-y divide-border rounded-lg border border-border">
          {DAY_NAMES.map((day, dayOfWeek) => {
            const rows = windows.map((w, index) => ({ ...w, index })).filter((w) => w.dayOfWeek === dayOfWeek);
            return (
              <div key={day} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start">
                <p className="w-20 shrink-0 pt-2.5 text-body-sm font-semibold text-ink-900">{day}</p>
                <div className="flex-1 space-y-2">
                  {rows.length === 0 && <p className="pt-2.5 text-body-sm text-ink-300">Libur</p>}
                  {rows.map((row) => (
                    <div key={row.index} className="flex items-center gap-2">
                      <label className="sr-only" htmlFor={`start-${row.index}`}>Jam mulai {day}</label>
                      <NativeSelect id={`start-${row.index}`} value={row.startTime} onChange={(e) => update(row.index, { startTime: e.target.value })} className="w-28 font-mono">
                        {TIMES.map((t) => <option key={t}>{t}</option>)}
                      </NativeSelect>
                      <span className="text-ink-500">–</span>
                      <label className="sr-only" htmlFor={`end-${row.index}`}>Jam selesai {day}</label>
                      <NativeSelect id={`end-${row.index}`} value={row.endTime} onChange={(e) => update(row.index, { endTime: e.target.value })} className="w-28 font-mono">
                        {TIMES.map((t) => <option key={t}>{t}</option>)}
                      </NativeSelect>
                      <Button variant="ghost" size="icon" onClick={() => setWindows((list) => list.filter((_, i) => i !== row.index))} aria-label={`Hapus rentang ${row.startTime} ${day}`}>
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setWindows((list) => [...list, { dayOfWeek, startTime: rows.at(-1)?.endTime && rows.at(-1)!.endTime < '21:00' ? rows.at(-1)!.endTime : '08:00', endTime: '12:00' }])}
                >
                  <Plus /> Rentang
                </Button>
              </div>
            );
          })}
        </div>
        {problem && <p className="mt-3 text-body-sm text-danger-600" role="alert">{problem}</p>}
        <Button className="mt-4" onClick={submit} disabled={save.isPending}>
          {save.isPending ? 'Menyimpan…' : 'Simpan jadwal'}
        </Button>
      </div>
    </Panel>
  );
}

function BlockedDates({ profile }: { profile: TutorProfile }) {
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const add = useTutorMutation((input: { blockedDate: string; reason?: string }) => api.post('/tutors/me/blocked-dates', input));
  const remove = useTutorMutation((id: number) => api.delete(`/tutors/me/blocked-dates/${id}`));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!date) return;
    try {
      await add.mutateAsync({ blockedDate: date, reason: reason.trim() || undefined });
      toast.success('Tanggal diblokir.');
      setDate('');
      setReason('');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const upcoming = (profile.blockedDates ?? []).filter((row) => row.blockedDate >= wibDateString());
  return (
    <Panel title="Tanggal libur / berhalangan">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
        <Field label="Tanggal">
          {(props) => <Input {...props} type="date" min={wibDateString()} value={date} onChange={(e) => setDate(e.target.value)} />}
        </Field>
        <Field label="Alasan" optional>
          {(props) => <Input {...props} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Mis. acara keluarga" />}
        </Field>
        <Button type="submit" disabled={!date || add.isPending}>
          <CalendarOff /> Blokir
        </Button>
      </form>
      {upcoming.length > 0 ? (
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
          {upcoming.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-body-sm text-ink-900">
                {formatDateLong(row.blockedDate)}
                {row.reason && <span className="text-ink-500"> — {row.reason}</span>}
              </span>
              <Button variant="ghost" size="sm" onClick={() => remove.mutate(row.id)} aria-label={`Buka kembali ${row.blockedDate}`}>
                Buka lagi
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-body-sm text-ink-500">Belum ada tanggal yang diblokir.</p>
      )}
    </Panel>
  );
}

type AreaDraft = Omit<ServiceArea, 'id'>;

function ServiceAreas({ profile }: { profile: TutorProfile }) {
  const [areas, setAreas] = useState<AreaDraft[]>(profile.serviceAreas.map(({ id: _id, ...rest }) => rest));
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(8);
  const [name, setName] = useState('');
  const [areaName, setAreaName] = useState('');
  const save = useTutorMutation((list: AreaDraft[]) =>
    api.put('/tutors/me/service-areas', {
      serviceAreas: list.map((area) =>
        area.areaType === 'radius'
          ? { areaType: 'radius', areaName: area.areaName || undefined, centerLatitude: area.centerLatitude, centerLongitude: area.centerLongitude, radiusKm: area.radiusKm }
          : { areaType: 'area_name', areaName: area.areaName },
      ),
    }),
  );

  if (profile.teachingMode === 'online') {
    return (
      <Panel title="Wilayah layanan">
        <p className="text-body-sm text-ink-500">Kamu hanya mengajar online, jadi wilayah layanan tidak diperlukan. Ubah cara mengajar di halaman profil jika ingin menerima sesi tatap muka.</p>
      </Panel>
    );
  }

  async function persist(list: AreaDraft[]) {
    try {
      await save.mutateAsync(list);
      setAreas(list);
      toast.success('Wilayah layanan tersimpan.');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Panel title="Wilayah layanan tatap muka">
      <div id="wilayah" className="scroll-mt-24 space-y-5">
        <p className="text-body-sm text-ink-500">
          Pencarian berbasis lokasi memakai titik pusat + radius. Nama area (kecamatan/kota) membantu siswa mengenali wilayahmu.
        </p>
        {areas.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {areas.map((area, index) => (
              <li key={index} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="flex items-center gap-2 text-body-sm text-ink-900">
                  <MapPin className="size-4 text-primary-600" aria-hidden />
                  {area.areaName ?? 'Titik di peta'}
                  {area.areaType === 'radius' && <span className="text-ink-500">· radius {area.radiusKm} km</span>}
                </span>
                <Button variant="ghost" size="icon" onClick={() => persist(areas.filter((_, i) => i !== index))} aria-label={`Hapus wilayah ${area.areaName ?? ''}`}>
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="space-y-3 rounded-lg bg-surface-muted/60 p-4">
          <p className="text-body-sm font-semibold text-ink-900">Tambah wilayah berdasarkan titik & radius</p>
          <LocationPicker value={point} onChange={setPoint} radiusKm={radius} heightClass="h-64" />
          <div className="grid gap-3 sm:grid-cols-[1fr_9rem_auto] sm:items-end">
            <Field label="Nama wilayah" optional>
              {(props) => <Input {...props} value={name} onChange={(e) => setName(e.target.value)} placeholder="Jakarta Selatan" />}
            </Field>
            <div className="space-y-1.5">
              <Label htmlFor="radius" className="text-body-sm font-semibold text-ink-900">Radius</Label>
              <NativeSelect id="radius" value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
                {[2, 3, 5, 8, 10, 15, 20, 30].map((km) => <option key={km} value={km}>{km} km</option>)}
              </NativeSelect>
            </div>
            <Button
              disabled={!point || save.isPending}
              onClick={() => {
                persist([...areas, { areaType: 'radius', areaName: name.trim() || null, centerLatitude: point!.lat, centerLongitude: point!.lng, radiusKm: radius }]);
                setName('');
              }}
            >
              <Plus /> Tambah
            </Button>
          </div>
          {!point && <p className="text-body-sm text-ink-500">Tentukan titik pusat dulu lewat pencarian, tombol lokasi, atau klik peta.</p>}
        </div>
        <form
          className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            if (areaName.trim().length < 2) return;
            persist([...areas, { areaType: 'area_name', areaName: areaName.trim(), centerLatitude: null, centerLongitude: null, radiusKm: null }]);
            setAreaName('');
          }}
        >
          <Field label="Atau tambah nama area saja">
            {(props) => <Input {...props} value={areaName} onChange={(e) => setAreaName(e.target.value)} placeholder="Kebayoran Baru" />}
          </Field>
          <Button type="submit" variant="secondary" disabled={areaName.trim().length < 2}>
            <Plus /> Tambah area
          </Button>
        </form>
      </div>
    </Panel>
  );
}

export default function TutorSchedulePage() {
  const { data: profile, isPending, isError, error, refetch } = useMyTutorProfile();
  if (isPending) return <PageSkeleton />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;
  return (
    <div className="max-w-3xl">
      <PageHeader title="Jadwal & wilayah" description="Atur kapan dan di mana kamu bisa mengajar." />
      <div className="space-y-6">
        <AvailabilityEditor profile={profile} />
        <BlockedDates profile={profile} />
        <ServiceAreas profile={profile} />
      </div>
    </div>
  );
}
