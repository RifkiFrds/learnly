# Tech Stack — Learnly

Status: Draft v1.1 (disederhanakan untuk skala tugas/proyek kecil)
Terkait: [04-architecture.md](04-architecture.md)

> **Catatan revisi v1.1**: versi awal dokumen ini terlalu "over-engineered" untuk skala proyek (job queue, WebSocket server, payment gateway berbayar, dsb). Versi ini disederhanakan agar (a) mudah dikerjakan dalam waktu terbatas, (b) bisa **deploy gratis** — FE di **Vercel**, BE+DB di **Railway** — tanpa servis tambahan berbayar (Redis, S3, payment gateway).

## 1. Ringkasan

| Layer | Teknologi | Alasan Singkat |
|---|---|---|
| Frontend | Next.js 14+ (App Router), TypeScript | SSR untuk katalog kursus/tutor, ekosistem React terbesar |
| Styling/UI | Tailwind CSS + shadcn/ui | Cepat dikembangkan, komponen siap pakai |
| State/Data Fetching | TanStack Query (React Query) | Cache & refetch/polling API bawaan (dipakai juga untuk "real-time" via polling) |
| Form & Validasi FE | React Hook Form + Zod | Validasi konsisten dengan BE |
| Peta | Leaflet + OpenStreetMap tiles | Gratis, tanpa perlu billing key |
| Backend | Node.js (LTS) + Express.js, TypeScript | Sesuai requirement, ringan |
| Validasi BE | Zod | Satu pola validasi dengan FE |
| ORM & Migrasi | Prisma ORM | Type-safe, migration bawaan, cocok untuk MySQL |
| Database | MySQL 8.x | Sesuai requirement, tersedia gratis di Railway |
| Auth | JWT (access token) + refresh token (httpOnly cookie) | Stateless, tidak butuh session store terpisah |
| **Pembayaran** | **Manual — QRIS statis + upload bukti transfer, verifikasi admin** | Tanpa biaya integrasi, tanpa akun merchant/payment gateway; cukup untuk skala tugas |
| **Update status real-time** | **Polling** (FE fetch ulang tiap beberapa detik via TanStack Query `refetchInterval`) | Tidak butuh server WebSocket/Redis terpisah, tetap terasa "live" untuk kebutuhan tugas |
| File Upload/Storage | Cloudinary (free tier) | Simpan bukti bayar, dokumen tutor, sertifikat, thumbnail — setup jauh lebih simpel dari S3, gratis untuk volume kecil |
| Email (opsional) | Nodemailer + Gmail App Password | Gratis, cukup untuk reset password; tidak wajib untuk verifikasi email (lihat §2.6) |
| PDF Sertifikat | `pdf-lib` atau `puppeteer` (generate langsung saat request, tanpa job queue) | Volume rendah, generate on-demand cukup cepat |
| Testing | Vitest/Jest + Supertest (BE), secukupnya untuk business logic penting | Tidak perlu coverage penuh untuk skala tugas |
| Lint/Format | ESLint + Prettier | Konsistensi gaya kode |
| Struktur proyek | **Dua folder terpisah** `web/` (Next.js) dan `api/` (Express) dalam satu repo, **tanpa** tooling monorepo (Turborepo/pnpm workspaces) | Lebih simpel untuk dipahami & di-deploy terpisah (Vercel hanya baca `web/`, Railway hanya baca `api/`) |
| Container (opsional, dev lokal) | Docker Compose hanya untuk MySQL (agar tidak perlu install MySQL lokal) | API & web cukup dijalankan langsung dengan `npm run dev` |
| Hosting FE | **Vercel** (free tier) | Native Next.js, auto-deploy dari GitHub |
| Hosting BE + DB | **Railway** (free/trial tier) | Auto-deploy dari GitHub, MySQL managed tersedia satu klik |

### 1.1 Versi yang Dipasang (Fase 0)

Next.js 16 (App Router, Turbopack) · Tailwind CSS 4 (token tetap di `web/tailwind.config.ts`, dimuat via `@config` di `globals.css`) · shadcn/ui (primitives Radix) · TanStack Query 5 · Express 5 · Prisma 6 · Zod 4 · TypeScript 5.9. Prisma sengaja di-pin ke 6.x (stabil, tidak butuh driver adapter seperti v7+); TypeScript di-pin ke 5.x karena `typescript-eslint` belum mendukung TS 7. Upgrade major dilakukan sadar, bukan otomatis.

