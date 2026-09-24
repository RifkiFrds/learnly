import { Errors } from '../../lib/app-error';
import { toNumber } from '../../lib/money';
import { buildMeta, toSkipTake } from '../../lib/pagination';
import { resolveFileUrl, uploadFile, type StoredFile } from '../../lib/storage';
import {
  APP_TIMEZONE,
  dateOnly,
  dayOfWeekOf,
  hhmmToTimeColumn,
  minutesToHhmm,
  stringToDateColumn,
  timeColumnToMinutes,
  wibDateTimeToUtc,
} from '../../lib/time';
import { notificationService } from '../notifications/notification.service';
import { prisma } from '../../lib/prisma';
import { computeAvailableSlots, findAvailabilityProblem, type TimeWindow } from './availability';
import { tutorRepository, type TutorProfileFull } from './tutor.repository';
import type {
  AdminTutorListQuery,
  BlockedDateBody,
  CertificationBody,
  SetAvailabilitiesBody,
  SetEducationLevelsBody,
  SetServiceAreasBody,
  SetSubjectsBody,
  UpdateTutorProfileBody,
  VerifyTutorBody,
} from './tutor.schema';

export function toTimeWindows(profile: Pick<TutorProfileFull, 'availabilities'>): TimeWindow[] {
  return profile.availabilities.map((row) => ({
    dayOfWeek: row.dayOfWeek,
    startMinutes: timeColumnToMinutes(row.startTime),
    endMinutes: timeColumnToMinutes(row.endTime),
  }));
}

/** Item onboarding yang belum lengkap (membantu FE menampilkan checklist) */
function onboardingChecklist(profile: TutorProfileFull) {
  const missing: string[] = [];
  if (!profile.bio) missing.push('bio');
  if (toNumber(profile.hourlyRate) <= 0) missing.push('hourlyRate');
  if (profile.subjects.length === 0) missing.push('subjects');
  if (profile.educationLevels.length === 0) missing.push('educationLevels');
  if (profile.availabilities.length === 0) missing.push('availabilities');
  if (profile.certifications.length === 0) missing.push('certifications');
  if (profile.teachingMode !== 'online' && profile.serviceAreas.length === 0) {
    missing.push('serviceAreas');
  }
  return { isComplete: missing.length === 0, missing };
}

/**
 * Bentuk response profil tutor. `isPrivate` = dilihat pemilik/admin (dokumen & data kontak ikut);
 * versi publik menyembunyikan dokumen dan membulatkan titik pusat wilayah (~1 km) demi privasi.
 */
export function formatTutorProfile(profile: TutorProfileFull, isPrivate: boolean) {
  const roundCoord = (value: unknown) =>
    value === null
      ? null
      : isPrivate
        ? toNumber(value as number)
        : Number(toNumber(value as number).toFixed(2));

  return {
    id: profile.id,
    userId: profile.userId,
    fullName: profile.user.fullName,
    ...(isPrivate
      ? {
          email: profile.user.email,
          phone: profile.user.phone,
          autoAccept: profile.autoAccept,
          verificationNotes: profile.verificationNotes,
        }
      : {}),
    bio: profile.bio,
    educationBackground: profile.educationBackground,
    teachingExperienceYears: profile.teachingExperienceYears,
    curriculum: profile.curriculum,
    hourlyRate: profile.hourlyRate,
    teachingMode: profile.teachingMode,
    verificationStatus: profile.verificationStatus,
    avgRating: profile.avgRating,
    reviewCount: profile.reviewCount,
    memberSince: profile.user.createdAt,
    subjects: profile.subjects.map(({ subject }) => subject),
    educationLevels: profile.educationLevels.map(({ educationLevel }) => educationLevel),
    serviceAreas: profile.serviceAreas.map((area) => ({
      id: area.id,
      areaType: area.areaType,
      areaName: area.areaName,
      centerLatitude: roundCoord(area.centerLatitude),
      centerLongitude: roundCoord(area.centerLongitude),
      radiusKm: area.radiusKm,
    })),
    availabilities: profile.availabilities.map((row) => ({
      id: row.id,
      dayOfWeek: row.dayOfWeek,
      startTime: minutesToHhmm(timeColumnToMinutes(row.startTime)),
      endTime: minutesToHhmm(timeColumnToMinutes(row.endTime)),
    })),
    certifications: profile.certifications.map((cert) => ({
      id: cert.id,
      title: cert.title,
      issuer: cert.issuer,
      issuedAt: dateOnly(cert.issuedAt),
      ...(isPrivate ? { fileUrl: resolveFileUrl(cert.fileUrl) } : {}),
    })),
    ...(isPrivate
      ? {
          blockedDates: profile.blockedDates.map((row) => ({
            id: row.id,
            blockedDate: dateOnly(row.blockedDate),
            reason: row.reason,
          })),
          onboarding: onboardingChecklist(profile),
        }
      : {}),
    updatedAt: profile.updatedAt,
  };
}

