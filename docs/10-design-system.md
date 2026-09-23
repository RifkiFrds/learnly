# Design System & UI/UX Guideline — Learnly

Status: Draft v1.0
Terkait: [01-prd.md](01-prd.md), [03-tech-stack.md](03-tech-stack.md), [07-ssd.md](07-ssd.md)

Dokumen ini adalah **kontrak visual & interaksi** untuk seluruh FE Learnly. Tujuannya: memastikan hasil akhir terasa dirancang dengan niat — bukan "AI slop" (tampilan generik yang langsung ketahuan hasil auto-generate tanpa arah desain). Setiap keputusan visual di sini **wajib diikuti** oleh siapa pun/apa pun yang membangun UI (termasuk AI coding agent), bukan sekadar saran.

## 1. Filosofi Desain

1. **Human-friendly, bukan corporate-generic.** Learnly bicara ke orang tua yang khawatir soal anaknya, siswa yang stres cari tutor, dan tutor yang mengandalkan platform ini untuk penghasilan. UI harus terasa tenang, jujur, dan membantu — bukan penuh jargon marketing atau elemen "hype" (badge "AI-Powered!", confetti animation berlebihan, urgency palsu).
2. **Konten dulu, dekorasi belakangan.** Foto tutor, rating, harga, dan jadwal adalah alasan orang datang — bukan ilustrasi hero. Setiap elemen dekoratif harus punya alasan fungsional, bukan sekadar "biar rame".
3. **Konsisten & bisa ditebak.** Satu pola interaksi (mis. status booking, form validasi, tombol utama) dipakai identik di semua halaman. Pengguna tidak boleh belajar ulang UI di tiap halaman.
4. **Aksesibel secara default**, bukan tambahan belakangan (lihat §7).
5. **Berani punya identitas**, bukan netral sampai tidak berkarakter. Warna, tipografi, dan tone tulisan Learnly harus dikenali meski logonya ditutup.

## 2. Referensi & Cara Memakainya (Bukan untuk Ditiru Mentah)

| Referensi | Yang Diambil | Yang **Tidak** Diambil |
|---|---|---|
| **Claude.ai / Anthropic** | Palet warm-neutral (bukan putih pucat/abu dingin khas SaaS), whitespace lega, tipografi editorial (serif untuk judul + sans humanis untuk UI), nada tulisan tenang-percaya diri, shadow tipis/border halus (bukan drop-shadow tebal neon), komponen rapi tanpa dekorasi berlebih. | Warna coklat/oranye spesifik Anthropic, logo, aset visual apa pun milik mereka. Learnly punya palet sendiri (§4.1) yang *terinspirasi* nuansa yang sama (hangat, percaya diri), bukan menyalin kode warna. |
| **Udemy** | Pola informasi: course card (thumbnail, judul, instruktur, rating+jumlah review, harga), filter sidebar di halaman katalog, tab konten kursus (Overview/Curriculum/Reviews), sticky enroll box, progress bar linear di dashboard belajar, breadcrumb navigasi. | Palet ungu Udemy, layout section homepage yang penuh carousel, iklan/promo banner bertumpuk, kepadatan visual yang berlebihan. |

Prinsip gabungannya: **kepadatan informasi ala Udemy, ketenangan visual ala Claude.ai.** Data (harga, rating, jarak, jadwal) tetap scannable dan padat, tapi dibungkus whitespace dan tipografi yang tidak berteriak.

## 3. Anti-Pattern — Daftar "Jangan Lakukan Ini" (Ciri AI Slop)

Tolak/hindari secara eksplisit hal-hal berikut di seluruh UI Learnly:

