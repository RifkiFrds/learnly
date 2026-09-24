import { z } from 'zod';
import { dateString, idSchema } from '../../middlewares/validate';

export const updateMeBody = z
  .object({
    fullName: z.string().trim().min(2).max(191).optional(),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9]{9,15}$/, 'nomor HP 9-15 digit')
      .nullable()
      .optional(),
    currentPassword: z.string().min(1).optional(),
    newPassword: z.string().min(8, 'minimal 8 karakter').max(72).optional(),
  })
  .refine((body) => !body.newPassword || body.currentPassword, {
    message: 'Password lama wajib diisi untuk mengganti password',
    path: ['currentPassword'],
  });
export type UpdateMeBody = z.infer<typeof updateMeBody>;

export const learnerBody = z.object({
  fullName: z.string().trim().min(2).max(191),
  dateOfBirth: dateString.nullable().optional(),
  educationLevelId: idSchema.nullable().optional(),
});
export type LearnerBody = z.infer<typeof learnerBody>;
export const updateLearnerBody = learnerBody.partial();
export type UpdateLearnerBody = z.infer<typeof updateLearnerBody>;

export const addressBody = z.object({
  label: z.string().trim().min(1).max(100),
  fullAddress: z.string().trim().min(5).max(500),
  detailNote: z.string().trim().max(500).nullable().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type AddressBody = z.infer<typeof addressBody>;
export const updateAddressBody = addressBody.partial();
export type UpdateAddressBody = z.infer<typeof updateAddressBody>;
