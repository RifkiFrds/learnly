'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Notification } from '@/lib/types';

// Notifikasi dibaca dengan polling (docs/06-api-spec.md §13): 20 detik selama aplikasi terbuka.
export function useNotifications(options: { unread?: boolean; page?: number; limit?: number; poll?: boolean } = {}) {
  const { unread, page = 1, limit = 20, poll = true } = options;
  return useQuery({
    queryKey: ['notifications', { unread: Boolean(unread), page, limit }],
    queryFn: () => api.list<Notification>('/notifications', { unread: unread ? 'true' : undefined, page, limit }),
    refetchInterval: poll ? 20_000 : false,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch<{ updatedCount: number }>('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