- ❌ Hero section dengan gradient ungu→pink/biru→cyan generik.
- ❌ Ilustrasi 3D isometric generik (orang mengambang di sekitar laptop, dsb.) atau stok foto "orang beragam high-five di depan laptop".
- ❌ Font `Inter` dipakai tanpa pertimbangan sebagai default — Learnly punya pasangan font sendiri (§4.2).
- ❌ Semua elemen rounded-full/rounded-3xl + neon glow shadow di mana-mana.
- ❌ Layout yang semuanya center-align dengan container sempit di tengah layar kosong luas.
- ❌ Emoji berlebihan di UI copy (mis. "🎉 Yuk mulai belajar! 🚀📚✨"). Emoji hanya boleh dipakai sangat selektif dan konsisten (lihat §6).
- ❌ Urgency/scarcity palsu ("Hanya tersisa 2 slot!" padahal tidak berdasar data nyata).
- ❌ Carousel auto-play untuk konten penting (rating, harga) yang membuat pengguna kehilangan info sebelum sempat baca.
- ❌ Warna status booking/pembayaran memakai warna acak-rainbow tanpa sistem (lihat §4.1 untuk skema resmi).
- ❌ Dark pattern: tombol "Batalkan" dibuat samar/kecil, checkbox consent pre-checked, dsb.
- ❌ Copy bahasa Indonesia yang kaku hasil terjemahan literal ("Silahkan melakukan klik pada tombol di bawah ini") — tulis natural, lihat §6.

## 4. Design Tokens

### 4.1 Warna

Palet warm-neutral dengan satu accent warna hangat (terracotta/clay) sebagai identitas Learnly — beda dari mayoritas edtech yang memakai biru korporat.

| Token | Hex | Penggunaan |
|---|---|---|
| `background` | `#FAF8F4` | Latar utama (warm off-white, bukan putih pucat) |
| `surface` | `#FFFFFF` | Card, modal, elemen di atas background |
| `surface-muted` | `#F1EDE5` | Section alternatif, sidebar filter |
| `ink-900` | `#231F1A` | Teks judul/utama (warm near-black, bukan `#000`) |
| `ink-700` | `#4A443C` | Teks body |
| `ink-500` | `#7A7267` | Teks sekunder/caption |
| `ink-300` | `#B6ADA0` | Placeholder, disabled text |
| `border` | `#E4DFD5` | Border default, pemisah |
| `primary-600` | `#C15F3C` | Accent utama — tombol utama, link aktif, elemen brand |
| `primary-700` | `#A24D2F` | Hover/active state dari primary |
| `primary-100` | `#F3E1D6` | Background tint (badge, highlight lembut) |
| `success-600` | `#4A7C59` | Status positif (terverifikasi, dibayar, selesai) |
| `success-100` | `#E1EBE3` | Background badge success |
| `warning-600` | `#B4842A` | Status menunggu (menunggu verifikasi, pending) |
| `warning-100` | `#F3E7CF` | Background badge warning |
| `danger-600` | `#B3432B` | Status negatif (ditolak, dibatalkan, error) |
| `danger-100` | `#F3DCD4` | Background badge danger |
| `info-600` | `#3D6B8A` | Status netral-informatif (dalam perjalanan, in progress) |
| `info-100` | `#DEE9EF` | Background badge info |

**Aturan pemakaian warna status** (booking/payment/course) — satu-satunya skema resmi, jangan buat variasi lain:

| Kategori status | Warna |
|---|---|
| Menunggu aksi (`pending_confirmation`, `menunggu_pembayaran`, `menunggu_verifikasi`) | `warning` |
| Sedang berjalan (`tutor_bersiap`, `tutor_dalam_perjalanan`, `tutor_tiba`, `sesi_berlangsung`, `in_progress`) | `info` |
| Berhasil/selesai (`dikonfirmasi`, `paid`, `sesi_selesai`, `completed`, `verified`) | `success` |
| Gagal/dibatalkan (`dibatalkan`, `ditolak`, `rejected`, `expired`) | `danger` |

Implementasi di Tailwind (`web/tailwind.config.ts`):
```ts
theme: {
  extend: {
    colors: {
      background: '#FAF8F4',
      surface: { DEFAULT: '#FFFFFF', muted: '#F1EDE5' },
      ink: { 900: '#231F1A', 700: '#4A443C', 500: '#7A7267', 300: '#B6ADA0' },
      border: '#E4DFD5',
      primary: { 100: '#F3E1D6', 600: '#C15F3C', 700: '#A24D2F' },
      success: { 100: '#E1EBE3', 600: '#4A7C59' },
      warning: { 100: '#F3E7CF', 600: '#B4842A' },
      danger:  { 100: '#F3DCD4', 600: '#B3432B' },
      info:    { 100: '#DEE9EF', 600: '#3D6B8A' },
    },
  },
}
```

### 4.2 Tipografi

Pasangan **serif editorial (judul) + sans humanis (UI/body)** — menghindari `Inter`-default yang jadi ciri khas produk AI-generated.

