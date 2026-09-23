# Roadmap Eksekusi Pembangunan — Learnly

Status: Draft v1.2 (restrukturisasi: **Backend 100% dulu**, baru Frontend)
Terkait: [01-prd.md](01-prd.md) §3 (Full Scope), [03-tech-stack.md](03-tech-stack.md)

Seluruh fitur di [01-prd.md](01-prd.md) masuk cakupan produk (bukan dipotong). Dokumen ini mengatur **urutan pembangunan**.

> **Perubahan v1.2**: sebelumnya tiap fase mencampur pekerjaan backend & frontend. Sekarang dipecah jadi dua track berurutan: **Track A — Backend selesai 100% dulu** (semua modul API + Postman collection siap pakai untuk tim FE), baru **Track B — Frontend** dikerjakan setelah backend benar-benar siap & terverifikasi. Ini memberi kontrak API yang stabil sebelum FE mulai, mengurangi bolak-balik.

## Fase 0 — Fondasi Proyek (berjalan/selesai)

- Struktur repo `web/` + `api/` (tanpa monorepo tooling), Prisma + migrasi awal dari [05-erd.md](05-erd.md), skeleton Express (`/health`) & skeleton Next.js, `.env.example`, setup Vercel + Railway.
- Lihat detail di riwayat prompt Fase 0. Tidak diulang di sini.

**DoD**: `api/` & `web/` jalan lokal, `/health` terhubung DB, kedua app live (skeleton) di Vercel & Railway.

---

## Track A — Backend Lengkap (100%)

Seluruh fase di track ini dikerjakan **tanpa menunggu FE**. Setiap fase harus bisa diuji langsung lewat Postman/curl (bukan lewat UI). Tidak ada kode FE yang disentuh di track ini kecuali skeleton dari Fase 0.

### Fase B1 — Auth, User, Learner, RBAC
- Modul `auth`: register (akun langsung `active`), login, refresh, logout, forgot/reset password via Gmail SMTP (FR-AUTH-01–05).
- Modul `users`/`learners`: profil user, manajemen learner (anak) oleh parent, alamat (FR-AUTH-06).
- Middleware auth + RBAC (FR-AUTH-07) — pola baku dipakai semua modul berikutnya.
- Onboarding tutor (upload dokumen ke Cloudinary, status `pending_verification`) (FR-AUTH-08).

**DoD**: Semua role bisa register/login via endpoint, RBAC teruji (request tanpa role yang benar ditolak 403), akun parent bisa tambah anak — semua dibuktikan lewat Postman.

### Fase B2 — Master Data, Profil Tutor, Pencarian
- Modul admin master data: `subjects`, `education_levels`, `categories` (CRUD, FR-ADMIN-03).
- Profil tutor lengkap: bio, sertifikasi, mapel, jenjang, tarif, mode mengajar (FR-TUTOR-01/02).
- Admin: antrian & approval verifikasi tutor (FR-ADMIN-01).
- Wilayah layanan, jadwal ketersediaan, blocked dates (FR-TUTOR-03/04).
- Endpoint pencarian tutor (filter + lokasi Haversine, FR-SEARCH-01/02) & pencarian kursus.

**DoD**: Tutor bisa onboarding lengkap → diverifikasi admin → muncul di hasil pencarian dengan filter lokasi & mapel berfungsi — semua via Postman.

### Fase B3 — Booking, Pembayaran Manual, Tracking, Check-in/out
- Modul `bookings`: create, respond (accept/reject), state machine status (FR-BOOK-*, FR-TRACK-01/02).
- Modul `payments` manual: info QRIS/rekening, upload bukti transfer, antrian & aksi verifikasi admin (FR-PAY-01–04, FR-PAY-08).
- Endpoint status untuk dipoll (`GET /bookings/:id`, `GET /payments/:id`) — **tidak** ada Socket.IO/Redis.
- Check-in (dengan QR token) & check-out + form laporan perkembangan (FR-CHECKIN-*, FR-REPORT-01/02).
- Kebijakan pembatalan & refund manual (FR-PAY-06), riwayat pendapatan tutor (FR-PAY-05).

**DoD**: Simulasi end-to-end satu booking tatap muka murni via Postman — dari create booking → upload bukti bayar → admin approve → update status berurutan → check-in dengan QR token → check-out + laporan tersimpan — sesuai alur [07-ssd.md](07-ssd.md) §2–5.

