# API Specification — Learnly

Status: Draft v1.1 (pembayaran manual, polling menggantikan WebSocket)
Terkait: [02-srs.md](02-srs.md), [05-erd.md](05-erd.md), [07-ssd.md](07-ssd.md)

## 1. Konvensi Umum

- **Base URL**: `https://api.learnly.id/api/v1` (contoh; dikonfigurasi via `NEXT_PUBLIC_API_BASE_URL`).
- **Format**: JSON, `Content-Type: application/json` (kecuali endpoint upload → `multipart/form-data`).
- **Auth**: header `Authorization: Bearer <access_token>` untuk endpoint terproteksi.
- **Versioning**: prefix `/v1`; breaking change berikutnya memakai `/v2`.

### 1.1 Response Envelope

Sukses:
```json
{ "success": true, "data": { }, "meta": { } }
```
`meta` dipakai untuk pagination:
```json
{ "meta": { "page": 1, "limit": 20, "total": 134, "totalPages": 7 } }
```

Error:
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Alamat wajib diisi untuk sesi tatap muka", "details": [ { "field": "addressId", "message": "required" } ] } }
```

### 1.2 Kode Status & Error

| HTTP | `error.code` | Kapan |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Payload tidak valid |
| 401 | `UNAUTHENTICATED` | Token tidak ada/invalid/expired |
| 403 | `FORBIDDEN` | Role tidak berhak |
| 404 | `NOT_FOUND` | Resource tidak ditemukan |
| 409 | `CONFLICT` | Mis. slot bentrok, sudah pernah review |
| 422 | `BUSINESS_RULE_VIOLATION` | Mis. cancel window terlewati |
| 500 | `INTERNAL_ERROR` | Kesalahan tak terduga |

### 1.3 Pagination Query Params

`?page=1&limit=20&sort=-createdAt` (prefix `-` = descending).

## 2. Auth (`/auth`) — lihat FR-AUTH-*

| Method | Path | Role | Deskripsi |
|---|---|---|---|
| POST | `/auth/register` | guest | Registrasi (`role`: student/parent/tutor) |
| POST | `/auth/verify-email` | guest | Verifikasi email via token |
| POST | `/auth/login` | guest | Login → access token + set refresh cookie |
| POST | `/auth/refresh` | guest (cookie) | Refresh access token |
| POST | `/auth/logout` | authenticated | Revoke refresh token |
| POST | `/auth/forgot-password` | guest | Kirim email reset password |
| POST | `/auth/reset-password` | guest | Set password baru via token |
| GET | `/auth/me` | authenticated | Data profil user login |

## 3. Users & Learners (`/users`, `/learners`) — FR-AUTH-06

| Method | Path | Role | Deskripsi |
|---|---|---|---|
| PATCH | `/users/me` | authenticated | Update profil sendiri |
| GET | `/learners` | student, parent | Daftar learner milik akun (diri sendiri/anak) |
| POST | `/learners` | parent | Tambah profil anak |
| PATCH | `/learners/:id` | parent (owner) | Edit profil anak |
| DELETE | `/learners/:id` | parent (owner) | Hapus profil anak |
| GET | `/addresses` | student, parent | Daftar alamat tersimpan |
| POST | `/addresses` | student, parent | Tambah alamat baru |
| PATCH | `/addresses/:id` | owner | Edit alamat |
| DELETE | `/addresses/:id` | owner | Hapus alamat |

## 4. Tutor Profile & Availability (`/tutors`) — FR-TUTOR-*

| Method | Path | Role | Deskripsi |
|---|---|---|---|
| GET | `/tutors/me` | tutor | Profil tutor milik sendiri |
| PUT | `/tutors/me` | tutor | Update profil (bio, pendidikan, tarif, kurikulum, mode) |
| POST | `/tutors/me/certifications` | tutor | Tambah sertifikasi (upload file) |
| DELETE | `/tutors/me/certifications/:id` | tutor | Hapus sertifikasi |
| PUT | `/tutors/me/subjects` | tutor | Set daftar mapel yang diajarkan |
| PUT | `/tutors/me/education-levels` | tutor | Set jenjang yang diajarkan |
| PUT | `/tutors/me/service-areas` | tutor | Set wilayah layanan tatap muka |
| PUT | `/tutors/me/availabilities` | tutor | Set jadwal ketersediaan mingguan |
| POST | `/tutors/me/blocked-dates` | tutor | Tambah tanggal blokir |
| DELETE | `/tutors/me/blocked-dates/:id` | tutor | Hapus tanggal blokir |
| GET | `/tutors/:id` | public | Detail profil tutor publik (termasuk rating & review) |
| GET | `/tutors/:id/available-slots?date=YYYY-MM-DD` | public | Slot tersedia pada tanggal tsb |

## 5. Pencarian (`/search`) — FR-SEARCH-*

| Method | Path | Role | Deskripsi |
|---|---|---|---|
| GET | `/search/tutors` | public | Query: `subjectId, educationLevelId, mode, minRate, maxRate, minRating, lat, lng, radiusKm, sort, page, limit` |
| GET | `/search/courses` | public | Query: `categoryId, educationLevelId, level, priceType(free/paid), minRating, q, sort, page, limit` |

## 6. Booking (`/bookings`) — FR-BOOK-*, FR-TRACK-*, FR-CHECKIN-*

| Method | Path | Role | Deskripsi |
|---|---|---|---|
| POST | `/bookings` | student, parent | Buat booking baru (`learnerId, tutorProfileId, subjectId, mode, scheduledStartAt, durationMinutes, addressId?`) |
| GET | `/bookings` | student, parent, tutor | Daftar booking milik sendiri (filter `status`) |
| GET | `/bookings/:id` | pemilik terkait | Detail booking + status history |
| PATCH | `/bookings/:id/respond` | tutor | Terima/tolak booking (`action: accept|reject`) |
| GET | `/bookings/:id/payment-info` | student, parent | Nominal tagihan + gambar QRIS/info rekening (lihat §9) |
| PATCH | `/bookings/:id/status` | tutor | Update status perjalanan (`tutor_bersiap`, `tutor_dalam_perjalanan`, `tutor_tiba`) |
| POST | `/bookings/:id/location-ping` | tutor | Kirim titik lokasi terkini (saat `tutor_dalam_perjalanan`) |
| POST | `/bookings/:id/checkin` | tutor | Check-in (opsional `qrToken` untuk verifikasi tatap muka) |
| GET | `/bookings/:id/qr-token` | student, parent | Generate/ambil QR token aktif untuk ditampilkan ke tutor |
| POST | `/bookings/:id/checkout-session` | tutor | Check-out + submit laporan perkembangan (body = payload `progress_reports`) |
| POST | `/bookings/:id/cancel` | pemilik terkait | Batalkan booking (`reason`) |

> Catatan penamaan: `/bookings/:id/payment-info` (lihat tagihan & QRIS) vs `/bookings/:id/checkout-session` (mengakhiri sesi belajar, tutor check-out) sengaja dibedakan namanya untuk menghindari ambiguitas "pembayaran" vs "check-out sesi les". Pembayaran aktual dilakukan lewat modul `/payments` (§9) karena satu alur pembayaran dipakai bersama oleh booking dan enrollment kursus.

> Catatan real-time: `GET /bookings/:id` dipanggil FE secara **polling** (tiap ~5 detik) selama status belum final, sebagai pengganti WebSocket (lihat [03-tech-stack.md](03-tech-stack.md) §2.2 & [04-architecture.md](04-architecture.md) §6).

## 7. Laporan Perkembangan (`/reports`) — FR-REPORT-*

| Method | Path | Role | Deskripsi |
|---|---|---|---|
| GET | `/reports` | student, parent | Riwayat laporan (filter `learnerId, subjectId, tutorProfileId, dateFrom, dateTo`) |
| GET | `/reports/:bookingId` | pemilik terkait, tutor pembuat | Detail satu laporan |

## 8. Kursus (`/courses`) — FR-COURSE-*, FR-EVAL-*

| Method | Path | Role | Deskripsi |
|---|---|---|---|
| GET | `/courses/:slug` | public | Detail kursus (modul, lesson preview, rating) |
| POST | `/courses` | admin | Buat kursus baru |
| PUT | `/courses/:id` | admin (pembuat) | Edit metadata kursus |
| PUT | `/courses/:id/modules` | admin | Susun ulang/edit modul |
| POST | `/courses/:id/modules/:moduleId/lessons` | admin | Tambah lesson |
| PATCH | `/courses/:id/submit-review` | admin | `draft` → `in_review` |
| PATCH | `/courses/:id/publish` | admin | `in_review` → `published` |
| POST | `/courses/:id/enroll` | student, parent | Enroll (gratis langsung; berbayar → return payment info) |
| GET | `/enrollments/:id` | pemilik | Progres & status enrollment |
| POST | `/lessons/:id/complete` | pemilik enrollment | Tandai lesson selesai (video/artikel) |
| POST | `/lessons/:id/quiz-attempts` | pemilik enrollment | Submit jawaban kuis → skor otomatis |
| POST | `/lessons/:id/assignments` | pemilik enrollment | Upload tugas |
| PATCH | `/assignments/:id/grade` | admin/instruktur | Beri nilai & feedback tugas |
| GET | `/enrollments/:id/certificate` | pemilik | Unduh sertifikat (jika sudah terbit) |

## 9. Pembayaran Manual (`/payments`) — FR-PAY-*

| Method | Path | Role | Deskripsi |
|---|---|---|---|
| GET | `/payments` | student, parent, tutor | Riwayat transaksi (payer atau earnings tutor) |
| GET | `/payments/:id` | pemilik terkait | Detail transaksi (termasuk `proofImageUrl` jika sudah diupload) |
| POST | `/payments/:id/proof` | student, parent | Upload bukti transfer (`multipart/form-data`, field `file`) → status `menunggu_verifikasi` |
| GET | `/admin/payments?status=menunggu_verifikasi` | admin | Antrian pembayaran yang perlu diverifikasi |
| PATCH | `/admin/payments/:id/verify` | admin | `{ action: "approve" \| "reject", rejectionReason? }` → `paid` (lanjutkan booking/enrollment) atau `ditolak` |
| GET | `/tutors/me/earnings` | tutor | Ringkasan pendapatan per periode (dihitung dari `payments.status = paid`) |

> Tidak ada endpoint webhook — seluruh perubahan status pembayaran dipicu aksi manusia (user upload bukti, admin approve/reject), sesuai [03-tech-stack.md](03-tech-stack.md) §2.1.

## 10. Review (`/reviews`) — FR-REVIEW-*

| Method | Path | Role | Deskripsi |
|---|---|---|---|
| POST | `/reviews` | student, parent | Buat review (`reviewableType, reviewableId, rating, comment`) |
| PATCH | `/reviews/:id` | pembuat | Edit review (dalam window waktu tertentu) |
| POST | `/reviews/:id/reply` | tutor terkait | Balas review |
| GET | `/tutors/:id/reviews` | public | Daftar review tutor |
| GET | `/courses/:id/reviews` | public | Daftar review kursus |

## 11. Notifikasi (`/notifications`)

| Method | Path | Role | Deskripsi |
|---|---|---|---|
| GET | `/notifications` | authenticated | Daftar notifikasi (filter `unread=true`) |
| PATCH | `/notifications/:id/read` | authenticated | Tandai dibaca |
| PATCH | `/notifications/read-all` | authenticated | Tandai semua dibaca |

## 12. Admin (`/admin`) — FR-ADMIN-*

| Method | Path | Role | Deskripsi |
|---|---|---|---|
| GET | `/admin/tutors?status=pending_verification` | admin | Antrian verifikasi tutor |
| PATCH | `/admin/tutors/:id/verify` | admin | Approve/reject (`status, notes`) |
| PATCH | `/admin/users/:id/suspend` | admin | Suspend/reaktivasi akun |
| CRUD | `/admin/subjects`, `/admin/education-levels`, `/admin/categories` | admin | Master data |
| GET | `/admin/courses?status=in_review` | admin | Antrian review kursus |
| GET | `/admin/dashboard/summary` | admin | Ringkasan KPI (booking, GMV, tutor aktif) |
| GET | `/admin/disputes` | admin | Daftar booking/pembayaran bermasalah |
| PATCH | `/admin/settings` | admin | Update `platform_settings` (service fee %, cancel window, dsb.) |

## 13. Update Status via Polling (bukan WebSocket)

Tidak ada koneksi WebSocket. FE memperbarui tampilan status booking/lokasi/notifikasi dengan **polling periodik** ke endpoint REST biasa, memakai TanStack Query `refetchInterval`:

| Kebutuhan | Endpoint di-poll | Interval saran | Berhenti polling saat |
|---|---|---|---|
| Status & lokasi booking | `GET /bookings/:id` | 5 detik | status `sesi_selesai` atau `dibatalkan` |
| Status pembayaran | `GET /payments/:id` | 5 detik | status `paid` atau `ditolak` |
| Notifikasi baru | `GET /notifications?unread=true` | 15–30 detik | selalu aktif selama halaman terbuka |

Pendekatan ini dipilih agar tidak perlu server WebSocket/Redis terpisah (lihat [03-tech-stack.md](03-tech-stack.md) §2.2). Endpoint `POST /bookings/:id/location-ping` (§6) tetap ada untuk tutor mengirim titik lokasi; klien siswa/orang tua membacanya lewat polling `GET /bookings/:id`, bukan event push.

## 14. Contoh Payload — Buat Booking Tatap Muka

```json
POST /bookings
{
  "learnerId": 12,
  "tutorProfileId": 45,
  "subjectId": 3,
  "mode": "tatap_muka",
  "scheduledStartAt": "2026-10-01T09:00:00+07:00",
  "durationMinutes": 90,
  "addressId": 7
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": 981,
    "status": "pending_confirmation",
    "hourlyRateSnapshot": 100000,
    "serviceFee": 10000,
    "totalAmount": 160000,
    "scheduledStartAt": "2026-10-01T09:00:00+07:00",
    "scheduledEndAt": "2026-10-01T10:30:00+07:00"
  }
}
```