| Peran | Font (Google Fonts, gratis) | Alasan |
|---|---|---|
| Judul/Display (`h1`–`h3`, headline landing, nama tutor di profil) | **Fraunces** (serif hangat, sedikit karakter, tidak kaku seperti serif klasik) | Memberi kesan editorial & personal, sesuai referensi Claude.ai, beda dari font judul edtech yang biasanya sans tebal generik |
| UI/Body (`h4`–`h6`, paragraf, form, tombol, navigasi) | **Plus Jakarta Sans** | Humanis, mudah dibaca di ukuran kecil, terasa ramah tanpa jadi "default AI app" seperti Inter |
| Monospace (kode booking ID, angka rekening/QRIS) | **JetBrains Mono** | Angka mudah dibedakan (0 vs O, 1 vs l) — penting untuk nomor booking & verifikasi pembayaran |

Skala tipografi (rem, base 16px):

| Token | Ukuran | Line-height | Font | Pemakaian |
|---|---|---|---|---|
| `display-lg` | 3rem (48px) | 1.1 | Fraunces, 600 | Headline landing page |
| `display-md` | 2.25rem (36px) | 1.15 | Fraunces, 600 | Judul halaman utama (mis. nama tutor) |
| `heading-lg` | 1.5rem (24px) | 1.3 | Fraunces, 600 | Judul section/card besar |
| `heading-md` | 1.25rem (20px) | 1.35 | Plus Jakarta Sans, 600 | Judul card, modal |
| `body-lg` | 1.125rem (18px) | 1.6 | Plus Jakarta Sans, 400 | Paragraf penting, deskripsi kursus |
| `body-md` | 1rem (16px) | 1.6 | Plus Jakarta Sans, 400 | Body default |
| `body-sm` | 0.875rem (14px) | 1.5 | Plus Jakarta Sans, 400 | Caption, metadata (mis. "2 jam lalu") |
| `label-sm` | 0.75rem (12px) | 1.4 | Plus Jakarta Sans, 600, uppercase, tracking-wide | Label kategori/badge |

### 4.3 Spacing, Radius, Shadow

- **Spacing scale**: kelipatan 4px (Tailwind default `4,8,12,16,24,32,48,64`) — jangan bikin nilai custom di luar skala ini.
- **Radius**: `rounded-lg` (8px) untuk card & input, `rounded-full` hanya untuk avatar/badge/tombol ikon bulat — **bukan default semua elemen**.
- **Shadow**: pakai satu level shadow halus untuk elevasi (`shadow-sm`: `0 1px 2px rgba(35,31,26,0.06)`; `shadow-md`: `0 4px 12px rgba(35,31,26,0.08)`). Hindari shadow berwarna/neon.
- **Border** lebih diutamakan dibanding shadow untuk memisahkan card di layout padat (list tutor, tabel admin) — shadow dipakai untuk elemen mengambang (modal, dropdown, sticky box).

### 4.4 Breakpoints

Mobile-first (mayoritas pengguna akses via HP, sesuai NFR-UX-01):

| Breakpoint | Lebar | Catatan |
|---|---|---|
| Base (mobile) | < 640px | Layout default, single column |
| `sm` | ≥ 640px | Form lebar penuh mulai dibatasi max-width |
| `md` | ≥ 768px | Sidebar filter mulai muncul di samping (bukan drawer) |
| `lg` | ≥ 1024px | Grid card 3 kolom, layout dashboard dengan sidebar navigasi tetap |
| `xl` | ≥ 1280px | Max content width `1280px`, sisanya jadi margin |

## 5. Komponen (dibangun di atas shadcn/ui)

shadcn/ui dipakai sebagai **primitives** (bukan tampilan akhir) — setiap komponen di-*restyle* memakai token §4, bukan dipakai dengan tampilan default shadcn.