Library backend Track A: `bcryptjs` (hash password), `jsonwebtoken` (JWT), `cookie-parser`, `multer` (upload), `cloudinary`, `nodemailer`, `pdf-lib` (sertifikat), `express-rate-limit` (store in-memory, tanpa Redis), `helmet`; test memakai `vitest`. Postman collection dijalankan otomatis dengan `newman` via `npx` (tidak masuk dependency).

## 2. Detail Keputusan

### 2.1 Pembayaran Manual (QRIS + Upload Bukti)

Menggantikan payment gateway (Midtrans/Xendit) yang butuh akun bisnis/verifikasi merchant dan tidak relevan untuk skala tugas:

1. Admin mengunggah **satu gambar QRIS statis** (QRIS pribadi/merchant) melalui halaman admin sekali di awal — disimpan sebagai `platform_settings` (key `qris_image_url`) atau sebagai record sederhana.
2. Saat checkout, sistem menampilkan gambar QRIS tersebut + nominal tagihan (dan/atau info rekening transfer manual sebagai alternatif).
3. User mengunggah **bukti transfer** (screenshot) melalui form upload → status pembayaran `menunggu_verifikasi`.
4. Admin membuka daftar pembayaran `menunggu_verifikasi`, melihat bukti, lalu **approve** (→ `paid`, booking/enrollment lanjut) atau **reject** (→ `ditolak`, user diminta upload ulang atau booking dibatalkan).
5. Tidak ada webhook, tidak ada signature verification, tidak ada idempotency-dari-luar — proses murni CRUD + perubahan status oleh admin.

Ini tetap mengikuti seluruh alur bisnis di PRD (rincian biaya, riwayat transaksi, kebijakan refund manual oleh admin) tanpa kompleksitas integrasi pihak ketiga.

### 2.2 Real-time via Polling (bukan WebSocket)

- Halaman detail booking (status tracking) melakukan `refetchInterval: 5000` (polling tiap 5 detik) menggunakan TanStack Query ke `GET /bookings/:id`.
- Cukup untuk kebutuhan tugas — tidak perlu Socket.IO, Redis, atau adapter multi-instance.
- Jika di masa depan dibutuhkan latensi lebih rendah, dapat di-upgrade ke WebSocket tanpa mengubah skema data (lihat [04-architecture.md](04-architecture.md) §9).

### 2.3 Tanpa Job Queue (BullMQ/Redis)

- Generate sertifikat PDF, kirim email, hitung ulang rating — dijalankan **langsung di dalam request** (synchronous) karena volume data skala tugas kecil, sehingga tidak butuh Redis/worker terpisah.
- Jika volume tumbuh besar, ini adalah titik upgrade pertama yang dicatat di [04-architecture.md](04-architecture.md) §9, bukan kebutuhan sekarang.

### 2.4 Cloudinary untuk Storage

- Free tier Cloudinary cukup untuk: bukti transfer, dokumen verifikasi tutor, foto profil, sertifikat PDF, thumbnail kursus.
- Upload langsung dari FE (signed upload) atau lewat BE (multer → Cloudinary SDK) — pilih **lewat BE** agar validasi (ukuran, tipe file) tetap terpusat & konsisten dengan RBAC.

### 2.5 Struktur Repo Tanpa Monorepo Tooling

```
learnly/
├── web/          # Next.js (deploy ke Vercel, root directory = web/)
├── api/          # Express (deploy ke Railway, root directory = api/)
└── docs/
```
- Tidak ada `packages/shared`. Tipe/skema yang perlu sama di FE-BE cukup **didefinisikan ulang secara sadar di masing-masing sisi** (duplikasi kecil, tapi menghindari kerumitan build-tooling monorepo). Jika di kemudian hari terasa merepotkan, baru pertimbangkan workspace tooling.
- Struktur folder internal `api/` dan `web/` tetap mengikuti [04-architecture.md](04-architecture.md) §4 (layered architecture tetap dipakai — ini bukan bagian yang "over-engineering", justru yang menjaga kode tetap rapi).

### 2.6 Email — Opsional, Tidak Memblokir

