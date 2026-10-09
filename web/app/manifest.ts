import type { MetadataRoute } from 'next';

/** Web App Manifest Learnly — docs/10-design-system.md §4.1 (warna brand) */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Learnly — Learn Your Way, Grow Your Future',
    short_name: 'Learnly',
    description:
      'Kursus online, tutor online, dan tutor yang datang ke rumahmu — dalam satu platform belajar.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAF8F4',
    theme_color: '#231F1A',
    lang: 'id',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
