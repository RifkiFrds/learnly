# Software Requirements Specification (SRS) — Learnly

Status: Draft v1.1 (disederhanakan: pembayaran manual, polling, tanpa job queue — lihat [03-tech-stack.md](03-tech-stack.md))
Terkait: [01-prd.md](01-prd.md), [06-api-spec.md](06-api-spec.md)

Konvensi ID: `FR-<modul>-<nomor>` untuk functional requirement, `NFR-<kategori>-<nomor>` untuk non-functional requirement.

## 1. Functional Requirements

### 1.1 Auth & Account (AUTH)

| ID | Requirement |
|---|---|
| FR-AUTH-01 | Sistem harus mengizinkan registrasi akun baru dengan email, password, nama, dan role awal (`student` atau `tutor`). `parent` dibuat melalui alur yang sama dengan role `student` kosong (akun induk) lalu menambahkan profil anak. |
| FR-AUTH-02 | Akun langsung berstatus `active` setelah registrasi (tidak ada langkah verifikasi email yang memblokir booking/pembelian) — disederhanakan agar tidak bergantung pada infra email di alur inti. |
| FR-AUTH-03 | Sistem harus mendukung login dengan email + password, menghasilkan access token (JWT, short-lived) dan refresh token (long-lived, disimpan sebagai httpOnly cookie). |
| FR-AUTH-04 | Sistem harus menyediakan endpoint refresh token dan logout (revoke refresh token). |
| FR-AUTH-05 | Sistem harus mendukung reset password via email (token sekali pakai, kedaluwarsa 1 jam). |
| FR-AUTH-06 | Akun `parent` dapat membuat, mengedit, dan menghapus profil `student` anak (relasi 1 parent : N student). Data anak (nama, tanggal lahir, jenjang) dikelola oleh parent. |
| FR-AUTH-07 | Setiap endpoint API harus menegakkan RBAC sesuai role (`guest`, `student`, `parent`, `tutor`, `admin`); akses ditolak (403) jika role tidak sesuai. |
| FR-AUTH-08 | Tutor mengisi form onboarding (biodata, pendidikan, pengalaman, sertifikasi, upload dokumen) → status akun tutor `pending_verification`. Tutor tidak dapat menerima booking sebelum status `verified`. |

### 1.2 Tutor Profile & Availability (TUTOR)

| ID | Requirement |
|---|---|
| FR-TUTOR-01 | Tutor dapat membuat/mengedit profil: bio, riwayat pendidikan, pengalaman mengajar, sertifikasi (list), mata pelajaran (many-to-many ke master `Subject`), jenjang pendidikan yang diajarkan (many-to-many ke master `EducationLevel`), kurikulum, tarif per jam. |
| FR-TUTOR-02 | Tutor dapat menentukan metode mengajar: `online`, `tatap_muka`, atau keduanya. |
| FR-TUTOR-03 | Tutor dapat menentukan wilayah layanan tatap muka: satu atau lebih area (kota/kecamatan) DAN/ATAU titik pusat + radius (km). |
| FR-TUTOR-04 | Tutor dapat mengatur jadwal ketersediaan mingguan berulang (hari + jam mulai/selesai) dan mengecualikan tanggal tertentu (blocked dates). |
| FR-TUTOR-05 | Sistem menghitung slot yang tersedia untuk dipesan berdasarkan jadwal ketersediaan dikurangi booking yang sudah ada (tidak boleh bentrok/overlap). |
| FR-TUTOR-06 | Profil tutor publik menampilkan rating rata-rata, jumlah ulasan, dan daftar ulasan terbaru. |

### 1.3 Pencarian Tutor (SEARCH)

| ID | Requirement |
|---|---|
| FR-SEARCH-01 | Sistem harus mendukung pencarian tutor dengan filter kombinasi: mata pelajaran, jenjang, rentang tarif, rating minimum, metode (online/tatap muka), lokasi. |
| FR-SEARCH-02 | Untuk pencarian tatap muka, pengguna memberi titik lokasi (lat/long) via input alamat (geocoding) atau pin peta; hasil difilter ke tutor yang wilayah layanannya mencakup titik tsb, diurutkan berdasarkan jarak (terdekat dahulu). |
| FR-SEARCH-03 | Hasil pencarian mendukung pagination dan sorting (relevansi, tarif termurah/termahal, rating tertinggi, jarak terdekat). |
| FR-SEARCH-04 | Pencarian kursus mendukung filter kategori, jenjang, level (pemula/menengah/lanjut), harga (gratis/berbayar), rating. |