async function getOwnProfile(userId: bigint) {
  const profile = await tutorRepository.findByUserId(userId);
  if (!profile) throw Errors.notFound('Profil tutor tidak ditemukan');
  return profile;
}

async function reloadOwn(userId: bigint) {
  return formatTutorProfile(await getOwnProfile(userId), true);
}

export const tutorService = {
  getOwnProfile,

  async getMine(userId: bigint) {
    return reloadOwn(userId);
  },

  // FR-TUTOR-01/02 (+ FR-AUTH-08: profil yang ditolak kembali ke antrian verifikasi setelah diperbaiki)
  async updateMine(userId: bigint, input: UpdateTutorProfileBody) {
    const profile = await getOwnProfile(userId);
    await tutorRepository.update(profile.id, {
      ...input,
      ...(profile.verificationStatus === 'rejected'
        ? { verificationStatus: 'pending_verification', verificationNotes: null }
        : {}),
    });
    return reloadOwn(userId);
  },

  // FR-AUTH-08: dokumen onboarding (ijazah/sertifikat) — disimpan privat (NFR-SEC-06)
  async addCertification(userId: bigint, input: CertificationBody, file: StoredFile) {
    const profile = await getOwnProfile(userId);
    const fileUrl = await uploadFile(file, { folder: 'tutor-documents', isPrivate: true });
    const cert = await tutorRepository.createCertification({
      tutorProfileId: profile.id,
      title: input.title,
      issuer: input.issuer ?? null,
      issuedAt: input.issuedAt ? stringToDateColumn(input.issuedAt) : null,
      fileUrl,
    });
    return { ...cert, issuedAt: dateOnly(cert.issuedAt), fileUrl: resolveFileUrl(cert.fileUrl) };
  },

  async deleteCertification(userId: bigint, certificationId: bigint) {
    const profile = await getOwnProfile(userId);
    const cert = await tutorRepository.findCertification(certificationId);
    if (!cert) throw Errors.notFound('Sertifikasi tidak ditemukan');
    if (cert.tutorProfileId !== profile.id) throw Errors.forbidden('Sertifikasi ini bukan milikmu');
    await tutorRepository.deleteCertification(certificationId);
    return { deleted: true };
  },

  async setSubjects(userId: bigint, input: SetSubjectsBody) {
    const profile = await getOwnProfile(userId);
    if (
      (await tutorRepository.countExisting('subject', input.subjectIds)) !== input.subjectIds.length
    ) {
      throw Errors.validation('Ada mata pelajaran yang tidak ditemukan', [
        { field: 'subjectIds', message: 'not_found' },
      ]);
    }
    await tutorRepository.replaceSubjects(profile.id, input.subjectIds);
    return reloadOwn(userId);
  },

  async setEducationLevels(userId: bigint, input: SetEducationLevelsBody) {
    const profile = await getOwnProfile(userId);
    const ids = input.educationLevelIds;
    if ((await tutorRepository.countExisting('educationLevel', ids)) !== ids.length) {
      throw Errors.validation('Ada jenjang pendidikan yang tidak ditemukan', [
        { field: 'educationLevelIds', message: 'not_found' },
      ]);
    }
    await tutorRepository.replaceEducationLevels(profile.id, ids);
    return reloadOwn(userId);
  },

  // FR-TUTOR-03: area (nama kota/kecamatan) dan/atau titik pusat + radius
  async setServiceAreas(userId: bigint, input: SetServiceAreasBody) {
    const profile = await getOwnProfile(userId);
    await tutorRepository.replaceServiceAreas(
      profile.id,
      input.serviceAreas.map((area) =>
        area.areaType === 'radius'
          ? {
              areaType: 'radius' as const,
              areaName: area.areaName ?? null,
              centerLatitude: area.centerLatitude,
              centerLongitude: area.centerLongitude,
              radiusKm: area.radiusKm,
            }
          : { areaType: 'area_name' as const, areaName: area.areaName },
      ),
    );
    return reloadOwn(userId);
  },

  // FR-TUTOR-04: jadwal mingguan berulang (jam dalam WIB)
  async setAvailabilities(userId: bigint, input: SetAvailabilitiesBody) {
    const profile = await getOwnProfile(userId);
    const toMinutes = (value: string) => {
      const [h, m] = value.split(':').map(Number);
      return h * 60 + m;
    };
    const problem = findAvailabilityProblem(
      input.availabilities.map((row) => ({
        dayOfWeek: row.dayOfWeek,
        startMinutes: toMinutes(row.startTime),
        endMinutes: toMinutes(row.endTime),
      })),
    );
    if (problem) throw Errors.validation(problem, [{ field: 'availabilities', message: problem }]);

    await tutorRepository.replaceAvailabilities(
      profile.id,
      input.availabilities.map((row) => ({
        dayOfWeek: row.dayOfWeek,
        startTime: hhmmToTimeColumn(row.startTime),
        endTime: hhmmToTimeColumn(row.endTime),
      })),
    );
    return reloadOwn(userId);
  },

  async addBlockedDate(userId: bigint, input: BlockedDateBody) {
    const profile = await getOwnProfile(userId);
    const blockedDate = stringToDateColumn(input.blockedDate);
    if (await tutorRepository.findBlockedDate(profile.id, blockedDate)) {
      throw Errors.conflict('Tanggal ini sudah diblokir');
    }
    const row = await tutorRepository.createBlockedDate({
      tutorProfileId: profile.id,
      blockedDate,
      reason: input.reason ?? null,
    });
    return { ...row, blockedDate: dateOnly(row.blockedDate) };
  },

  async deleteBlockedDate(userId: bigint, id: bigint) {
    const profile = await getOwnProfile(userId);
    const row = await tutorRepository.findBlockedDateById(id);
    if (!row) throw Errors.notFound('Tanggal blokir tidak ditemukan');
    if (row.tutorProfileId !== profile.id) throw Errors.forbidden('Data ini bukan milikmu');
    await tutorRepository.deleteBlockedDate(id);
    return { deleted: true };
  },

  /** Profil publik: hanya tutor terverifikasi dengan akun aktif (FR-TUTOR-06). */
  async getPublic(tutorProfileId: bigint) {
    const profile = await tutorRepository.findById(tutorProfileId);
    if (!profile || profile.verificationStatus !== 'verified' || profile.user.status !== 'active') {
      throw Errors.notFound('Tutor tidak ditemukan');
    }
    const { items } = await tutorRepository.listReviews(profile.id, 0, 5);
    return { ...formatTutorProfile(profile, false), recentReviews: items };
  },

  async listReviews(tutorProfileId: bigint, page: number, limit: number) {
    const profile = await tutorRepository.findById(tutorProfileId);
    if (!profile || profile.verificationStatus !== 'verified')
      throw Errors.notFound('Tutor tidak ditemukan');
    const { skip, take } = toSkipTake({ page, limit });
    const { items, total } = await tutorRepository.listReviews(tutorProfileId, skip, take);
    return { items, meta: buildMeta(page, limit, total) };
  },

  // FR-TUTOR-05: slot = jadwal mingguan − blocked dates − booking aktif
  async availableSlots(tutorProfileId: bigint, date: string) {
    const profile = await tutorRepository.findById(tutorProfileId);
    if (!profile || profile.verificationStatus !== 'verified' || profile.user.status !== 'active') {
      throw Errors.notFound('Tutor tidak ditemukan');
    }
    const dayStart = wibDateTimeToUtc(date, '00:00');
    const dayEnd = new Date(dayStart.getTime() + 86_400_000);
    const busy = await tutorRepository.findBusyRanges(profile.id, dayStart, dayEnd);
    const isBlocked = profile.blockedDates.some((row) => dateOnly(row.blockedDate) === date);

    const slots = computeAvailableSlots({
      date,
      dayOfWeek: dayOfWeekOf(date),
      windows: toTimeWindows(profile),
      isBlocked,
      busy: busy.map((row) => ({ start: row.scheduledStartAt, end: row.scheduledEndAt })),
      now: new Date(),
    });

    return {
      tutorProfileId: profile.id,
      date,
      timezone: APP_TIMEZONE,
      slotMinutes: 30,
      isBlocked,
      slots,
    };
  },

  // ---- Admin (FR-ADMIN-01)
  async adminList(query: AdminTutorListQuery) {
    const { skip, take } = toSkipTake(query);
    const [rows, total] = await tutorRepository.listByStatus(query.status, skip, take);
    return {
      items: rows.map((row) => formatTutorProfile(row, true)),
      meta: buildMeta(query.page, query.limit, total),
    };
  },

  async adminVerify(tutorProfileId: bigint, input: VerifyTutorBody) {
    const profile = await tutorRepository.findById(tutorProfileId);
    if (!profile) throw Errors.notFound('Tutor tidak ditemukan');

    await prisma.$transaction(async (tx) => {
      await tx.tutorProfile.update({
        where: { id: profile.id },
        data: { verificationStatus: input.status, verificationNotes: input.notes ?? null },
      });
      await notificationService.notify(
        tx,
        profile.userId,
        input.status === 'verified'
          ? {
              type: 'tutor_verified',
              title: 'Profil tutormu sudah terverifikasi',
              body: 'Selamat! Profilmu kini tampil di pencarian dan siap menerima booking.',
            }
          : {
              type: 'tutor_rejected',
              title: 'Verifikasi profil tutor belum disetujui',
              body: `Catatan admin: ${input.notes}. Perbarui profilmu lalu kirim ulang.`,
            },
      );
    });

    const updated = await tutorRepository.findById(tutorProfileId);
    return formatTutorProfile(updated!, true);
  },
};
