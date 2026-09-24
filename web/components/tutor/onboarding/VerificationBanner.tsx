import { CircleAlert, CircleCheck, Clock } from 'lucide-react';
import Link from 'next/link';
import type { TutorProfile } from '@/lib/types';

const MISSING_LABEL: Record<string, { label: string; href: string }> = {
  bio: { label: 'Tulis bio singkat', href: '/mengajar/profil#biodata' },
  hourlyRate: { label: 'Tentukan tarif per jam', href: '/mengajar/profil#biodata' },
  subjects: { label: 'Pilih mata pelajaran', href: '/mengajar/profil#mapel' },
  educationLevels: { label: 'Pilih jenjang yang diajar', href: '/mengajar/profil#mapel' },
  certifications: { label: 'Unggah minimal satu dokumen (ijazah/sertifikat)', href: '/mengajar/profil#dokumen' },
  availabilities: { label: 'Atur jadwal mingguan', href: '/mengajar/jadwal#jadwal' },
  serviceAreas: { label: 'Atur wilayah layanan tatap muka', href: '/mengajar/jadwal#wilayah' },
};

/** Status verifikasi + checklist onboarding (FR-AUTH-08) */
export function VerificationBanner({ profile }: { profile: TutorProfile }) {
  const missing = profile.onboarding?.missing ?? [];
  if (profile.verificationStatus === 'verified') {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-success-100 bg-success-100/60 px-5 py-4" role="status">
        <CircleCheck className="mt-0.5 size-5 shrink-0 text-success-600" aria-hidden />
        <div>
          <p className="font-semibold text-ink-900">Profilmu sudah terverifikasi</p>
          <p className="text-body-sm text-ink-700">Kamu tampil di pencarian dan bisa menerima booking. Perubahan profil langsung terlihat oleh siswa.</p>
        </div>
      </div>
    );
  }
  const rejected = profile.verificationStatus === 'rejected';
  return (
    <div
      className={`rounded-lg border px-5 py-4 ${rejected ? 'border-danger-100 bg-danger-100/50' : 'border-warning-100 bg-warning-100/60'}`}
      role="status"
    >
      <div className="flex items-start gap-3">
        {rejected ? (
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-danger-600" aria-hidden />
        ) : (
          <Clock className="mt-0.5 size-5 shrink-0 text-warning-600" aria-hidden />
        )}
        <div>
          <p className="font-semibold text-ink-900">
            {rejected ? 'Verifikasi belum disetujui' : missing.length ? 'Lengkapi profil agar bisa diverifikasi' : 'Profilmu sedang ditinjau tim Learnly'}
          </p>
          <p className="text-body-sm text-ink-700">
            {rejected
              ? `Catatan admin: ${profile.verificationNotes ?? '-'}. Perbaiki bagian yang diminta — setelah disimpan, profilmu otomatis masuk antrian verifikasi lagi.`
              : missing.length
                ? 'Admin memeriksa profil & dokumenmu sebelum kamu tampil di pencarian. Selesaikan langkah berikut:'
                : 'Biasanya selesai dalam 1–2 hari kerja. Kami kabari lewat notifikasi.'}
          </p>
        </div>
      </div>
      {missing.length > 0 && (
        <ol className="mt-3 ml-8 space-y-1.5">
          {missing.map((key) => (
            <li key={key} className="flex items-center gap-2 text-body-sm">
              <span className="size-2 shrink-0 rounded-full bg-warning-600" aria-hidden />
              <Link href={MISSING_LABEL[key]?.href ?? '#'} className="font-semibold text-ink-900 underline decoration-border underline-offset-4 hover:decoration-ink-900">
                {MISSING_LABEL[key]?.label ?? key}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
