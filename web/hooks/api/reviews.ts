'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

function useInvalidateReviews() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['booking'] });
    queryClient.invalidateQueries({ queryKey: ['tutor'] });
    queryClient.invalidateQueries({ queryKey: ['tutor-reviews'] });
    queryClient.invalidateQueries({ queryKey: ['course'] });
    queryClient.invalidateQueries({ queryKey: ['course-reviews'] });
    queryClient.invalidateQueries({ queryKey: ['enrollment'] });
  };
}

export interface ReviewInput {
  rating: number;
  comment?: string | null;
}

export function useCreateReview() {
  const invalidate = useInvalidateReviews();
  return useMutation({
    mutationFn: (input: ReviewInput & { reviewableType: 'tutor_booking' | 'course'; reviewableId: number }) =>
      api.post('/reviews', { ...input, comment: input.comment || undefined }),
    onSuccess: invalidate,
  });
}

export function useUpdateReview() {
  const invalidate = useInvalidateReviews();
  return useMutation({
    mutationFn: ({ id, ...input }: ReviewInput & { id: number }) => api.patch(`/reviews/${id}`, { rating: input.rating, comment: input.comment || null }),
    onSuccess: invalidate,
  });
}

export function useReplyReview() {
  const invalidate = useInvalidateReviews();
  return useMutation({
    mutationFn: ({ id, replyText }: { id: number; replyText: string }) => api.post(`/reviews/${id}/reply`, { replyText }),
    onSuccess: invalidate,
  });
}
