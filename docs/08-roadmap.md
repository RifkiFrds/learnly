# Roadmap Eksekusi Pembangunan — Learnly

Status: Draft v1.1 (disederhanakan, infra free-tier)
Terkait: [01-prd.md](01-prd.md) §3 (Full Scope), [03-tech-stack.md](03-tech-stack.md)

Seluruh fitur di [01-prd.md](01-prd.md) masuk cakupan produk (bukan dipotong). Dokumen ini hanya mengatur **urutan pembangunan** agar dapat dikerjakan bertahap, dengan setiap fase menghasilkan sistem yang dapat dijalankan & diuji end-to-end (bukan fitur setengah jadi).

## Fase 0 — Fondasi Proyek

- Buat struktur repo `web/` (Next.js) dan `api/` (Express) — dua folder sederhana, **tanpa** tooling monorepo (lihat [03-tech-stack.md](03-tech-stack.md) §2.5).
- Setup Prisma + migrasi awal dari skema di [05-erd.md](05-erd.md), koneksi ke MySQL (lokal via Docker Compose *hanya untuk MySQL*, atau langsung ke Railway MySQL saat dev).
- Setup ESLint/Prettier/TS config di masing-masing folder.
- Skeleton Express app (endpoint `/health`) & skeleton Next.js app (landing page kosong).
- Konfigurasi environment (`.env.example` di `web/` dan `api/`) sesuai [03-tech-stack.md](03-tech-stack.md) §3.
- Setup project di Vercel (root `web/`) & Railway (root `api/` + MySQL plugin), pastikan auto-deploy dari `main` berjalan untuk skeleton kosong ini.

**Definition of Done**: `api/` jalan lokal (`npm run dev`) & migrasi Prisma berhasil ke DB; `web/` jalan lokal & bisa fetch `/health` dari `api/`; kedua app juga sudah live di Vercel & Railway (walau masih kosong) — memastikan pipeline deploy gratis berfungsi sejak awal, bukan di akhir.

## Fase 1 — Auth, User, & RBAC

- Modul `auth`: register (akun langsung `active`), login, refresh, logout, forgot/reset password via Gmail SMTP (FR-AUTH-01–05).
- Modul `users`/`learners`: profil user, manajemen learner (anak) oleh parent (FR-AUTH-06).
- Middleware auth + RBAC (FR-AUTH-07), diterapkan sebagai pola baku untuk semua modul berikutnya.
- Halaman FE: register, login, forgot/reset password, dashboard kosong per role (routing `(auth)`, `(student)`, `(tutor)`, `(admin)`).

**DoD**: Semua role bisa register/login, RBAC teruji, akun parent bisa tambah anak.

## Fase 2 — Profil Tutor, Master Data, & Pencarian

- Modul admin master data: `subjects`, `education_levels`, `categories` (CRUD, FR-ADMIN-03).
- Onboarding tutor: form profil, upload dokumen ke Cloudinary, status verifikasi (FR-AUTH-08, FR-TUTOR-01/02).
- Admin: antrian & approval verifikasi tutor (FR-ADMIN-01).
- Wilayah layanan, jadwal ketersediaan, blocked dates (FR-TUTOR-03/04, FR-BOOK-06 terkait slot).
- Endpoint & UI pencarian tutor (filter + lokasi via peta Leaflet/OSM, FR-SEARCH-01/02), halaman detail profil tutor publik.

**DoD**: Tutor bisa onboarding lengkap → diverifikasi admin → muncul di hasil pencarian dengan filter lokasi & mapel berfungsi.

## Fase 3 — Booking, Pembayaran Manual, Tracking (Polling), Check-in/out

- Modul `bookings`: create, respond (accept/reject), state machine status (FR-BOOK-*, FR-TRACK-01/02).
- Modul `payments` manual: tampilkan QRIS + info rekening, upload bukti transfer, antrian & aksi verifikasi admin (FR-PAY-01–04, FR-PAY-08).
- Update status booking via polling `GET /bookings/:id` di FE (FR-TRACK-03/04) — **tidak** ada Socket.IO/Redis.
- Check-in (dengan QR) & check-out + form laporan perkembangan (FR-CHECKIN-*, FR-REPORT-01/02).
- UI: alur booking lengkap (pilih tutor → slot → alamat/online → ringkasan biaya → QRIS → upload bukti), dashboard tutor (booking masuk, kontrol status, check-in/out), halaman detail booking dengan status ter-polling, dashboard admin (verifikasi pembayaran).
- Kebijakan pembatalan & refund manual (FR-PAY-06), riwayat pendapatan tutor (FR-PAY-05).

