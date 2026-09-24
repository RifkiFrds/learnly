# Learnly

> Learn Your Way, Grow Your Future.

Platform edtech yang mengintegrasikan kursus online, tutor online, dan tutor tatap muka (on-demand, berbasis lokasi) dalam satu produk.

Repo ini berisi **dokumentasi perencanaan lengkap** di `docs/` (PRD → SRS → tech stack → arsitektur → ERD → API spec → SSD → roadmap → coding standards → design system) dan kode aplikasi di `web/` (Next.js) + `api/` (Express).

**Status:** Fase 0 selesai; **Track A — Backend (Fase B1–B8) selesai** secara lokal: seluruh endpoint [docs/06-api-spec.md](docs/06-api-spec.md) + Postman collection & panduan FE ([api/POSTMAN_GUIDE.md](api/POSTMAN_GUIDE.md)). Berikutnya: deploy Railway, lalu Track B — Frontend ([docs/08-roadmap.md](docs/08-roadmap.md)).

## Getting Started

### Struktur repo

```
learnly/
├── web/                # Next.js 16 (App Router) + Tailwind 4 + shadcn/ui → Vercel
├── api/                # Express 5 + TypeScript + Prisma 6 (MySQL) → Railway
├── docs/               # dokumentasi produk & teknis (sumber kebenaran)
└── docker-compose.yml  # HANYA MySQL untuk dev lokal
```

Dua proyek npm independen — **tanpa** Turborepo/workspaces. Jalankan `npm` di dalam masing-masing folder.

### Prasyarat

- Node.js ≥ 20 (dikembangkan dengan Node 24) & npm
- Docker Desktop (untuk MySQL lokal) — atau MySQL 8 sendiri / Railway MySQL

### 1. Jalankan MySQL

```bash
docker compose up -d mysql
```

MySQL di-expose di **port 3307** (bukan 3306, supaya tidak bentrok dengan MySQL lokal yang mungkin sudah terpasang). Kredensial dev: `root` / `learnly_root`, database `learnly`.

### 2. Jalankan API (`api/`)

```bash
cd api
cp .env.example .env        # nilai default sudah cocok dengan docker-compose
npm install
npm run prisma:migrate      # terapkan migrasi ke MySQL lokal (+ generate Prisma Client)
npm run db:seed             # admin, master data, pengaturan default + data demo (dev)
npm run dev                 # http://localhost:4000
```

Cek: `curl http://localhost:4000/health` →

```json
{ "success": true, "data": { "status": "ok", "db": "connected" } }
```

Bagian `db` berasal dari query `SELECT 1` sungguhan; jika MySQL mati, endpoint membalas `503` dengan `error.code = "SERVICE_UNAVAILABLE"`. Endpoint yang sama juga tersedia di `/api/v1/health`.

Semua env var divalidasi saat startup (`src/config/env.ts`); API langsung berhenti dengan pesan jelas jika ada yang kosong/tidak valid.

| Script | Fungsi |
|---|---|
| `npm run dev` | Dev server dengan hot reload (tsx watch) |
| `npm run build` | `prisma generate` + compile TypeScript ke `dist/` |
| `npm run start` | `prisma migrate deploy` + seed (idempotent) + jalankan `dist/server.js` (dipakai Railway) |
| `npm run db:seed` | Seed admin (`admin@learnly.id` / `AdminLearnly#2026` di dev), master data, pengaturan, data demo |
| `npm test` | Unit test (Vitest): state machine booking, biaya, verifikasi pembayaran, progres kursus, slot |
| `npm run postman:test` | Jalankan skenario end-to-end Postman dengan newman (API lokal harus menyala) |
| `npm run postman:build` / `postman:examples` | Generate ulang collection & environment (+ sisipkan contoh response dari run terakhir) |
| `npm run prisma:migrate` | Buat/terapkan migrasi baru saat dev (`prisma migrate dev`) |
| `npm run prisma:generate` | Generate ulang Prisma Client |
| `npm run prisma:studio` | GUI untuk melihat isi database |
| `npm run lint` / `typecheck` / `format` | ESLint / TypeScript / Prettier |

### 3. Jalankan Web (`web/`)

```bash
cd web
cp .env.example .env.local  # NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
npm install
npm run dev                 # http://localhost:3000
```

Scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `format`. Jalankan API lebih dulu — seluruh data (termasuk landing page) diambil dari API.

