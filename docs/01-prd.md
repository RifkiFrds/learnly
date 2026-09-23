# Product Requirements Document (PRD) — Learnly

Status: Draft v1.1 (disederhanakan untuk skala proyek/tugas — pembayaran manual, infra free-tier)
Terkait: [00-overview.md](00-overview.md), [02-srs.md](02-srs.md)

## 1. Latar Belakang & Tujuan

Lihat [00-overview.md](00-overview.md) untuk konteks masalah dan visi produk. Tujuan utama rilis pertama Learnly (full-scope, dibangun bertahap sesuai [08-roadmap.md](08-roadmap.md)):

1. Pengguna dapat menemukan & memesan tutor (online maupun tatap muka) berdasarkan lokasi, mapel, jenjang, tarif, dan jadwal.
2. Pengguna dapat mengikuti kursus online mandiri dengan materi terstruktur dan evaluasi.
3. Proses sesi tatap muka terlacak end-to-end: booking → konfirmasi → tutor bersiap → dalam perjalanan → tiba (check-in) → sesi berjalan → selesai (check-out) → laporan.
4. Pembayaran, laporan perkembangan, evaluasi, sertifikat, dan rating/review terintegrasi dalam satu alur.

## 2. Peran Pengguna (Roles)

| Role | Hak Akses Utama |
|---|---|
| `guest` | Browsing kursus & tutor publik, registrasi/login |
| `student` | Booking tutor, enroll kursus, belajar, mengerjakan evaluasi, memberi rating, melihat laporan perkembangan miliknya |
| `parent` | Mengelola 1..n akun `student` (anak), booking & pembayaran atas nama anak, melihat laporan perkembangan anak |
| `tutor` | Mengelola profil, jadwal ketersediaan, wilayah layanan, menerima/menolak booking, check-in/out, mengisi laporan perkembangan, membalas review |
| `admin` | Verifikasi tutor, moderasi kursus & review, manajemen kategori/mapel, monitoring transaksi, penanganan dispute |

Catatan model relasi: `parent` dan `student` adalah dua role dari entitas `User` yang sama (lihat [05-erd.md](05-erd.md)); satu akun `parent` dapat terhubung ke banyak profil `student` (anak). Seorang `student` dewasa bisa menjadi akun mandiri tanpa `parent`.

## 3. Ruang Lingkup Fitur (Full Scope)

Semua modul di bawah **masuk dalam cakupan produk**. Prioritas *urutan pembangunan* (bukan pemotongan fitur) diatur di [08-roadmap.md](08-roadmap.md).

### 3.1 Autentikasi & Manajemen Akun
- Registrasi & login (email/password) untuk role `student`, `parent`, `tutor`.
- Verifikasi email.
- Orang tua dapat menambahkan/mengelola profil anak (multi-anak) di bawah satu akun.
- Onboarding tutor: pengisian profil lengkap + upload dokumen verifikasi (ijazah/sertifikat/KTP) → status `pending_verification` → `verified` oleh admin.
- Reset password, manajemen sesi (logout, refresh token).
- Role-based access control (RBAC) di seluruh endpoint.

### 3.2 Profil Tutor
- Data profil: latar belakang pendidikan, pengalaman mengajar, sertifikasi, mata pelajaran yang dikuasai, jenjang pendidikan yang dapat diajarkan, kurikulum yang digunakan, tarif per jam, wilayah/lokasi layanan, jadwal ketersediaan, rating rata-rata, jumlah ulasan.
- Tutor dapat menawarkan metode: `online`, `tatap_muka`, atau keduanya.
- Tutor mengatur wilayah layanan (service area) untuk tatap muka — berbasis kota/kecamatan atau radius dari titik referensi.
- Tutor mengatur jadwal ketersediaan mingguan (recurring) + blokir tanggal tertentu.

