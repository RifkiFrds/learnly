import type { Config } from 'tailwindcss';

// Design tokens Learnly — sumber: docs/10-design-system.md §4.
// Dimuat di Tailwind v4 lewat `@config` di app/globals.css.
// Jangan hardcode hex/px di komponen; tambah token di sini (dan update dokumen) jika butuh nilai baru.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './hooks/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // §4.1 — persis sesuai snippet dokumen
      colors: {
        background: '#FAF8F4',
        surface: { DEFAULT: '#FFFFFF', muted: '#F1EDE5' },
        ink: { 900: '#231F1A', 700: '#4A443C', 500: '#7A7267', 300: '#B6ADA0' },
        border: '#E4DFD5',
        primary: { 100: '#F3E1D6', 600: '#C15F3C', 700: '#A24D2F' },
        success: { 100: '#E1EBE3', 600: '#4A7C59' },
        warning: { 100: '#F3E7CF', 600: '#B4842A' },
        danger: { 100: '#F3DCD4', 600: '#B3432B' },
        info: { 100: '#DEE9EF', 600: '#3D6B8A' },
      },
      // §4.2 — CSS variable di-set oleh next/font di app/layout.tsx
      fontFamily: {
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans: ['var(--font-plus-jakarta-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'ui-monospace', 'monospace'],
      },
      // §4.2 — skala tipografi
      fontSize: {
        'display-lg': ['3rem', { lineHeight: '1.1', fontWeight: '600' }],
        'display-md': ['2.25rem', { lineHeight: '1.15', fontWeight: '600' }],
        'heading-lg': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        'heading-md': ['1.25rem', { lineHeight: '1.35', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6' }],
        'body-md': ['1rem', { lineHeight: '1.6' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],
        'label-sm': ['0.75rem', { lineHeight: '1.4', fontWeight: '600', letterSpacing: '0.05em' }],
      },
      // §4.3 — satu level shadow halus, tanpa shadow berwarna
      boxShadow: {
        sm: '0 1px 2px rgba(35,31,26,0.06)',
        md: '0 4px 12px rgba(35,31,26,0.08)',
      },
      // §4.4 — max content width
      maxWidth: {
        content: '1280px',
      },
    },
  },
};

export default config;
