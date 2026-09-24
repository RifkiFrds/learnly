/** Isi teks materi PDF & contoh file tugas demo (tanpa dependensi — aman dimuat seeder di production). */

// ---------- isi materi PDF lesson ----------

export const LESSON_PDFS: Record<string, { kicker: string; title: string; body: string }> = {
  'aljabar-ringkasan-variabel': {
    kicker: 'Aljabar Dasar untuk SMP - Ringkasan',
    title: 'Variabel, koefisien, dan konstanta',
    body: 'Pada bentuk aljabar 4x + 7:\n- x adalah variabel (nilai yang belum diketahui)\n- 4 adalah koefisien (pengali variabel)\n- 7 adalah konstanta (bilangan tanpa variabel)\n\nContoh menyederhanakan:\n1) 3a + 5a = 8a\n2) 7p - 2q - 3p + 6q = 4p + 4q\n3) 2(x + 3) = 2x + 6\n\nLatihan mandiri:\n1) Sederhanakan 9m - 4n + 2m - n\n2) Tentukan koefisien y pada 12 - 5y\n3) Jika a = 3, hitung 4a - 2\n\nKunci: 1) 11m - 5n  2) -5  3) 10',
  },
  'utbk-lembar-pola-bilangan': {
    kicker: 'UTBK Penalaran Matematika - Lembar latihan',
    title: 'Pola bilangan: 15 soal pemanasan',
    body: 'Tentukan suku berikutnya:\n1) 2, 5, 10, 17, 26, ...\n2) 3, 6, 12, 24, ...\n3) 1, 1, 2, 3, 5, 8, ...\n4) 100, 91, 83, 76, ...\n5) 2, 3, 5, 9, 17, ...\n6) 7, 14, 11, 22, 19, ...\n7) 1, 4, 9, 16, 25, ...\n8) 81, 27, 9, 3, ...\n9) 4, 6, 10, 16, 24, ...\n10) 5, 10, 8, 16, 14, ...\n11) 1, 8, 27, 64, ...\n12) 2, 6, 7, 21, 22, ...\n13) 10, 12, 15, 19, 24, ...\n14) 1, 3, 7, 15, 31, ...\n15) 50, 45, 41, 38, ...\n\nKunci: 37, 48, 13, 70, 33, 38, 36, 1, 34, 28, 125, 66, 30, 63, 36',
  },
  'python-panduan-instalasi': {
    kicker: 'Belajar Python dari Nol - Panduan',
    title: 'Menyiapkan Python di Windows & macOS',
    body: 'Windows:\n1) Buka situs resmi Python dan unduh versi terbaru untuk Windows.\n2) Jalankan installer, centang "Add Python to PATH", lalu klik Install Now.\n3) Buka Command Prompt dan ketik: python --version\n\nmacOS:\n1) Unduh installer macOS dari situs resmi Python.\n2) Setelah terpasang, buka Terminal dan ketik: python3 --version\n\nEditor yang disarankan: Visual Studio Code dengan ekstensi Python.\n\nProgram pertama:\nprint("Halo, saya siap belajar Python!")\n\nJika muncul pesan "python is not recognized", ulangi instalasi dan pastikan opsi PATH dicentang.',
  },
  'kimia-tabel-massa-atom': {
    kicker: 'Kimia Dasar: Stoikiometri - Lampiran',
    title: 'Tabel massa atom relatif (Ar) & latihan',
    body: 'H = 1   C = 12   N = 14   O = 16   Na = 23   Mg = 24\nAl = 27   S = 32   Cl = 35,5   K = 39   Ca = 40   Fe = 56\n\nContoh: Mr H2SO4 = 2(1) + 32 + 4(16) = 98\n\nLatihan (nomor 11-14 untuk tugas):\n11) Hitung jumlah mol dari 49 gram H2SO4.\n12) Berapa gram NaCl dalam 0,5 mol NaCl?\n13) Setarakan: Al + O2 -> Al2O3\n14) Pada 2H2 + O2 -> 2H2O, berapa mol air dari 3 mol H2?',
  },
  'belajar-template-jadwal-mingguan': {
    kicker: 'Teknik Belajar Efektif - Template',
    title: 'Template jadwal belajar mingguan',
    body: 'Isi setiap kotak dengan satu kegiatan belajar (2 x 25 menit Pomodoro).\n\nSenin: ........................................\nSelasa: ........................................\nRabu: ........................................\nKamis: ........................................\nJumat: ........................................\nSabtu: ........................................\nMinggu: istirahat & review ringan 25 menit\n\nTips:\n- Letakkan materi tersulit di jam paling segar.\n- Sisakan satu slot kosong untuk mengejar ketertinggalan.\n- Centang setiap sesi yang selesai agar kemajuan terlihat.',
  },
};

/** File tugas siswa contoh */
export const SUBMISSIONS: Record<string, { title: string; body: string }> = {
  'putri-python-dari-nol': {
    title: 'Proyek: kalkulator nilai rapor - Putri Maharani',
    body: 'Kode program:\n\nnilai = []\nfor i in range(5):\n    nilai.append(float(input("Nilai ke-" + str(i + 1) + ": ")))\nrata = sum(nilai) / len(nilai)\nif rata >= 85: predikat = "A"\nelif rata >= 75: predikat = "B"\nelif rata >= 65: predikat = "C"\nelse: predikat = "D"\nprint("Rata-rata:", round(rata, 2), "Predikat:", predikat)\n\nHasil uji: nilai 80, 90, 75, 88, 92 -> rata-rata 85.0, predikat A.',
  },
  'clara-english-conversation-beginners': {
    title: 'Dialog 8 baris - Clara Wijaya',
    body: 'A: Hi, I\'m Clara. Is this your first time at the meetup?\nB: Yes, it is. I\'m Rian. Nice to meet you.\nA: Nice to meet you too. What do you do?\nB: I work as a nurse. How about you?\nA: I\'m a graphic designer. How was your weekend?\nB: It was relaxing. I tried a new coffee shop.\nA: Oh, which one? I love finding new cafes.\nB: The one next to the bookstore. Let\'s go there sometime!',
  },
  'fajar-menulis-esai-meyakinkan': {
    title: 'Esai: Perlukah gawai dilarang di sekolah? - Fajar Hermawan',
    body: 'Tesis: Sekolah tidak perlu melarang gawai sepenuhnya, tetapi mengatur penggunaannya pada jam pelajaran tertentu.\n\nArgumen 1: Gawai membantu mengakses sumber belajar digital yang kini dipakai di banyak mata pelajaran.\nArgumen 2: Aturan jam pakai lebih mendidik tanggung jawab dibanding larangan total.\nArgumen 3: Penyimpanan gawai saat ujian mencegah kecurangan tanpa menghilangkan manfaatnya.\n\nPenutup: Aturan yang jelas lebih efektif daripada larangan yang sulit ditegakkan.',
  },
};

export const SUBMISSION_FOOTER = 'File tugas contoh untuk demo aplikasi Learnly.';
export const LESSON_FOOTER = 'Materi contoh untuk demo aplikasi Learnly.';
