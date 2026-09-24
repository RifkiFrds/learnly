'use client';

import { Check, ChevronDown, CircleAlert, ExternalLink, X } from 'lucide-react';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { toast } from 'sonner';
import { ProofThumb } from '@/components/admin/AdminDialogs';
import { Avatar, Pagination } from '@/components/common/Bits';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/States';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminTutors, useVerifyTutor } from '@/hooks/api/admin';
import { useQueryParams } from '@/hooks/useQueryParams';
import { errorMessage } from '@/lib/api-client';
import { DAY_NAMES, formatDate, formatRelative, formatRupiah, TEACHING_MODE_LABEL } from '@/lib/format';
import type { AdminTutor } from '@/lib/types';

const KEYS = ['status'] as const;
const MISSING_LABEL: Record<string, string> = {
  bio: 'bio',
  hourlyRate: 'tarif',
  subjects: 'mata pelajaran',
  educationLevels: 'jenjang',
  certifications: 'dokumen',
  availabilities: 'jadwal mingguan',
  serviceAreas: 'wilayah layanan',
};

function TutorRow({ tutor }: { tutor: AdminTutor }) {
  const verify = useVerifyTutor();
  const [rejectOpen, setRejectOpen] = useState(false);
  const missing = tutor.onboarding?.missing ?? [];

  async function approve() {
    try {
      await verify.mutateAsync({ id: tutor.id, status: 'verified' });
      toast.success(`${tutor.fullName} terverifikasi dan kini muncul di pencarian.`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <li>
      <details className="group rounded-lg border border-border bg-surface open:border-primary-600/40">
        <summary className="flex min-h-16 cursor-pointer list-none items-center gap-4 p-4 sm:px-5 [&::-webkit-details-marker]:hidden">
          <Avatar name={tutor.fullName} />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 font-sans text-body-md font-semibold text-ink-900">
              {tutor.fullName}
              <StatusBadge kind="verification" status={tutor.verificationStatus} />
            </p>
            <p className="truncate text-body-sm text-ink-500">
              {tutor.subjects.map((s) => s.name).join(', ') || 'Belum pilih mapel'} · {formatRupiah(tutor.hourlyRate)}/jam · diperbarui {formatRelative(tutor.updatedAt)}
            </p>
            {missing.length > 0 && (
              <p className="mt-1 flex items-center gap-1.5 text-body-sm text-warning-600">
                <CircleAlert className="size-4" aria-hidden /> Belum lengkap: {missing.map((key) => MISSING_LABEL[key] ?? key).join(', ')}
              </p>
            )}
          </div>
          <ChevronDown className="size-5 shrink-0 text-ink-500 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="grid gap-6 border-t border-border p-4 sm:px-5 lg:grid-cols-2">
          <dl className="space-y-3 text-body-sm">
            <div><dt className="font-semibold text-ink-900">Kontak</dt><dd className="text-ink-700">{tutor.email}{tutor.phone ? ` · ${tutor.phone}` : ''}</dd></div>
            <div><dt className="font-semibold text-ink-900">Bio</dt><dd className="whitespace-pre-line text-ink-700">{tutor.bio ?? '—'}</dd></div>
            <div><dt className="font-semibold text-ink-900">Pendidikan</dt><dd className="text-ink-700">{tutor.educationBackground ?? '—'}{tutor.teachingExperienceYears != null ? ` · ${tutor.teachingExperienceYears} tahun mengajar` : ''}</dd></div>
            <div><dt className="font-semibold text-ink-900">Jenjang & cara mengajar</dt><dd className="text-ink-700">{tutor.educationLevels.map((l) => l.name).join(', ') || '—'} · {TEACHING_MODE_LABEL[tutor.teachingMode]}</dd></div>
            <div>
              <dt className="font-semibold text-ink-900">Jadwal mingguan</dt>
              <dd className="text-ink-700">
                {tutor.availabilities.length ? tutor.availabilities.map((a) => `${DAY_NAMES[a.dayOfWeek]} ${a.startTime}–${a.endTime}`).join(' · ') : '—'}
              </dd>
            </div>
            <div><dt className="font-semibold text-ink-900">Wilayah</dt><dd className="text-ink-700">{tutor.serviceAreas.map((a) => a.areaName ?? `radius ${a.radiusKm} km`).join(', ') || (tutor.teachingMode === 'online' ? 'Online saja' : '—')}</dd></div>
            {tutor.verificationNotes && <div><dt className="font-semibold text-ink-900">Catatan verifikasi terakhir</dt><dd className="text-ink-700">{tutor.verificationNotes}</dd></div>}
          </dl>
          <div className="space-y-3">
            <p className="text-body-sm font-semibold text-ink-900">Dokumen ({tutor.certifications.length})</p>
            {tutor.certifications.length === 0 ? (
              <p className="text-body-sm text-ink-500">Belum ada dokumen diunggah.</p>
            ) : (
              <ul className="space-y-3">
                {tutor.certifications.map((doc) => (
                  <li key={doc.id} className="flex items-center gap-3">
                    <ProofThumb url={doc.fileUrl} label={doc.title} />
                    <div className="min-w-0 text-body-sm">
                      <p className="font-semibold text-ink-900">{doc.title}</p>
                      <p className="text-ink-500">{[doc.issuer, doc.issuedAt && formatDate(doc.issuedAt, false)].filter(Boolean).join(' · ') || 'Tanpa keterangan penerbit'}</p>
                      <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1 font-semibold text-primary-600 hover:text-primary-700">
                        Buka file <ExternalLink className="size-3.5" aria-hidden />
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              {tutor.verificationStatus !== 'verified' && (
                <Button onClick={approve} disabled={verify.isPending}><Check /> Verifikasi tutor</Button>
              )}
              {tutor.verificationStatus !== 'rejected' && (
                <Button variant="destructive" onClick={() => setRejectOpen(true)} disabled={verify.isPending}>
                  <X /> {tutor.verificationStatus === 'verified' ? 'Cabut verifikasi' : 'Minta perbaikan'}
                </Button>
              )}
              {tutor.verificationStatus === 'verified' && (
                <Button asChild variant="secondary"><Link href={`/tutor/${tutor.id}`}>Lihat profil publik</Link></Button>
              )}
            </div>
            {missing.length > 0 && tutor.verificationStatus !== 'verified' && (
              <p className="text-body-sm text-ink-500">Tutor dengan profil belum lengkap tetap bisa diverifikasi, tetapi tidak akan muncul di pencarian lokasi sampai datanya lengkap.</p>
            )}
          </div>
        </div>
      </details>
      <ConfirmDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title={tutor.verificationStatus === 'verified' ? `Cabut verifikasi ${tutor.fullName}?` : `Minta ${tutor.fullName} memperbaiki profil?`}
        consequence={
          tutor.verificationStatus === 'verified'
            ? 'Profil langsung hilang dari pencarian dan tidak bisa menerima booking baru. Booking yang sudah berjalan tetap berlanjut.'
            : 'Tutor menerima catatanmu dan bisa mengajukan ulang setelah memperbaiki profil. Profil belum tampil di pencarian.'
        }
        confirmLabel={tutor.verificationStatus === 'verified' ? 'Cabut verifikasi' : 'Kirim catatan'}
        destructive
        reason={{ label: 'Catatan untuk tutor', placeholder: 'Mis. foto ijazah buram, mohon unggah ulang', minLength: 5 }}
        pending={verify.isPending}
        onConfirm={async (notes) => {
          try {
            await verify.mutateAsync({ id: tutor.id, status: 'rejected', notes });
            toast.success('Catatan terkirim ke tutor.');
            setRejectOpen(false);
          } catch (err) {
            toast.error(errorMessage(err));
          }
        }}
      />
    </li>
  );
}

function TutorQueue() {
  const { values, update, page } = useQueryParams(KEYS);
  const status = values.status ?? 'pending_verification';
  const query = useAdminTutors({ status, page });

  return (
    <div className="max-w-5xl">
      <PageHeader title="Verifikasi tutor" description="Periksa identitas, dokumen, dan kelengkapan profil sebelum tutor tampil di pencarian." />
      <Tabs value={status} onValueChange={(value) => update({ status: value === 'pending_verification' ? undefined : value })} className="mb-5">
        <TabsList>
          <TabsTrigger value="pending_verification">Menunggu</TabsTrigger>
          <TabsTrigger value="verified">Terverifikasi</TabsTrigger>
          <TabsTrigger value="rejected">Perlu perbaikan</TabsTrigger>
        </TabsList>
      </Tabs>
      {query.isPending ? (
        <ListSkeleton count={4} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <EmptyState illustration="people" title={status === 'pending_verification' ? 'Tidak ada tutor yang menunggu verifikasi.' : 'Belum ada tutor di kategori ini.'} />
      ) : (
        <>
          <ul className="space-y-3">{query.data.items.map((tutor) => <TutorRow key={tutor.id} tutor={tutor} />)}</ul>
          <Pagination meta={query.data.meta} onPage={(next) => update({ page: String(next) }, false)} />
        </>
      )}
    </div>
  );
}

export default function AdminTutorsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <TutorQueue />
    </Suspense>
  );
}
