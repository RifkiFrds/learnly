import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from 'cn';

/** Select native (ramah mobile & keyboard) dengan gaya yang sama dengan Input — docs/10 §5 Form Input */
function NativeSelect({ className, wrapperClassName, children, ...props }: React.ComponentProps<'select'> & { wrapperClassName?: string }) {
  return (
    <div className={cn('relative', wrapperClassName)}>
      <select
        data-slot="native-select"
        className={cn(
          'h-11 w-full min-w-0 cursor-pointer appearance-none rounded-lg border border-border bg-surface py-0 pr-10 pl-3.5 font-sans text-body-md text-ink-900 transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50',
          'focus-visible:border-primary-600 focus-visible:ring-2 focus-visible:ring-primary-600/25',
          'aria-invalid:border-danger-600 aria-invalid:ring-2 aria-invalid:ring-danger-600/20',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink-500" aria-hidden />
    </div>
  );
}

export { NativeSelect };
