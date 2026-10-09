'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Address, Earnings, Learner, Me, TutorProfile } from '@/lib/types';

// ---------- learner (anak) & alamat — siswa/orang tua ----------

export function useLearners(enabled = true) {
  return useQuery({ queryKey: ['learners'], queryFn: () => api.get<Learner[]>('/learners'), enabled });
}

export interface LearnerInput {
  fullName: string;
  dateOfBirth: string | null;
  educationLevelId: number | null;
}

export function useSaveLearner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: LearnerInput & { id?: number }) =>
      id ? api.patch<Learner>(`/learners/${id}`, input) : api.post<Learner>('/learners', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learners'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useDeleteLearner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/learners/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['learners'] }),
  });
}

export function useAddresses() {
  return useQuery({ queryKey: ['addresses'], queryFn: () => api.get<Address[]>('/addresses') });
}

export interface AddressInput {
  label: string;
  fullAddress: string;
  detailNote: string | null;
  latitude: number;
  longitude: number;
}

export function useSaveAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: AddressInput & { id?: number }) =>
      id ? api.patch<Address>(`/addresses/${id}`, input) : api.post<Address>('/addresses', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/addresses/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  });
}

/** Unggah/ganti foto profil (semua role) — PATCH-like via /users/me/avatar, hasil langsung sinkron ke cache ['me'] */
export function useUploadAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.upload<Me>('/users/me/avatar', form);
    },
    onSuccess: (me) => queryClient.setQueryData(['me'], me),
  });
}

// ---------- profil tutor milik sendiri ----------

export function useMyTutorProfile() {
  return useQuery({ queryKey: ['tutor-me'], queryFn: () => api.get<TutorProfile>('/tutors/me') });
}

/** Mutasi profil tutor: semua endpoint /tutors/me/* mengembalikan profil terbaru → langsung disimpan ke cache */
export function useTutorMutation<TInput>(request: (input: TInput) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: (data) => {
      if (data && typeof data === 'object' && 'onboarding' in (data as object)) {
        queryClient.setQueryData(['tutor-me'], data);
      } else {
        queryClient.invalidateQueries({ queryKey: ['tutor-me'] });
      }
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useEarnings(range: { from?: string; to?: string } = {}) {
  return useQuery({ queryKey: ['earnings', range], queryFn: () => api.get<Earnings>('/tutors/me/earnings', range) });
}
