import { BookOpen, MapPin, ShieldCheck, Video } from 'lucide-react';
import { HeroSearch } from '@/components/landing/HeroSearch';
import { FeaturedTutors, PopularCourses, SubjectGrid } from '@/components/landing/LandingSections';

const LEARNING_MODES = [
  {
    icon: BookOpen,
    title: 'Kursus online',
    description: 'Video, modul, dan kuis yang bisa kamu pelajari kapan saja. Selesaikan untuk dapat sertifikat.',
  },
  {
    icon: Video,
    title: 'Tutor online',
    description: 'Sesi terjadwal lewat video call bersama tutor pilihanmu, tanpa terbatas jarak.',
  },
  {
    icon: MapPin,
    title: 'Tutor datang ke rumah',
    description: 'Pilih tutor di sekitarmu dan pantau statusnya, dari berangkat sampai tiba di lokasi.',
  },
];

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

        <aside className="lg:col-span-5 lg:pt-10" aria-labelledby="modes-title">
          <div className="rounded-lg border border-border bg-surface">
            <h2 id="modes-title" className="border-b border-border px-6 py-4 font-sans text-heading-md">
              Tiga cara belajar di Learnly
            </h2>
            <ul className="divide-y divide-border">
              {LEARNING_MODES.map(({ icon: Icon, title, description }) => (
                <li key={title} className="flex gap-4 px-6 py-5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-sans text-body-md font-semibold">{title}</h3>
                    <p className="mt-1 text-body-sm text-ink-500">{description}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="flex items-start gap-2 rounded-b-lg bg-surface-muted px-6 py-4 text-body-sm text-ink-700">
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
