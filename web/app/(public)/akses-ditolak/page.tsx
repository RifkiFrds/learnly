import { Lock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Akses ditolak' };

export default function AccessDeniedPage() {
  return (
    <div className="mx-auto flex max-w-content flex-col px-4 py-16 md:px-8">
      <Lock className="size-10 text-primary-600" aria-hidden />
      <p className="mt-6 text-label-sm text-ink-500 uppercase">Error 403</p>
      <h1 className="mt-2 max-w-xl text-display-md">Kamu tidak punya akses ke halaman ini.</h1>
      <p className="mt-3 max-w-xl text-body-lg text-ink-700">
        Halaman tersebut khusus untuk peran akun tertentu. Masuk dengan akun yang sesuai, atau kembali ke beranda.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/masuk">Masuk dengan akun lain</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/">Ke beranda</Link>
        </Button>
      </div>
    </div>
  );
}
