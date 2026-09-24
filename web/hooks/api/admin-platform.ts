'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { AdminReview, AdminUser, DashboardSummary, MasterItem, PlatformSettings } from '@/lib/types';

// ---------- dasbor KPI (FR-ADMIN-05) ----------

export function useDashboardSummary(range: { from?: string; to?: string }) {
  return useQuery({ queryKey: ['admin-summary', range], queryFn: () => api.get<DashboardSummary>('/admin/dashboard/summary', range) });
}

// ---------- master data (FR-ADMIN-03) ----------

export type MasterKind = 'subjects' | 'education-levels' | 'categories';

export function useMasterData(kind: MasterKind) {
  return useQuery({ queryKey: ['admin-master', kind], queryFn: () => api.get<MasterItem[]>(`/admin/${kind}`) });
}

export function useSaveMasterData(kind: MasterKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id?: number; name: string; slug?: string }) =>
      id ? api.patch<MasterItem>(`/admin/${kind}/${id}`, body) : api.post<MasterItem>(`/admin/${kind}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-master', kind] });
      queryClient.invalidateQueries({ queryKey: ['master', kind] });
    },
  });
}

export function useDeleteMasterData(kind: MasterKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/${kind}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-master', kind] });
      queryClient.invalidateQueries({ queryKey: ['master', kind] });
    },
  });
}

// ---------- pengguna (suspend/reaktivasi) ----------

export function useAdminUsers(params: { role?: string; status?: string; q?: string; page?: number }) {
  return useQuery({
    queryKey: ['admin-users', params],
    queryFn: () => api.list<AdminUser>('/admin/users', { ...params, limit: 20 }),
    placeholderData: keepPreviousData,
  });
}

export function useSuspendUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; status: 'suspended' | 'active'; reason?: string }) => api.patch(`/admin/users/${id}/suspend`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

// ---------- moderasi ulasan (FR-REVIEW-05) ----------

export function useAdminReviews(params: { reviewableType?: string; hidden?: string; page?: number }) {
  return useQuery({
    queryKey: ['admin-reviews', params],
    queryFn: () => api.list<AdminReview>('/admin/reviews', { ...params, limit: 20 }),
    placeholderData: keepPreviousData,
  });
}

export function useReviewVisibility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; isHidden: boolean; reason?: string }) => api.patch(`/admin/reviews/${id}/visibility`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['tutor'] });
      queryClient.invalidateQueries({ queryKey: ['course'] });
    },
  });
}

// ---------- pengaturan platform ----------

export function useAdminSettings() {
  return useQuery({ queryKey: ['admin-settings'], queryFn: () => api.get<PlatformSettings>('/admin/settings') });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<PlatformSettings>) => api.patch<PlatformSettings>('/admin/settings', patch),
    onSuccess: (settings) => {
      queryClient.setQueryData(['admin-settings'], settings);
      queryClient.invalidateQueries({ queryKey: ['settings-public'] });
    },
  });
}

export function useUploadQris() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.upload<PlatformSettings>('/admin/settings/qris-image', form);
    },
    onSuccess: (settings) => queryClient.setQueryData(['admin-settings'], settings),
  });
}
