# Learnly

> Learn Your Way, Grow Your Future.

Platform edtech yang mengintegrasikan kursus online, tutor online, dan tutor tatap muka (on-demand, berbasis lokasi) dalam satu produk.

Kode aplikasi belum dibangun — repo ini saat ini berisi **dokumentasi perencanaan lengkap** (PRD → SRS → tech stack → arsitektur → ERD → API spec → SSD → roadmap → coding standards) yang menjadi acuan bagi tim/agent yang akan mengimplementasikan produk.

## Mulai dari sini

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
