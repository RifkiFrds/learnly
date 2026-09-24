import { z } from 'zod';
import { paginationQuery } from '../../lib/pagination';
import { dateString, idSchema, timeString } from '../../middlewares/validate';

export const updateTutorProfileBody = z.object({
  bio: z.string().trim().max(5000).nullable().optional(),
  educationBackground: z.string().trim().max(255).nullable().optional(),
  teachingExperienceYears: z.number().int().min(0).max(60).nullable().optional(),
  curriculum: z.string().trim().max(255).nullable().optional(),
  hourlyRate: z.number().int().min(10_000, 'tarif minimal Rp10.000/jam').max(5_000_000),
  teachingMode: z.enum(['online', 'tatap_muka', 'both']),
  autoAccept: z.boolean().optional(),
});
export type UpdateTutorProfileBody = z.infer<typeof updateTutorProfileBody>;

// Dikirim sebagai multipart/form-data (field teks) atau JSON bersama fileBase64
export const certificationBody = z.object({
  title: z.string().trim().min(2).max(191),
  issuer: z.string().trim().max(191).optional(),
  issuedAt: dateString.optional(),
});
export type CertificationBody = z.infer<typeof certificationBody>;

const idList = z
  .array(idSchema)
  .min(1, 'pilih minimal satu')
  .max(30)
  .transform((ids) => [...new Set(ids)]);

export const setSubjectsBody = z.object({ subjectIds: idList });
export type SetSubjectsBody = z.infer<typeof setSubjectsBody>;

export const setEducationLevelsBody = z.object({ educationLevelIds: idList });
export type SetEducationLevelsBody = z.infer<typeof setEducationLevelsBody>;

const serviceArea = z.discriminatedUnion('areaType', [
  z.object({
    areaType: z.literal('area_name'),
    areaName: z.string().trim().min(2).max(191),
  }),
  z.object({
    areaType: z.literal('radius'),
    areaName: z.string().trim().max(191).optional(),
    centerLatitude: z.number().min(-90).max(90),
    centerLongitude: z.number().min(-180).max(180),
    radiusKm: z.number().min(0.5).max(50),
  }),
]);
export const setServiceAreasBody = z.object({ serviceAreas: z.array(serviceArea).max(20) });
export type SetServiceAreasBody = z.infer<typeof setServiceAreasBody>;

export const setAvailabilitiesBody = z.object({
  availabilities: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: timeString,
        endTime: timeString,
      }),
    )
    .max(50),
});
export type SetAvailabilitiesBody = z.infer<typeof setAvailabilitiesBody>;

export const blockedDateBody = z.object({
  blockedDate: dateString,
  reason: z.string().trim().max(255).optional(),
});
export type BlockedDateBody = z.infer<typeof blockedDateBody>;

export const certificationParam = z.object({ id: idSchema });

export const availableSlotsQuery = z.object({ date: dateString });
export type AvailableSlotsQuery = z.infer<typeof availableSlotsQuery>;

export const adminTutorListQuery = z.object({
  status: z.enum(['pending_verification', 'verified', 'rejected']).default('pending_verification'),
  ...paginationQuery,
});
export type AdminTutorListQuery = z.infer<typeof adminTutorListQuery>;

export const verifyTutorBody = z
  .object({
    status: z.enum(['verified', 'rejected']),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((body) => body.status !== 'rejected' || body.notes, {
    message: 'Alasan penolakan wajib diisi',
    path: ['notes'],
  });
export type VerifyTutorBody = z.infer<typeof verifyTutorBody>;