### Fase B4 — Kursus Online
- Modul `courses`: CRUD kursus/modul/lesson (admin), alur `draft → in_review → published` (FR-COURSE-01–03).
- Enrollment (gratis & berbayar, reuse modul `payments`), progres lesson (FR-COURSE-04/05).
- Quiz (penilaian otomatis) & assignment (penilaian manual) (FR-COURSE-06, FR-EVAL-*).
- Generate sertifikat PDF **synchronous** saat syarat kelulusan terpenuhi (FR-COURSE-07).

**DoD**: Via Postman — buat kursus, publish, enroll (gratis & berbayar), selesaikan lesson+quiz, unduh sertifikat PDF yang benar-benar valid.

### Fase B5 — Tutor Online (Sesi Daring)
- Reuse modul booking untuk mode `online` (tanpa alamat) (FR-ONLINE-01/03).
- Tutor melampirkan tautan meeting ke booking (FR-ONLINE-02).

**DoD**: Booking sesi online end-to-end via Postman tanpa langkah alamat.

### Fase B6 — Rating, Review, Notifikasi, Admin Dashboard
- Modul `reviews`: create/edit, reply tutor, moderasi admin (FR-REVIEW-*).
- Rekalkulasi rating agregat (synchronous, request yang sama).
- Modul `notifications`: list, tandai dibaca.
- Admin: dashboard ringkasan KPI, dispute, `platform_settings` (FR-ADMIN-05/06/07).

**DoD**: Review mempengaruhi rating tutor/kursus, admin dashboard summary mengembalikan angka yang benar — semua via Postman.

### Fase B7 — Hardening Backend
- Rate limiting endpoint sensitif (login, reset password) (NFR-SEC-05).
- Validasi input konsisten di semua endpoint (Zod), error handling terpusat & konsisten dengan envelope di [06-api-spec.md](06-api-spec.md) §1.1.
- Test untuk business logic penting: state machine booking, kalkulasi biaya, verifikasi pembayaran, kalkulasi progres kursus.
- Review checklist NFR di [02-srs.md](02-srs.md) §2 (fokus keamanan dasar & kebenaran fungsional, bukan skala enterprise).

**DoD**: Tidak ada endpoint yang mengembalikan bentuk response tidak konsisten; tidak ada credential ter-hardcode; alur-alur kritis di [07-ssd.md](07-ssd.md) semuanya bisa direplay via Postman tanpa error.

### Fase B8 — Postman Collection & Dokumentasi API untuk Tim FE

Deliverable akhir Track A, **wajib** sebelum Track B mulai:

- Generate **satu file `learnly.postman_collection.json`** (Postman Collection v2.1) berisi **seluruh endpoint** di [06-api-spec.md](06-api-spec.md), dikelompokkan per folder sesuai modul (Auth, Users & Learners, Tutor Profile, Search, Bookings, Payments, Reports, Courses, Reviews, Notifications, Admin).
- Setiap request punya:
  - Nama yang jelas & deskriptif (bukan `POST /bookings` mentah, tapi "Buat Booking Baru — Tatap Muka/Online").
  - Deskripsi di setiap request (tab Description Postman) ditulis **human-friendly, Bahasa Indonesia, gaya copywriting jelas** — jelaskan: kapan endpoint ini dipakai, role apa yang boleh akses, apa yang terjadi setelah sukses, dan status error yang mungkin muncul. Tulis seolah menjelaskan ke developer FE yang belum baca dokumen teknis sama sekali.
  - Contoh request body realistis (bukan `{}` kosong) yang sudah terisi data contoh masuk akal (nama, tanggal, dsb — bukan `"string"` atau `"test123"`).
  - Contoh response tersimpan (Postman "Saved Response") untuk kasus sukses, minimal untuk endpoint-endpoint kunci (booking, payment, course enrollment, auth).
