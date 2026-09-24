'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ApiError } from '@/lib/api-client';
import { AuthProvider } from '@/lib/auth';

export function Providers({ children }: { children: React.ReactNode }) {
  // Satu QueryClient per sesi browser (bukan module-level) agar aman untuk SSR.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // Error 4xx (validasi, akses, tidak ditemukan) tidak perlu diulang
            retry: (count, error) =>
              !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
      </AuthProvider>
      {/* §5 Toast: kanan atas di desktop, atas di mobile; auto-dismiss 4 detik (error lebih lama) */}
      <Toaster
        position="top-right"
        duration={4000}
        closeButton
        toastOptions={{
          classNames: {
            toast: 'font-sans !rounded-lg !border !border-border !bg-surface !text-ink-900 !shadow-md',
            description: '!text-ink-500',
            success: '[&_[data-icon]]:!text-success-600',
            error: '[&_[data-icon]]:!text-danger-600',
          },
        }}
      />
    </QueryClientProvider>
  );
}
