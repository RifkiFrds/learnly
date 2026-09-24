'use client';

import { Award, BadgeCheck, BookOpen, Briefcase, GraduationCap, MapPin, Video } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Avatar, Pagination, RatingStars } from '@/components/common/Bits';
import { EmptyState, ErrorState, ListSkeleton, PageSkeleton } from '@/components/common/States';
import { MapView } from '@/components/map';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTutor, useTutorReviews } from '@/hooks/api/catalog';
import { useAuth } from '@/lib/auth';
import { DAY_NAMES, formatDate, formatDuration, formatRupiah, formatTime, TEACHING_MODE_LABEL, wibDateString } from '@/lib/format';
import type { TutorProfile } from '@/lib/types';
import { ReviewCard } from './ReviewList';
import { SlotPicker } from './SlotPicker';

function AboutTab({ tutor }: { tutor: TutorProfile }) {
  const radiusAreas = tutor.serviceAreas.filter((area) => area.areaType === 'radius' && area.centerLatitude !== null);
  const facts = [
    tutor.educationBackground && { icon: GraduationCap, label: 'Pendidikan', value: tutor.educationBackground },
    tutor.teachingExperienceYears !== null && { icon: Briefcase, label: 'Pengalaman', value: `${tutor.teachingExperienceYears} tahun mengajar` },
    tutor.curriculum && { icon: BookOpen, label: 'Kurikulum', value: tutor.curriculum },
    { icon: Video, label: 'Cara mengajar', value: TEACHING_MODE_LABEL[tutor.teachingMode] },
  ].filter(Boolean) as { icon: typeof GraduationCap; label: string; value: string }[];

  return (
    <div className="space-y-8">
      {tutor.bio && (
        <section>
          <h2 className="font-sans text-heading-md">Tentang {tutor.fullName.split(' ')[0]}</h2>
          <p className="mt-2 text-body-lg whitespace-pre-line text-ink-700">{tutor.bio}</p>
        </section>
      )}
      <dl className="grid gap-4 sm:grid-cols-2">
        {facts.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex gap-3 rounded-lg border border-border bg-surface p-4">
            <Icon className="mt-0.5 size-5 shrink-0 text-primary-600" aria-hidden />
            <div>
              <dt className="text-body-sm text-ink-500">{label}</dt>
              <dd className="text-body-md font-semibold text-ink-900">{value}</dd>
            </div>
          </div>
        ))}
      </dl>
      <section>
        <h2 className="font-sans text-heading-md">Mata pelajaran & jenjang</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {tutor.subjects.map((subject) => (
            <li key={subject.id} className="rounded-full bg-primary-100 px-3 py-1 text-body-sm font-semibold text-primary-700">
              {subject.name}
            </li>
          ))}
          {tutor.educationLevels.map((level) => (
            <li key={level.id} className="rounded-full bg-surface-muted px-3 py-1 text-body-sm text-ink-700">
              {level.name}
            </li>
          ))}
        </ul>
      </section>
      {tutor.certifications.length > 0 && (
        <section>
          <h2 className="font-sans text-heading-md">Sertifikasi & dokumen terverifikasi</h2>
          <ul className="mt-3 space-y-2">
            {tutor.certifications.map((cert) => (
              <li key={cert.id} className="flex items-start gap-3 text-body-md text-ink-700">
                <Award className="mt-0.5 size-5 shrink-0 text-success-600" aria-hidden />
                <span>
                  <span className="font-semibold text-ink-900">{cert.title}</span>
                  {cert.issuer && ` — ${cert.issuer}`}
                  {cert.issuedAt && <span className="text-ink-500"> ({formatDate(cert.issuedAt, false)})</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {tutor.teachingMode !== 'online' && tutor.serviceAreas.length > 0 && (
        <section>
          <h2 className="font-sans text-heading-md">Wilayah layanan tatap muka</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {tutor.serviceAreas.map((area) => (
              <li key={area.id} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-body-sm text-ink-700">
                <MapPin className="size-4 text-primary-600" aria-hidden />
                {area.areaName ?? 'Area tanpa nama'}
                {area.areaType === 'radius' && area.radiusKm ? ` (±${area.radiusKm} km)` : ''}
              </li>
            ))}
          </ul>
          {radiusAreas.length > 0 && (
            <div className="mt-4 h-64 overflow-hidden rounded-lg border border-border">
              <MapView
                className="h-full w-full"
                center={{ lat: radiusAreas[0].centerLatitude!, lng: radiusAreas[0].centerLongitude! }}
                circles={radiusAreas.map((area) => ({
                  lat: area.centerLatitude!,
                  lng: area.centerLongitude!,
                  radiusKm: area.radiusKm ?? 1,
                  label: area.areaName ?? undefined,
                }))}
              />
            </div>
          )}
          <p className="mt-2 text-body-sm text-ink-500">Titik pusat wilayah dibulatkan untuk menjaga privasi tutor.</p>
        </section>
      )}
    </div>
  );
}

function ScheduleTab({ tutor }: { tutor: TutorProfile }) {
  const router = useRouter();
  const { user } = useAuth();
  const [date, setDate] = useState(wibDateString(1));
  const [duration, setDuration] = useState(90);
  const [startAt, setStartAt] = useState<string | null>(null);
  const byDay = DAY_NAMES.map((name, day) => ({ name, windows: tutor.availabilities.filter((row) => row.dayOfWeek === day) }));
  const canBook = !user || user.role === 'student' || user.role === 'parent';

  function book() {
    const params = new URLSearchParams({ tutor: String(tutor.id), mulai: startAt!, durasi: String(duration) });
    const target = `/booking/baru?${params.toString()}`;
    router.push(user ? target : `/masuk?next=${encodeURIComponent(target)}`);
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div>
        <h2 className="font-sans text-heading-md">Pilih jadwal sesi</h2>
        <p className="mt-1 mb-4 text-body-sm text-ink-500">Jam yang dicoret tidak cukup untuk durasi yang kamu pilih.</p>
        <SlotPicker
          tutorId={tutor.id}
          date={date}
          onDate={setDate}
          duration={duration}
          onDuration={setDuration}
          startAt={startAt}
          onStart={setStartAt}
        />
        <div className="mt-6 flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-body-sm text-ink-700">
            {startAt ? (
              <>
                <span className="font-semibold text-ink-900">{formatDate(startAt)}, {formatTime(startAt)} WIB</span> · {formatDuration(duration)} ·{' '}
                {formatRupiah((tutor.hourlyRate * duration) / 60)} + biaya layanan
              </>
            ) : (
              'Pilih jam mulai untuk melanjutkan.'
            )}
          </p>
          <Button onClick={book} disabled={!startAt || !canBook}>
            {canBook ? 'Lanjut pesan' : 'Hanya untuk siswa/orang tua'}
          </Button>
        </div>
      </div>
      <aside>
        <h2 className="font-sans text-body-md font-semibold text-ink-900">Jadwal mingguan</h2>
        <dl className="mt-3 divide-y divide-border rounded-lg border border-border bg-surface">
          {byDay.map(({ name, windows }) => (
            <div key={name} className="flex justify-between gap-3 px-4 py-2.5 text-body-sm">
              <dt className="text-ink-700">{name}</dt>
              <dd className="text-right font-mono text-ink-900">
                {windows.length ? windows.map((w) => `${w.startTime}–${w.endTime}`).join(', ') : <span className="font-sans text-ink-300">Libur</span>}
              </dd>
            </div>
          ))}
        </dl>
      </aside>
    </div>
  );
}

function ReviewsTab({ tutor }: { tutor: TutorProfile }) {
  const [page, setPage] = useState(1);
  const reviews = useTutorReviews(tutor.id, page);
  return (
    <div className="max-w-3xl">
      <div className="mb-5 flex items-center gap-3">
        <span className="font-display text-display-md text-ink-900">{tutor.avgRating.toFixed(1)}</span>
        <RatingStars rating={tutor.avgRating} count={tutor.reviewCount} size="md" />
      </div>
      {reviews.isPending ? (
        <ListSkeleton />
      ) : reviews.isError ? (
        <ErrorState error={reviews.error} onRetry={() => reviews.refetch()} />
      ) : reviews.data.items.length === 0 ? (
        <EmptyState illustration="people" title="Belum ada ulasan." description="Ulasan muncul setelah siswa menyelesaikan sesi bersama tutor ini." />
      ) : (
        <div className="space-y-3">
          {reviews.data.items.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
          <Pagination meta={reviews.data.meta} onPage={setPage} />
        </div>
      )}
    </div>
  );
}

export function TutorProfileView({ id }: { id: string }) {
  const { data: tutor, isPending, isError, error, refetch } = useTutor(id);
  const [tab, setTab] = useState('tentang');

  if (isPending) return <div className="mx-auto max-w-content px-4 py-8 md:px-8"><PageSkeleton /></div>;
  if (isError) return <div className="mx-auto max-w-content px-4 py-8 md:px-8"><ErrorState error={error} onRetry={() => refetch()} title="Profil tutor tidak bisa dibuka" /></div>;

  return (
    <div className="mx-auto max-w-content px-4 py-8 md:px-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar name={tutor.fullName} size="lg" />
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-display-md">
              {tutor.fullName}
              <span className="inline-flex items-center gap-1 rounded-full bg-success-100 px-2.5 py-1 font-sans text-label-sm text-success-600">
                <BadgeCheck className="size-3.5" aria-hidden /> Terverifikasi
              </span>
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-ink-500">
              <RatingStars rating={tutor.avgRating} count={tutor.reviewCount} />
              <span>{TEACHING_MODE_LABEL[tutor.teachingMode]}</span>
              <span>Bergabung {formatDate(tutor.memberSince, false)}</span>
            </div>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {tutor.subjects.map((subject) => (
                <li key={subject.id} className="rounded-full bg-surface-muted px-2.5 py-1 text-body-sm text-ink-700">{subject.name}</li>
              ))}
            </ul>
          </div>
        </header>
        {/* §8: tarif menonjol kanan-atas, sticky di desktop */}
        <aside className="lg:row-span-2">
          <div className="rounded-lg border border-border bg-surface p-5 shadow-sm lg:sticky lg:top-24">
            <p className="text-body-sm text-ink-500">Tarif per jam</p>
            <p className="font-display text-display-md text-ink-900">{formatRupiah(tutor.hourlyRate)}</p>
            <p className="mt-1 text-body-sm text-ink-500">Belum termasuk biaya layanan platform.</p>
            <Button className="mt-4 w-full" onClick={() => { setTab('jadwal'); document.getElementById('tab-area')?.scrollIntoView({ behavior: 'smooth' }); }}>
              Lihat jadwal & pesan
            </Button>
            {tutor.recentReviews?.[0] && (
              <p className="mt-4 border-t border-border pt-4 text-body-sm text-ink-700">
                “{tutor.recentReviews[0].comment ?? 'Sesi yang menyenangkan.'}”
                <span className="mt-1 block text-ink-500">— {tutor.recentReviews[0].reviewerName}</span>
              </p>
            )}
          </div>
        </aside>
        <div id="tab-area" className="min-w-0 scroll-mt-24">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-6 w-full justify-start overflow-x-auto">
              <TabsTrigger value="tentang">Tentang</TabsTrigger>
              <TabsTrigger value="jadwal">Jadwal & booking</TabsTrigger>
              <TabsTrigger value="ulasan">Ulasan ({tutor.reviewCount})</TabsTrigger>
            </TabsList>
            <TabsContent value="tentang"><AboutTab tutor={tutor} /></TabsContent>
            <TabsContent value="jadwal"><ScheduleTab tutor={tutor} /></TabsContent>
            <TabsContent value="ulasan"><ReviewsTab tutor={tutor} /></TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