### 1.4 Booking & Jadwal Sesi Tutor (BOOKING)

| ID | Requirement |
|---|---|
| FR-BOOK-01 | Pengguna (student/parent) dapat membuat booking dengan memilih tutor, metode, tanggal & slot waktu (durasi kelipatan 30/60 menit sesuai konfigurasi tutor). |
| FR-BOOK-02 | Untuk booking tatap muka, pengguna wajib memilih/menambahkan alamat pembelajaran (nama alamat, detail, lat/long via pin peta, catatan tambahan). |
| FR-BOOK-03 | Sistem menghitung total biaya = (tarif per jam tutor × durasi dalam jam) + biaya layanan platform (persentase/flat, dikonfigurasi admin), ditampilkan sebelum konfirmasi. |
| FR-BOOK-04 | Booking baru berstatus `pending_confirmation`; tutor harus menerima/menolak dalam batas waktu tertentu (default 24 jam, dikonfigurasi), atau sistem auto-cancel. Tutor dapat mengaktifkan mode "auto-accept". |
| FR-BOOK-05 | Setelah tutor menerima, booking berstatus `menunggu_pembayaran` → setelah pembayaran sukses → `dikonfirmasi`. |
| FR-BOOK-06 | Sistem mencegah pembuatan booking pada slot yang bentrok dengan booking lain milik tutor yang sama (status aktif). |
| FR-BOOK-07 | Siswa/orang tua atau tutor dapat membatalkan booking sebelum sesi dimulai. Pembatalan tunduk pada kebijakan (lihat FR-PAY-06). |
| FR-BOOK-08 | Riwayat booking (aktif, selesai, dibatalkan) dapat dilihat oleh siswa/orang tua dan tutor terkait. |

### 1.5 Pelacakan Status Sesi Tatap Muka (TRACK)

| ID | Requirement |
|---|---|
| FR-TRACK-01 | Status booking tatap muka mengikuti mesin status: `dikonfirmasi` → `tutor_bersiap` → `tutor_dalam_perjalanan` → `tutor_tiba` → `sesi_berlangsung` → `sesi_selesai`; transisi mundur tidak diizinkan kecuali ke `dibatalkan` sebelum `sesi_berlangsung`. |
| FR-TRACK-02 | Hanya tutor pemilik booking yang dapat mengubah status booking-nya. |
| FR-TRACK-03 | Perubahan status tersedia bagi klien siswa/orang tua yang sedang membuka halaman detail booking melalui **polling** berkala (bukan push/WebSocket), dan tercatat sebagai notifikasi in-app. |
| FR-TRACK-04 | Saat status `tutor_dalam_perjalanan`, tutor dapat (opsional, dengan izin) mengirim update lokasi terkini secara berkala; siswa/orang tua melihat posisi tersebut di peta. |

### 1.6 Check-in / Check-out (CHECKIN)

| ID | Requirement |
|---|---|
| FR-CHECKIN-01 | Tutor melakukan check-in untuk mengubah status ke `sesi_berlangsung`, dicatat `checked_in_at`. |
| FR-CHECKIN-02 | Untuk sesi tatap muka, check-in dapat diverifikasi dengan memindai QR code unik per booking yang ditampilkan di sisi siswa/orang tua (QR mengenkode `booking_id` + token verifikasi bertanda waktu). |
| FR-CHECKIN-03 | Tutor melakukan check-out untuk mengubah status ke `sesi_selesai`, dicatat `checked_out_at`, dan **wajib** mengisi form Laporan Perkembangan (lihat REPORT) sebelum check-out dianggap lengkap. |
| FR-CHECKIN-04 | Sistem mencatat durasi aktual sesi (checked_out_at − checked_in_at) sebagai data referensi/analitik, terpisah dari durasi yang ditagihkan saat booking. |

### 1.7 Kursus Online (COURSE)

