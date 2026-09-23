import type { Metadata } from 'next';
import { Fraunces, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

// Pasangan font resmi Learnly — docs/10-design-system.md §4.2
const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  axes: ['opsz'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-plus-jakarta-sans',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Learnly — Learn Your Way, Grow Your Future',
  description:
    'Kursus online, tutor online, dan tutor yang datang ke rumahmu — dalam satu platform belajar.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="id"
      className={`${fraunces.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
