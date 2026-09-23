'use client';

import { CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useApiHealth } from '@/hooks/useApiHealth';

/** Bukti koneksi FE ↔ BE: memanggil GET /health (yang ikut mengecek database). */
export function ApiStatusBadge() {
  const { isPending, isError, error } = useApiHealth();

  if (isPending) {
    return (
      <Badge variant="neutral" role="status">
        <LoaderCircle className="animate-spin" aria-hidden />
        API: Memeriksa…
      </Badge>
    );
  }

  if (isError) {
    return (
      <Badge variant="danger" role="status" title={error.message}>
        <CircleAlert aria-hidden />
        API: Tidak terhubung
        <span className="sr-only"> — {error.message}</span>
      </Badge>
    );
  }

  return (
    <Badge variant="success" role="status" title="API & database terhubung">
      <CircleCheck aria-hidden />
      API: Terhubung
    </Badge>
  );
}
