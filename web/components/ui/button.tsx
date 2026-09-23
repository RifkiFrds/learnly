import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';
import { Slot } from 'radix-ui';

// Di-restyle sesuai docs/10-design-system.md §5 (Button) & §7 (focus ring, target sentuh 44px).
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg font-sans text-body-sm font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-700',
        secondary: 'border border-border bg-transparent text-ink-900 hover:bg-surface-muted',
        outline: 'border border-border bg-transparent text-ink-900 hover:bg-surface-muted',
        // Batal itu serius, bukan alarm: outline danger, bukan solid merah.
        destructive: 'border border-danger-600 bg-transparent text-danger-600 hover:bg-danger-100',
        ghost: 'text-ink-700 hover:bg-surface-muted hover:text-ink-900',
        link: 'text-primary-600 underline-offset-4 hover:text-primary-700 hover:underline',
      },
      size: {
        default: 'h-11 px-5',
        sm: 'h-9 px-3',
        lg: 'h-12 px-6 text-body-md',
        icon: 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
