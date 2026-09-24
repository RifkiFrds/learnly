# Panduan Postman Learnly API — untuk Tim Frontend

Halo! Dokumen ini dibuat supaya kamu bisa mencoba **seluruh API Learnly** tanpa perlu membaca kode backend. Cukup ikuti langkah di bawah. Kalau ada yang membingungkan, besar kemungkinan jawabannya ada di bagian [Pertanyaan yang sering muncul](#9-pertanyaan-yang-sering-muncul).

File yang kamu butuhkan ada di folder `api/postman/`:

| File                                     | Isinya                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| `learnly.postman_collection.json`        | Semua endpoint (124 request) + contoh response nyata + skenario end-to-end |
| `learnly-local.postman_environment.json` | Variabel `baseUrl`, token, dan ID yang terisi otomatis                     |

---

## 1. Siapkan API-nya (sekali saja)

Pilih salah satu:

**A. Pakai server lokal** (butuh Docker Desktop & Node.js 20+):

```bash
docker compose up -d mysql      # dari root repo
cd api
cp .env.example .env
npm install
npm run prisma:migrate          # buat tabel
npm run db:seed                 # akun admin, master data, + data demo
npm run dev                     # API jalan di http://localhost:4000
```

Cek di browser: <http://localhost:4000/health> harus menampilkan `"db": "connected"`.

**B. Pakai server Railway** (production/staging): tidak perlu install apa pun, cukup ganti `baseUrl` di environment (lihat langkah 2).

## 2. Import ke Postman

1. Buka Postman → tombol **Import** (kiri atas) → seret kedua file JSON di atas → **Import**.
2. Di pojok kanan atas, pilih environment **Learnly — Lokal**.
3. Kalau memakai Railway: klik ikon mata 👁 di sebelah pilihan environment → **Edit** → ubah `baseUrl` menjadi `https://<domain-railway>/api/v1`, dan isi `adminPassword` dengan password admin production. Selain itu **tidak ada yang perlu diedit** — semua token & ID terisi sendiri.

## 3. Token terisi otomatis — cukup login sekali

Setiap request "Login" dan "Daftar" punya script kecil yang menyimpan token ke environment. Setelah itu semua request lain langsung memakainya. Ada tiga "peran" yang dipakai bergantian:

| Variabel           | Diisi oleh request                                       | Dipakai untuk                                                 |
| ------------------ | -------------------------------------------------------- | ------------------------------------------------------------- |
| `accessToken`      | **Login (Siswa/Orang Tua)** atau _Daftar Akun Orang Tua_ | Semua aksi siswa/orang tua (booking, bayar, kursus, ulasan…)  |
| `tutorAccessToken` | **Login sebagai Tutor** atau _Daftar Akun Tutor_         | Aksi tutor (profil, terima booking, update status, check-in…) |
| `adminAccessToken` | **Login sebagai Admin**                                  | Semua request di folder Admin                                 |

Jadi kamu tidak perlu copy-paste token. Access token berlaku **15 menit** — kalau dapat error `401`, jalankan lagi request login yang sesuai (atau _Perbarui Access Token (Refresh)_).

ID yang dihasilkan request (misalnya `bookingId`, `paymentId`, `courseId`, `tutorProfileId`) juga tersimpan otomatis, jadi request berikutnya langsung tahu harus memakai data yang mana.

## 4. Cara tercepat: jalankan skenario lengkap (±15 detik)

1. Di sidebar, klik kanan folder **00 · Skenario End-to-End** → **Run folder**.
2. Pastikan environment **Learnly — Lokal** terpilih → klik **Run**.
3. Tunggu sampai selesai — semua 148 langkah seharusnya hijau.

Skenario ini memutar seluruh alur produk berurutan dan membuat akun baru di setiap run (email unik), jadi aman dijalankan berkali-kali. Setelah selesai, environment berisi data "hidup" yang bisa kamu pakai untuk mencoba request lain secara manual.

## 5. Mencoba alur booking satu per satu (manual)

Kalau ingin memahami alurnya pelan-pelan, jalankan request berikut secara berurutan. Nama di bawah persis sama dengan nama request di Postman.

**Persiapan akun**

1. `Search` → **Daftar Mata Pelajaran**, **Daftar Jenjang Pendidikan**, **Daftar Kategori Kursus** (menyimpan ID master data).
2. `Auth` → **Login sebagai Admin**.
3. `Auth` → **Daftar Akun Orang Tua** → token otomatis tersimpan (kamu sudah "login").
4. `Users & Learners` → **Tambah Profil Anak**, lalu **Tambah Alamat untuk Sesi Tatap Muka**.

**Tutor siap dibooking** 5. `Auth` → **Daftar Akun Tutor**. 6. `Tutor Profile` → **Isi / Ubah Profil Tutor**, **Atur Mata Pelajaran**, **Atur Jenjang**, **Atur Wilayah Layanan**, **Atur Jadwal Mingguan**, **Upload Dokumen / Sertifikasi**, lalu **Profil Tutor Saya** (menyimpan `tutorProfileId`). 7. `Admin` → **Setujui / Tolak Verifikasi Tutor** (tutor sekarang tampil di pencarian).

**Booking tatap muka sampai selesai** 8. `Search` → **Cari Tutor Tatap Muka di Sekitar Lokasi**. 9. `Tutor Profile` → **Slot Kosong Tutor pada Tanggal Tertentu**. 10. `Bookings` → **Buat Booking Baru — Tatap Muka** → status `pending_confirmation`. 11. `Bookings` → **Tutor Menerima Booking** → status `menunggu_pembayaran`. 12. `Bookings` → **Info Tagihan & Cara Bayar** (menyimpan `paymentId`). 13. `Payments` → **Upload Bukti Transfer** → pembayaran `menunggu_verifikasi`. 14. `Admin` → **Setujui Pembayaran (Approve)** → booking otomatis `dikonfirmasi`. 15. `Bookings` → **Update Status — Tutor Bersiap** → **Tutor Dalam Perjalanan** → **Kirim Lokasi Terkini Tutor** → **Tutor Tiba**.
Di sela-sela langkah ini, jalankan **Detail Booking** untuk melihat status berubah (begitulah FE akan melakukan polling). 16. `Bookings` → **Ambil QR Token Check-in** → **Check-in Tatap Muka dengan Scan QR** → status `sesi_berlangsung`. 17. `Bookings` → **Akhiri Sesi + Isi Laporan Perkembangan** → status `sesi_selesai`. 18. `Reports` → **Riwayat Laporan Perkembangan**, lalu `Reviews` → **Beri Ulasan Sesi Tutor**.

Setiap request punya **tab Description** yang menjelaskan kapan dipakai, siapa yang boleh, apa yang terjadi setelah sukses, dan error yang mungkin muncul. Setiap request juga punya **contoh response** (klik nama request → dropdown _Examples_ di kanan atas) sehingga kamu bisa melihat bentuk data tanpa menjalankannya.

## 6. Cara membaca response

Semua endpoint memakai bentuk yang **sama persis**, jadi kamu cukup menulis satu helper fetch.

**Sukses**

```json
{ "success": true, "data": { "id": 22, "status": "pending_confirmation" } }
```

Endpoint daftar (list) menambahkan `meta` untuk paginasi:

```json
{ "success": true, "data": [ … ], "meta": { "page": 1, "limit": 20, "total": 134, "totalPages": 7 } }
```

**Gagal**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data yang dikirim belum sesuai. Cek kembali isian yang ditandai.",
    "details": [{ "field": "addressId", "message": "Alamat wajib diisi untuk sesi tatap muka" }]
  }
}
```

`message` sudah berbahasa Indonesia dan aman ditampilkan langsung ke pengguna. `details` hanya ada di error validasi — tampilkan `details[i].message` di bawah input bernama `details[i].field`.

| HTTP      | `error.code`                             | Artinya                                                                  | Yang sebaiknya dilakukan FE                           |
| --------- | ---------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------- |
| 400       | `VALIDATION_ERROR`                       | Isian tidak valid                                                        | Tandai field yang salah                               |
| 401       | `UNAUTHENTICATED`                        | Belum login / token kedaluwarsa                                          | Panggil refresh sekali; kalau gagal, ke halaman login |
| 403       | `FORBIDDEN`                              | Role salah, bukan pemilik data, atau akun ditangguhkan                   | Tampilkan pesan; sembunyikan tombol yang tidak berhak |
| 404       | `NOT_FOUND`                              | Data tidak ada                                                           | Halaman "tidak ditemukan"                             |
| 409       | `CONFLICT`                               | Bentrok (slot sudah dipesan, sudah pernah review, email terdaftar)       | Minta user memilih ulang                              |
| 422       | `BUSINESS_RULE_VIOLATION`                | Melanggar aturan bisnis (di luar jadwal tutor, batal saat sesi berjalan) | Tampilkan `message` apa adanya                        |
| 429       | `TOO_MANY_REQUESTS`                      | Terlalu sering login/reset password                                      | Minta user menunggu 15 menit                          |
| 500 / 503 | `INTERNAL_ERROR` / `SERVICE_UNAVAILABLE` | Masalah server/database                                                  | "Coba lagi sebentar lagi"                             |

**Hal kecil yang perlu diketahui**

- **ID dan nominal uang berupa angka** (`"totalAmount": 160000` = Rp160.000, tanpa desimal).
- **Waktu** (`scheduledStartAt`, `createdAt`, …) dalam format ISO UTC, mis. `2026-09-27T02:00:00.000Z` = 27 Sep 2026 09:00 WIB. Format sendiri ke WIB di FE. Saat **mengirim** jadwal, sertakan zona waktu: `2026-09-27T09:00:00+07:00`.
- **Tanggal saja** (tanggal lahir, tanggal blokir) berupa string `YYYY-MM-DD`.
- Banyak response menyertakan label siap tampil, mis. `statusLabel: "Menunggu konfirmasi tutor"`, dan daftar `availableActions` untuk menentukan tombol mana yang ditampilkan.

## 7. Kamus status (bahasa awam)

### Status booking (`booking.status`)

| Nilai                    | Artinya                                                                               | Siapa yang mengubah ke status berikutnya        |
| ------------------------ | ------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `pending_confirmation`   | Menunggu tutor menerima/menolak (maks. 24 jam, lewat itu otomatis batal)              | Tutor                                           |
| `rejected`               | Tutor menolak. **Final.**                                                             | —                                               |
| `menunggu_pembayaran`    | Tutor menerima, siswa/orang tua perlu membayar (maks. 24 jam)                         | Siswa upload bukti → admin approve              |
| `dikonfirmasi`           | Sudah dibayar & diverifikasi, sesi terkunci                                           | Tutor (tatap muka: bersiap; online: mulai sesi) |
| `tutor_bersiap`          | Tutor bersiap berangkat (khusus tatap muka)                                           | Tutor                                           |
| `tutor_dalam_perjalanan` | Tutor sedang menuju lokasi; lokasi tutor bisa tampil di peta                          | Tutor                                           |
| `tutor_tiba`             | Tutor sudah sampai; siswa menampilkan QR                                              | Tutor (scan QR)                                 |
| `sesi_berlangsung`       | Sesi sedang berjalan                                                                  | Tutor (akhiri sesi + laporan)                   |
| `sesi_selesai`           | Sesi selesai & laporan tersedia; siswa bisa memberi ulasan. **Final.**                | —                                               |
| `dibatalkan`             | Dibatalkan siswa/tutor/sistem/admin. **Final.** Lihat `cancelReason` & `cancelledBy`. | —                                               |

Urutannya tidak bisa dilompati atau mundur. Sesi **online** melewati status perjalanan: `dikonfirmasi → sesi_berlangsung → sesi_selesai`. Pembatalan hanya bisa sebelum `sesi_berlangsung`.

### Status pembayaran (`payment.status`)

| Nilai                 | Artinya                                                                       |
| --------------------- | ----------------------------------------------------------------------------- |
| `menunggu_pembayaran` | Tagihan dibuat, user belum upload bukti transfer                              |
| `menunggu_verifikasi` | Bukti sudah diunggah, **menunggu admin mengecek** (bukan otomatis!)           |
| `paid`                | Admin menyetujui — lunas                                                      |
| `ditolak`             | Admin menolak bukti (lihat `rejectionReason`); booking terkait otomatis batal |
| `expired`             | Tidak dibayar sampai batas waktu, atau booking dibatalkan sebelum dibayar     |
| `refunded`            | Uang sudah dikembalikan admin (lihat `refundAmount` & `refundNote`)           |

### Status kursus & belajar

| Field                   | Nilai                                                 | Artinya                                                                                        |
| ----------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `course.status`         | `draft` → `in_review` → `published` (atau `archived`) | Draf, sedang direview admin, sudah terbit di katalog, diarsipkan                               |
| `enrollment.status`     | `active` / `completed`                                | Sedang belajar / semua materi sudah selesai                                                    |
| `enrollment.hasAccess`  | `true` / `false`                                      | Materi terbuka (gratis atau sudah lunas) atau masih terkunci menunggu pembayaran               |
| `lesson progressStatus` | `not_started` / `in_progress` / `completed`           | Belum dibuka / kuis dicoba tapi belum lulus / selesai                                          |
| `lesson.type`           | `video`, `article`, `quiz`, `assignment`              | Video, materi bacaan, kuis pilihan ganda (dinilai otomatis), tugas upload (dinilai instruktur) |

### Status lainnya

| Field                      | Nilai                                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `tutor.verificationStatus` | `pending_verification` (menunggu admin), `verified` (tampil di pencarian), `rejected` (lihat `verificationNotes`) |
| `teachingMode`             | `online`, `tatap_muka`, `both`                                                                                    |
| `user.role`                | `student`, `parent`, `tutor`, `admin`                                                                             |
| `user.status`              | `active`, `suspended` (ditangguhkan admin — semua request dapat 403)                                              |

## 8. Dua hal yang sering bikin bingung

### Pembayaran itu **manual**, bukan otomatis

Tidak ada payment gateway. Alurnya:

```
Tutor terima booking ─► tagihan dibuat (menunggu_pembayaran)
        │
        ▼
