'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/hooks/api/notifications';
import { useAuth } from '@/lib/auth';
import { formatRelative } from '@/lib/format';
import { notificationHref } from '@/lib/navigation';

export function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const { data } = useNotifications({ limit: 6 });
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const unread = data?.meta.unreadCount ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unread ? `Notifikasi, ${unread} belum dibaca` : 'Notifikasi'}
        >
          <Bell />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 flex min-w-4.5 items-center justify-center rounded-full bg-primary-600 px-1 text-[0.6875rem] leading-4.5 font-semibold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <DropdownMenuLabel className="p-0 font-sans text-body-md font-semibold text-ink-900">Notifikasi</DropdownMenuLabel>
          {unread > 0 && (
            <button
              type="button"
              className="rounded-sm text-body-sm font-semibold text-primary-700 hover:underline"
              onClick={() => markAll.mutate()}
            >
              Tandai semua dibaca
            </button>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        {!data?.items.length ? (
          <p className="px-4 py-6 text-center text-body-sm text-ink-500">Belum ada notifikasi.</p>
        ) : (
          data.items.map((item) => (
            <DropdownMenuItem
              key={item.id}
              className="flex cursor-pointer flex-col items-start gap-0.5 rounded-none px-4 py-3 focus:bg-surface-muted"
              onSelect={() => {
                if (!item.readAt) markRead.mutate(item.id);
                const href = user ? notificationHref(user.role, item.type, item.data) : null;
                if (href) router.push(href);
              }}
            >
              <span className={cn('flex w-full items-start gap-2 text-body-sm', item.readAt ? 'text-ink-700' : 'font-semibold text-ink-900')}>
                {!item.readAt && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary-600" aria-label="Belum dibaca" />}
                {item.title}
              </span>
              {item.body && <span className="line-clamp-2 text-body-sm text-ink-500">{item.body}</span>}
              <span className="text-label-sm font-normal tracking-normal text-ink-500">{formatRelative(item.createdAt)}</span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator className="m-0" />
        <Link href="/notifikasi" className="block px-4 py-3 text-center text-body-sm font-semibold text-primary-700 hover:bg-surface-muted">
          Lihat semua notifikasi
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