| Komponen | Aturan Khusus |
|---|---|
| **Button** | Primary = `primary-600` solid, teks putih, radius `rounded-lg`. Secondary = border `border`, teks `ink-900`, background transparan. Destructive (batalkan booking) = `danger-600` outline, bukan solid merah menyala — batal itu serius, bukan alarm. |
| **Badge/Status Chip** | Selalu pasangan `bg-{status}-100` + `text-{status}-600`, teks label singkat (mis. "Menunggu Verifikasi", bukan "PENDING_VERIFICATION"). Ikon kecil di depan label (lihat §6 iconografi). |
| **Card Tutor** (hasil pencarian) | Foto profil bulat kiri/atas, nama (`heading-md`), badge terverifikasi jika ada, baris mapel sebagai pill kecil, rating (bintang + angka + jumlah review dalam kurung — pola Udemy), tarif per jam rata kanan menonjol, jarak (mis. "2.3 km dari lokasimu") jika tatap muka. |
| **Card Kursus** | Thumbnail 16:9, kategori sebagai label kecil di atas judul, judul (`heading-md`, 2 baris max dgn ellipsis), instruktur/nama, rating, harga (coret harga asli jika ada diskon — tanpa elemen urgency palsu). |
| **Rating Stars** | 5 ikon bintang, terisi sesuai rata-rata (boleh setengah), warna `warning-600` (bukan kuning terang generik), angka rating + `(jumlah review)` di sebelahnya. |
| **Booking Status Stepper** | Horizontal di mobile jadi vertical timeline. Titik status terlewati = `success-600` filled, status aktif = `info-600` dengan pulse halus (bukan animasi mencolok), status akan datang = `ink-300` outline. |
| **Progress Bar** (kursus) | Track `surface-muted`, fill `primary-600`, radius penuh, tinggi 8px, label persentase di kanan. |
| **Form Input** | Border `border`, focus ring `primary-600` 2px (bukan browser default biru), label di atas input (bukan placeholder-as-label), pesan error di bawah input warna `danger-600` dengan ikon, bukan cuma teks merah. |
| **Empty State** | Ilustrasi garis sederhana (bukan foto stok) + 1 kalimat manusiawi + CTA jelas. Contoh: belum ada booking → "Belum ada jadwal les. Yuk cari tutor yang cocok." + tombol "Cari Tutor". |
| **Toast/Notifikasi** | Muncul dari atas-kanan (desktop) / atas (mobile), auto-dismiss 4 detik kecuali error, ikon status sesuai §4.1. |
| **Modal Konfirmasi Aksi Penting** (batalkan booking, reject pembayaran) | Selalu tampilkan konsekuensi eksplisit dalam kalimat manusia ("Sesi dengan Kak Rina hari Jumat 09:00 akan dibatalkan. Ini tidak bisa dibatalkan ulang."), bukan generic "Apakah kamu yakin?". |

## 6. Ikonografi, Ilustrasi, & Tone Tulisan

- **Ikon**: pakai **Lucide Icons** (satu set konsisten, line-style, sudah cocok dengan shadcn/ui) di seluruh aplikasi — jangan campur beberapa icon set berbeda gaya.
- **Ilustrasi** (empty state, onboarding kosong): line-art minimal 2 warna (`ink-700` + `primary-600`), dibuat custom sederhana (SVG), bukan stok ilustrasi 3D/flat-design generik yang sama dipakai ribuan produk lain.
- **Emoji**: hanya dipakai di notifikasi ringan/kasual (mis. reminder H-1 sesi), maksimal 1 emoji per pesan, tidak pernah di label tombol/navigasi/judul halaman.
- **Tone tulisan (microcopy Bahasa Indonesia)**:
  - Sapaan natural, tidak kaku: "Cari tutor di sekitarmu" bukan "Silakan melakukan pencarian tutor".
  - Jujur soal proses manual: pesan pembayaran bilang jelas "Kami akan verifikasi bukti transfermu dalam 1x24 jam" — bukan berpura-pura instan.
  - Hormat ke orang tua: bahasa untuk parent lebih formal-hangat; ke siswa boleh sedikit lebih santai.
  - Pesan error actionable, bukan menyalahkan: "Nomor HP belum terdaftar. Coba daftar akun baru?" bukan "Error: user not found".

## 7. Aksesibilitas (Wajib, Bukan Opsional)