**Akun demo** (dibuat oleh seed API): admin `admin@learnly.id` / `AdminLearnly#2026`, tutor `demo.tutor.budi@learnly.id` · `demo.tutor.dewi@learnly.id` · `demo.tutor.fajar@learnly.id` / `DemoLearnly123`. Siswa/orang tua: daftar sendiri di `/daftar`. Di mode development, halaman masuk menampilkan daftar akun demo, dan lupa password / verifikasi email menampilkan tautan langsung (tanpa email).

**Halaman per peran** (route group App Router, guard per layout — belum login → `/masuk?next=…`, peran salah → halaman 403):

| Peran | Halaman |
|---|---|
| Publik | `/` landing (pencarian hero, mapel, tutor & kursus unggulan), `/tutor` (filter + peta Leaflet + urut jarak), `/tutor/[id]`, `/kursus`, `/kursus/[slug]` |
| Siswa & orang tua | `/beranda`, `/booking`, `/booking/baru` (stepper jadwal → lokasi → ringkasan biaya → bayar), `/booking/[id]` (stepper status, peta tutor, QR check-in 10 menit), `/pembayaran/[id]` (QRIS/transfer + unggah bukti), `/anak`, `/alamat`, `/laporan`, `/transaksi`, `/kursus-saya`, `/belajar/[id]` (player video/bacaan/kuis/tugas + sertifikat) |
| Tutor | `/mengajar` (booking masuk paling atas), `/mengajar/booking/[id]` (status perjalanan, bagikan lokasi, pindai QR/kode manual, check-out + laporan), `/mengajar/profil`, `/mengajar/jadwal`, `/mengajar/pendapatan`, `/mengajar/ulasan` |
| Admin | `/admin` (KPI), `/admin/tutor`, `/admin/pembayaran`, `/admin/dispute`, `/admin/kursus` (+ editor kurikulum & nilai), `/admin/pengguna`, `/admin/ulasan`, `/admin/master-data`, `/admin/pengaturan` |
| Semua peran | `/akun`, `/notifikasi` |

Catatan teknis web:
- **Satu api-client** (`web/lib/api-client.ts`): semua request `credentials: 'include'`; access token di memori, refresh token di cookie httpOnly; 401 → refresh **sekali** lalu request diulang (request paralel berbagi satu refresh).
- **TanStack Query** untuk semua fetch (`web/hooks/api/*`). Polling: detail booking & pembayaran tiap 5 detik sampai status final, notifikasi tiap 20 detik — tanpa WebSocket.
- Token desain di blok `@theme` `web/app/globals.css` (Tailwind 4, tanpa `tailwind.config.ts`); status selalu lewat `StatusBadge` (`web/lib/status.ts`).
- Kamera untuk scan QR butuh **HTTPS** (atau `localhost`); bila kamera ditolak/tidak ada, tutor memakai kode manual yang ditampilkan di bawah QR siswa.

> Windows: jika `npm run build` di `api/` gagal dengan `EPERM ... query_engine-windows.dll.node`, hentikan dulu `npm run dev` (file engine Prisma sedang dikunci proses yang berjalan).

### Environment variables

| Variabel | Proyek | Keterangan |
|---|---|---|
| `NODE_ENV` | api | `development` / `production` / `test` (default `development`) |
| `PORT` | api | Default `4000`; Railway meng-inject otomatis |
| `CORS_ORIGIN` | api | Origin FE yang diizinkan, pisahkan koma (default `http://localhost:3000`) |
| `DATABASE_URL` | api | Connection string `mysql://...` |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | api | Minimal 32 karakter |
| `API_PUBLIC_URL`, `WEB_APP_URL` | api | URL publik API (untuk URL file lokal) & URL web app (untuk link di email) |
| `STORAGE_DRIVER` | api | `local` (dev, folder `api/uploads`) atau `cloudinary` (production) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | api | Wajib jika `STORAGE_DRIVER=cloudinary` |
| `MAIL_DRIVER` | api | `log` (dev, email dicetak ke console) atau `smtp` (Gmail) |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | api | Wajib jika `MAIL_DRIVER=smtp` |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | api | Akun admin pertama (password wajib di production) |
| `NEXT_PUBLIC_API_BASE_URL` | web | Base URL API **termasuk** `/api/v1` |
| `NEXT_PUBLIC_MAP_TILE_URL` | web | Tile OpenStreetMap untuk Leaflet |

