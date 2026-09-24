import { Lock } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/common/Bits';
import { Button } from '@/components/ui/button';
import { homeFor } from '@/lib/auth';
import { ROLE_LABEL } from '@/lib/status';
import type { Role } from '@/lib/types';

/** Halaman 403 — akses ditolak karena role tidak sesuai */
export function Forbidden({ role }: { role?: Role }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-content items-center px-4 md:px-8">
          <Logo />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-content flex-1 flex-col justify-center px-4 py-16 md:px-8">
        <Lock className="size-10 text-primary-600" aria-hidden />
        <p className="mt-6 text-label-sm text-ink-500 uppercase">Error 403</p>
        <h1 className="mt-2 max-w-xl text-display-md">Halaman ini bukan untuk akunmu.</h1>
        <p className="mt-3 max-w-xl text-body-lg text-ink-700">
          {role
            ? `Kamu masuk sebagai ${ROLE_LABEL[role].toLowerCase()}, sedangkan halaman ini khusus peran lain. Kembali ke dasbormu untuk melanjutkan.`
            : 'Kamu tidak punya akses ke halaman ini.'}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link href={role ? homeFor(role) : '/'}>Kembali ke dasbor</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">Ke beranda Learnly</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
