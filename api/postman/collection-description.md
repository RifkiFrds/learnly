Koleksi resmi **Learnly REST API** untuk tim frontend. Panduan lengkap: `api/POSTMAN_GUIDE.md`.

**Mulai cepat**

1. Import koleksi ini + environment **Learnly — Lokal**, lalu pilih environment tersebut (pojok kanan atas).
2. Pastikan API lokal menyala (`npm run dev` di folder `api/`, database sudah di-migrate & di-seed).
3. Klik kanan folder **00 · Skenario End-to-End** → _Run folder_ untuk mereplay seluruh alur, atau jalankan request per modul.

**Token otomatis:** request _Login_ menyimpan `accessToken` ke environment dan semua request lain langsung memakainya. Aksi tutor memakai `tutorAccessToken` (request _Login sebagai Tutor_), aksi admin memakai `adminAccessToken` (_Login sebagai Admin_).

**Format response selalu sama:** sukses `{ "success": true, "data": …, "meta"?: … }`, gagal `{ "success": false, "error": { "code", "message", "details"? } }`.

**Tidak ada push/WebSocket:** status booking, pembayaran, dan notifikasi diperbarui dengan _polling_ (fetch ulang berkala).
