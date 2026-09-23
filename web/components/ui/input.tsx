import * as React from 'react';
import { cn } from 'cn';

// Border token, focus ring primary-600 2px (bukan biru default browser) — docs/10-design-system.md §5.
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-11 w-full min-w-0 rounded-lg border border-border bg-surface px-3.5 font-sans text-body-md text-ink-900 transition-[color,box-shadow] outline-none placeholder:text-ink-300 disabled:cursor-not-allowed disabled:opacity-50',
        'focus-visible:border-primary-600 focus-visible:ring-2 focus-visible:ring-primary-600/25',
        'aria-invalid:border-danger-600 aria-invalid:ring-2 aria-invalid:ring-danger-600/20',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
