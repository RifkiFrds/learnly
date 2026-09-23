# Learnly — Project Overview

> **Learnly — Learn Your Way, Grow Your Future.**

## 1. Ringkasan

Learnly adalah platform teknologi pendidikan (edtech) yang mengintegrasikan tiga model pembelajaran dalam satu produk:

1. **Kursus online (self-paced)** — materi digital (video, modul, latihan, proyek, evaluasi) yang dipelajari mandiri.
2. **Tutor online** — sesi belajar 1-on-1/kelompok kecil bersama tutor secara daring, terjadwal.
3. **Tutor tatap muka (datang ke lokasi)** — model *on-demand tutoring*, tutor mendatangi lokasi yang ditentukan pengguna, lengkap dengan pelacakan status kedatangan (mirip model *on-demand service* ala ride-hailing, diterapkan ke konteks les privat).

Ketiga model ini didukung oleh sistem pencarian tutor berbasis lokasi, jadwal & pemesanan, pembayaran terintegrasi, laporan perkembangan belajar, evaluasi, sertifikat, serta rating & review.

## 2. Masalah yang Diselesaikan

- Mencari tutor privat yang sesuai (lokasi, mapel, jenjang, tarif, jadwal) masih tersebar dan manual (grup WhatsApp, rekomendasi mulut ke mulut).
- Tidak ada transparansi profil/kualitas tutor (latar belakang, sertifikasi, rating) sebelum booking.
- Tidak ada visibilitas status kedatangan tutor untuk sesi tatap muka.
- Orang tua tidak punya laporan perkembangan belajar anak yang terstruktur.
- Pembelajaran mandiri (kursus online) dan pembelajaran berbimbing (tutor) biasanya berada di platform terpisah.

## 3. Target Pengguna

| Persona | Deskripsi |
|---|---|
| **Siswa (Pelajar/Mahasiswa/Umum)** | Pengguna yang mencari kursus online dan/atau tutor (online/tatap muka). Bisa akun mandiri (dewasa) atau di bawah pengawasan orang tua. |
| **Orang Tua/Wali** | Mengelola akun anak, memilih & booking tutor, memantau laporan perkembangan, melakukan pembayaran. |
| **Tutor** | Menyediakan jasa mengajar (online dan/atau datang ke lokasi), mengelola profil, jadwal ketersediaan, wilayah layanan, melakukan check-in/out, mengisi laporan perkembangan. |
| **Admin/Operasional** | Mengelola verifikasi tutor, kurasi kursus, moderasi review, menangani dispute pembayaran/pesanan, monitoring platform. |

## 4. Model Bisnis (asumsi kerja)

- **Komisi transaksi** dari setiap sesi tutor (online/tatap muka) yang berhasil diselesaikan.
- **Komisi/penjualan kursus online** (revenue share dengan pembuat kursus, jika kursus dibuat oleh pihak ketiga; atau 100% jika kursus dibuat in-house).
- Biaya layanan (*platform/service fee*) ditambahkan pada tagihan booking tutor.
- Model ini adalah asumsi dasar untuk mendesain skema pembayaran; dapat disesuaikan tanpa mengubah arsitektur teknis secara signifikan.

## 5. Prinsip Desain Produk & Teknis

- **Scalable & maintainable, tapi proporsional**: arsitektur modular (REST API + layer service jelas), skema database ternormalisasi — tanpa infra tambahan (payment gateway, Redis, job queue, WebSocket) yang tidak sepadan dengan skala proyek. Lihat [03-tech-stack.md](03-tech-stack.md) §5 untuk daftar hal yang sengaja disederhanakan beserta alasannya dan titik upgrade di masa depan jika dibutuhkan.
- **Web-first**: seluruh pengalaman (siswa, orang tua, tutor, admin) diakses lewat web app Next.js yang responsif (desktop & mobile browser). Tidak ada aplikasi native pada tahap ini — fitur lokasi/kamera (QR check-in) memanfaatkan Web API (Geolocation, kamera browser).
- **Full-scope fitur, minimal infra**: seluruh modul pada deskripsi bisnis (kursus, tutor online, tutor tatap muka + tracking, booking, laporan perkembangan, evaluasi, sertifikat, rating) tetap masuk cakupan produk — yang disederhanakan adalah **cara implementasinya** (mis. pembayaran manual QRIS alih-alih payment gateway, polling alih-alih WebSocket), bukan fiturnya. Urutan pembangunannya diatur di [08-roadmap.md](08-roadmap.md).
- **Deploy gratis**: FE di Vercel, BE + MySQL di Railway (free/trial tier) — tidak ada servis berbayar yang wajib di-provision. Detail di [03-tech-stack.md](03-tech-stack.md) §4.

## 6. Daftar Dokumen

| Dokumen | Isi |
|---|---|
| [01-prd.md](01-prd.md) | Product Requirements Document — fitur, user stories, scope |
| [02-srs.md](02-srs.md) | Software Requirements Specification — functional & non-functional requirements |
| [03-tech-stack.md](03-tech-stack.md) | Pilihan teknologi & alasan |
| [04-architecture.md](04-architecture.md) | Arsitektur sistem, struktur folder, deployment |
| [05-erd.md](05-erd.md) | Entity Relationship Diagram & skema database |
| [06-api-spec.md](06-api-spec.md) | Spesifikasi REST API |
| [07-ssd.md](07-ssd.md) | System Sequence Diagram untuk alur-alur utama |
| [08-roadmap.md](08-roadmap.md) | Urutan eksekusi pembangunan (untuk AI agent executor) |
| [09-coding-standards.md](09-coding-standards.md) | Konvensi kode, git workflow, environment |
| [10-design-system.md](10-design-system.md) | Design system & UI/UX — token warna/tipografi, komponen, anti-pattern "AI slop" |