### 3.3 Pencarian Tutor Berbasis Lokasi
- Filter: mata pelajaran, jenjang pendidikan, tarif per jam (range), rating minimum, metode belajar (online/tatap muka), ketersediaan jadwal.
- Untuk tatap muka: input lokasi manual (alamat/kota) atau pin lokasi via peta; sistem menampilkan tutor yang wilayah layanannya mencakup titik tersebut, diurutkan berdasarkan jarak.
- Untuk online: filter tidak bergantung lokasi, dapat diurutkan berdasarkan rating/tarif/ketersediaan terdekat.
- Halaman detail tutor menampilkan seluruh profil + kalender ketersediaan + ulasan.

### 3.4 Jadwal & Pemesanan (Booking) Sesi Tutor
- Pengguna memilih tutor, metode (online/tatap muka), tanggal, waktu, dan durasi sesi berdasarkan slot yang tersedia.
- Untuk tatap muka: konfirmasi alamat pembelajaran (pilih dari daftar alamat tersimpan atau input baru via form + pin peta), termasuk catatan tambahan lokasi.
- Sistem menghitung rincian biaya: tarif tutor × durasi + biaya layanan (service fee) = total tagihan.
- Booking berstatus `pending` hingga dikonfirmasi tutor (atau auto-confirm, tergantung pengaturan tutor), lalu berlanjut ke pembayaran.
- Pembatalan booking oleh siswa/orang tua atau tutor, dengan kebijakan pembatalan (window waktu, denda opsional — didetailkan di SRS).

### 3.5 Pelacakan Status Sesi Tatap Muka
- Status pesanan: `dikonfirmasi` → `tutor_bersiap` → `tutor_dalam_perjalanan` → `tutor_tiba` → `sesi_dimulai` → `sesi_selesai` (atau `dibatalkan`).
- Tutor mengubah status secara manual dari aplikasi web (mis. tombol "Saya dalam perjalanan", "Saya telah tiba").
- Update status dikirim real-time ke sisi siswa/orang tua (WebSocket/polling) + notifikasi.
- Tutor dapat berbagi lokasi saat ini (opsional, browser Geolocation) selama status `tutor_dalam_perjalanan` agar posisi tutor terlihat di peta oleh siswa/orang tua.

### 3.6 Check-in / Check-out Sesi
- Tutor melakukan **check-in** saat tiba di lokasi (tatap muka) atau saat memulai sesi (online) sebagai tanda sesi dimulai.
- Check-in tatap muka dapat diverifikasi dengan **QR Code** yang ditampilkan siswa/orang tua dan dipindai tutor (via kamera browser).
- Setelah sesi selesai, tutor melakukan **check-out** dan wajib mengisi ringkasan hasil pembelajaran (terhubung ke modul Laporan Perkembangan).
- Durasi aktual sesi (check-in → check-out) dicatat sebagai referensi (tidak mengubah tagihan yang sudah dihitung di awal, kecuali ada mekanisme *overtime* — didetailkan di SRS).

### 3.7 Kursus Online
- Katalog kursus dengan kategori: mapel sekolah, persiapan ujian, bahasa asing, keterampilan digital, pengembangan diri, kursus & hobi.
- Struktur kursus: Course → Module → Lesson (video/materi/dokumen) → Quiz/Assignment.
- Siswa belajar dengan kecepatan sendiri; progres per lesson tercatat (selesai/belum).
- Evaluasi berupa kuis (pilihan ganda/isian) dan/atau tugas (upload file), dengan penilaian otomatis (kuis) atau manual oleh instruktur/tutor (tugas).
- Sertifikat diterbitkan otomatis (PDF) setelah syarat kelulusan kursus terpenuhi (mis. progres 100% + nilai evaluasi ≥ passing grade).
- Kursus dapat berbayar atau gratis.

