import type { NextConfig } from 'next';

// Proxy same-origin ke Learnly API: browser memanggil /api/v1/* di domain web (learnly.web.id),
// Next.js meneruskannya ke API (api.learnly.web.id). Cookie refresh token jadi first-party
// (tidak diblokir Safari/ITP) dan CORS tidak dipakai browser. Lihat Bab 3.3 - Architecture & Infrastructure Design.
// API_PROXY_TARGET = origin API tanpa path (mis. https://api.learnly.web.id), dibaca saat build & start.
const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1';
const proxyTarget = (
  process.env.API_PROXY_TARGET ?? (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:4000')
).replace(/\/+$/, '');

if (apiBase.startsWith('/') && !proxyTarget) {
  throw new Error(
    'API_PROXY_TARGET wajib diisi (origin Learnly API, mis. https://api.learnly.web.id) karena NEXT_PUBLIC_API_BASE_URL relatif.',
  );
}

const nextConfig: NextConfig = {
  // Wajib untuk image Docker ringan: hanya menyalin file yang diperlukan saat runtime
  // (lihat Handbook Deploy Bab 6 - Docker Configuration, web/Dockerfile Stage 3).
  output: 'standalone',
  async rewrites() {
    if (!proxyTarget) return [];
    return [
      { source: '/api/v1/:path*', destination: `${proxyTarget}/api/v1/:path*` },
      // file unggahan STORAGE_DRIVER=local (bukti transfer, dokumen, sertifikat PDF) ikut lewat domain web
      { source: '/uploads/:path*', destination: `${proxyTarget}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
