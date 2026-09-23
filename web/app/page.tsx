import Link from 'next/link';
import { BookOpen, MapPin, ShieldCheck, Video } from 'lucide-react';
import { ApiStatusBadge } from '@/components/ApiStatusBadge';
import { HeroSearch } from '@/components/HeroSearch';

const LEARNING_MODES = [
  {
    icon: BookOpen,
    title: 'Kursus online',
    description:
      'Video, modul, dan kuis yang bisa kamu pelajari kapan saja. Selesaikan untuk dapat sertifikat.',
  },
  {
    icon: Video,
    title: 'Tutor online',
    description: 'Sesi terjadwal lewat video call bersama tutor pilihanmu, tanpa terbatas jarak.',
  },
  {
    icon: MapPin,
    title: 'Tutor datang ke rumah',
    description:
      'Pilih tutor di sekitarmu dan pantau statusnya, dari berangkat sampai tiba di lokasi.',
  },
];

export default function HomePage() {
  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-content items-center justify-between px-4 md:px-8">
          <Link
            href="/"
            className="rounded-sm font-display text-heading-lg text-ink-900 outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
          >
            Learnly<span className="text-primary-600">.</span>
          </Link>
          <ApiStatusBadge />
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-content gap-12 px-4 py-12 md:px-8 md:py-20 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <p className="mb-4 text-label-sm text-primary-700 uppercase">
              Kursus · Tutor online · Tutor tatap muka
            </p>
            <h1 className="max-w-2xl text-display-md md:text-display-lg">
              Belajar dengan <em className="text-primary-600">caramu</em>, bersama tutor yang tepat.
            </h1>
            <p className="mt-5 max-w-xl text-body-lg text-ink-700">
              Ikuti kursus sesuai ritmemu, jadwalkan sesi daring, atau undang tutor ke rumah.
              Profil, tarif, dan ulasan tutor terlihat jelas sebelum kamu memesan.
            </p>
            <div className="mt-8 max-w-2xl">
              <HeroSearch />
            </div>
          </div>

          <aside className="lg:col-span-5 lg:pt-10" aria-labelledby="modes-title">
            <div className="rounded-lg border border-border bg-surface">
              <h2
                id="modes-title"
                className="border-b border-border px-6 py-4 font-sans text-heading-md"
              >
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
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-content flex-col gap-1 px-4 py-6 text-body-sm text-ink-500 sm:flex-row sm:justify-between md:px-8">
          <span>© {new Date().getFullYear()} Learnly</span>
          <span className="font-display italic">Learn Your Way, Grow Your Future.</span>
        </div>
      </footer>
    </>
  );
}