| ID | Requirement |
|---|---|
| FR-COURSE-01 | Admin/instruktur dapat membuat kursus dengan judul, deskripsi, kategori, jenjang, level, harga, thumbnail, dan struktur modul→lesson. |
| FR-COURSE-02 | Lesson dapat berupa tipe: `video`, `artikel/materi`, `quiz`, `assignment`. |
| FR-COURSE-03 | Kursus harus melalui status `draft` → `in_review` → `published` (approval admin) sebelum tampil di katalog publik. |
| FR-COURSE-04 | Siswa dapat enroll kursus gratis langsung, atau kursus berbayar setelah pembayaran sukses. |
| FR-COURSE-05 | Sistem mencatat progres siswa per lesson (`not_started`/`in_progress`/`completed`) dan progres keseluruhan kursus (%). |
| FR-COURSE-06 | Quiz dinilai otomatis (pilihan ganda) dengan passing grade yang dikonfigurasi per kursus; assignment dinilai manual oleh instruktur dengan kolom feedback. |
| FR-COURSE-07 | Sertifikat (PDF, dapat diunduh) diterbitkan otomatis saat progres kursus 100% DAN rata-rata nilai evaluasi ≥ passing grade (jika kursus mensyaratkan sertifikat). |

### 1.8 Tutor Online (Sesi Daring) (ONLINE)

| ID | Requirement |
|---|---|
| FR-ONLINE-01 | Booking sesi tutor online mengikuti alur BOOKING yang sama tanpa langkah alamat (FR-BOOK-02 tidak berlaku). |
| FR-ONLINE-02 | Tutor melampirkan tautan meeting (Zoom/Google Meet/lainnya) pada booking yang telah dikonfirmasi; tautan tampil ke siswa H-1 atau sesuai konfigurasi. |
| FR-ONLINE-03 | Status booking online mengikuti subset mesin status TRACK (`dikonfirmasi` → `sesi_berlangsung` → `sesi_selesai`), tanpa status perjalanan fisik. |

### 1.9 Laporan Perkembangan (REPORT)

| ID | Requirement |
|---|---|
| FR-REPORT-01 | Form laporan perkembangan berisi: materi yang dipelajari, tingkat pemahaman siswa (skala), kemampuan yang dikuasai, area yang perlu ditingkatkan, tugas/latihan yang diberikan, rekomendasi sesi berikutnya — diisi tutor saat check-out. |
| FR-REPORT-02 | Laporan terhubung ke satu booking dan dapat dilihat oleh siswa terkait serta parent yang menaunginya. |
| FR-REPORT-03 | Riwayat laporan dapat difilter berdasarkan anak (untuk parent dengan multi-anak), mata pelajaran, tutor, rentang tanggal. |

### 1.10 Evaluasi & Umpan Balik (EVAL) — lihat juga FR-COURSE-06

| ID | Requirement |
|---|---|
| FR-EVAL-01 | Siswa dapat melihat riwayat nilai kuis/tugas per kursus yang diikuti. |
| FR-EVAL-02 | Instruktur/admin dapat melihat rekap nilai seluruh peserta suatu kursus. |

### 1.11 Pembayaran Manual (PAY)

| ID | Requirement |
|---|---|
| FR-PAY-01 | Sistem menampilkan rincian biaya (tarif, durasi/harga, biaya layanan, total) sebelum pengguna melanjutkan ke pembayaran. |
| FR-PAY-02 | Sistem menampilkan gambar QRIS statis (diunggah admin) dan/atau info rekening transfer manual sebagai instruksi pembayaran — **tidak** ada integrasi payment gateway pihak ketiga. |
| FR-PAY-03 | Pengguna mengunggah bukti transfer (gambar) setelah membayar; status transaksi berubah `menunggu_pembayaran` → `menunggu_verifikasi`. Admin meninjau bukti lalu **approve** (→ `paid`) atau **reject** (→ `ditolak`, dengan alasan) secara manual. |
| FR-PAY-04 | Booking/enrollment yang pembayarannya `ditolak`/`expired` (tidak dibayar dalam window waktu tertentu) otomatis batal dan slot/kuota dilepas kembali. |
| FR-PAY-05 | Tutor dapat melihat riwayat pendapatan (per booking berstatus `paid` & selesai) dan ringkasan total periode berjalan. |
| FR-PAY-06 | Kebijakan pembatalan & refund: pembatalan oleh siswa ≥ 24 jam sebelum jadwal → refund penuh; < 24 jam → refund sebagian/tanpa refund (dikonfigurasi admin); pembatalan oleh tutor → refund penuh ke siswa. Refund dilakukan **manual** oleh admin (transfer langsung di luar sistem), sistem hanya mencatat status `refunded` dan catatan referensi. |
| FR-PAY-07 | Seluruh transaksi tercatat dalam ledger yang dapat diaudit (tidak ada penghapusan data transaksi, hanya perubahan status). |
| FR-PAY-08 | Hanya admin yang dapat mengubah status pembayaran menjadi `paid`/`ditolak`/`refunded`; tidak ada endpoint publik/otomatis yang mengubah status pembayaran tanpa aksi admin. |

