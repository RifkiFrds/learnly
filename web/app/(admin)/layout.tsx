import { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { RequireRole } from '@/components/layout/RequireRole';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <RequireRole roles={['admin']}>
        <AppShell>{children}</AppShell>
      </RequireRole>
    </Suspense>
  );
}
