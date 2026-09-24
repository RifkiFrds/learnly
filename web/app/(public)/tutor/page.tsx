import { Suspense } from 'react';
import { PageSkeleton } from '@/components/common/States';
import { TutorSearch } from '@/components/search/TutorSearch';

export const metadata = {
  title: 'Cari tutor',
  description: 'Cari tutor online atau tutor yang datang ke rumah berdasarkan mapel, jenjang, tarif, dan lokasi.',
};

export default function TutorSearchPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-content px-4 py-8 md:px-8"><PageSkeleton /></div>}>
      <TutorSearch />
    </Suspense>
  );
}
