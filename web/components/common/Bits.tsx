import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import Link from 'next/link';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { initials } from '@/lib/format';
import type { PageMeta } from '@/lib/types';

/** Wordmark Learnly */
export function Logo({ href = '/', className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn('rounded-sm font-display text-heading-lg text-ink-900', className)}
      aria-label="Learnly — ke beranda"
    >
      Learnly<span className="text-primary-600">.</span>
    </Link>
  );
}

/** Avatar inisial (belum ada foto profil di skema) */
export function Avatar({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'size-9 text-body-sm', md: 'size-12 text-body-md', lg: 'size-20 text-heading-lg' };
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-primary-100 font-sans font-semibold text-primary-700',
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

/** §5 Rating Stars: warna warning-600, angka + (jumlah ulasan) */
export function RatingStars({
  rating,
  count,
  size = 'sm',
  showEmpty = true,
}: {
  rating: number;
  count?: number;
  size?: 'sm' | 'md';
  showEmpty?: boolean;
}) {
  if (!count && showEmpty) {
    return <span className="text-body-sm text-ink-500">Belum ada ulasan</span>;
  }
  const iconSize = size === 'sm' ? 'size-3.5' : 'size-4.5';
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`Rating ${rating.toFixed(1)} dari 5, ${count ?? 0} ulasan`}>
      <span className="inline-flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((index) => {
          const fill = Math.max(0, Math.min(1, rating - (index - 1)));
          return (
            <span key={index} className={cn('relative', iconSize)}>
              <Star className={cn('absolute inset-0 text-border', iconSize)} fill="currentColor" strokeWidth={0} />
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star className={cn('text-warning-600', iconSize)} fill="currentColor" strokeWidth={0} />
              </span>
            </span>
          );
        })}
      </span>
      <span className="text-body-sm font-semibold text-ink-900">{rating.toFixed(1)}</span>
      {count !== undefined && <span className="text-body-sm text-ink-500">({count})</span>}
    </span>
  );
}

export function Pagination({ meta, onPage }: { meta?: PageMeta; onPage: (page: number) => void }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <nav className="mt-6 flex items-center justify-between gap-3" aria-label="Paginasi">
      <p className="text-body-sm text-ink-500">
        Halaman {meta.page} dari {meta.totalPages} · {meta.total} hasil
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" size="icon" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)} aria-label="Halaman sebelumnya">
          <ChevronLeft />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPage(meta.page + 1)}
          aria-label="Halaman berikutnya"
        >
          <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}

/** Baris label–nilai untuk ringkasan (biaya, detail) */
export function InfoRow({ label, value, strong = false }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <dt className="text-body-sm text-ink-500">{label}</dt>
      <dd className={cn('text-right', strong ? 'text-body-lg font-semibold text-ink-900' : 'text-body-sm text-ink-900')}>{value}</dd>
    </div>
  );
}

/** Kartu permukaan standar */
export function Panel({ title, action, children, className }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-lg border border-border bg-surface', className)}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <h2 className="font-sans text-heading-md text-ink-900">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
