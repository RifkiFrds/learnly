'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { AdminTutor, Booking, DisputeList, Payment } from '@/lib/types';

// ---------- verifikasi tutor (FR-ADMIN-01) ----------

export function useAdminTutors(params: { status: string; page?: number }) {
  return useQuery({ queryKey: ['admin-tutors', params], queryFn: () => api.list<AdminTutor>('/admin/tutors', { ...params, limit: 10 }) });
}

export function useVerifyTutor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; status: 'verified' | 'rejected'; notes?: string }) =>
      api.patch(`/admin/tutors/${id}/verify`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tutors'] });
      queryClient.invalidateQueries({ queryKey: ['admin-summary'] });
    },
  });
}

// ---------- verifikasi pembayaran (FR-PAY-03/04, FR-PAY-06) ----------

export function useAdminPayments(params: { status: string; payableType?: string; page?: number }) {
  return useQuery({
    queryKey: ['admin-payments', params],
    queryFn: () => api.list<Payment>('/admin/payments', { ...params, limit: 10 }),
    // antrian bisa bertambah kapan saja — segarkan berkala tanpa WebSocket
    refetchInterval: params.status === 'menunggu_verifikasi' ? 30_000 : false,
  });
}

function useInvalidatePayments() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
    queryClient.invalidateQueries({ queryKey: ['admin-disputes'] });
    queryClient.invalidateQueries({ queryKey: ['admin-summary'] });
  };
}

export function useVerifyPayment() {
  const invalidate = useInvalidatePayments();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; action: 'approve' | 'reject'; rejectionReason?: string }) =>
      api.patch<Payment>(`/admin/payments/${id}/verify`, body),
    onSuccess: invalidate,
  });
}

export function useRefundPayment() {
  const invalidate = useInvalidatePayments();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; note: string; refundAmount?: number }) =>
      api.patch<Payment>(`/admin/payments/${id}/refund`, body),
    onSuccess: invalidate,
  });
}

// ---------- dispute (FR-ADMIN-06) ----------

export function useDisputes() {
  return useQuery({ queryKey: ['admin-disputes'], queryFn: () => api.get<DisputeList>('/admin/disputes') });
}

export function useOverrideBookingStatus() {
  const invalidate = useInvalidatePayments();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; status: string; reason: string }) =>
      api.patch<Booking>(`/admin/bookings/${id}/status`, body),
    onSuccess: invalidate,
  });
}
