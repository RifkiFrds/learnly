'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, refreshSession, sessionHint, setSessionExpiredHandler, tokenStore } from './api-client';
import type { AuthResult, Me, Role } from './types';

type Status = 'loading' | 'authenticated' | 'guest';

interface AuthContextValue {
  status: Status;
  user: Me | null;
  login: (email: string, password: string) => Promise<Me>;
  register: (input: RegisterInput) => Promise<{ me: Me; devEmailVerificationToken?: string }>;
  logout: () => Promise<void>;
  reloadUser: () => Promise<void>;
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role: 'student' | 'parent' | 'tutor';
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Halaman utama setelah login, per role */
export function homeFor(role: Role): string {
  if (role === 'tutor') return '/mengajar';
  if (role === 'admin') return '/admin';
  return '/beranda';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [status, setStatus] = useState<Status>('loading');

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<Me>('/auth/me'),
    enabled: status === 'authenticated',
    staleTime: 60_000,
  });

  // Pulihkan sesi dari cookie refresh token saat aplikasi pertama dibuka
  useEffect(() => {
    let cancelled = false;
    if (!sessionHint.has()) {
      // Tidak pernah login di browser ini → langsung tamu, tanpa request refresh
      queueMicrotask(() => !cancelled && setStatus('guest'));
      return () => {
        cancelled = true;
      };
    }
    refreshSession().then((result) => {
      if (!cancelled) setStatus(result ? 'authenticated' : 'guest');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Refresh gagal di tengah sesi (cookie kedaluwarsa/dicabut) → kembali ke login
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setStatus('guest');
      queryClient.clear();
      const next = window.location.pathname + window.location.search;
      router.replace(`/masuk?next=${encodeURIComponent(next)}&alasan=sesi-berakhir`);
    });
  }, [queryClient, router]);

  const afterAuth = useCallback(
    async (result: AuthResult) => {
      tokenStore.set(result.accessToken);
      sessionHint.set(true);
      queryClient.clear();
      const me = await api.get<Me>('/auth/me');
      queryClient.setQueryData(['me'], me);
      setStatus('authenticated');
      return me;
    },
    [queryClient],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      // /auth/me gagal (mis. akun ditangguhkan) → diperlakukan sebagai belum login
      status:
        status === 'authenticated' && meQuery.isError
          ? 'guest'
          : status === 'authenticated' && meQuery.isPending
            ? 'loading'
            : status,
      user: status === 'authenticated' && !meQuery.isError ? (meQuery.data ?? null) : null,
      async login(email, password) {
        const result = await api.post<AuthResult>('/auth/login', { email, password }, false);
        return afterAuth(result);
      },
      async register(input) {
        const result = await api.post<AuthResult>('/auth/register', input, false);
        const me = await afterAuth(result);
        return { me, devEmailVerificationToken: result.devEmailVerificationToken };
      },
      async logout() {
        try {
          await api.post('/auth/logout', {});
        } catch {
          /* token mungkin sudah kedaluwarsa — tetap keluar di sisi klien */
        }
        tokenStore.set(null);
        sessionHint.set(false);
        queryClient.clear();
        // Navigasi penuh agar guard halaman terproteksi tidak sempat mengalihkan ke /masuk
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- sengaja reload penuh: bersihkan semua state klien
        window.location.assign('/');
      },
      async reloadUser() {
        await queryClient.invalidateQueries({ queryKey: ['me'] });
      },
    }),
    [status, meQuery.isPending, meQuery.isError, meQuery.data, afterAuth, queryClient],
  );


  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return context;
}