**DoD**: Simulasi end-to-end satu booking tatap muka dari pencarian → upload bukti bayar → admin approve → tracking status (polling) → check-in QR → check-out → laporan tersimpan, tervalidasi via [07-ssd.md](07-ssd.md) §2–5.

## Fase 4 — Kursus Online

- Modul `courses`: CRUD kursus/modul/lesson (admin), alur `draft → in_review → published` (FR-COURSE-01–03).
- Enrollment (gratis & berbayar, reuse modul `payments` manual), progres lesson (FR-COURSE-04/05).
- Quiz (penilaian otomatis) & assignment (penilaian manual) (FR-COURSE-06, FR-EVAL-*).
- Generate sertifikat PDF **synchronous** saat syarat kelulusan terpenuhi (FR-COURSE-07) — lihat [03-tech-stack.md](03-tech-stack.md) §2.3.
- UI: katalog kursus + filter, halaman player kursus (video/materi/quiz/assignment), dashboard progres siswa, halaman sertifikat.

**DoD**: Siswa bisa enroll kursus berbayar (lewat alur pembayaran manual yang sama), menyelesaikan seluruh lesson+quiz, dan mengunduh sertifikat.

## Fase 5 — Tutor Online (Sesi Daring)

- Reuse modul booking untuk mode `online` (tanpa alamat) (FR-ONLINE-01/03).
- Tutor melampirkan tautan meeting ke booking (FR-ONLINE-02).

**DoD**: Booking sesi online end-to-end berfungsi tanpa langkah alamat, tautan meeting tampil sesuai jadwal.

## Fase 6 — Rating, Review, Notifikasi, Admin Dashboard

- Modul `reviews`: create/edit review, reply tutor, moderasi admin (FR-REVIEW-*).
- Rekalkulasi rating agregat (synchronous, di request yang sama saat review dibuat).
- Modul `notifications`: in-app notification center (dibaca via polling), tandai dibaca.
- Admin dashboard ringkasan KPI, manajemen dispute (FR-ADMIN-05/06/07).

**DoD**: Review muncul & mempengaruhi rating tutor/kursus, admin dapat melihat ringkasan transaksi & menangani dispute contoh kasus.

## Fase 7 — Pengerasan (Hardening) Secukupnya

- Rate limiting endpoint sensitif (login, reset password) (NFR-SEC-05).
- Validasi input konsisten di semua endpoint (Zod), penanganan error terpusat.
- Test untuk business logic penting: state machine booking, kalkulasi biaya, validasi verifikasi pembayaran, kalkulasi progres kursus.
- Review manual terhadap [02-srs.md](02-srs.md) §2 (NFR) — tidak semua NFR skala enterprise perlu dipenuhi penuh untuk tugas; fokus pada keamanan dasar (password hashing, RBAC, validasi input) dan kebenaran fungsional.

**DoD**: Alur-alur utama di [07-ssd.md](07-ssd.md) berjalan mulus di environment production (Vercel + Railway), tidak ada credential/secret ter-hardcode, RBAC teruji.

## Catatan untuk Executor

- Setiap fase **harus** diakhiri dalam keadaan aplikasi berjalan sebelum lanjut ke fase berikutnya — jangan menumpuk perubahan besar tanpa checkpoint yang bisa dijalankan/dideploy.
- Ikuti pola layer (route→controller→service→repository) di [04-architecture.md](04-architecture.md) §3 untuk setiap modul baru agar konsisten dan mudah di-review — pola ini tetap dipakai meski infra disederhanakan.
- Skema Prisma harus selalu sinkron dengan [05-erd.md](05-erd.md); jika ada penyesuaian skema selama implementasi, update dokumen ERD juga.
- Endpoint yang diimplementasikan harus sesuai kontrak di [06-api-spec.md](06-api-spec.md); jika terjadi deviasi, update dokumen tersebut agar tetap menjadi sumber kebenaran.
- Jangan menambahkan kembali infra yang sudah sengaja dihilangkan (Redis, job queue, WebSocket, payment gateway) kecuali user secara eksplisit memintanya — lihat [03-tech-stack.md](03-tech-stack.md) §5.