### 3.8 Tutor Online (Sesi Terjadwal Daring)
- Alur booking sama seperti 3.4, namun tanpa kebutuhan alamat/lokasi.
- Sesi dilakukan melalui tautan video call (integrasi pihak ketiga: Zoom/Google Meet link yang diinput tutor, atau embed WebRTC pada fase lanjutan — lihat roadmap).
- Check-in/out tetap berlaku sebagai penanda mulai/selesai sesi (tanpa QR, cukup klik).

### 3.9 Laporan Perkembangan Peserta Didik
- Diisi tutor setelah sesi (saat check-out): materi yang dipelajari, tingkat pemahaman siswa, kemampuan yang dikuasai, area yang perlu ditingkatkan, tugas/latihan yang diberikan, rekomendasi sesi berikutnya.
- Riwayat laporan dapat dilihat siswa & orang tua per anak, terurut kronologis, dapat difilter per mapel/tutor.

### 3.10 Evaluasi & Umpan Balik
- Untuk kursus: kuis/evaluasi dengan skor otomatis, tugas dengan feedback tertulis dari instruktur.
- Untuk sesi tutor: feedback tertulis dari tutor sebagai bagian dari laporan perkembangan (3.9).
- Sertifikat kursus diterbitkan sesuai kriteria kelulusan yang ditentukan pembuat kursus.

### 3.11 Pembayaran (Manual)
- Ringkasan biaya ditampilkan sebelum konfirmasi pembayaran: tarif tutor, durasi, biaya layanan, total.
- Pembayaran dilakukan **manual**: sistem menampilkan QRIS statis dan/atau info rekening, pengguna transfer lalu mengunggah bukti, admin memverifikasi (approve/reject). Tidak ada integrasi payment gateway pihak ketiga (lihat [03-tech-stack.md](03-tech-stack.md) §2.1).
- Status pembayaran: `menunggu_pembayaran`, `menunggu_verifikasi`, `paid`, `ditolak`, `expired`, `refunded`.
- Riwayat transaksi untuk siswa/orang tua dan riwayat pendapatan untuk tutor.
- Kebijakan refund untuk pembatalan sesuai aturan bisnis (didetailkan di SRS) — refund dieksekusi manual oleh admin di luar sistem, sistem hanya mencatat statusnya.

### 3.12 Rating & Review
- Setelah sesi/kursus selesai, siswa memberi rating (1–5) & ulasan teks terhadap tutor/kursus.
- Tutor dapat membalas ulasan.
- Rating rata-rata tutor/kursus dihitung dan ditampilkan di profil/katalog.
- Admin dapat memoderasi ulasan yang melanggar pedoman komunitas.

### 3.13 Admin & Operasional
- Verifikasi & suspend akun tutor.
- Kurasi/approval kursus sebelum tayang publik.
- Manajemen master data: kategori/mapel, jenjang pendidikan, kurikulum.
- Dashboard transaksi & monitoring booking (termasuk penanganan dispute/pembatalan).
- Moderasi review.

## 4. User Stories Kunci (contoh representatif per modul)

> Story lengkap + acceptance criteria didetailkan sebagai *functional requirements* di [02-srs.md](02-srs.md). Berikut contoh representatif tingkat PRD.

- **Sebagai** orang tua, **saya ingin** mencari tutor Matematika SMP di sekitar lokasi rumah saya dengan tarif di bawah Rp150.000/jam, **agar** saya bisa membandingkan dan memilih tutor yang sesuai.
- **Sebagai** siswa, **saya ingin** melihat status tutor secara real-time (dalam perjalanan/tiba) saat sesi tatap muka, **agar** saya siap tepat waktu.
- **Sebagai** tutor, **saya ingin** memindai QR code siswa saat tiba di lokasi, **agar** sesi tercatat resmi dimulai dan terhindar dari sengketa waktu.
- **Sebagai** siswa, **saya ingin** mengikuti kursus Bahasa Inggris secara mandiri dan mendapat sertifikat setelah lulus, **agar** saya punya bukti kompetensi.
- **Sebagai** orang tua, **saya ingin** membaca laporan perkembangan anak setelah setiap sesi les, **agar** saya tahu progres belajarnya.
- **Sebagai** tutor, **saya ingin** melihat riwayat pendapatan dan status pembayaran saya, **agar** saya bisa memantau penghasilan.
- **Sebagai** siswa, **saya ingin** memberi rating & ulasan setelah sesi selesai, **agar** membantu siswa lain memilih tutor.

