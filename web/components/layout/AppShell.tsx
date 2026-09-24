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
import { navFor, type NavItem } from '@/lib/navigation';
import { ROLE_LABEL } from '@/lib/status';
import { NotificationBell } from './NotificationBell';
import { UserMenu } from './UserMenu';

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-lg px-3 text-body-sm font-semibold transition-colors',
                active ? 'bg-primary-100 text-primary-700' : 'text-ink-700 hover:bg-surface-muted hover:text-ink-900',
              )}
            >
              <Icon className="size-4.5 shrink-0" aria-hidden />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** §8 dashboard: sidebar navigasi tetap di lg+, drawer di mobile/tablet */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  const items = navFor(user.role);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#konten" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:shadow-md">
        Lewati ke konten
      </a>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-3 px-4 md:px-8">
          <div className="flex items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Buka navigasi">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-background">
                <SheetHeader>
                  <SheetTitle className="text-left">
                    <Logo href={homeFor(user.role)} />
                  </SheetTitle>
                </SheetHeader>
                <nav className="px-3" aria-label="Navigasi dasbor">
                  <NavLinks items={items} onNavigate={() => setOpen(false)} />
                </nav>
              </SheetContent>
            </Sheet>
            <Logo href={homeFor(user.role)} />
            <span className="hidden rounded-full bg-surface-muted px-2.5 py-1 text-label-sm text-ink-500 uppercase sm:inline">
              {ROLE_LABEL[user.role]}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {user.role !== 'admin' && user.role !== 'tutor' && (
              <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
                <Link href="/kursus">Katalog kursus</Link>
              </Button>
            )}
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-content flex-1 gap-8 px-4 md:px-8">
        <aside className="hidden w-60 shrink-0 py-8 lg:block">
          <nav className="sticky top-24" aria-label="Navigasi dasbor">
            <NavLinks items={items} />
          </nav>
        </aside>
        <main id="konten" tabIndex={-1} className="outline-none min-w-0 flex-1 py-6 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
