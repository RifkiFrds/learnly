import { Suspense } from 'react';
import { PageSkeleton } from '@/components/common/States';
import { CourseCatalog } from '@/components/search/CourseCatalog';

export const metadata = {
  title: 'Kursus online',
  description: 'Katalog kursus online Learnly: mapel sekolah, persiapan ujian, bahasa, keterampilan digital, dan lainnya.',
};

export default function CourseCatalogPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-content px-4 py-8 md:px-8"><PageSkeleton /></div>}>
      <CourseCatalog />
    </Suspense>
  );
}
