import { z } from 'zod';

export const MASTER_DATA_KINDS = ['subjects', 'education-levels', 'categories'] as const;
export type MasterDataKind = (typeof MASTER_DATA_KINDS)[number];

const slug = z
  .string()
  .trim()
  .min(2)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug hanya huruf kecil, angka, dan tanda hubung');

export const createMasterDataBody = z.object({
  name: z.string().trim().min(2).max(100),
  slug: slug.optional(),
});
export type CreateMasterDataBody = z.infer<typeof createMasterDataBody>;

export const updateMasterDataBody = createMasterDataBody.partial();
export type UpdateMasterDataBody = z.infer<typeof updateMasterDataBody>;
