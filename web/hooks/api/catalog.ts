'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type {
  CourseCard,
  CourseDetail,
  MasterItem,
  ReviewItem,
  SlotsResponse,
  TutorCard,
  TutorProfile,
} from '@/lib/types';

// ---- master data (jarang berubah → cache lama)
const masterQuery = (kind: 'subjects' | 'education-levels' | 'categories') => ({
  queryKey: ['master', kind],
  queryFn: () => api.get<MasterItem[]>(`/${kind}`, undefined, false),
  staleTime: 10 * 60_000,
});
export const useSubjects = () => useQuery(masterQuery('subjects'));
export const useEducationLevels = () => useQuery(masterQuery('education-levels'));
export const useCategories = () => useQuery(masterQuery('categories'));

// ---- pencarian tutor & kursus (publik)
export interface TutorSearchParams {
  subjectId?: string;
  educationLevelId?: string;
  mode?: string;
  minRate?: string;
  maxRate?: string;
  minRating?: string;
  lat?: string;
  lng?: string;
  radiusKm?: string;
  q?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export function useTutorSearch(params: TutorSearchParams) {
  return useQuery({
    queryKey: ['search', 'tutors', params],
    queryFn: () => api.list<TutorCard>('/search/tutors', { ...params }, false),
    placeholderData: keepPreviousData,
  });
}

export interface CourseSearchParams {
  categoryId?: string;
  educationLevelId?: string;
  level?: string;
  priceType?: string;
  minRating?: string;
  q?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export function useCourseSearch(params: CourseSearchParams) {
  return useQuery({
    queryKey: ['search', 'courses', params],
    queryFn: () => api.list<CourseCard>('/search/courses', { ...params }, false),
    placeholderData: keepPreviousData,
  });
}

// ---- detail publik
export function useTutor(id: string | number | undefined) {
  return useQuery({
    queryKey: ['tutor', String(id)],
    queryFn: () => api.get<TutorProfile>(`/tutors/${id}`, undefined, false),
    enabled: Boolean(id),
  });
}

export function useTutorSlots(id: string | number | undefined, date: string) {
  return useQuery({
    queryKey: ['tutor', String(id), 'slots', date],
    queryFn: () => api.get<SlotsResponse>(`/tutors/${id}/available-slots`, { date }, false),
    enabled: Boolean(id && date),
  });
}

export function useTutorReviews(id: string | number | undefined, page = 1) {
  return useQuery({
    queryKey: ['tutor', String(id), 'reviews', page],
    queryFn: () => api.list<ReviewItem>(`/tutors/${id}/reviews`, { page, limit: 10 }, false),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  });
}

export function useCourse(slugOrId: string | number | undefined, asAdmin = false) {
  return useQuery({
    queryKey: ['course', String(slugOrId), asAdmin],
    queryFn: () => api.get<CourseDetail>(`/courses/${slugOrId}`, undefined, asAdmin),
    enabled: Boolean(slugOrId),
  });
}

export function useCourseReviews(courseId: number | undefined, page = 1) {
  return useQuery({
    queryKey: ['course', courseId, 'reviews', page],
    queryFn: () => api.list<ReviewItem>(`/courses/${courseId}/reviews`, { page, limit: 10 }, false),
    enabled: Boolean(courseId),
    placeholderData: keepPreviousData,
  });
}