FE tampilkan QRIS / rekening dari GET /bookings/:id/payment-info
        │
User bayar lewat aplikasi bank/e-wallet (di luar Learnly)
        │
        ▼
User upload screenshot bukti ─► POST /payments/:id/proof ─► menunggu_verifikasi
        │
        ▼
Admin cek bukti di panel admin ─► approve (paid, booking dikonfirmasi)
                               └► reject  (ditolak, booking dibatalkan)
```

Setelah upload bukti, tampilkan pesan jujur seperti _"Kami akan memverifikasi bukti transfermu maksimal 1x24 jam"_, lalu **poll** `GET /payments/:id` sampai statusnya berubah. Kursus berbayar memakai alur pembayaran yang sama persis.

### Update status itu **polling**, bukan push

Server **tidak** mengirim update sendiri (tidak ada WebSocket). FE yang harus bertanya ulang secara berkala. Response sudah memberi petunjuk lewat field `polling`:

```json
"polling": { "shouldPoll": true, "intervalSeconds": 5 }
```

| Yang dipantau           | Endpoint                         | Interval    | Berhenti saat                                       |
| ----------------------- | -------------------------------- | ----------- | --------------------------------------------------- |
| Status & lokasi booking | `GET /bookings/:id`              | 5 detik     | `polling.shouldPoll = false` (status final)         |
| Status pembayaran       | `GET /payments/:id`              | 5 detik     | `polling.shouldPoll = false` (paid/ditolak/expired) |
| Notifikasi baru         | `GET /notifications?unread=true` | 15–30 detik | Selama aplikasi terbuka                             |

Dengan TanStack Query, cukup begini:

```ts
const { data } = useQuery({
  queryKey: ['booking', id],
  queryFn: () => apiFetch(`/bookings/${id}`),
  refetchInterval: (query) =>
    query.state.data?.polling.shouldPoll ? query.state.data.polling.intervalSeconds * 1000 : false,
});
```

## 9. Pertanyaan yang sering muncul

**Upload file di web app pakai apa?** Kirim `multipart/form-data` dengan field **`file`** (field lain seperti `title` atau `enrollmentId` sebagai field teks biasa). Di Postman kami memakai versi JSON `{ "fileBase64": "data:image/png;base64,..." }` supaya bisa dijalankan tanpa memilih file — server menerima keduanya.

**Kenapa refresh token juga ada di body response?** Untuk Postman & klien non-browser. Di web app, abaikan saja: refresh token sudah tersimpan sebagai cookie httpOnly. Panggil `fetch` dengan `credentials: 'include'` agar cookie ikut terkirim ke `/auth/refresh`.

**Dapat `409 CONFLICT` saat membuat booking?** Slot itu sudah terisi. Ambil ulang `GET /tutors/:id/available-slots` dan pilih jam lain. (Di Postman, request _Buat Booking Tambahan_ otomatis memilih jam berikutnya.)

**Dapat `401` di tengah-tengah?** Access token hanya 15 menit. Jalankan lagi request login yang sesuai perannya.

**Dapat `429` saat login?** Kamu mencoba login gagal lebih dari 10 kali untuk email yang sama dalam 15 menit. Tunggu sebentar.

**Link di email (reset password/verifikasi) tidak pernah datang di server lokal?** Server lokal tidak mengirim email sungguhan. Tokennya dikembalikan di response (`devResetToken`, `devEmailVerificationToken`) dan isi email tercetak di terminal API.

**Akun untuk dicoba langsung (server lokal, setelah `npm run db:seed`)?**

| Akun                       | Email                                                                                     | Password            |
| -------------------------- | ----------------------------------------------------------------------------------------- | ------------------- |
| Admin                      | `admin@learnly.id`                                                                        | `AdminLearnly#2026` |
| Tutor demo (terverifikasi) | `demo.tutor.budi@learnly.id`, `demo.tutor.dewi@learnly.id`, `demo.tutor.fajar@learnly.id` | `DemoLearnly123`    |

Ada juga dua kursus demo yang sudah terbit (satu gratis, satu berbayar).

**Butuh endpoint yang belum ada?** Kabari tim backend. Kontrak resmi ada di `docs/06-api-spec.md`, dan koleksi ini dibuat otomatis dari kode, jadi selalu sinkron dengan API yang berjalan.