- Registrasi langsung membuat akun **aktif** (tidak ada langkah wajib "verifikasi email" yang memblokir booking) — menyederhanakan FR-AUTH-02 dari versi sebelumnya.
- Email (via Nodemailer + Gmail App Password, gratis) tetap dipakai untuk **lupa password** karena itu kebutuhan fungsional, bukan sekadar formalitas.
- Notifikasi lain (booking baru, status berubah) cukup ditampilkan **in-app** (tabel `notifications`, dipoll bersamaan dengan status booking) — tidak wajib dikirim email.

## 3. Environment Variables (Disederhanakan)

| Variabel | Digunakan di | Keterangan |
|---|---|---|
| `NODE_ENV` | api | `development`/`production`/`test` (default `development`) |
| `PORT` | api | port HTTP (default `4000`; di Railway di-inject otomatis) |
| `CORS_ORIGIN` | api | origin FE yang diizinkan CORS, dipisah koma (URL Vercel di production) |
| `DATABASE_URL` | api | koneksi MySQL Railway |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | api | signing token |
| `API_PUBLIC_URL` | api | URL publik API (membentuk URL file saat `STORAGE_DRIVER=local`) |
| `WEB_APP_URL` | api | URL web app untuk link reset password / verifikasi email |
| `STORAGE_DRIVER` | api | `local` (dev, folder `api/uploads`) atau `cloudinary` (wajib di production — filesystem Railway tidak permanen) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | api | upload file (wajib bila `STORAGE_DRIVER=cloudinary`) |
| `MAIL_DRIVER` | api | `log` (dev, email dicetak ke console) atau `smtp` (Gmail) |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | api | kirim email reset password (wajib bila `MAIL_DRIVER=smtp`) |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | api | akun admin pertama yang dibuat seed (password wajib ≥ 12 karakter di production) |
| `NEXT_PUBLIC_API_BASE_URL` | web | endpoint Express API (URL Railway) |
| `NEXT_PUBLIC_MAP_TILE_URL` | web | tile OpenStreetMap |

## 4. Deployment Free-Tier

| Komponen | Platform | Catatan |
|---|---|---|
| Frontend (Next.js) | **Vercel** (Hobby/free) | Connect repo GitHub, root directory `web/`, auto-deploy tiap push ke `main` |
| Backend (Express) | **Railway** (free/trial credit) | Connect repo GitHub, root directory `api/`, auto-deploy tiap push; set env vars di dashboard Railway |
| Database (MySQL) | **Railway MySQL plugin** | Satu klik dari dashboard Railway, `DATABASE_URL` otomatis tersedia sebagai variabel yang bisa direferensikan service `api` |

Tidak ada servis tambahan (Redis, message broker, object storage berbayar) yang perlu di-provision — cukup 2 service di Railway (api + MySQL) dan 1 project di Vercel.

## 5. Alternatif yang Sengaja Tidak Dipakai (agar tidak diulang-ulang oleh executor)

| Opsi | Kenapa tidak dipakai untuk skala ini |
|---|---|
| Midtrans/Xendit (payment gateway) | Butuh akun bisnis/verifikasi merchant, biaya transaksi, kompleksitas webhook — tidak sepadan untuk tugas. Pembayaran manual QRIS cukup dan tetap mendemonstrasikan alur bisnis yang sama. |
| Redis + BullMQ | Infra tambahan yang perlu di-provision & dibayar/dikonfigurasi terpisah di Railway; volume data tugas tidak butuh job async. |
| Socket.IO / WebSocket server | Menambah kompleksitas deployment (sticky session/adapter) tanpa manfaat signifikan pada skala kecil; polling cukup. |
| S3/Cloudflare R2 | Setup IAM/bucket lebih rumit dibanding Cloudinary untuk kebutuhan sederhana. |
| Turborepo/pnpm workspaces | Menambah lapisan tooling build yang tidak diperlukan untuk 2 aplikasi kecil yang di-deploy terpisah. |
| Sentry/observability lanjutan | `console.log`/logging sederhana cukup untuk tugas; ditambahkan hanya jika benar-benar dibutuhkan saat debugging produksi. |
| NestJS, PostgreSQL, GraphQL | Tetap tidak dipakai — di luar requirement eksplisit (Express + MySQL) dan menambah kompleksitas tanpa kebutuhan jelas. |
