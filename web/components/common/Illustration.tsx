// Ilustrasi garis sederhana 2 warna (ink-700 + primary-600) untuk empty state — docs/10-design-system.md §6.
// Dibuat custom (SVG), bukan stok 3D/flat generik.

type Variant = 'calendar' | 'search' | 'book' | 'bell' | 'receipt' | 'people' | 'map' | 'report';

const stroke = { fill: 'none', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function Illustration({ variant, className }: { variant: Variant; className?: string }) {
  const ink = 'var(--color-ink-700)';
  const accent = 'var(--color-primary-600)';
  return (
    <svg viewBox="0 0 120 96" className={className} aria-hidden>
      <path d="M8 88h104" stroke="var(--color-border)" {...stroke} />
      {variant === 'calendar' && (
        <>
          <rect x="28" y="20" width="64" height="58" rx="6" stroke={ink} {...stroke} />
          <path d="M28 36h64M44 14v12M76 14v12" stroke={ink} {...stroke} />
          <path d="M44 52h8M60 52h8M44 64h8" stroke={ink} {...stroke} />
          <circle cx="76" cy="64" r="6" stroke={accent} {...stroke} />
        </>
      )}
      {variant === 'search' && (
        <>
          <circle cx="54" cy="44" r="22" stroke={ink} {...stroke} />
          <path d="M70 60l18 18" stroke={ink} {...stroke} />
          <path d="M44 44h20" stroke={accent} {...stroke} />
        </>
      )}
      {variant === 'book' && (
        <>
          <path d="M60 28c-10-6-22-6-32-2v52c10-4 22-4 32 2 10-6 22-6 32-2V26c-10-4-22-4-32 2z" stroke={ink} {...stroke} />
          <path d="M60 28v52" stroke={ink} {...stroke} />
          <path d="M70 44h12M70 54h12" stroke={accent} {...stroke} />
        </>
      )}
      {variant === 'bell' && (
        <>
          <path d="M40 66V48a20 20 0 0140 0v18l6 8H34z" stroke={ink} {...stroke} />
          <path d="M54 80a6 6 0 0012 0" stroke={ink} {...stroke} />
          <path d="M86 28l6-6M90 40h8" stroke={accent} {...stroke} />
        </>
      )}
      {variant === 'receipt' && (
        <>
          <path d="M36 14h48v70l-8-5-8 5-8-5-8 5-8-5-8 5z" stroke={ink} {...stroke} />
          <path d="M46 32h28M46 44h28M46 56h16" stroke={ink} {...stroke} />
          <path d="M66 64l4 4 8-8" stroke={accent} {...stroke} />
        </>
      )}
      {variant === 'people' && (
        <>
          <circle cx="46" cy="36" r="10" stroke={ink} {...stroke} />
          <path d="M28 76c0-12 8-20 18-20s18 8 18 20" stroke={ink} {...stroke} />
          <circle cx="78" cy="42" r="8" stroke={accent} {...stroke} />
          <path d="M66 76c0-10 6-16 12-16s12 6 12 16" stroke={accent} {...stroke} />
        </>
      )}
      {variant === 'map' && (
        <>
          <path d="M20 28l26-10 28 10 26-10v58l-26 10-28-10-26 10z" stroke={ink} {...stroke} />
          <path d="M46 18v58M74 28v58" stroke={ink} {...stroke} />
          <path d="M60 36a8 8 0 00-8 8c0 6 8 14 8 14s8-8 8-14a8 8 0 00-8-8z" stroke={accent} {...stroke} />
        </>
      )}
      {variant === 'report' && (
        <>
          <rect x="32" y="14" width="56" height="70" rx="5" stroke={ink} {...stroke} />
          <path d="M44 32h32M44 44h32" stroke={ink} {...stroke} />
          <path d="M44 70l8-10 8 6 14-16" stroke={accent} {...stroke} />
        </>
      )}
    </svg>
  );
}

export type IllustrationVariant = Variant;