### 1.12 Rating & Review (REVIEW)

| ID | Requirement |
|---|---|
| FR-REVIEW-01 | Siswa dapat memberi rating (1–5 bintang) & ulasan teks setelah booking berstatus `sesi_selesai`, atau setelah menyelesaikan kursus. |
| FR-REVIEW-02 | Satu booking/enrollment hanya dapat direview satu kali (dapat diedit dalam jangka waktu tertentu, mis. 7 hari). |
| FR-REVIEW-03 | Tutor dapat membalas (satu kali) setiap ulasan pada profilnya. |
| FR-REVIEW-04 | Rating rata-rata tutor/kursus dihitung ulang setiap ada review baru (materialized/cached, lihat NFR performa). |
| FR-REVIEW-05 | Admin dapat menyembunyikan/menghapus ulasan yang melanggar pedoman. |

### 1.13 Admin & Operasional (ADMIN)

| ID | Requirement |
|---|---|
| FR-ADMIN-01 | Admin dapat meninjau dokumen onboarding tutor dan mengubah status ke `verified`/`rejected` (dengan alasan). |
| FR-ADMIN-02 | Admin dapat suspend/reaktivasi akun (tutor/student/parent) yang melanggar kebijakan. |
| FR-ADMIN-03 | Admin dapat mengelola master data: `Subject` (mapel), `EducationLevel` (jenjang), `Category` (kategori kursus), `Curriculum`. |
| FR-ADMIN-04 | Admin dapat meninjau & menyetujui/menolak kursus sebelum publish. |
| FR-ADMIN-05 | Admin memiliki dashboard ringkasan: jumlah booking per status, GMV, tutor aktif, kursus terlaris. |
| FR-ADMIN-06 | Admin dapat melihat & menindaklanjuti dispute booking/pembayaran (mis. override status, memicu refund manual). |
| FR-ADMIN-07 | Admin dapat mengonfigurasi parameter bisnis: persentase/flat biaya layanan, window pembatalan, passing grade default. |

## 2. Non-Functional Requirements

### 2.1 Performa (PERF)

| ID | Requirement |
|---|---|
| NFR-PERF-01 | 95% API request (non-upload, non-report) harus merespons < 500ms pada beban normal. |
| NFR-PERF-02 | Endpoint pencarian tutor berbasis lokasi harus mendukung dataset hingga puluhan ribu tutor dengan waktu respons < 1s (index spasial pada koordinat, lihat [05-erd.md](05-erd.md)). |
| NFR-PERF-03 | Streaming video kursus menggunakan progressive loading/adaptive bitrate (via CDN/object storage), tidak memuat seluruh file sekaligus. |

### 2.2 Skalabilitas & Maintainability (SCALE)

| ID | Requirement |
|---|---|
| NFR-SCALE-01 | Backend harus stateless (session state di JWT/refresh token store, bukan in-memory) agar dapat dijalankan multi-instance di belakang load balancer. |
| NFR-SCALE-02 | Kode backend mengikuti layered architecture (route → controller → service → repository) agar modul dapat diuji dan diganti secara independen (lihat [04-architecture.md](04-architecture.md)). |
| NFR-SCALE-03 | Skema database dinormalisasi (min. 3NF) dengan indeks pada kolom pencarian umum (foreign key, kolom filter, kolom lokasi). |
| NFR-SCALE-04 | Proses seperti generate sertifikat PDF dan recalculate rating dijalankan synchronous di dalam request (tidak butuh job queue pada skala data proyek ini); waktu eksekusi tetap dijaga singkat (< 2 detik) agar tidak membebani respons. |

### 2.3 Keamanan (SEC)

