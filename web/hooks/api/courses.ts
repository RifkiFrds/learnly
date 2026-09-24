'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { CourseDetail, CourseStatus, Enrollment, EnrollmentListItem, EnrollResult, QuizResult } from '@/lib/types';

// ---------- siswa / orang tua ----------

export function useMyEnrollments(page = 1, enabled = true) {
  return useQuery({
    queryKey: ['enrollments', page],
    queryFn: () => api.list<EnrollmentListItem>('/enrollments', { page, limit: 50 }),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useEnrollment(id: number | string) {
  return useQuery({
    queryKey: ['enrollment', String(id)],
    queryFn: () => api.get<Enrollment>(`/enrollments/${id}`),
    // kursus berbayar: pantau verifikasi pembayaran sampai akses terbuka
    refetchInterval: (query) => (query.state.data && !query.state.data.hasAccess && query.state.data.payment?.status === 'menunggu_verifikasi' ? 5000 : false),
  });
}

export function useEnroll(courseId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (learnerId?: number) => api.post<EnrollResult>(`/courses/${courseId}/enroll`, learnerId ? { learnerId } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

function useEnrollmentUpdate() {
  const queryClient = useQueryClient();
  return (enrollmentId: number) => {
    queryClient.invalidateQueries({ queryKey: ['enrollment', String(enrollmentId)] });
    queryClient.invalidateQueries({ queryKey: ['enrollments'] });
  };
}

export function useCompleteLesson(enrollmentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lessonId: number) => api.post<Enrollment>(`/lessons/${lessonId}/complete`, { enrollmentId }),
    onSuccess: (enrollment) => {
      queryClient.setQueryData(['enrollment', String(enrollmentId)], enrollment);
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
  });
}

export function useSubmitQuiz(enrollmentId: number) {
  const refresh = useEnrollmentUpdate();
  return useMutation({
    mutationFn: ({ lessonId, answers }: { lessonId: number; answers: { questionId: number; optionId: number }[] }) =>
      api.post<QuizResult>(`/lessons/${lessonId}/quiz-attempts`, { enrollmentId, answers }),
    onSuccess: () => refresh(enrollmentId),
  });
}

export function useSubmitAssignment(enrollmentId: number) {
  const refresh = useEnrollmentUpdate();
  return useMutation({
    mutationFn: ({ lessonId, file }: { lessonId: number; file: File }) => {
      const form = new FormData();
      form.append('file', file);
      form.append('enrollmentId', String(enrollmentId));
      return api.upload<{ message: string }>(`/lessons/${lessonId}/assignments`, form);
    },
    onSuccess: () => refresh(enrollmentId),
  });
}

export interface CertificateInfo {
  enrollmentId: number;
  learnerName: string;
  courseTitle: string;
  averageScore: number | null;
  certificateNumber: string;
  fileUrl: string | null;
  issuedAt: string;
}

export function useCertificate() {
  return useMutation({ mutationFn: (enrollmentId: number) => api.get<CertificateInfo>(`/enrollments/${enrollmentId}/certificate`) });
}

// ---------- admin: kursus ----------

export function useAdminCourses(status: CourseStatus, page = 1) {
  return useQuery({
    queryKey: ['admin-courses', status, page],
    queryFn: () => api.list<CourseDetail>('/admin/courses', { status, page, limit: 10 }),
    placeholderData: keepPreviousData,
  });
}

export function useAdminCourse(id: number | string) {
  return useQuery({ queryKey: ['admin-course', String(id)], queryFn: () => api.get<CourseDetail>(`/courses/${id}`) });
}

export interface CourseInput {
  title: string;
  description: string | null;
  categoryId: number;
  educationLevelId: number | null;
  level: 'pemula' | 'menengah' | 'lanjut';
  isFree: boolean;
  price: number;
  thumbnailUrl: string | null;
  passingGrade: number | null;
  issuesCertificate: boolean;
}

export interface LessonInput {
  title: string;
  type: 'video' | 'article' | 'quiz' | 'assignment';
  contentUrl?: string;
  contentBody?: string;
  durationSeconds?: number;
  questions?: { questionText: string; options: { optionText: string; isCorrect: boolean }[] }[];
}

/** Semua mutasi editor kursus mengembalikan detail kursus terbaru → langsung simpan ke cache */
function useCourseMutation<TInput>(courseId: number | undefined, request: (input: TInput) => Promise<CourseDetail>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: (course) => {
      queryClient.setQueryData(['admin-course', String(course.id)], course);
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      queryClient.invalidateQueries({ queryKey: ['course'] });
      queryClient.invalidateQueries({ queryKey: ['search', 'courses'] });
      if (courseId && courseId !== course.id) queryClient.invalidateQueries({ queryKey: ['admin-course', String(courseId)] });
    },
  });
}

export function useSaveCourse(id?: number) {
  return useCourseMutation(id, (input: CourseInput) => (id ? api.put<CourseDetail>(`/courses/${id}`, input) : api.post<CourseDetail>('/courses', input)));
}

export function useSetModules(id: number) {
  return useCourseMutation(id, (modules: { id?: number; title: string }[]) => api.put<CourseDetail>(`/courses/${id}/modules`, { modules }));
}

export function useAddLesson(id: number) {
  return useCourseMutation(id, ({ moduleId, ...input }: LessonInput & { moduleId: number }) =>
    api.post<CourseDetail>(`/courses/${id}/modules/${moduleId}/lessons`, input),
  );
}

export function useUpdateLesson(id: number) {
  return useCourseMutation(id, ({ lessonId, ...input }: LessonInput & { lessonId: number }) =>
    api.put<CourseDetail>(`/courses/${id}/lessons/${lessonId}`, input),
  );
}

export function useDeleteLesson(id: number) {
  return useCourseMutation(id, (lessonId: number) => api.delete<CourseDetail>(`/courses/${id}/lessons/${lessonId}`));
}

export function useCourseWorkflow(id: number) {
  return useCourseMutation(id, ({ action, notes }: { action: 'submit-review' | 'publish' | 'reject'; notes?: string }) =>
    api.patch<CourseDetail>(`/courses/${id}/${action}`, action === 'reject' ? { notes } : {}),
  );
}

export interface GradeRecap {
  course: { id: number; title: string; slug: string };
  participants: {
    enrollmentId: number;
    learner: { id: number; fullName: string };
    account: { fullName: string; email: string };
    status: 'active' | 'completed';
    progressPercent: number;
    quizzes: { lessonId: number; title: string; attempts: number; bestScore: number | null }[];
    assignments: {
      lessonId: number;
      title: string;
      submission: { id: number; fileUrl: string | null; submittedAt: string; score: number | null; feedback: string | null; gradedAt: string | null } | null;
    }[];
    certificate: { certificateNumber: string; issuedAt: string } | null;
  }[];
}

export function useGrades(courseId: number, enabled = true) {
  return useQuery({ queryKey: ['grades', courseId], queryFn: () => api.get<GradeRecap>(`/courses/${courseId}/grades`), enabled });
}

export function useGradeAssignment(courseId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ submissionId, ...body }: { submissionId: number; score: number; feedback: string }) => api.patch(`/assignments/${submissionId}/grade`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['grades', courseId] }),
  });
}