`.env` / `.env.local` tidak pernah di-commit (lihat `.gitignore`); hanya `.env.example` yang masuk repo.

### 4. Coba API lewat Postman

Import `api/postman/learnly.postman_collection.json` + `api/postman/learnly-local.postman_environment.json`, lalu jalankan folder **00 · Skenario End-to-End** dengan Collection Runner. Panduan lengkap untuk tim FE: [api/POSTMAN_GUIDE.md](api/POSTMAN_GUIDE.md).

### Deploy (free tier)

1. **Push** repo ke GitHub (branch `main`).
2. **Railway** — New Project → Deploy from GitHub repo → set **Root Directory = `api`**. Tambahkan **MySQL** (New → Database → MySQL) di project yang sama. Di service `api`, set variables:
   - `DATABASE_URL` = `${{MySQL.MYSQL_URL}}` (reference variable dari plugin MySQL)
   - `NODE_ENV=production`, `CORS_ORIGIN=<URL Vercel>`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (acak, ≥ 32 karakter)
   - `SEED_ADMIN_PASSWORD` (≥ 12 karakter) — dipakai membuat akun admin pertama
   - `STORAGE_DRIVER=cloudinary` + `CLOUDINARY_*` (filesystem Railway tidak permanen); `MAIL_DRIVER=smtp` + `GMAIL_*` untuk email reset password (atau `MAIL_DRIVER=log` sementara)
   - `API_PUBLIC_URL=https://<domain-railway>` dan `WEB_APP_URL=<URL Vercel>`
   - Build/start/healthcheck sudah diatur di `api/railway.json` (`npm run build` → `npm run start`, yang otomatis menjalankan `prisma migrate deploy` + seed). Lalu Settings → Networking → **Generate Domain**.
3. **Vercel** — Add New Project → import repo → set **Root Directory = `web`** (framework Next.js terdeteksi otomatis, tanpa config tambahan). Set env `NEXT_PUBLIC_API_BASE_URL=https://<domain-railway>/api/v1` dan `NEXT_PUBLIC_MAP_TILE_URL`.
4. Kembali ke Railway, pastikan `CORS_ORIGIN` berisi domain Vercel final (mis. `https://learnly.vercel.app`), lalu buka landing page Vercel: badge harus hijau.

## Dokumentasi — mulai dari sini

👉 [`docs/00-overview.md`](docs/00-overview.md)

| Dokumen | Isi |
|---|---|
| [docs/00-overview.md](docs/00-overview.md) | Ringkasan produk, persona, model bisnis |
| [docs/01-prd.md](docs/01-prd.md) | Product Requirements Document |
| [docs/02-srs.md](docs/02-srs.md) | Software Requirements Specification (FR & NFR) |
| [docs/03-tech-stack.md](docs/03-tech-stack.md) | Pilihan teknologi & alasan |
| [docs/04-architecture.md](docs/04-architecture.md) | Arsitektur sistem & struktur folder |
| [docs/05-erd.md](docs/05-erd.md) | ERD & skema database MySQL |
| [docs/06-api-spec.md](docs/06-api-spec.md) | Spesifikasi REST API (polling untuk update status) |
| [docs/07-ssd.md](docs/07-ssd.md) | System Sequence Diagram alur-alur utama |
| [docs/08-roadmap.md](docs/08-roadmap.md) | Urutan eksekusi pembangunan |
| [docs/09-coding-standards.md](docs/09-coding-standards.md) | Konvensi kode, git workflow |
| [docs/10-design-system.md](docs/10-design-system.md) | Design system & UI/UX guideline |

## Tech Stack (ringkas)

- **Frontend**: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui — deploy ke **Vercel** (gratis)
- **Backend**: Node.js + Express + TypeScript + Prisma — deploy ke **Railway** (gratis/trial)
- **Database**: MySQL 8 (Railway MySQL plugin)
- **Pembayaran**: manual — QRIS statis + upload bukti transfer + verifikasi admin (tanpa payment gateway)
- **Update status**: polling REST (bukan WebSocket), tanpa Redis/job queue
- **File storage**: Cloudinary (free tier)

Sengaja disederhanakan untuk skala proyek/tugas — tidak ada servis berbayar yang wajib di-provision. Detail lengkap & alasan pemilihan ada di [docs/03-tech-stack.md](docs/03-tech-stack.md).
