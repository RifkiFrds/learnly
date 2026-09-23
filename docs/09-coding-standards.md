# Coding Standards & Konvensi — Learnly

Status: Draft v1.1 (disederhanakan)
Terkait: [03-tech-stack.md](03-tech-stack.md), [04-architecture.md](04-architecture.md)

## 1. Bahasa & Penamaan

- **Kode** (variabel, fungsi, tabel, kolom, endpoint): Bahasa Inggris, `camelCase` untuk TypeScript, `snake_case` untuk kolom database (sesuai [05-erd.md](05-erd.md)).
- **Konten yang tampil ke pengguna** (label UI, pesan error, notifikasi, nama status bisnis seperti `tutor_dalam_perjalanan`): Bahasa Indonesia, sesuai istilah yang sudah dipakai di dokumen produk agar konsisten dari PRD sampai kode.
- Nama file React component: `PascalCase.tsx`. Nama file util/hook: `camelCase.ts`. Nama file modul backend: `kebab-case` (mis. `tutor-profile.service.ts`).
- Enum status (booking, payment, course) memakai nilai string yang **identik** dengan yang didefinisikan di [05-erd.md](05-erd.md) — jangan membuat varian baru tanpa mengupdate dokumen ERD & API spec.

## 2. Struktur Modul Backend (wajib diikuti, lihat [04-architecture.md](04-architecture.md) §3)

```
modules/bookings/
├── booking.route.ts        # definisi endpoint + middleware
├── booking.controller.ts   # req/res handling saja
├── booking.service.ts      # business logic (state machine, kalkulasi)
├── booking.repository.ts   # akses Prisma
├── booking.schema.ts       # Zod schema request/response
└── booking.test.ts         # unit test service (mock repository)
```
- Controller **tidak boleh** memanggil Prisma langsung — selalu lewat service → repository.
- Service **tidak boleh** mengimpor Express (`Request`/`Response`) — agar dapat diuji tanpa HTTP layer.

## 3. Validasi & Tipe

- Setiap endpoint punya Zod schema request (body/query/params) di `*.schema.ts`, divalidasi di middleware route sebelum masuk controller.
- Tidak ada package `shared` (lihat [03-tech-stack.md](03-tech-stack.md) §2.5) — tipe/schema yang bentuknya sama di FE & BE boleh didefinisikan ulang di masing-masing sisi. Jaga agar bentuknya tetap sinkron secara manual mengikuti kontrak di [06-api-spec.md](06-api-spec.md).

## 4. Git Workflow

- Branch: `main` (langsung auto-deploy ke Vercel/Railway), feature branch `feat/<modul>-<ringkas>`, fix branch `fix/<ringkas>` jika bekerja dalam tim/perlu review; untuk pengerjaan solo, commit langsung ke `main` juga boleh selama aplikasi tetap dalam keadaan jalan.
- Commit message: [Conventional Commits](https://www.conventionalcommits.org/) — `feat(bookings): add status transition validation`, `fix(payments): fix proof upload validation`.
- Migrasi Prisma **selalu** disertakan dalam commit yang sama dengan perubahan skema (tidak ada migrasi menyusul terpisah tanpa alasan jelas).

## 5. Testing (Secukupnya, Tidak Perlu Coverage Tinggi)

- Prioritaskan **unit test** untuk business logic yang paling berisiko salah: state machine status booking, kalkulasi biaya, verifikasi pembayaran (approve/reject), kalkulasi progres kursus/passing grade.
- Integration test (Supertest) untuk alur kritis boleh ditambahkan jika waktu memungkinkan (auth, booking flow), tapi **bukan syarat wajib** di setiap PR untuk skala proyek ini.
- Tidak ada target angka coverage — fokus pada test yang benar-benar mencegah bug pada logic penting, bukan mengejar persentase.

## 6. API & Error Handling

- Ikuti kontrak response envelope di [06-api-spec.md](06-api-spec.md) §1.1 secara konsisten — tidak ada endpoint yang mengembalikan bentuk response berbeda.
- Semua error terduga (validasi, business rule) dilempar sebagai custom error class (`AppError(code, message, httpStatus)`) dan ditangkap oleh satu `error-handler` middleware terpusat — jangan `try/catch` + format response manual di tiap controller.

## 7. Environment & Secrets

- Tidak ada secret hardcoded di kode; semua lewat `process.env`, divalidasi saat startup (fail-fast jika env wajib tidak ada) menggunakan schema di `config/env.ts`.
- `.env` tidak pernah dikomit; `.env.example` selalu up to date dengan variabel yang benar-benar dipakai.

## 8. Frontend

- Server Components untuk halaman yang murni menampilkan data publik (katalog tutor/kursus, SEO-friendly); Client Components untuk halaman interaktif (form booking, dashboard real-time).
- Data fetching ke API selalu lewat TanStack Query (tidak `fetch` langsung di komponen tanpa query hook) agar caching & revalidation konsisten.
- Komponen UI dasar (button, input, dialog) memakai shadcn/ui sebagai basis, dikustomisasi lewat Tailwind config — hindari membuat komponen primitif baru dari nol jika shadcn/ui sudah punya.

## 9. Dokumen adalah Living Document

Jika implementasi menemukan kebutuhan yang menyimpang dari dokumen di `docs/` (skema, endpoint, alur), **update dokumen terkait dalam PR yang sama**, bukan membiarkan dokumen jadi usang. Urutan yang harus tetap konsisten: [01-prd.md](01-prd.md) → [02-srs.md](02-srs.md) → [05-erd.md](05-erd.md)/[06-api-spec.md](06-api-spec.md) → kode.
