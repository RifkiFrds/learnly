'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Booking, BookingPaymentInfo, Payment, ProgressReport, PublicSettings } from '@/lib/types';

/** Polling berhenti sendiri begitu backend bilang status final (docs/06 §10). */
const POLL_MS = 5000;

export function usePublicSettings() {
  return useQuery({
    queryKey: ['settings-public'],
    queryFn: () => api.get<PublicSettings>('/settings/public', undefined, false),
    staleTime: 5 * 60_000,
  });
}

// ---------- booking ----------

export interface BookingListParams {
  status?: string;
  mode?: string;
  learnerId?: string | number;
  page?: number;
  limit?: number;
}

export function useBookings(params: BookingListParams, options: { poll?: boolean } = {}) {
  return useQuery({
    queryKey: ['bookings', params],
    queryFn: () => api.list<Booking>('/bookings', { ...params }),
    refetchInterval: options.poll ? 30_000 : false,
  });
}

export function useBooking(id: number | string) {
  return useQuery({
    queryKey: ['booking', String(id)],
    queryFn: () => api.get<Booking>(`/bookings/${id}`),
    refetchInterval: (query) => (query.state.data?.polling.shouldPoll ? POLL_MS : false),
  });
}

/** Setelah aksi apa pun pada booking: tulis detail terbaru ke cache & segarkan daftar. */
function useBookingAction<TInput>(request: (input: TInput) => Promise<Booking>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: (booking) => {
      queryClient.setQueryData(['booking', String(booking.id)], booking);
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['earnings'] });
    },
  });
}

export interface CreateBookingInput {
  learnerId?: number;
  tutorProfileId: number;
  subjectId: number;
  mode: 'online' | 'tatap_muka';
  scheduledStartAt: string;
  durationMinutes: number;
  addressId?: number;
}

export function useCreateBooking() {
  return useBookingAction((input: CreateBookingInput) => api.post<Booking>('/bookings', input));
}

export function useRespondBooking(id: number) {
  return useBookingAction((input: { action: 'accept' | 'reject'; reason?: string }) =>
    api.patch<Booking>(`/bookings/${id}/respond`, input),
  );
}

export function useTravelStatus(id: number) {
  return useBookingAction((status: 'tutor_bersiap' | 'tutor_dalam_perjalanan' | 'tutor_tiba') =>
    api.patch<Booking>(`/bookings/${id}/status`, { status }),
  );
}

export function useLocationPing(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (point: { latitude: number; longitude: number }) => api.post(`/bookings/${id}/location-ping`, point),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['booking', String(id)] }),
  });
}

export function useCheckin(id: number) {
  return useBookingAction((qrToken?: string) => api.post<Booking>(`/bookings/${id}/checkin`, qrToken ? { qrToken } : {}));
}

export interface CheckoutInput {
  materialsCovered: string;
  understandingLevel: number;
  masteredSkills?: string;
  areasToImprove?: string;
  homeworkGiven?: string;
  recommendationNotes?: string;
}

export function useCheckout(id: number) {
  return useBookingAction((input: CheckoutInput) =>
    api.post<{ booking: Booking; progressReport: ProgressReport }>(`/bookings/${id}/checkout-session`, input).then((result) => result.booking),
  );
}

export function useCancelBooking(id: number) {
  return useBookingAction((reason: string) => api.post<Booking>(`/bookings/${id}/cancel`, { reason }));
}

export function useMeetingLink(id: number) {
  return useBookingAction((meetingLink: string) => api.patch<Booking>(`/bookings/${id}/meeting-link`, { meetingLink }));
}

export interface QrToken {
  bookingId: number;
  qrToken: string;
  expiresAt: string;
  qrPayload: string;
}

export function useQrToken(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ['qr-token', id],
    queryFn: () => api.get<QrToken>(`/bookings/${id}/qr-token`),
    enabled,
    staleTime: 0,
  });
}

export function useBookingPaymentInfo(id: number | string, enabled = true) {
  return useQuery({
    queryKey: ['booking-payment-info', String(id)],
    queryFn: () => api.get<BookingPaymentInfo>(`/bookings/${id}/payment-info`),
    enabled,
  });
}

// ---------- pembayaran ----------

export function usePayments(params: { status?: string; payableType?: string; page?: number; limit?: number }) {
  return useQuery({ queryKey: ['payments', params], queryFn: () => api.list<Payment>('/payments', { ...params }) });
}

export function usePayment(id: number | string) {
  return useQuery({
    queryKey: ['payment', String(id)],
    queryFn: () => api.get<Payment>(`/payments/${id}`),
    refetchInterval: (query) => (query.state.data?.polling.shouldPoll ? POLL_MS : false),
  });
}

export function useUploadProof(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.upload<Payment>(`/payments/${id}/proof`, form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment', String(id)] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['booking'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
  });
}

// ---------- laporan perkembangan ----------

export function useReports(params: { learnerId?: string; subjectId?: string; page?: number; limit?: number }) {
  return useQuery({ queryKey: ['reports', params], queryFn: () => api.list<ProgressReport>('/reports', { ...params }) });
}

export function useReport(bookingId: number | string, enabled = true) {
  return useQuery({
    queryKey: ['report', String(bookingId)],
    queryFn: () => api.get<ProgressReport>(`/reports/${bookingId}`),
    enabled,
  });
}
