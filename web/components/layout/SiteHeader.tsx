'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from 'cn';
import { Logo } from '@/components/common/Bits';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { homeFor, useAuth } from '@/lib/auth';
import { PUBLIC_NAV } from '@/lib/navigation';
import { NotificationBell } from './NotificationBell';
import { UserMenu } from './UserMenu';

/** Header halaman publik (landing, pencarian, katalog, detail) */
export function SiteHeader() {
  const { status, user } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <>
      {PUBLIC_NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setOpen(false)}
          aria-current={pathname.startsWith(item.href) ? 'page' : undefined}
          className={cn(
            'flex min-h-11 items-center rounded-lg px-3 text-body-sm font-semibold transition-colors hover:bg-surface-muted',
            pathname.startsWith(item.href) ? 'text-ink-900' : 'text-ink-700',
          )}
        >
          {item.label}
        </Link>
      ))}
      {status !== 'authenticated' && (
        <Link
          href="/daftar?peran=tutor"
          onClick={() => setOpen(false)}
          className="flex min-h-11 items-center rounded-lg px-3 text-body-sm font-semibold text-ink-700 hover:bg-surface-muted"
        >
          Jadi tutor
        </Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-4 px-4 md:px-8">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Navigasi utama">
            {nav}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {status === 'authenticated' && user ? (
            <>
              <Button asChild variant="secondary" size="sm" className="hidden sm:inline-flex">
                <Link href={homeFor(user.role)}>Dasbor</Link>
              </Button>
              <NotificationBell />
              <UserMenu showDashboard />
            </>
          ) : status === 'guest' ? (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/masuk">Masuk</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/daftar">Daftar</Link>
              </Button>
            </>
          ) : (
            <span className="h-9 w-24" aria-hidden />
          )}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Buka menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-background">
              <SheetHeader>
                <SheetTitle className="font-display text-heading-lg">Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4" aria-label="Navigasi utama">
                {nav}
                {status === 'guest' && (
                  <Link href="/masuk" onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-lg px-3 text-body-sm font-semibold text-ink-700 hover:bg-surface-muted">
                    Masuk
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-content gap-6 px-4 py-10 text-body-sm text-ink-500 sm:grid-cols-3 md:px-8">
        <div>
          <Logo />
          <p className="mt-2 font-display italic">Learn Your Way, Grow Your Future.</p>
        </div>
        <nav aria-label="Tautan footer" className="flex flex-col gap-2">
          <Link href="/tutor" className="hover:text-ink-900">Cari tutor</Link>
          <Link href="/kursus" className="hover:text-ink-900">Kursus online</Link>
          <Link href="/daftar?peran=tutor" className="hover:text-ink-900">Mengajar di Learnly</Link>
        </nav>
        <p className="sm:text-right">© {new Date().getFullYear()} Learnly. Pembayaran diverifikasi manual oleh tim kami.</p>
      </div>
    </footer>
  );
}
