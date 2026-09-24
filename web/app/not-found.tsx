import { Compass } from 'lucide-react';
import Link from 'next/link';
import { SiteFooter, SiteHeader } from '@/components/layout/SiteHeader';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="konten" tabIndex={-1} className="outline-none mx-auto flex w-full max-w-content flex-1 flex-col justify-center px-4 py-16 md:px-8">
        <Compass className="size-10 text-primary-600" aria-hidden />
        <p className="mt-6 text-label-sm text-ink-500 uppercase">Error 404</p>
        <h1 className="mt-2 max-w-xl text-display-md">Halaman yang kamu cari tidak ada.</h1>
        <p className="mt-3 max-w-xl text-body-lg text-ink-700">
          Mungkin tautannya sudah berubah atau salah ketik. Coba mulai lagi dari pencarian tutor atau katalog kursus.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/tutor">Cari tutor</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">Ke beranda</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
