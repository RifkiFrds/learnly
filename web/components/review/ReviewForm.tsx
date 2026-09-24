'use client';

import { Star } from 'lucide-react';
import { useId, useState } from 'react';
import { toast } from 'sonner';
import { cn } from 'cn';
import { FormError } from '@/components/form/Field';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateReview, useUpdateReview } from '@/hooks/api/reviews';
import { errorMessage } from '@/lib/api-client';

const RATING_HINT = ['', 'Kurang sekali', 'Kurang', 'Cukup', 'Bagus', 'Sangat bagus'];

/** Pilih bintang 1–5: radio group yang bisa dipakai keyboard (panah kiri/kanan). */
export function RatingInput({ value, onChange, label }: { value: number; onChange: (value: number) => void; label: string }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div>
      <div className="flex items-center gap-1" role="radiogroup" aria-label={label} onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} bintang — ${RATING_HINT[star]}`}
            tabIndex={value === star || (!value && star === 1) ? 0 : -1}
            onMouseEnter={() => setHover(star)}
            onClick={() => onChange(star)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                event.preventDefault();
                onChange(Math.min(5, (value || 0) + 1));
              }
              if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
                event.preventDefault();
                onChange(Math.max(1, (value || 2) - 1));
              }
            }}
            className="flex size-11 cursor-pointer items-center justify-center rounded-md"
          >
            <Star className={cn('size-7 transition-colors', star <= shown ? 'fill-warning-600 text-warning-600' : 'text-ink-300')} aria-hidden />
          </button>
        ))}
        <span className="ml-2 text-body-sm text-ink-700" aria-hidden>{shown ? RATING_HINT[shown] : ''}</span>
      </div>
    </div>
  );
}

/** Form ulasan baru atau edit (FR-REVIEW-01/02). */
export function ReviewForm({
  target,
  existing,
  onDone,
  subjectLabel,
}: {
  target: { reviewableType: 'tutor_booking' | 'course'; reviewableId: number };
  existing?: { id: number; rating: number; comment: string | null };
  onDone?: () => void;
  subjectLabel: string;
}) {
  const id = useId();
  const create = useCreateReview();
  const update = useUpdateReview();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [error, setError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!rating) return setError('Pilih jumlah bintang dulu.');
    try {
      if (existing) await update.mutateAsync({ id: existing.id, rating, comment: comment.trim() });
      else await create.mutateAsync({ ...target, rating, comment: comment.trim() });
      toast.success(existing ? 'Ulasan diperbarui.' : 'Terima kasih! Ulasanmu membantu siswa lain memilih.');
      onDone?.();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <FormError message={error} />
      <div className="space-y-1.5">
        <p className="text-body-sm font-semibold text-ink-900">Bagaimana {subjectLabel}?</p>
        <RatingInput value={rating} onChange={setRating} label={`Rating untuk ${subjectLabel}`} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-comment`} className="text-body-sm font-semibold text-ink-900">
          Ceritakan pengalamanmu <span className="font-normal text-ink-500">(opsional)</span>
        </Label>
        <Textarea
          id={`${id}-comment`}
          rows={3}
          maxLength={2000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Mis. cara menjelaskan, ketepatan waktu, perkembangan anak setelah sesi."
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>{pending ? 'Menyimpan…' : existing ? 'Simpan perubahan' : 'Kirim ulasan'}</Button>
        {existing && onDone && <Button type="button" variant="secondary" onClick={onDone}>Batal</Button>}
      </div>
    </form>
  );
}
