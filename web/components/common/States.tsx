'use client';

import { CircleAlert, RotateCw } from 'lucide-react';
import Link from 'next/link';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { errorMessage } from '@/lib/api-client';
import { Illustration, type IllustrationVariant } from './Illustration';

/** §5 Empty State: ilustrasi garis + 1 kalimat manusiawi + CTA jelas */
export function EmptyState({
  illustration,
  title,
  description,
  action,
  className,
}: {
  illustration: IllustrationVariant;
  title: string;
  description?: string;
  action?: { label: string; href?: string; onClick?: () => void };
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-lg border border-dashed border-border bg-surface px-6 py-10 text-center',
        className,
      )}
    >
      <Illustration variant={illustration} className="h-24 w-32" />
      <p className="mt-4 font-sans text-heading-md text-ink-900">{title}</p>
      {description && <p className="mt-1 max-w-md text-body-sm text-ink-500">{description}</p>}
      {action &&
        (action.href ? (
          <Button asChild className="mt-5">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : (
          <Button className="mt-5" onClick={action.onClick}>
            {action.label}
          </Button>
        ))}
    </div>
  );
}

/** Pesan error actionable + tombol coba lagi */
export function ErrorState({
  error,
  onRetry,
  title = 'Data belum bisa dimuat',
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center rounded-lg border border-danger-100 bg-surface px-6 py-10 text-center',
        className,
      )}
    >
      <CircleAlert className="size-8 text-danger-600" aria-hidden />
      <p className="mt-3 font-sans text-heading-md text-ink-900">{title}</p>
      <p className="mt-1 max-w-md text-body-sm text-ink-500">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-5" onClick={onRetry}>
          <RotateCw aria-hidden /> Coba lagi
        </Button>
      )}
    </div>
  );
}

export function CardSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('rounded-lg border border-border bg-surface p-5', className)} aria-hidden>
      <Skeleton className="h-5 w-2/5" />
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={cn('mt-3 h-4', index % 2 ? 'w-3/5' : 'w-4/5')} />
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} role="status" aria-label="Memuat data">
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Memuat data">
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} lines={4} />
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Memuat halaman">
      <Skeleton className="h-9 w-1/3" />
      <Skeleton className="h-4 w-1/2" />
      <ListSkeleton count={3} />
    </div>
  );
}