| ID | Requirement |
|---|---|
| NFR-SEC-01 | Password disimpan dengan hashing bcrypt/argon2 (tidak pernah plaintext). |
| NFR-SEC-02 | Seluruh komunikasi klien-server menggunakan HTTPS/TLS. |
| NFR-SEC-03 | Input divalidasi di sisi server (schema validation) untuk seluruh endpoint yang menerima payload. |
| NFR-SEC-04 | Proteksi terhadap SQL injection (parameterized query via ORM), XSS (sanitasi output/escape di FE), dan CSRF (untuk endpoint berbasis cookie). |
| NFR-SEC-05 | Rate limiting pada endpoint sensitif (login, reset password, OTP) untuk mencegah brute force. |
| NFR-SEC-06 | Dokumen sensitif tutor (KTP, ijazah) disimpan di storage privat (bukan bucket publik), akses via signed URL berumur pendek. |
| NFR-SEC-07 | QR code check-in memiliki masa berlaku singkat dan terikat ke `booking_id` tertentu untuk mencegah reuse/spoofing. |
| NFR-SEC-08 | Data pembayaran sensitif (nomor kartu, dsb.) tidak pernah disimpan di server Learnly — sepenuhnya didelegasikan ke payment gateway (PCI-DSS compliant). |

### 2.4 Ketersediaan & Keandalan (AVAIL)

| ID | Requirement |
|---|---|
| NFR-AVAIL-01 | Target uptime API 99.5% pada jam operasional. |
| NFR-AVAIL-02 | Aksi verifikasi pembayaran oleh admin (approve/reject) harus idempotent — mengulang aksi yang sama pada pembayaran yang sudah `paid`/`ditolak` tidak boleh mengubah state lagi atau menyebabkan duplikasi. |
| NFR-AVAIL-03 | Backup database otomatis harian, retensi minimal 30 hari. |

### 2.5 Usability & Aksesibilitas (UX)

| ID | Requirement |
|---|---|
| NFR-UX-01 | Web app responsif untuk layar mobile, tablet, dan desktop (mobile-first, karena mayoritas pengguna Indonesia mengakses via HP). |
| NFR-UX-02 | Alur booking (pilih tutor → jadwal → alamat/metode → bayar) maksimal 5 langkah dengan indikator progres jelas. |
| NFR-UX-03 | Pesan error ditampilkan dalam bahasa yang dipahami pengguna awam (bukan pesan teknis mentah). |

### 2.6 Observability (OBS)

| ID | Requirement |
|---|---|
| NFR-OBS-01 | Seluruh request API dicatat minimal via console/structured log (method, path, status, durasi) — cukup untuk debugging skala proyek, tanpa perlu servis error-tracking pihak ketiga. |
| NFR-OBS-02 | Metrik bisnis kunci (booking dibuat, pembayaran diverifikasi, sertifikat diterbitkan) diekspos untuk dashboard admin ([FR-ADMIN-05]) lewat query langsung ke database, bukan sistem analitik terpisah. |

### 2.7 Kepatuhan & Lokalisasi (COMPLY)

| ID | Requirement |
|---|---|
| NFR-COMPLY-01 | Data pribadi anak (untuk akun student di bawah parent) diperlakukan sesuai prinsip perlindungan data (akses terbatas, tidak ditampilkan publik). |
| NFR-COMPLY-02 | Format mata uang IDR, format tanggal/waktu Indonesia (WIB/WITA/WIT sesuai lokasi pengguna, default WIB). |
| NFR-COMPLY-03 | Struktur teks UI disiapkan untuk i18n (key-based) meski hanya Bahasa Indonesia yang aktif pada rilis awal. |

## 3. Antarmuka Eksternal (External Interfaces)

| Sistem | Kebutuhan |
|---|---|
| Maps/Geocoding (OpenStreetMap + Nominatim) | Geocode alamat → lat/long, reverse geocode, render peta pin, hitung jarak — gratis, tanpa API key berbayar |
| Email (Gmail SMTP via Nodemailer) | Reset password saja (bukan verifikasi email wajib, lihat [03-tech-stack.md](03-tech-stack.md) §2.6) |
| Cloudinary (free tier) | Upload dokumen tutor, foto profil, bukti transfer pembayaran, sertifikat PDF, thumbnail kursus |

> Tidak ada dependensi ke payment gateway pihak ketiga maupun WhatsApp/SMS gateway pada skala proyek ini (lihat [03-tech-stack.md](03-tech-stack.md) §5 untuk daftar alternatif yang sengaja tidak dipakai).
