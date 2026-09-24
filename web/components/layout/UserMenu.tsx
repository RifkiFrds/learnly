'use client';

import { ChevronDown, LayoutDashboard, LogOut, UserRound } from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '@/components/common/Bits';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { homeFor, useAuth } from '@/lib/auth';
import { ROLE_LABEL } from '@/lib/status';

export function UserMenu({ showDashboard = false }: { showDashboard?: boolean }) {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex min-h-11 items-center gap-2 rounded-lg px-1.5 text-left hover:bg-surface-muted"
        aria-label={`Menu akun ${user.fullName}`}
      >
        <Avatar name={user.fullName} size="sm" />
        <span className="hidden max-w-36 truncate text-body-sm font-semibold text-ink-900 md:inline">{user.fullName}</span>
        <ChevronDown className="hidden size-4 text-ink-500 md:inline" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-body-sm font-semibold text-ink-900">{user.fullName}</span>
          <span className="block truncate text-body-sm text-ink-500">
            {ROLE_LABEL[user.role]} · {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {showDashboard && (
          <DropdownMenuItem asChild className="min-h-11 cursor-pointer">
            <Link href={homeFor(user.role)}>
              <LayoutDashboard aria-hidden /> Dasbor
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild className="min-h-11 cursor-pointer">
          <Link href="/akun">
            <UserRound aria-hidden /> Pengaturan akun
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="min-h-11 cursor-pointer" onSelect={() => logout()}>
          <LogOut aria-hidden /> Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
