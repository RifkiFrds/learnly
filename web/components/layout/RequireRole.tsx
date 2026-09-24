'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { PageSkeleton } from '@/components/common/States';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/types';
import { Forbidden } from './Forbidden';

/**
 * Guard per role di layout route group: belum login → ke /masuk?next=…,
 * role salah → halaman 403 yang jelas (bukan redirect diam-diam).
 */
export function RequireRole({ roles, children }: { roles: Role[] | 'any'; children: React.ReactNode }) {
  const { status, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status === 'guest') {
      const query = searchParams.toString();
      const next = pathname + (query ? `?${query}` : '');
      router.replace(`/masuk?next=${encodeURIComponent(next)}`);
    }
  }, [status, router, pathname, searchParams]);

  if (status !== 'authenticated' || !user) {
    return (
      <div className="mx-auto max-w-content px-4 py-10 md:px-8">
        <PageSkeleton />
      </div>
    );
  }
  if (roles !== 'any' && !roles.includes(user.role)) return <Forbidden role={user.role} />;
  return <>{children}</>;
}
