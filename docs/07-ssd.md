# System Sequence Diagrams (SSD) — Learnly

Status: Draft v1.1 (pembayaran manual QRIS + verifikasi admin, polling menggantikan WebSocket/job queue)
Terkait: [06-api-spec.md](06-api-spec.md), [02-srs.md](02-srs.md)

Diagram di bawah menggambarkan interaksi antara aktor, Web App (klien), API, dan sistem eksternal untuk alur-alur utama. Notasi: `System` mewakili keseluruhan Express API + DB (detail internal ada di [04-architecture.md](04-architecture.md)).

## 1. Registrasi & Verifikasi Akun

```mermaid
sequenceDiagram
    actor U as User (Student/Parent/Tutor)
    participant Web
    participant API as System
    participant Mail as Email Provider

    U->>Web: Isi form registrasi
    Web->>API: POST /auth/register
    API->>API: validasi & hash password, simpan user (status=unverified)
    API->>Mail: enqueue kirim email verifikasi
    API-->>Web: 201 Created
    Mail-->>U: Email verifikasi
    U->>Web: Klik link verifikasi
    Web->>API: POST /auth/verify-email {token}
    API->>API: set status=active, email_verified_at
    API-->>Web: 200 OK
```

## 2. Pencarian & Booking Tutor Tatap Muka

```mermaid
sequenceDiagram
    actor P as Parent
    participant Web
    participant API as System
    participant Geo as Geocoding Service

    P->>Web: Input lokasi (alamat/pin peta) + filter (mapel, jenjang, tarif)
    Web->>Geo: geocode alamat → lat/long (jika input teks)
    Geo-->>Web: lat/long
    Web->>API: GET /search/tutors?lat&lng&subjectId&...
    API->>API: query tutor_service_areas (Haversine) + filter
    API-->>Web: daftar tutor terurut jarak
    P->>Web: Pilih tutor → lihat slot tersedia
    Web->>API: GET /tutors/:id/available-slots?date=
    API-->>Web: slot kosong
    P->>Web: Pilih slot, pilih/isi alamat, konfirmasi
    Web->>API: POST /bookings {tutorProfileId, addressId, ...}
    API->>API: validasi bentrok jadwal, hitung total biaya
    API->>API: simpan booking status=pending_confirmation
    API-->>Web: booking dibuat
    API-->>Web: (notif) booking baru → tutor
```

## 3. Konfirmasi Tutor & Pembayaran Manual (QRIS + Verifikasi Admin)

```mermaid
sequenceDiagram
    actor T as Tutor
    actor P as Parent
    actor Ad as Admin
    participant Web
    participant API as System
    participant CL as Cloudinary

    T->>Web: Buka daftar booking masuk
    Web->>API: GET /bookings?status=pending_confirmation
    API-->>Web: daftar booking
    T->>Web: Terima booking
    Web->>API: PATCH /bookings/:id/respond {action: accept}
    API->>API: Booking.status → menunggu_pembayaran, Payment dibuat (status=menunggu_pembayaran)
    Note over API,Web: notifikasi dibuat di tabel notifications, dibaca via polling oleh Parent

    P->>Web: Buka booking, lihat nominal & QRIS
    Web->>API: GET /bookings/:id/payment-info
    API-->>Web: nominal + gambar QRIS
    P->>Web: Scan QRIS di aplikasi e-wallet/bank, transfer manual
    P->>Web: Upload bukti transfer
    Web->>API: POST /payments/:id/proof (file)
    API->>CL: simpan gambar bukti
    API->>API: Payment.status → menunggu_verifikasi

    Ad->>Web: Buka antrian verifikasi pembayaran
    Web->>API: GET /admin/payments?status=menunggu_verifikasi
    API-->>Web: daftar + gambar bukti
    Ad->>Web: Approve
    Web->>API: PATCH /admin/payments/:id/verify {action: approve}
    API->>API: Payment.status → paid, Booking.status → dikonfirmasi

    P->>Web: (polling GET /bookings/:id tiap 5 detik)
    Web-->>P: status ter-update → "Dikonfirmasi"
```

