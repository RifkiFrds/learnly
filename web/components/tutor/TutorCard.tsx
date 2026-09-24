import { BadgeCheck, MapPin, Video } from 'lucide-react';
import Link from 'next/link';
import { Avatar, RatingStars } from '@/components/common/Bits';
import { formatRupiah, TEACHING_MODE_LABEL } from '@/lib/format';
import type { TutorCard as TutorCardData } from '@/lib/types';

/** §5 Card Tutor: avatar, nama, badge terverifikasi, pill mapel, rating (pola Udemy), tarif rata kanan, jarak */
export function TutorCard({ tutor }: { tutor: TutorCardData }) {
  return (
    <article className="group relative flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-surface p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        <Avatar name={tutor.fullName} />
        <div className="min-w-0 flex-1">
          <h3 className="flex min-w-0 items-center gap-1.5 font-sans text-heading-md">
            <Link href={`/tutor/${tutor.id}`} className="min-w-0 truncate after:absolute after:inset-0 after:content-['']">
              {tutor.fullName}
            </Link>
            {tutor.isVerified && <BadgeCheck className="size-4.5 shrink-0 text-success-600" aria-label="Terverifikasi" />}
          </h3>
          <div className="mt-1">
            <RatingStars rating={tutor.avgRating} count={tutor.reviewCount} />
          </div>
        </div>
        <div className="text-right">
          <p className="text-body-lg font-semibold text-ink-900">{formatRupiah(tutor.hourlyRate)}</p>
          <p className="text-body-sm text-ink-500">per jam</p>
        </div>
      </div>
      {tutor.bio && <p className="line-clamp-2 text-body-sm text-ink-700">{tutor.bio}</p>}
      <ul className="flex flex-wrap gap-1.5" aria-label="Mata pelajaran">
        {tutor.subjects.slice(0, 4).map((subject) => (
          <li key={subject.id} className="rounded-full bg-surface-muted px-2.5 py-1 text-body-sm text-ink-700">
            {subject.name}
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-body-sm text-ink-500">
        <span className="inline-flex items-center gap-1.5">
          <Video className="size-4" aria-hidden />
          {TEACHING_MODE_LABEL[tutor.teachingMode]}
        </span>
        {tutor.distanceKm !== null ? (
          <span className="inline-flex items-center gap-1.5 font-semibold text-ink-700">
            <MapPin className="size-4 text-primary-600" aria-hidden />
            {tutor.distanceKm.toLocaleString('id-ID')} km dari lokasimu
          </span>
        ) : tutor.serviceAreaNames.length ? (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4" aria-hidden />
            {tutor.serviceAreaNames.slice(0, 2).join(', ')}
          </span>
        ) : null}
        {tutor.teachingExperienceYears ? <span>{tutor.teachingExperienceYears} th mengajar</span> : null}
      </div>
    </article>
  );
}
