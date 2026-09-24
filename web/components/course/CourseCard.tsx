import { Award, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { RatingStars } from '@/components/common/Bits';
import { COURSE_LEVEL_LABEL, formatRupiah } from '@/lib/format';
import type { CourseCard as CourseCardData } from '@/lib/types';

/** Thumbnail kursus: gambar asli jika ada, jika tidak pola garis sederhana (bukan stok foto) */
export function CourseThumbnail({ title, url }: { title: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- URL eksternal (Cloudinary/lokal) tanpa konfigurasi domain
    return <img src={url} alt={`Sampul kursus ${title}`} className="aspect-video w-full rounded-t-lg object-cover" />;
  }
  return (
    <div className="relative flex aspect-video w-full items-end overflow-hidden rounded-t-lg bg-surface-muted p-4" aria-hidden>
      <svg className="absolute inset-0 h-full w-full text-border" preserveAspectRatio="none" viewBox="0 0 160 90">
        <path d="M0 70 C40 50 60 80 100 55 S150 40 160 50" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M0 80 C50 62 70 90 110 66 S150 56 160 62" fill="none" stroke="var(--color-primary-100)" strokeWidth="6" />
      </svg>
      <BookOpen className="relative size-7 text-primary-600" />
    </div>
  );
}

/** §5 Card Kursus: thumbnail 16:9, kategori kecil, judul 2 baris, instruktur, rating, harga */
export function CourseCard({ course }: { course: CourseCardData }) {
  return (
    <article className="relative flex min-w-0 flex-col rounded-lg border border-border bg-surface transition-shadow hover:shadow-md">
      <CourseThumbnail title={course.title} url={course.thumbnailUrl} />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-label-sm text-primary-700 uppercase">{course.category.name}</p>
        <h3 className="line-clamp-2 font-sans text-heading-md">
          <Link href={`/kursus/${course.slug}`} className="after:absolute after:inset-0 after:content-['']">
            {course.title}
          </Link>
        </h3>
        <p className="text-body-sm text-ink-500">
          {course.instructorName} · {COURSE_LEVEL_LABEL[course.level]} · {course.lessonCount} materi
        </p>
        <RatingStars rating={course.avgRating} count={course.reviewCount} />
        <div className="mt-auto flex items-center justify-between pt-2">
          <p className="text-body-lg font-semibold text-ink-900">{course.isFree ? 'Gratis' : formatRupiah(course.price)}</p>
          {course.issuesCertificate && (
            <span className="inline-flex items-center gap-1 text-body-sm text-ink-500">
              <Award className="size-4" aria-hidden /> Sertifikat
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