## 4. Pelacakan Status & Check-in dengan QR (Sesi Tatap Muka)

```mermaid
sequenceDiagram
    actor T as Tutor
    actor S as Student/Parent
    participant Web
    participant API as System

    S->>Web: Buka halaman detail booking (H-1/hari-H)
    loop polling tiap 5 detik
        Web->>API: GET /bookings/:id
        API-->>Web: status & lokasi terkini
    end

    T->>Web: Tandai "Bersiap" / "Dalam perjalanan"
    Web->>API: PATCH /bookings/:id/status {status: tutor_dalam_perjalanan}
    API->>API: validasi transisi status, simpan + booking_status_history
    Note over Web,S: polling berikutnya (≤5 detik) otomatis menampilkan status baru

    loop selama dalam perjalanan (opsional)
        T->>Web: kirim posisi
        Web->>API: POST /bookings/:id/location-ping
        API->>API: simpan ke tutor_locations
        Note over Web,S: terbaca lewat polling GET /bookings/:id
    end

    S->>Web: Tampilkan QR code booking
    Web->>API: GET /bookings/:id/qr-token
    API-->>Web: qrToken (short-lived)

    T->>Web: Scan QR (kamera browser)
    Web->>API: POST /bookings/:id/checkin {qrToken}
    API->>API: verifikasi token & validasi, status → sesi_berlangsung, checked_in_at
    Note over Web,S: polling berikutnya menampilkan "Sesi dimulai"
```

## 5. Check-out & Laporan Perkembangan

```mermaid
sequenceDiagram
    actor T as Tutor
    participant Web
    participant API as System

    T->>Web: Akhiri sesi, isi form laporan perkembangan
    Web->>API: POST /bookings/:id/checkout-session {materialsCovered, understandingLevel, ...}
    API->>API: simpan progress_reports, booking status → sesi_selesai, checked_out_at
    API->>API: buat notifikasi in-app langsung (synchronous)
    API-->>Web: 200 OK
    Note over Web: Student/Parent melihat laporan & notifikasi lewat polling GET /notifications
```

## 6. Enrollment & Belajar Kursus Online (Berbayar)

```mermaid
sequenceDiagram
    actor S as Student
    actor Ad as Admin
    participant Web
    participant API as System

    S->>Web: Pilih kursus, klik Enroll
    Web->>API: POST /courses/:id/enroll
    alt kursus berbayar
        API->>API: buat Payment (status=menunggu_pembayaran), course_enrollments (status=active, terkunci sampai paid)
        API-->>Web: nominal + QRIS
        S->>Web: Upload bukti transfer
        Web->>API: POST /payments/:id/proof
        API->>API: Payment.status → menunggu_verifikasi
        Ad->>API: PATCH /admin/payments/:id/verify {action: approve}
        API->>API: Payment.status → paid, akses kursus dibuka penuh
    else kursus gratis
        API->>API: buat course_enrollments langsung
    end
    S->>Web: Buka lesson, tandai selesai / kerjakan kuis
    Web->>API: POST /lessons/:id/complete atau /lessons/:id/quiz-attempts
    API->>API: update lesson_progress, recalculate progress_percent
    alt progress 100% & nilai >= passing grade
        API->>API: generate certificate PDF (synchronous, on-demand)
        API-->>Web: notifikasi sertifikat terbit
    end
```

## 7. Rating & Review Pasca Sesi

```mermaid
sequenceDiagram
    actor S as Student/Parent
    participant Web
    participant API as System

    S->>Web: Buka booking status=sesi_selesai, isi rating & ulasan
    Web->>API: POST /reviews {reviewableType: tutor_booking, reviewableId, rating, comment}
    API->>API: validasi belum pernah review, simpan review
    API->>API: recalculate tutor_profiles.avg_rating & review_count (synchronous, di request yang sama)
    API-->>Web: 201 Created

    actor T as Tutor
    T->>Web: Balas ulasan
    Web->>API: POST /reviews/:id/reply
    API-->>Web: 200 OK
```
