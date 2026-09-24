import { Router } from 'express';
import { validate } from '../../middlewares/validate';
import { searchController } from './search.controller';
import { searchCoursesQuery, searchTutorsQuery } from './search.schema';

// Publik (tanpa login)
export const searchRouter = Router();
searchRouter.get('/tutors', validate({ query: searchTutorsQuery }), searchController.tutors);
searchRouter.get('/courses', validate({ query: searchCoursesQuery }), searchController.courses);
