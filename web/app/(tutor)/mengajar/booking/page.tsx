'use client';

import { Suspense } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { ListSkeleton } from '@/components/common/States';
import { BookingList } from '@/components/booking/BookingList';

export default function TutorBookingsPage() {
  return (
    <div className="max-w-4xl">
      <PageHeader title="Booking" description="Semua sesi dari siswa — permintaan baru, jadwal mendatang, dan riwayat." />
      <Suspense fallback={<ListSkeleton />}>
        <BookingList perspective="tutor" />
      </Suspense>
    </div>
  );
}
