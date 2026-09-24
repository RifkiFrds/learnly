'use client';

import { CheckCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { toast } from 'sonner';
import { cn } from 'cn';
import { Pagination } from '@/components/common/Bits';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/States';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/hooks/api/notifications';
import { useQueryParams } from '@/hooks/useQueryParams';
import { useAuth } from '@/lib/auth';
import { formatDateTime, formatRelative } from '@/lib/format';
import { notificationHref } from '@/lib/navigation';

function NotificationsContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { values, update, page } = useQueryParams(['filter'] as const);
  const unreadOnly = values.filter === 'belum-dibaca';
  const query = useNotifications({ unread: unreadOnly, page, limit: 20 });
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const unread = query.data?.meta.unreadCount ?? 0;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Notifikasi"
        description="Kabar terbaru soal booking, pembayaran, kursus, dan ulasan. Diperbarui otomatis."
        actions={
          unread > 0 && (
            <Button
              variant="secondary"
              disabled={markAll.isPending}
              onClick={() => markAll.mutate(undefined, { onSuccess: (result) => toast.success(`${result.updatedCount} notifikasi ditandai dibaca.`) })}
            >
              <CheckCheck /> Tandai semua dibaca
            </Button>
          )
        }
      />
      <Tabs value={unreadOnly ? 'belum-dibaca' : 'semua'} onValueChange={(value) => update({ filter: value === 'semua' ? undefined : value })} className="mb-5">
        <TabsList>
          <TabsTrigger value="semua">Semua</TabsTrigger>
          <TabsTrigger value="belum-dibaca">Belum dibaca{unread ? ` (${unread})` : ''}</TabsTrigger>
        </TabsList>
      </Tabs>
      {query.isPending ? (
        <ListSkeleton count={5} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <EmptyState illustration="bell" title={unreadOnly ? 'Semua notifikasi sudah dibaca.' : 'Belum ada notifikasi.'} description="Notifikasi muncul saat ada perubahan status booking, pembayaran, atau kursus." />
      ) : (
        <>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {query.data.items.map((item) => {
              const href = user ? notificationHref(user.role, item.type, item.data) : null;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={cn('flex w-full cursor-pointer items-start gap-3 px-4 py-4 text-left hover:bg-surface-muted/60 sm:px-5', !item.readAt && 'bg-primary-100/30')}
                    onClick={() => {
                      if (!item.readAt) markRead.mutate(item.id);
                      if (href) router.push(href);
                    }}
                  >
                    <span className={cn('mt-2 size-2 shrink-0 rounded-full', item.readAt ? 'bg-transparent' : 'bg-primary-600')} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-body-md', item.readAt ? 'text-ink-700' : 'font-semibold text-ink-900')}>
                        {item.title}
                        {!item.readAt && <span className="sr-only"> (belum dibaca)</span>}
                      </span>
                      {item.body && <span className="mt-0.5 block text-body-sm text-ink-700">{item.body}</span>}
                      <span className="mt-1 block text-body-sm text-ink-500" title={formatDateTime(item.createdAt)}>{formatRelative(item.createdAt)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <Pagination meta={query.data.meta} onPage={(next) => update({ page: String(next) }, false)} />
        </>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <NotificationsContent />
    </Suspense>
  );
}
