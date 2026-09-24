import type { RequestHandler } from 'express';
import { sendSuccess } from '../../lib/response';
import type { SearchCoursesQuery, SearchTutorsQuery } from './search.schema';
import { searchService } from './search.service';

export const searchController = {
  tutors: (async (req, res) => {
    const { items, meta } = await searchService.searchTutors(req.valid.query as SearchTutorsQuery);
    sendSuccess(res, items, 200, meta);
  }) satisfies RequestHandler,

  courses: (async (req, res) => {
    const { items, meta } = await searchService.searchCourses(
      req.valid.query as SearchCoursesQuery,
    );
    sendSuccess(res, items, 200, meta);
  }) satisfies RequestHandler,
};