- Buat **Postman Environment** (`learnly-local.postman_environment.json`) berisi variabel: `baseUrl`, `accessToken`, `refreshToken`, dan ID contoh (`bookingId`, `tutorProfileId`, `courseId`, dst) yang otomatis terisi via **Postman test script** (`pm.environment.set(...)`) setelah request login/create sukses — supaya tim FE tinggal Login sekali, lalu semua request lain otomatis pakai token tanpa copy-paste manual.
- Buat file `api/POSTMAN_GUIDE.md` (satu halaman, ditujukan untuk developer FE, bukan backend) berisi:
  - Cara import collection + environment ke Postman.
  - Alur testing dasar step-by-step (mis. "1. Jalankan request Register → 2. Login → token otomatis tersimpan → 3. Coba Search Tutor → 4. Buat Booking...").
  - Penjelasan singkat & manusiawi soal hal yang sering bikin bingung: format response envelope, cara baca error, daftar semua nilai enum status (booking/payment/course) beserta artinya dalam bahasa awam, cara kerja pembayaran manual (upload bukti → nunggu admin approve, bukan otomatis), cara kerja "real-time" (polling, bukan WebSocket, jadi FE harus fetch ulang berkala).
  - Tidak ditulis dengan gaya dokumentasi teknis kaku — tulis seperti menjelaskan ke rekan tim, jelas dan ramah, tanpa jargon berlebihan.

**DoD Track A**: Backend live di Railway, seluruh endpoint di [06-api-spec.md](06-api-spec.md) terimplementasi & bisa dites lewat Postman collection yang di-generate, `POSTMAN_GUIDE.md` bisa diikuti orang yang belum pernah lihat kode backend sama sekali dan tetap berhasil menjalankan alur booking end-to-end.

---

## Track B — Frontend (Mulai Setelah Track A Selesai & Diverifikasi)

Track ini baru dimulai setelah Fase B8 selesai dan backend dianggap stabil (kontrak API tidak berubah-ubah lagi). Setiap fase memakai [10-design-system.md](10-design-system.md) sejak awal.

### Fase F1 — Auth & Shell Aplikasi
- Halaman register, login, forgot/reset password.
- Layout shell per role: `(public)`, `(auth)`, `(student)`, `(tutor)`, `(admin)` sesuai [04-architecture.md](04-architecture.md) §4.
- Navigasi dasar, state auth (token handling, refresh otomatis).

### Fase F2 — Pencarian & Profil Tutor
- Halaman pencarian tutor (filter + peta Leaflet) & katalog kursus, pola layout sesuai [10-design-system.md](10-design-system.md) §8.
- Halaman detail profil tutor publik.
- Onboarding tutor (form profil lengkap + upload dokumen).

### Fase F3 — Booking Flow & Tracking
- Alur booking (stepper), halaman detail booking dengan polling status, upload bukti pembayaran, tampilan QR check-in.
- Dashboard tutor: booking masuk, kontrol status, check-in/out, form laporan perkembangan.
- Dashboard admin: verifikasi pembayaran, verifikasi tutor.

### Fase F4 — Kursus Online
- Katalog kursus, halaman detail, player kursus (video/materi/quiz/assignment), progres, sertifikat.

### Fase F5 — Tutor Online & Sisanya
- Booking sesi online (reuse alur F3 tanpa alamat), tautan meeting.
- Rating & review, notification center, dashboard admin KPI & settings.

### Fase F6 — QA Responsif & Aksesibilitas
- Uji seluruh halaman di breakpoint mobile/tablet/desktop ([10-design-system.md](10-design-system.md) §4.4).
- Cek checklist aksesibilitas §7 (kontras, focus state, keyboard nav, target sentuh).
- Cek checklist anti-pattern §3 — pastikan tidak ada elemen "AI slop" lolos ke production.

---

## Catatan untuk Executor

- **Jangan mulai Track B sebelum Track A (termasuk Fase B8 Postman) benar-benar selesai** — ini keputusan eksplisit user untuk menghindari bolak-balik kontrak API di tengah kerja FE.
- Setiap fase di Track A harus bisa diverifikasi murni lewat Postman/curl, tanpa perlu UI apa pun.
- Ikuti pola layer (route→controller→service→repository) di [04-architecture.md](04-architecture.md) §3 untuk setiap modul.
- Skema Prisma harus selalu sinkron dengan [05-erd.md](05-erd.md); update dokumen jika ada penyesuaian.
- Endpoint yang diimplementasikan harus sesuai kontrak di [06-api-spec.md](06-api-spec.md); jika terjadi deviasi, update dokumen tersebut agar tetap jadi sumber kebenaran (termasuk Postman collection harus ikut diperbarui).
- Jangan menambahkan kembali infra yang sudah sengaja dihilangkan (Redis, job queue, WebSocket, payment gateway) kecuali user secara eksplisit memintanya — lihat [03-tech-stack.md](03-tech-stack.md) §5.
