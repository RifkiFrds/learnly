import { buildMeta, toSkipTake } from '../../lib/pagination';
import { searchRepository } from './search.repository';
import type { SearchCoursesQuery, SearchTutorsQuery } from './search.schema';

export const searchService = {
  async searchTutors(query: SearchTutorsQuery) {
    const { skip, take } = toSkipTake(query);
    const { rows, total } = await searchRepository.searchTutorIds(query, skip, take);
    const cards = await searchRepository.findTutorCards(rows.map((row) => row.id));
    const byId = new Map(cards.map((card) => [card.id, card]));

    // Urutan hasil mengikuti query SQL (jarak/rating/tarif), bukan urutan findMany
    const items = rows.flatMap(({ id, distanceKm }) => {
      const card = byId.get(id);
      if (!card) return [];
      return [
        {
          id: card.id,
          fullName: card.user.fullName,
          bio: card.bio ? card.bio.slice(0, 160) : null,
          hourlyRate: card.hourlyRate,
          teachingMode: card.teachingMode,
          teachingExperienceYears: card.teachingExperienceYears,
          avgRating: card.avgRating,
          reviewCount: card.reviewCount,
          isVerified: card.verificationStatus === 'verified',
          subjects: card.subjects.map(({ subject }) => subject),
          educationLevels: card.educationLevels.map(({ educationLevel }) => educationLevel),
          serviceAreaNames: card.serviceAreas
            .map((area) => area.areaName)
            .filter((name): name is string => Boolean(name)),
          distanceKm: distanceKm === null ? null : Math.round(distanceKm * 10) / 10,
        },
      ];
    });

    return { items, meta: buildMeta(query.page, query.limit, total) };
  },

  async searchCourses(query: SearchCoursesQuery) {
    const { skip, take } = toSkipTake(query);
    const [rows, total] = await searchRepository.searchCourses(query, skip, take);
    const items = rows.map((course) => ({
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description ? course.description.slice(0, 200) : null,
      category: course.category,
      educationLevel: course.educationLevel,
      level: course.level,
      price: course.price,
      isFree: course.isFree,
      thumbnailUrl: course.thumbnailUrl,
      issuesCertificate: course.issuesCertificate,
      avgRating: course.avgRating,
      reviewCount: course.reviewCount,
      instructorName: course.createdBy.fullName,
      enrollmentCount: course._count.enrollments,
      lessonCount: course.modules.reduce((sum, mod) => sum + mod._count.lessons, 0),
    }));
    return { items, meta: buildMeta(query.page, query.limit, total) };
  },
};
