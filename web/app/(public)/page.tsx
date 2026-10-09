import { ShieldCheck } from 'lucide-react';
import { HeroSearch } from '@/components/landing/HeroSearch';
import { FeaturedTutors, PopularCourses, SubjectGrid } from '@/components/landing/LandingSections';

const STEPS = [
  ['Cari & bandingkan', 'Lihat profil, tarif, jadwal kosong, dan ulasan sebelum memesan.'],
  ['Pesan & bayar', 'Tutor mengonfirmasi, lalu kamu bayar lewat QRIS/transfer. Tim kami memverifikasi buktinya.'],
  ['Belajar & pantau', 'Ikuti status tutor, mulai sesi dengan QR, lalu baca laporan perkembangan setelahnya.'],
];

export default function HomePage() {
  return (
    <>
      <section className="mx-auto grid max-w-content gap-12 px-4 py-12 md:px-8 md:py-16 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <p className="mb-4 text-label-sm text-primary-700 uppercase">Kursus · Tutor online · Tutor tatap muka</p>
          <h1 className="max-w-2xl text-display-md md:text-display-lg">
            Belajar dengan <em className="text-primary-600">caramu</em>, bersama tutor yang tepat.
          </h1>
          <p className="mt-5 max-w-xl text-body-lg text-ink-700">
            Ikuti kursus sesuai ritmemu, jadwalkan sesi daring, atau undang tutor ke rumah. Profil, tarif, dan ulasan
            tutor terlihat jelas sebelum kamu memesan.
          </p>
          <div className="mt-8 max-w-3xl">
            <HeroSearch />
          </div>
        </div>

        <aside className="lg:col-span-5 lg:pt-10">
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element -- pola existing: img native, lihat Bits.tsx Avatar */}
            <img
              src="/hero-learnly.jpg"
              alt="Tutor dan siswa Learnly berdiskusi sambil memantau progres kursus dan jadwal sesi"
              className="aspect-[4/5] w-full object-cover sm:aspect-[4/3]"
            />
            <p className="flex items-start gap-2 bg-surface-muted px-6 py-4 text-body-sm text-ink-700">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success-600" aria-hidden />
              Tutor baru tampil di pencarian setelah dokumennya diverifikasi tim Learnly.
            </p>
          </div>
        </aside>
      </section>

      <SubjectGrid />
      <FeaturedTutors />
      <PopularCourses />

      <section className="mx-auto max-w-content px-4 pt-4 pb-16 md:px-8" aria-labelledby="cara-title">
        <h2 id="cara-title" className="text-heading-lg md:text-display-md">Cara kerjanya</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {STEPS.map(([title, description], index) => (
            <li key={title} className="rounded-lg border border-border bg-surface p-5">
              <span className="font-mono text-body-sm text-primary-700">0{index + 1}</span>
              <h3 className="mt-2 font-sans text-heading-md">{title}</h3>
              <p className="mt-1 text-body-sm text-ink-500">{description}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