- Kontras teks-background minimum **4.5:1** untuk teks body, **3:1** untuk teks besar (≥24px) — semua kombinasi token warna di §4.1 sudah dipilih agar lolos ini pada pasangan yang disebutkan (teks `ink-900`/`ink-700` di atas `background`/`surface`, teks putih di atas `primary-600`/`success-600`/`danger-600`).
- Semua elemen interaktif punya **focus state terlihat** (ring 2px `primary-600`), bukan `outline: none` tanpa pengganti.
- Semua ikon fungsional (bukan dekoratif) punya `aria-label`; gambar tutor/kursus punya `alt` deskriptif.
- Form wajib punya `<label>` terasosiasi (bukan placeholder-only), pesan error terhubung via `aria-describedby`.
- Target sentuh (tombol, item list di mobile) minimum **44×44px**.
- Navigasi bisa dilakukan penuh via keyboard (tab order logis, modal trap focus, Escape menutup modal/dropdown).

## 8. Pola Layout per Halaman Kunci

Ringkas — detail interaksi mengikuti alur di [07-ssd.md](07-ssd.md); ini fokus ke *layout & hierarki visual*.

| Halaman | Pola Layout |
|---|---|
| **Landing/Beranda** | Hero singkat (headline + 1 CTA jelas + search bar tutor/kursus langsung di hero, bukan cuma tombol "Mulai"), section kategori mapel populer (grid ikon+label, bukan carousel), section "Tutor terverifikasi pilihan" (card grid ala §5), section kursus populer, tanpa testimonial palsu/logo klien fiktif. |
| **Pencarian Tutor** | Layout 2 kolom di `md+`: sidebar filter kiri (sticky), hasil card grid/list kanan + peta opsional toggle di atas hasil (bukan peta full-screen default — data list lebih penting dari peta, sesuai prinsip §1.2). Mobile: filter jadi bottom-sheet, peta jadi tab terpisah dari list. |
| **Detail Profil Tutor** | Header: foto, nama, badge verifikasi, rating, tarif menonjol kanan-atas (sticky di scroll pada desktop). Tab: Tentang / Jadwal & Booking / Ulasan — pola tab ala Udemy course page. |
| **Alur Booking** | Stepper horizontal jelas di atas (Pilih Jadwal → Lokasi/Metode → Ringkasan → Bayar), form satu langkah per layar di mobile, ringkasan biaya selalu terlihat (sticky bottom di mobile, sticky sidebar di desktop). |
| **Detail Booking (Tracking)** | Status stepper vertikal §5 di atas, info tutor & jadwal di bawahnya, tombol aksi kontekstual sesuai role (siswa: lihat QR/upload bukti bayar; tutor: ubah status/check-in/check-out). |
| **Katalog Kursus** | Sama pola dengan pencarian tutor (filter kiri + grid kanan), card kursus §5. |
| **Player Kursus** | Sidebar kiri (daftar modul/lesson dgn checklist progres, collapsible di mobile jadi drawer), area konten kanan (video/materi/quiz), progress bar keseluruhan di header sticky. |
| **Dashboard Tutor** | Ringkasan booking masuk (butuh aksi) paling atas — bukan chart dulu, aksi yang perlu direspons harus paling menonjol. |
| **Dashboard Admin — Verifikasi Pembayaran** | Tabel/list antrian dengan preview bukti transfer inline (klik untuk zoom), aksi approve/reject langsung di baris, bukan berpindah halaman. |

## 9. Implementasi Praktis

- Font di-load via `next/font/google` (Fraunces, Plus Jakarta Sans, JetBrains Mono) — bukan `<link>` manual, agar tidak ada layout shift.
- Semua token warna & tipografi di §4 didefinisikan **sekali** di `tailwind.config.ts` dan `globals.css` (CSS variables) — komponen tidak boleh hardcode hex/px di luar token ini.
  - Tailwind 4 memuat `tailwind.config.ts` lewat `@config` di `app/globals.css`.
  - Alias semantik shadcn/ui (`--primary`, `--muted-foreground`, `--ring`, dst.) di `globals.css` **hanya cermin** token §4.1 (mis. `--primary` = `primary-600`), bukan palet tambahan. Jika token berubah, ubah keduanya.
  - Komponen shadcn/ui di `web/components/ui/` sudah di-restyle sesuai §5 (Button, Badge status, Input).
- Sebelum menambah komponen baru, cek dulu apakah shadcn/ui sudah punya primitive-nya (lihat [09-coding-standards.md](09-coding-standards.md) §8) — desain ulang tampilannya sesuai §5, jangan bikin dari nol.
- Dark mode **tidak** menjadi kebutuhan wajib rilis awal (di luar scope [01-prd.md](01-prd.md)) — token warna di atas cukup didefinisikan untuk light mode.
