import type { Metadata, Viewport } from 'next';
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

const SITE_URL = 'https://learnly.web.id';
const SITE_TITLE = 'Learnly — Learn Your Way, Grow Your Future';
const SITE_DESCRIPTION =
  'Kursus online, tutor online, dan tutor yang datang ke rumahmu — dalam satu platform belajar.';

export const metadata: Metadata = {
  // favicon.ico, icon.svg, apple-icon.png, dan manifest.ts (di app/) otomatis
  // disisipkan Next.js lewat file convention — tidak perlu didaftarkan ulang di sini.
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: '%s · Learnly' },
  description: SITE_DESCRIPTION,
  applicationName: 'Learnly',
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: SITE_URL,
    siteName: 'Learnly',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: '/logo-learnly.png', width: 512, height: 512, alt: 'Logo Learnly' }],
  },
  twitter: {
    card: 'summary',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ['/logo-learnly.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#231F1A',
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
