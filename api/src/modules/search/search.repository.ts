import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import type { SearchCoursesQuery, SearchTutorsQuery } from './search.schema';

const KM_PER_DEGREE = 111;
const MAX_RADIUS_KM = 50; // batas radius wilayah layanan (tutor.schema)

export const searchRepository = {
  /**
   * Pencarian tutor (FR-SEARCH-01/02/03). Jika lat/lng dikirim → hanya tutor yang wilayah
   * layanan radius-nya mencakup titik tsb, dengan jarak dihitung Haversine (docs/05-erd.md §4).
   */
  async searchTutorIds(query: SearchTutorsQuery, skip: number, take: number) {
    const useLocation =
      query.lat !== undefined && query.lng !== undefined && query.mode !== 'online';
    const conditions: Prisma.Sql[] = [
      Prisma.sql`tp.verification_status = 'verified'`,
      Prisma.sql`u.status = 'active'`,
    ];

    if (query.subjectId) {
      conditions.push(
        Prisma.sql`EXISTS (SELECT 1 FROM tutor_subjects ts WHERE ts.tutor_profile_id = tp.id AND ts.subject_id = ${query.subjectId})`,
      );
    }
    if (query.educationLevelId) {
      conditions.push(
        Prisma.sql`EXISTS (SELECT 1 FROM tutor_education_levels tel WHERE tel.tutor_profile_id = tp.id AND tel.education_level_id = ${query.educationLevelId})`,
      );
    }
    const mode = query.mode ?? (useLocation ? 'tatap_muka' : undefined);
    if (mode) conditions.push(Prisma.sql`tp.teaching_mode IN (${mode}, 'both')`);
    if (query.minRate !== undefined)
      conditions.push(Prisma.sql`tp.hourly_rate >= ${query.minRate}`);
    if (query.maxRate !== undefined)
      conditions.push(Prisma.sql`tp.hourly_rate <= ${query.maxRate}`);
    if (query.minRating !== undefined)
      conditions.push(Prisma.sql`tp.avg_rating >= ${query.minRating}`);
    if (query.q) conditions.push(Prisma.sql`u.full_name LIKE ${`%${query.q}%`}`);

    let distanceJoin = Prisma.empty;
    let distanceSelect = Prisma.sql`NULL AS distance_km`;
    if (useLocation) {
      const lat = query.lat!;
      const lng = query.lng!;
      // Bounding box memakai index idx_service_area_center sebelum menghitung Haversine (NFR-PERF-02)
      const latDelta = MAX_RADIUS_KM / KM_PER_DEGREE;
      const lngDelta =
        MAX_RADIUS_KM / (KM_PER_DEGREE * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));
      const userRadius = query.radiusKm
        ? Prisma.sql`AND x.dist <= ${query.radiusKm}`
        : Prisma.empty;
      distanceJoin = Prisma.sql`
        JOIN (
          SELECT x.tutor_profile_id, MIN(x.dist) AS distance_km
          FROM (
            SELECT tsa.tutor_profile_id, tsa.radius_km,
              (6371 * ACOS(LEAST(1,
                COS(RADIANS(${lat})) * COS(RADIANS(tsa.center_latitude)) *
                COS(RADIANS(tsa.center_longitude) - RADIANS(${lng})) +
                SIN(RADIANS(${lat})) * SIN(RADIANS(tsa.center_latitude))
              ))) AS dist
            FROM tutor_service_areas tsa
            WHERE tsa.area_type = 'radius'
              AND tsa.center_latitude BETWEEN ${lat - latDelta} AND ${lat + latDelta}
              AND tsa.center_longitude BETWEEN ${lng - lngDelta} AND ${lng + lngDelta}
          ) x
          WHERE x.dist <= x.radius_km ${userRadius}
          GROUP BY x.tutor_profile_id
        ) d ON d.tutor_profile_id = tp.id`;
      distanceSelect = Prisma.sql`d.distance_km`;
    }

    const orderBy = {
      relevance: useLocation
        ? Prisma.sql`d.distance_km ASC, tp.avg_rating DESC, tp.id ASC`
        : Prisma.sql`tp.avg_rating DESC, tp.review_count DESC, tp.id ASC`,
      price_asc: Prisma.sql`tp.hourly_rate ASC, tp.id ASC`,
      price_desc: Prisma.sql`tp.hourly_rate DESC, tp.id ASC`,
      rating: Prisma.sql`tp.avg_rating DESC, tp.review_count DESC, tp.id ASC`,
      distance: Prisma.sql`d.distance_km ASC, tp.id ASC`,
    }[query.sort];

    const where = Prisma.join(conditions, ' AND ');
    const [rows, countRows] = await Promise.all([
      prisma.$queryRaw<{ id: bigint; distance_km: number | null }[]>(Prisma.sql`
        SELECT tp.id, ${distanceSelect}
        FROM tutor_profiles tp
        JOIN users u ON u.id = tp.user_id
        ${distanceJoin}
        WHERE ${where}
        ORDER BY ${orderBy}
        LIMIT ${take} OFFSET ${skip}`),
      prisma.$queryRaw<{ total: bigint }[]>(Prisma.sql`
        SELECT COUNT(*) AS total
        FROM tutor_profiles tp
        JOIN users u ON u.id = tp.user_id
        ${distanceJoin}
        WHERE ${where}`),
    ]);

    return {
      rows: rows.map((row) => ({
        id: row.id,
        distanceKm: row.distance_km === null ? null : Number(row.distance_km),
      })),
      total: Number(countRows[0]?.total ?? 0),
    };
  },

  findTutorCards(ids: bigint[]) {
    return prisma.tutorProfile.findMany({
      where: { id: { in: ids } },
      include: {
        user: { select: { fullName: true } },
        subjects: { include: { subject: true } },
        educationLevels: { include: { educationLevel: true } },
        serviceAreas: { select: { areaType: true, areaName: true } },
      },
    });
  },

  // FR-SEARCH-04
  searchCourses(query: SearchCoursesQuery, skip: number, take: number) {
    const where: Prisma.CourseWhereInput = {
      status: 'published',
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.educationLevelId ? { educationLevelId: query.educationLevelId } : {}),
      ...(query.level ? { level: query.level } : {}),
      ...(query.priceType ? { isFree: query.priceType === 'free' } : {}),
      ...(query.minRating !== undefined ? { avgRating: { gte: query.minRating } } : {}),
      ...(query.q ? { title: { contains: query.q } } : {}),
    };
    const orderBy: Prisma.CourseOrderByWithRelationInput[] = {
      newest: [{ createdAt: 'desc' as const }],
      popular: [{ enrollments: { _count: 'desc' as const } }, { createdAt: 'desc' as const }],
      price_asc: [{ price: 'asc' as const }],
      price_desc: [{ price: 'desc' as const }],
      rating: [{ avgRating: 'desc' as const }, { reviewCount: 'desc' as const }],
    }[query.sort];

    return prisma.$transaction([
      prisma.course.findMany({
        where,
        orderBy: [...orderBy, { id: 'asc' }],
        skip,
        take,
        include: {
          category: true,
          educationLevel: true,
          createdBy: { select: { fullName: true } },
          _count: { select: { enrollments: true } },
          modules: { select: { _count: { select: { lessons: true } } } },
        },
      }),
      prisma.course.count({ where }),
    ]);
  },
};
