import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';
import { Slot } from 'radix-ui';

// Status chip: selalu pasangan bg-{status}-100 + text-{status}-600 (docs/10-design-system.md §4.1, §5).
const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full px-2.5 py-1 font-sans text-label-sm whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3.5',
  {
    variants: {
      variant: {
        neutral: 'bg-surface-muted text-ink-700',
        brand: 'bg-primary-100 text-primary-700',
        success: 'bg-success-100 text-success-600',
        warning: 'bg-warning-100 text-warning-600',
        danger: 'bg-danger-100 text-danger-600',
        info: 'bg-info-100 text-info-600',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

function Badge({
  className,
  variant = 'neutral',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span';

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
