'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

export interface HealthStatus {
  status: 'ok';
  db: 'connected';
}

export function useApiHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => apiFetch<HealthStatus>('/health'),
    refetchInterval: 30_000,
    retry: 1,
  });
}
