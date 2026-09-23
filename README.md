# Learnly

> Learn Your Way, Grow Your Future.

Platform edtech yang mengintegrasikan kursus online, tutor online, dan tutor tatap muka (on-demand, berbasis lokasi) dalam satu produk.

Repo ini berisi **dokumentasi perencanaan lengkap** di `docs/` (PRD → SRS → tech stack → arsitektur → ERD → API spec → SSD → roadmap → coding standards → design system) dan kode aplikasi di `web/` (Next.js) + `api/` (Express).

**Status:** Fase 0 — Fondasi Proyek selesai. Berikutnya: Fase 1 — Auth, User, & RBAC ([docs/08-roadmap.md](docs/08-roadmap.md)).

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
| `npm run start` | `prisma migrate deploy` + jalankan `dist/server.js` (dipakai Railway) |
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

Badge di kanan atas landing page menunjukkan status koneksi ke API: hijau **"API: Terhubung"** jika `GET /health` sukses, merah **"API: Tidak terhubung"** jika API atau database tidak bisa dihubungi.

Scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `format`.

> Windows: jika `npm run build` di `api/` gagal dengan `EPERM ... query_engine-windows.dll.node`, hentikan dulu `npm run dev` (file engine Prisma sedang dikunci proses yang berjalan).

### Environment variables

| Variabel | Proyek | Keterangan |
|---|---|---|
| `NODE_ENV` | api | `development` / `production` / `test` (default `development`) |
| `PORT` | api | Default `4000`; Railway meng-inject otomatis |
| `CORS_ORIGIN` | api | Origin FE yang diizinkan, pisahkan koma (default `http://localhost:3000`) |
| `DATABASE_URL` | api | Connection string `mysql://...` |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | api | Minimal 32 karakter |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | api | Upload file (dipakai mulai Fase 2) |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | api | Email reset password (dipakai mulai Fase 1) |
| `NEXT_PUBLIC_API_BASE_URL` | web | Base URL API **termasuk** `/api/v1` |
| `NEXT_PUBLIC_MAP_TILE_URL` | web | Tile OpenStreetMap untuk Leaflet |

`.env` / `.env.local` tidak pernah di-commit (lihat `.gitignore`); hanya `.env.example` yang masuk repo.

### Deploy (free tier)

1. **Push** repo ke GitHub (branch `main`).
2. **Railway** — New Project → Deploy from GitHub repo → set **Root Directory = `api`**. Tambahkan **MySQL** (New → Database → MySQL) di project yang sama. Di service `api`, set variables:
   - `DATABASE_URL` = `${{MySQL.MYSQL_URL}}` (reference variable dari plugin MySQL)
   - `NODE_ENV=production`, `CORS_ORIGIN=<URL Vercel>`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CLOUDINARY_*`, `GMAIL_*`
   - Build/start/healthcheck sudah diatur di `api/railway.json` (`npm run build` → `npm run start`, yang otomatis menjalankan `prisma migrate deploy`). Lalu Settings → Networking → **Generate Domain**.
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
