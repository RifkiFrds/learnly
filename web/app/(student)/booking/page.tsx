'use client';

import { Search } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { ListSkeleton } from '@/components/common/States';
import { BookingList } from '@/components/booking/BookingList';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';

export default function StudentBookingsPage() {
  const { user } = useAuth();
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Booking les"
        description="Pantau status sesi, pembayaran, dan laporan dari tutor."
        actions={<Button asChild><Link href="/tutor"><Search /> Cari tutor</Link></Button>}
      />
      <Suspense fallback={<ListSkeleton />}>
        <BookingList perspective="owner" showLearnerFilter={user?.role === 'parent'} />
      </Suspense>
    </div>
  );
}
