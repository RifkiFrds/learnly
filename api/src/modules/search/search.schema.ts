import { z } from 'zod';
import { paginationQuery } from '../../lib/pagination';
import { idSchema } from '../../middlewares/validate';

export const searchTutorsQuery = z
  .object({
    subjectId: idSchema.optional(),
    educationLevelId: idSchema.optional(),
    mode: z.enum(['online', 'tatap_muka']).optional(),
    minRate: z.coerce.number().min(0).optional(),
    maxRate: z.coerce.number().min(0).optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().min(0.5).max(50).optional(),
    q: z.string().trim().min(2).max(100).optional(),
    sort: z
      .enum(['relevance', 'price_asc', 'price_desc', 'rating', 'distance'])
      .default('relevance'),
    ...paginationQuery,
  })
  .refine((query) => (query.lat === undefined) === (query.lng === undefined), {
    message: 'lat dan lng harus dikirim bersamaan',
    path: ['lat'],
  })
  .refine((query) => query.sort !== 'distance' || query.lat !== undefined, {
    message: 'Urutkan berdasarkan jarak butuh lokasi (lat & lng)',
    path: ['sort'],
  })
  .refine(
    (query) =>
      query.minRate === undefined || query.maxRate === undefined || query.minRate <= query.maxRate,
    { message: 'minRate tidak boleh lebih besar dari maxRate', path: ['minRate'] },
  );
export type SearchTutorsQuery = z.infer<typeof searchTutorsQuery>;

export const searchCoursesQuery = z.object({
  categoryId: idSchema.optional(),
  educationLevelId: idSchema.optional(),
  level: z.enum(['pemula', 'menengah', 'lanjut']).optional(),
  priceType: z.enum(['free', 'paid']).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  q: z.string().trim().min(2).max(100).optional(),
  sort: z.enum(['newest', 'popular', 'price_asc', 'price_desc', 'rating']).default('newest'),
  ...paginationQuery,
});
export type SearchCoursesQuery = z.infer<typeof searchCoursesQuery>;
