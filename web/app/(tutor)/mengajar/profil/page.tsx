'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState, PageSkeleton } from '@/components/common/States';
import { StatusBadge } from '@/components/common/StatusBadge';
import { BiodataForm, DocumentsPanel, SubjectsForm } from '@/components/tutor/onboarding/ProfileForms';
import { VerificationBanner } from '@/components/tutor/onboarding/VerificationBanner';
import { Button } from '@/components/ui/button';
import { useMyTutorProfile } from '@/hooks/api/account';

export default function TutorProfilePage() {
  const { data: profile, isPending, isError, error, refetch } = useMyTutorProfile();
  if (isPending) return <PageSkeleton />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Profil & dokumen"
        description={<span className="inline-flex flex-wrap items-center gap-2">Status verifikasi: <StatusBadge kind="verification" status={profile.verificationStatus} /></span>}
        actions={
          profile.verificationStatus === 'verified' ? (
            <Button asChild variant="secondary">
              <Link href={`/tutor/${profile.id}`}>Lihat profil publik</Link>
            </Button>
          ) : undefined
        }
      />
      <div className="space-y-6">
        <VerificationBanner profile={profile} />
        <BiodataForm profile={profile} />
        <SubjectsForm key={`${profile.subjects.length}-${profile.educationLevels.length}`} profile={profile} />
        <DocumentsPanel profile={profile} />
      </div>
    </div>
  );
}