## 5. Non-Goals (Di Luar Cakupan Saat Ini)

- Aplikasi mobile native (iOS/Android) — web app responsif menjadi satu-satunya kanal pada tahap ini (lihat [00-overview.md](00-overview.md) §5).
- Live video conferencing in-house (WebRTC custom) — fase awal memakai tautan pihak ketiga (Zoom/Meet); pengembangan WebRTC in-house dicatat sebagai potensi fase lanjutan di roadmap, bukan bagian rilis inti.
- **Integrasi payment gateway** (Midtrans/Xendit/dsb.) — pembayaran memakai alur manual (QRIS + upload bukti + verifikasi admin), lihat §3.11 dan [03-tech-stack.md](03-tech-stack.md) §2.1. Ini adalah keputusan skala proyek, bukan keterbatasan teknis — dapat ditambahkan di kemudian hari tanpa mengubah skema data inti.
- Sistem payout otomatis ke rekening tutor (disbursement) — pencatatan pendapatan tutor cukup sebagai riwayat/ringkasan di dalam sistem; pencairan dana dilakukan manual di luar sistem oleh admin.
- **WebSocket/real-time push, job queue asinkron (Redis/BullMQ)** — update status memakai polling, proses berat (sertifikat, notifikasi) dijalankan synchronous. Lihat [03-tech-stack.md](03-tech-stack.md) §5 untuk alasan & titik upgrade di masa depan.
- Fitur chat real-time bebas antara siswa-tutor di luar konteks sesi/notifikasi sistem.
- Marketplace pembuat kursus pihak ketiga (multi-vendor course creator dengan revenue split otomatis) — kursus awal dikelola sebagai konten first-party/kurasi admin.

## 6. Asumsi & Batasan

- Wilayah operasi awal: Indonesia (mata uang IDR, QRIS/transfer bank lokal, nomor telepon format Indonesia).
- Bahasa antarmuka: Bahasa Indonesia (utama), struktur i18n disiapkan agar dapat ditambah bahasa lain nanti.
- Koneksi internet pengguna bervariasi → materi video kursus perlu adaptive/streaming yang efisien (lihat NFR di SRS).
- Data lokasi tutor bergantung persetujuan pengguna atas izin lokasi browser (Geolocation API); jika ditolak, fallback ke input alamat manual.

## 7. Metrik Keberhasilan (KPI)

| Metrik | Deskripsi |
|---|---|
| Tutor Activation Rate | % tutor terdaftar yang terverifikasi & mendapat booking pertama dalam 30 hari |
| Booking Completion Rate | % booking yang selesai (check-out) dibanding dibuat |
| Course Completion Rate | % siswa enroll yang menyelesaikan kursus |
| GMV (Gross Merchandise Value) | Total nilai transaksi (booking + kursus) per periode |
| Rating Rata-rata Platform | Rata-rata rating tutor & kursus |
| Retention Rate | % pengguna aktif kembali dalam 30/60/90 hari |

## 8. Ketergantungan Eksternal

- Peta/geocoding gratis (OpenStreetMap + Nominatim).
- Gmail SMTP untuk email reset password (gratis).
- Cloudinary (free tier) untuk file upload: bukti transfer, dokumen verifikasi tutor, sertifikat PDF, thumbnail kursus.
- Hosting: Vercel (FE) & Railway (BE + MySQL), keduanya free/trial tier — lihat [03-tech-stack.md](03-tech-stack.md) §4.

Tidak ada ketergantungan ke payment gateway berbayar pada skala proyek ini (lihat §5 Non-Goals).
