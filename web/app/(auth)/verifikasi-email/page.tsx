'use client';

import { useMutation } from '@tanstack/react-query';
import { CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { api, errorMessage } from '@/lib/api-client';

function VerifyEmail() {
  const token = useSearchParams().get('token');
  const verify = useMutation({ mutationFn: (value: string) => api.post('/auth/verify-email', { token: value }, false) });
  const { mutate } = verify;

  useEffect(() => {
    if (token) mutate(token);
  }, [token, mutate]);

  return (
    <div className="rounded-lg border border-border bg-surface p-6 shadow-sm md:p-8" role="status">
      <h1 className="text-heading-lg">Verifikasi email</h1>
      {!token || verify.isError ? (
        <p className="mt-4 flex items-start gap-3 text-body-md text-ink-700">
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-danger-600" aria-hidden />
          {token ? errorMessage(verify.error) : 'Link verifikasi tidak lengkap.'} Akunmu tetap aktif dan bisa dipakai seperti biasa.
        </p>
      ) : verify.isSuccess ? (
        <p className="mt-4 flex items-start gap-3 text-body-md text-ink-700">
          <CircleCheck className="mt-0.5 size-5 shrink-0 text-success-600" aria-hidden />
          Terima kasih, email kamu sudah terverifikasi.
        </p>
      ) : (
        <p className="mt-4 flex items-center gap-3 text-body-md text-ink-700">
          <LoaderCircle className="size-5 animate-spin text-info-600" aria-hidden /> Memverifikasi…
        </p>
      )}
      <Button asChild className="mt-6 w-full">
        <Link href="/masuk">Ke halaman masuk</Link>
      </Button>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmail />
    </Suspense>
  );
}
