/**
 * Data demo Learnly — deterministik (tanpa acak). Dipakai bersama oleh:
 * - generate-demo-assets.ts (membuat file di api/seed-assets/)
 * - demo-seed.ts (mengisi database)
 * Semua akun demo: email <nama>@demo.learnly.id, password DEMO_PASSWORD.
 */
import type { TeachingMode, TutorVerificationStatus } from '@prisma/client';

export const DEMO_DOMAIN = 'demo.learnly.id';
export const DEMO_PASSWORD = 'Demo#2026';
export const DEMO_SERVICE_FEE = 10000;
export const demoEmail = (local: string) => `${local}@${DEMO_DOMAIN}`;

// ---------- master data tambahan (mapel lengkap SD–kuliah–umum) ----------

export const EXTRA_SUBJECTS: [string, string][] = [
  ['IPA', 'ipa'],
  ['IPS', 'ips'],
  ['Ekonomi', 'ekonomi'],
  ['Akuntansi', 'akuntansi'],
  ['Geografi', 'geografi'],
  ['Sejarah', 'sejarah'],
  ['Kalkulus', 'kalkulus'],
  ['Statistika', 'statistika'],
  ['Bahasa Jepang', 'bahasa-jepang'],
  ['Bahasa Mandarin', 'bahasa-mandarin'],
  ['Menulis Kreatif', 'menulis-kreatif'],
  ['Desain Grafis', 'desain-grafis'],
];

// ---------- kota (koordinat pusat wajar) ----------

export const CITIES = {
  jaksel: { name: 'Jakarta Selatan', lat: -6.2615, lng: 106.8106 },
  jaktim: { name: 'Jakarta Timur', lat: -6.225, lng: 106.9004 },
  bandung: { name: 'Bandung', lat: -6.9175, lng: 107.6191 },
  surabaya: { name: 'Surabaya', lat: -7.2575, lng: 112.7521 },
  yogya: { name: 'Yogyakarta', lat: -7.7956, lng: 110.3695 },
  medan: { name: 'Medan', lat: 3.5952, lng: 98.6722 },
  makassar: { name: 'Makassar', lat: -5.1477, lng: 119.4327 },
  denpasar: { name: 'Denpasar', lat: -8.6705, lng: 115.2126 },
} as const;
export type CityKey = keyof typeof CITIES;

// ---------- tutor ----------

export interface DemoTutor {
  key: string;
  fullName: string;
  phone: string;
  city: CityKey;
  radiusKm: number;
  extraArea?: string;
  bio: string;
  education: string;
  experienceYears: number;
  curriculum: string;
  hourlyRate: number;
  mode: TeachingMode;
  subjects: string[];
  levels: string[];
  status: TutorVerificationStatus;
  verificationNotes?: string;
  autoAccept?: boolean;
  /** jam WIB per hari: [hari 0=Minggu..6, mulai, selesai] */
  schedule: [number, string, string][];
  documents: { kind: 'ijazah' | 'sertifikat'; title: string; issuer: string; issuedAt: string }[];
}

const weekdayEvenings: [number, string, string][] = [1, 2, 3, 4, 5].map((d) => [d, '15:00', '20:00']);
const saturdayMorning: [number, string, string] = [6, '08:00', '12:00'];

export const TUTORS: DemoTutor[] = [
  {
    key: 'rizky',
    fullName: 'Rizky Pratama',
    phone: '081211002201',
    city: 'jaksel',
    radiusKm: 10,
    extraArea: 'Kebayoran Baru',
    bio: 'Alumni Fisika ITB yang sudah 7 tahun mendampingi siswa SMA menghadapi ulangan dan UTBK. Saya suka memulai dari "kenapa" sebelum rumus: gerak parabola dijelaskan lewat lemparan bola basket, listrik lewat instalasi lampu di rumah. Setiap sesi ditutup dengan 3 soal latihan supaya kemajuan terlihat.',
    education: 'S1 Fisika, Institut Teknologi Bandung',
    experienceYears: 7,
    curriculum: 'Kurikulum Merdeka, persiapan UTBK SNBT',
    hourlyRate: 150000,
    mode: 'both',
    subjects: ['fisika', 'matematika', 'persiapan-utbk'],
    levels: ['sma'],
    status: 'verified',
    schedule: [...weekdayEvenings, saturdayMorning],
    documents: [
      { kind: 'ijazah', title: 'Ijazah S1 Fisika', issuer: 'Institut Teknologi Bandung', issuedAt: '2017-10-21' },
      { kind: 'sertifikat', title: 'Sertifikat Pelatihan Tutor UTBK', issuer: 'Lembaga Bimbel Cendekia', issuedAt: '2021-03-12' },
    ],
  },
  {
    key: 'anisa',
    fullName: 'Anisa Rahmawati',
    phone: '081211002202',
    city: 'jaktim',
    radiusKm: 8,
    bio: 'Guru Bahasa Inggris SD dan SMP sejak 2016. Anak-anak belajar lewat lagu, permainan kartu, dan cerita bergambar, sehingga berani bicara tanpa takut salah. Orang tua mendapat catatan kosakata mingguan untuk diulang di rumah.',
    education: 'S1 Pendidikan Bahasa Inggris, Universitas Negeri Jakarta',
    experienceYears: 8,
    curriculum: 'Kurikulum Merdeka, Cambridge Primary',
    hourlyRate: 110000,
    mode: 'both',
    subjects: ['bahasa-inggris'],
    levels: ['sd', 'smp'],
    status: 'verified',
    autoAccept: false,
    schedule: [...weekdayEvenings, saturdayMorning],
    documents: [
      { kind: 'ijazah', title: 'Ijazah S1 Pendidikan Bahasa Inggris', issuer: 'Universitas Negeri Jakarta', issuedAt: '2016-08-30' },
      { kind: 'sertifikat', title: 'TKT (Teaching Knowledge Test) Module 1–3', issuer: 'Cambridge Assessment English', issuedAt: '2019-05-18' },
    ],
  },
  {
    key: 'dimasadi',
    fullName: 'Dimas Aditya',
    phone: '081211002203',
    city: 'jaksel',
    radiusKm: 5,
    bio: 'Software engineer di perusahaan e-commerce yang mengajar pemrograman di akhir pekan dan malam hari. Materi disusun dari proyek nyata: mulai dari kalkulator sederhana sampai web to-do list. Cocok untuk mahasiswa dan pekerja yang ingin pindah karier ke IT.',
    education: 'S1 Ilmu Komputer, Universitas Indonesia',
    experienceYears: 5,
    curriculum: 'Python, JavaScript, dasar web',
    hourlyRate: 200000,
    mode: 'online',
    subjects: ['pemrograman'],
    levels: ['kuliah', 'umum'],
    status: 'verified',
    autoAccept: true,
    schedule: [[1, '19:00', '22:00'], [3, '19:00', '22:00'], [5, '19:00', '22:00'], [6, '09:00', '15:00'], [0, '09:00', '12:00']],
    documents: [
      { kind: 'ijazah', title: 'Ijazah S1 Ilmu Komputer', issuer: 'Universitas Indonesia', issuedAt: '2019-02-02' },
      { kind: 'sertifikat', title: 'Sertifikat Instruktur Pemrograman Dasar', issuer: 'Komunitas Belajar Koding Indonesia', issuedAt: '2022-07-09' },
    ],
  },
  {
    key: 'siti',
    fullName: 'Siti Nurhaliza',
    phone: '081211002204',
    city: 'bandung',
    radiusKm: 10,
    bio: 'Lulusan Kimia Unpad yang mengajar Kimia dan Biologi untuk SMA. Konsep stoikiometri dan genetika dipecah menjadi langkah kecil, lengkap dengan peta konsep yang bisa dibawa pulang. Terbiasa mendampingi siswa kelas 12 menjelang ujian sekolah.',
    education: 'S1 Kimia, Universitas Padjadjaran',
    experienceYears: 6,
    curriculum: 'Kurikulum Merdeka SMA',
    hourlyRate: 130000,
    mode: 'tatap_muka',
    subjects: ['kimia', 'biologi'],
    levels: ['sma'],
    status: 'verified',
    schedule: [...weekdayEvenings, saturdayMorning],
    documents: [
      { kind: 'ijazah', title: 'Ijazah S1 Kimia', issuer: 'Universitas Padjadjaran', issuedAt: '2018-09-15' },
      { kind: 'sertifikat', title: 'Sertifikat Pendidik Olimpiade Kimia', issuer: 'Yayasan Sains Muda Bandung', issuedAt: '2020-11-02' },
    ],
  },
  {
    key: 'galih',
    fullName: 'Galih Prasetyo',
    phone: '081211002205',
    city: 'bandung',
    radiusKm: 12,
    extraArea: 'Dago',
    bio: 'Mahasiswa tingkat akhir Pendidikan Matematika UPI yang senang mengajar anak SD dan SMP. Pecahan, bangun ruang, dan soal cerita dijelaskan dengan benda di sekitar rumah. Sabar menghadapi anak yang takut matematika.',
    education: 'S1 Pendidikan Matematika (semester 8), Universitas Pendidikan Indonesia',
    experienceYears: 3,
    curriculum: 'Kurikulum Merdeka SD & SMP',
    hourlyRate: 75000,
    mode: 'both',
    subjects: ['matematika', 'ipa'],
    levels: ['sd', 'smp'],
    status: 'verified',
    schedule: [[1, '14:00', '19:00'], [2, '14:00', '19:00'], [3, '14:00', '19:00'], [4, '14:00', '19:00'], [5, '14:00', '19:00'], [6, '08:00', '14:00']],
    documents: [
      { kind: 'ijazah', title: 'Ijazah SMA & Transkrip Semester 1–7', issuer: 'Universitas Pendidikan Indonesia', issuedAt: '2024-02-10' },
      { kind: 'sertifikat', title: 'Sertifikat Asisten Pengajar Matematika', issuer: 'Laboratorium Pembelajaran Matematika UPI', issuedAt: '2023-06-20' },
    ],
  },
  {
    key: 'maya',
    fullName: 'Maya Kusuma',
    phone: '081211002206',
    city: 'surabaya',
    radiusKm: 5,
    bio: 'Pengajar IELTS bersertifikat dengan skor pribadi 8.0. Membantu mahasiswa dan profesional menyiapkan studi ke luar negeri: strategi reading, template writing task 2, dan simulasi speaking dengan umpan balik langsung.',
    education: 'S2 Applied Linguistics, University of Melbourne',
    experienceYears: 9,
    curriculum: 'IELTS Academic & General Training',
    hourlyRate: 250000,
    mode: 'online',
    subjects: ['bahasa-inggris'],
    levels: ['kuliah', 'umum'],
    status: 'verified',
    schedule: [[2, '18:00', '21:00'], [4, '18:00', '21:00'], [6, '09:00', '16:00'], [0, '13:00', '17:00']],
    documents: [
      { kind: 'ijazah', title: 'Ijazah S2 Applied Linguistics', issuer: 'University of Melbourne', issuedAt: '2015-12-11' },
      { kind: 'sertifikat', title: 'IELTS Teacher Training Certificate', issuer: 'British Council Indonesia', issuedAt: '2017-04-22' },
    ],
  },
  {
    key: 'hendra',
    fullName: 'Hendra Wijaya',
    phone: '081211002207',
    city: 'surabaya',
    radiusKm: 10,
    bio: 'Guru Fisika SMA negeri di Surabaya selama 11 tahun. Fokus pada pemahaman grafik dan analisis soal HOTS. Siswa diajak membuat ringkasan satu halaman per bab agar mudah diulang sebelum ujian.',
    education: 'S1 Pendidikan Fisika, Universitas Negeri Surabaya',
    experienceYears: 11,
    curriculum: 'Kurikulum Merdeka SMA',
    hourlyRate: 140000,
    mode: 'tatap_muka',
    subjects: ['fisika', 'matematika'],
    levels: ['smp', 'sma'],
    status: 'verified',
    schedule: [...weekdayEvenings, saturdayMorning],
    documents: [
      { kind: 'ijazah', title: 'Ijazah S1 Pendidikan Fisika', issuer: 'Universitas Negeri Surabaya', issuedAt: '2013-09-28' },
      { kind: 'sertifikat', title: 'Sertifikat Pendidik (Serdik)', issuer: 'Kementerian Pendidikan', issuedAt: '2018-12-01' },
    ],
  },
  {
    key: 'laras',
    fullName: 'Laras Setyaningrum',
    phone: '081211002208',
    city: 'yogya',
    radiusKm: 8,
    bio: 'Penulis dan pengajar Bahasa Indonesia untuk SMP–SMA. Membantu siswa menyusun teks eksposisi, argumentasi, dan cerpen dengan struktur yang rapi. Tulisan siswa dikembalikan dengan catatan di setiap paragraf, bukan sekadar nilai.',
    education: 'S1 Sastra Indonesia, Universitas Gadjah Mada',
    experienceYears: 6,
    curriculum: 'Kurikulum Merdeka, literasi AKM',
    hourlyRate: 90000,
    mode: 'both',
    subjects: ['bahasa-indonesia', 'menulis-kreatif'],
    levels: ['smp', 'sma'],
    status: 'verified',
    schedule: [...weekdayEvenings, [6, '09:00', '13:00']],
    documents: [
      { kind: 'ijazah', title: 'Ijazah S1 Sastra Indonesia', issuer: 'Universitas Gadjah Mada', issuedAt: '2017-05-24' },
      { kind: 'sertifikat', title: 'Sertifikat Fasilitator Kelas Menulis', issuer: 'Balai Bahasa DIY', issuedAt: '2021-09-14' },
    ],
  },
  {
    key: 'yoga',
    fullName: 'Yoga Saputra',
    phone: '081211002209',
    city: 'yogya',
    radiusKm: 6,
    bio: 'Asisten dosen Statistika yang mengajar Kalkulus, Statistika, dan Matematika SMA. Mahasiswa dibantu memahami konsep di balik rumus serta mengerjakan tugas analisis data dengan Excel dan R.',
    education: 'S2 Statistika, Universitas Gadjah Mada',
    experienceYears: 5,
    curriculum: 'Matematika SMA, Kalkulus I–II, Statistika Dasar',
    hourlyRate: 180000,
    mode: 'both',
    subjects: ['statistika', 'kalkulus', 'matematika'],
    levels: ['sma', 'kuliah'],
    status: 'verified',
    schedule: [[1, '16:00', '21:00'], [2, '16:00', '21:00'], [3, '16:00', '21:00'], [4, '16:00', '21:00'], [5, '16:00', '21:00'], [6, '09:00', '15:00']],
    documents: [
      { kind: 'ijazah', title: 'Ijazah S2 Statistika', issuer: 'Universitas Gadjah Mada', issuedAt: '2020-10-17' },
      { kind: 'sertifikat', title: 'Sertifikat Asisten Dosen Statistika', issuer: 'Departemen Matematika FMIPA UGM', issuedAt: '2021-02-01' },
    ],
  },
  {
    key: 'rina',
    fullName: 'Rina Siregar',
    phone: '081211002210',
    city: 'medan',
    radiusKm: 7,
    bio: 'Guru kelas SD berpengalaman yang membantu anak menguasai perkalian, pembagian, dan membaca pemahaman. Memakai metode jarimatika dan lembar kerja bergambar agar belajar terasa seperti bermain.',
    education: 'S1 PGSD, Universitas Negeri Medan',
    experienceYears: 10,
    curriculum: 'Kurikulum Merdeka SD',
    hourlyRate: 60000,
    mode: 'tatap_muka',
    subjects: ['matematika', 'bahasa-indonesia', 'ipa'],
    levels: ['sd'],
    status: 'verified',
    schedule: [[1, '13:00', '18:00'], [2, '13:00', '18:00'], [3, '13:00', '18:00'], [4, '13:00', '18:00'], [6, '08:00', '12:00']],
    documents: [
      { kind: 'ijazah', title: 'Ijazah S1 PGSD', issuer: 'Universitas Negeri Medan', issuedAt: '2014-11-08' },
      { kind: 'sertifikat', title: 'Sertifikat Pelatihan Jarimatika', issuer: 'Rumah Belajar Ceria Medan', issuedAt: '2016-03-19' },
    ],
  },
  {
    key: 'andreas',
    fullName: 'Andreas Nainggolan',
    phone: '081211002211',
    city: 'medan',
    radiusKm: 5,
    bio: 'Pengajar Bahasa Mandarin dengan sertifikat HSK 6. Mengajar percakapan sehari-hari, pinyin, dan persiapan HSK 1–4 untuk pelajar dan pekerja. Tiap pertemuan membawa 10 kosakata baru dan latihan nada.',
    education: 'S1 Sastra Tiongkok, Universitas Sumatera Utara',
    experienceYears: 6,
    curriculum: 'HSK 1–4, percakapan bisnis dasar',
    hourlyRate: 160000,
    mode: 'online',
    subjects: ['bahasa-mandarin'],
    levels: ['sma', 'kuliah', 'umum'],
    status: 'verified',
    schedule: [[1, '18:00', '21:00'], [3, '18:00', '21:00'], [5, '18:00', '21:00'], [6, '10:00', '14:00']],
    documents: [
      { kind: 'ijazah', title: 'Ijazah S1 Sastra Tiongkok', issuer: 'Universitas Sumatera Utara', issuedAt: '2017-08-26' },
      { kind: 'sertifikat', title: 'Sertifikat HSK Level 6', issuer: 'Chinese Testing International', issuedAt: '2019-06-15' },
    ],
  },
  {
    key: 'putu',
    fullName: 'Putu Ayu Lestari',
    phone: '081211002212',
    city: 'denpasar',
    radiusKm: 8,
    bio: 'Mantan pemandu wisata yang kini mengajar Bahasa Inggris percakapan untuk anak SD–SMP. Anak-anak berlatih memperkenalkan diri, bercerita tentang keluarga, dan memesan makanan dalam bahasa Inggris.',
    education: 'D3 Bahasa Inggris, Politeknik Negeri Bali',
    experienceYears: 4,
    curriculum: 'Percakapan dasar, Kurikulum Merdeka SD–SMP',
    hourlyRate: 100000,
    mode: 'tatap_muka',
    subjects: ['bahasa-inggris'],
    levels: ['sd', 'smp'],
    status: 'verified',
    schedule: [[1, '15:00', '19:00'], [2, '15:00', '19:00'], [4, '15:00', '19:00'], [6, '09:00', '13:00']],
    documents: [
      { kind: 'ijazah', title: 'Ijazah D3 Bahasa Inggris', issuer: 'Politeknik Negeri Bali', issuedAt: '2018-09-05' },
      { kind: 'sertifikat', title: 'Sertifikat TEFL 120 Jam', issuer: 'Bali English Teaching Centre', issuedAt: '2021-01-30' },
    ],
  },
  {
    key: 'fitri',
    fullName: 'Fitri Rahman',
    phone: '081211002213',
    city: 'makassar',
    radiusKm: 10,
    bio: 'Lulusan Biologi Unhas yang menyiapkan siswa SMA untuk UTBK Saintek. Membuat bank soal per topik dan target skor mingguan yang realistis.',
    education: 'S1 Biologi, Universitas Hasanuddin',
    experienceYears: 3,
    curriculum: 'UTBK SNBT, Biologi SMA',
    hourlyRate: 120000,
    mode: 'both',
    subjects: ['biologi', 'persiapan-utbk'],
    levels: ['sma'],
    status: 'pending_verification',
    schedule: [...weekdayEvenings],
    documents: [
      { kind: 'ijazah', title: 'Ijazah S1 Biologi', issuer: 'Universitas Hasanuddin', issuedAt: '2021-10-30' },
      { kind: 'sertifikat', title: 'Sertifikat Pengajar Bimbel UTBK', issuer: 'Bimbel Prima Makassar', issuedAt: '2023-01-15' },
    ],
  },
  {
    key: 'kevin',
    fullName: 'Kevin Halim',
    phone: '081211002214',
    city: 'denpasar',
    radiusKm: 6,
    bio: 'Desainer grafis lepas untuk hotel dan UMKM di Bali. Mengajar dasar desain: komposisi, tipografi, warna, dan membuat materi promosi dengan aplikasi gratis.',
    education: 'S1 Desain Komunikasi Visual, Institut Seni Indonesia Denpasar',
    experienceYears: 4,
    curriculum: 'Desain grafis dasar untuk pelajar & UMKM',
    hourlyRate: 140000,
    mode: 'online',
    subjects: ['desain-grafis'],
    levels: ['sma', 'umum'],
    status: 'pending_verification',
    schedule: [[2, '19:00', '21:00'], [4, '19:00', '21:00'], [6, '10:00', '14:00']],
    documents: [
      { kind: 'ijazah', title: 'Ijazah S1 Desain Komunikasi Visual', issuer: 'Institut Seni Indonesia Denpasar', issuedAt: '2020-09-12' },
      { kind: 'sertifikat', title: 'Portofolio Proyek Desain 2021–2024', issuer: 'Dokumen pribadi', issuedAt: '2024-05-01' },
    ],
  },
  {
    key: 'nuraini',
    fullName: 'Nur Aini',
    phone: '081211002215',
    city: 'makassar',
    radiusKm: 5,
    bio: 'Mengajar IPA dan Matematika untuk anak SD di sekitar Panakkukang.',
    education: 'S1 Pendidikan IPA, Universitas Negeri Makassar',
    experienceYears: 2,
    curriculum: 'Kurikulum Merdeka SD',
    hourlyRate: 65000,
    mode: 'tatap_muka',
    subjects: ['ipa', 'matematika'],
    levels: ['sd'],
    status: 'rejected',
    verificationNotes: 'Foto ijazah buram dan nama pada dokumen tidak terbaca. Mohon unggah ulang scan ijazah yang jelas (PDF atau JPG, minimal 150 dpi).',
    schedule: [[1, '14:00', '17:00'], [3, '14:00', '17:00'], [5, '14:00', '17:00']],
    documents: [{ kind: 'ijazah', title: 'Ijazah S1 Pendidikan IPA', issuer: 'Universitas Negeri Makassar', issuedAt: '2022-11-19' }],
  },
];

// ---------- keluarga & siswa mandiri ----------

export interface DemoLearner {
  key: string;
  fullName: string;
  level: string;
  birth: string;
}
export interface DemoAccount {
  key: string;
  fullName: string;
  phone: string;
  role: 'parent' | 'student';
  children?: DemoLearner[];
  /** siswa mandiri: profil diri */
  self?: { level: string; birth: string };
  address: { label: string; fullAddress: string; detailNote: string; lat: number; lng: number };
}

export const ACCOUNTS: DemoAccount[] = [
  {
    key: 'sari',
    fullName: 'Sari Wulandari',
    phone: '081311004401',
    role: 'parent',
    children: [
      { key: 'dimas', fullName: 'Dimas Wicaksono', level: 'sma', birth: '2009-04-12' },
      { key: 'alya', fullName: 'Alya Wicaksono', level: 'smp', birth: '2012-09-03' },
    ],
    address: { label: 'Rumah', fullAddress: 'Jl. Wijaya I No. 12, Kebayoran Baru, Jakarta Selatan', detailNote: 'Pagar hitam, sebelah minimarket', lat: -6.2489, lng: 106.8047 },
  },
  {
    key: 'bambang',
    fullName: 'Bambang Sutrisno',
    phone: '081311004402',
    role: 'parent',
    children: [
      { key: 'raka', fullName: 'Raka Sutrisno', level: 'smp', birth: '2011-02-20' },
      { key: 'nadia', fullName: 'Nadia Sutrisno', level: 'sd', birth: '2015-06-08' },
      { key: 'bima', fullName: 'Bima Sutrisno', level: 'sd', birth: '2017-11-15' },
    ],
    address: { label: 'Rumah Dago', fullAddress: 'Jl. Ir. H. Juanda No. 88, Dago, Coblong, Bandung', detailNote: 'Rumah cat hijau, parkir motor di depan', lat: -6.8841, lng: 107.6131 },
  },
  {
    key: 'dewi',
    fullName: 'Dewi Lestari',
    phone: '081311004403',
    role: 'parent',
    children: [{ key: 'kirana', fullName: 'Kirana Putri', level: 'sma', birth: '2008-12-01' }],
    address: { label: 'Rumah', fullAddress: 'Jl. Raya Darmo Permai III No. 21, Sukomanunggal, Surabaya', detailNote: 'Satpam kompleks minta kartu identitas', lat: -7.2702, lng: 112.7002 },
  },
  {
    key: 'agus',
    fullName: 'Agus Hermawan',
    phone: '081311004404',
    role: 'parent',
    children: [
      { key: 'fajar', fullName: 'Fajar Hermawan', level: 'sma', birth: '2009-01-25' },
      { key: 'tiara', fullName: 'Tiara Hermawan', level: 'smp', birth: '2012-05-30' },
    ],
    address: { label: 'Rumah', fullAddress: 'Jl. Kaliurang Km 5, Gang Pandega Marta No. 7, Sleman, Yogyakarta', detailNote: 'Masuk gang kedua setelah masjid', lat: -7.7589, lng: 110.3814 },
  },
  {
    key: 'putri',
    fullName: 'Putri Maharani',
    phone: '081311004405',
    role: 'student',
    self: { level: 'kuliah', birth: '2004-03-17' },
    address: { label: 'Kos', fullAddress: 'Jl. Pogung Baru Blok F No. 3, Sinduadi, Sleman, Yogyakarta', detailNote: 'Kos putri pintu biru', lat: -7.7626, lng: 110.3752 },
  },
  {
    key: 'arif',
    fullName: 'Arif Hidayat',
    phone: '081311004406',
    role: 'student',
    self: { level: 'sma', birth: '2008-07-09' },
    address: { label: 'Rumah', fullAddress: 'Jl. Setia Budi No. 45, Medan Selayang, Medan', detailNote: 'Di samping toko fotokopi', lat: 3.5669, lng: 98.6435 },
  },
  {
    key: 'clara',
    fullName: 'Clara Wijaya',
    phone: '081311004407',
    role: 'student',
    self: { level: 'umum', birth: '1998-10-22' },
    address: { label: 'Apartemen', fullAddress: 'Apartemen Kalibata City Tower Jasmine, Pancoran, Jakarta Selatan', detailNote: 'Tunggu di lobi, lantai 12', lat: -6.2567, lng: 106.8549 },
  },
];

// ---------- kursus ----------

export type DemoLesson =
  | { type: 'article'; title: string; body: string; pdf?: string; minutes?: number }
  | { type: 'quiz'; title: string; questions: { q: string; options: string[]; correct: number }[] }
  | { type: 'assignment'; title: string; body: string };

export interface DemoCourse {
  slug: string;
  title: string;
  description: string;
  category: string;
  level: 'pemula' | 'menengah' | 'lanjut';
  educationLevel: string | null;
  price: number;
  status: 'published' | 'in_review' | 'draft';
  /** pernah dikembalikan reviewer (status draft + catatan di notifikasi) */
  rejectedNotes?: string;
  passingGrade: number;
  issuesCertificate: boolean;
  cover: { accent: 'primary' | 'info' | 'success' | 'warning'; kicker: string };
  modules: { title: string; lessons: DemoLesson[] }[];
}

export const COURSES: DemoCourse[] = [
  {
    slug: 'aljabar-dasar-smp',
    title: 'Aljabar Dasar untuk SMP',
    description: 'Kuasai variabel, persamaan linear satu variabel, dan soal cerita aljabar dengan langkah yang runtut. Cocok untuk kelas 7–8 yang ingin percaya diri menghadapi ulangan harian dan asesmen sumatif.',
    category: 'mata-pelajaran-sekolah',
    level: 'pemula',
    educationLevel: 'smp',
    price: 149000,
    status: 'published',
    passingGrade: 70,
    issuesCertificate: true,
    cover: { accent: 'primary', kicker: 'Matematika SMP' },
    modules: [
      {
        title: 'Mengenal variabel',
        lessons: [
          { type: 'article', title: 'Apa itu variabel?', minutes: 6, pdf: 'aljabar-ringkasan-variabel', body: 'Variabel adalah huruf yang mewakili bilangan yang belum diketahui. Pada kalimat "sebuah kotak berisi x kelereng", x bisa bernilai 5, 12, atau berapa pun sampai kita mendapat informasi tambahan.\n\nDalam aljabar kita memperlakukan variabel seperti bilangan biasa: bisa dijumlahkan, dikurangkan, dan dikalikan. 3x artinya 3 dikali x, sedangkan x + x sama dengan 2x.\n\nUnduh ringkasan PDF di bawah untuk contoh lengkap dan latihan mandiri.' },
          { type: 'article', title: 'Suku sejenis dan menyederhanakan bentuk aljabar', minutes: 8, body: 'Suku sejenis adalah suku yang variabel dan pangkatnya sama, misalnya 4a dan -7a. Suku sejenis bisa digabung: 4a - 7a = -3a.\n\nContoh: sederhanakan 5x + 3y - 2x + y.\nKelompokkan suku sejenis: (5x - 2x) + (3y + y) = 3x + 4y.\n\nTips: beri garis bawah dengan warna berbeda untuk setiap jenis suku sebelum menghitung.' },
          { type: 'quiz', title: 'Kuis: bentuk aljabar', questions: [
            { q: 'Bentuk sederhana dari 6a + 2b - 4a + b adalah …', options: ['2a + 3b', '10a + 3b', '2a + b', '2a - 3b'], correct: 0 },
            { q: 'Jika x = 4, nilai dari 3x - 5 adalah …', options: ['7', '17', '12', '-7'], correct: 0 },
            { q: 'Manakah pasangan suku sejenis?', options: ['2p dan 2q', '5m dan -3m', '4x² dan 4x', '7 dan 7y'], correct: 1 },
          ] },
        ],
      },
      {
        title: 'Persamaan linear satu variabel',
        lessons: [
          { type: 'article', title: 'Prinsip timbangan', minutes: 7, body: 'Persamaan seperti timbangan yang seimbang. Apa pun yang kita lakukan di ruas kiri harus dilakukan juga di ruas kanan.\n\nContoh: 2x + 4 = 10.\nKurangi kedua ruas dengan 4: 2x = 6.\nBagi kedua ruas dengan 2: x = 3.\n\nSelalu cek jawaban dengan memasukkan nilai x ke persamaan awal: 2(3) + 4 = 10. Benar!' },
          { type: 'quiz', title: 'Kuis: menyelesaikan persamaan', questions: [
            { q: 'Nilai x dari 3x - 7 = 11 adalah …', options: ['6', '4', '18', '3'], correct: 0 },
            { q: 'Nilai y dari 5y + 2 = 3y + 10 adalah …', options: ['4', '6', '2', '8'], correct: 0 },
            { q: 'Langkah pertama yang tepat untuk menyelesaikan x/2 = 9 adalah …', options: ['Kalikan kedua ruas dengan 2', 'Kurangi kedua ruas dengan 2', 'Bagi kedua ruas dengan 9', 'Tambahkan 2 pada ruas kiri'], correct: 0 },
          ] },
        ],
      },
      {
        title: 'Soal cerita',
        lessons: [
          { type: 'article', title: 'Mengubah cerita menjadi persamaan', minutes: 9, body: 'Langkah membaca soal cerita:\n1. Tentukan apa yang ditanyakan dan jadikan variabel.\n2. Tulis hubungan yang diketahui sebagai persamaan.\n3. Selesaikan dan periksa apakah jawabannya masuk akal.\n\nContoh: Umur ayah 3 kali umur Dimas. Jumlah umur mereka 52 tahun. Misalkan umur Dimas = d, maka d + 3d = 52, sehingga d = 13. Umur Dimas 13 tahun dan ayah 39 tahun.' },
          { type: 'assignment', title: 'Tugas: 5 soal cerita dari kehidupanmu', body: 'Buat dan selesaikan 5 soal cerita aljabar dari kegiatan sehari-hari (belanja, uang saku, umur keluarga, dsb.). Tulis langkah pemisalan, persamaan, dan pemeriksaan jawaban. Foto atau scan hasilnya lalu unggah sebagai PDF/JPG.' },
        ],
      },
    ],
  },
  {
    slug: 'utbk-penalaran-matematika',
    title: 'Persiapan UTBK: Penalaran Matematika',
    description: 'Latihan terarah untuk subtes Penalaran Matematika UTBK SNBT: pola bilangan, perbandingan, peluang, dan interpretasi data. Setiap modul ditutup kuis bergaya soal UTBK dengan pembahasan.',
    category: 'persiapan-ujian',
    level: 'menengah',
    educationLevel: 'sma',
    price: 199000,
    status: 'published',
    passingGrade: 70,
    issuesCertificate: true,
    cover: { accent: 'info', kicker: 'UTBK SNBT' },
    modules: [
      {
        title: 'Pola bilangan dan barisan',
        lessons: [
          { type: 'article', title: 'Mengenali pola aritmetika & geometri', minutes: 8, pdf: 'utbk-lembar-pola-bilangan', body: 'Barisan aritmetika bertambah dengan selisih tetap (3, 7, 11, 15 → beda 4). Barisan geometri dikali dengan rasio tetap (2, 6, 18, 54 → rasio 3).\n\nStrategi cepat: hitung selisih dua suku berurutan. Jika selisihnya berubah teratur, periksa selisih tingkat dua atau kemungkinan pola bergantian.\n\nLembar latihan PDF berisi 15 soal pola dengan kunci jawaban.' },
          { type: 'quiz', title: 'Kuis: pola bilangan', questions: [
            { q: 'Suku berikutnya dari 5, 9, 17, 33, … adalah …', options: ['65', '49', '57', '66'], correct: 0 },
            { q: 'Suku ke-10 barisan 4, 7, 10, 13, … adalah …', options: ['31', '34', '28', '40'], correct: 0 },
            { q: 'Rasio barisan 81, 27, 9, 3, … adalah …', options: ['1/3', '3', '-3', '1/9'], correct: 0 },
          ] },
        ],
      },
      {
        title: 'Perbandingan dan persentase',
        lessons: [
          { type: 'article', title: 'Perbandingan senilai & berbalik nilai', minutes: 10, body: 'Perbandingan senilai: jika satu besaran naik, besaran lain ikut naik (harga dan jumlah barang). Perbandingan berbalik nilai: jika satu naik, lainnya turun (jumlah pekerja dan waktu selesai).\n\nContoh berbalik nilai: 6 pekerja menyelesaikan pagar dalam 10 hari. Dengan 4 pekerja, waktunya 6 × 10 / 4 = 15 hari.' },
          { type: 'quiz', title: 'Kuis: perbandingan', questions: [
            { q: 'Harga 3 buku Rp27.000. Harga 7 buku yang sama adalah …', options: ['Rp63.000', 'Rp56.000', 'Rp70.000', 'Rp49.000'], correct: 0 },
            { q: '8 keran mengisi kolam dalam 6 jam. Dengan 12 keran, waktu yang diperlukan …', options: ['4 jam', '9 jam', '3 jam', '5 jam'], correct: 0 },
            { q: 'Harga baju naik dari Rp80.000 menjadi Rp100.000. Persentase kenaikannya …', options: ['25%', '20%', '80%', '125%'], correct: 0 },
          ] },
        ],
      },
      {
        title: 'Peluang dan data',
        lessons: [
          { type: 'article', title: 'Peluang kejadian sederhana', minutes: 7, body: 'Peluang = banyak kejadian yang diharapkan ÷ banyak semua kemungkinan.\n\nContoh: dalam kantong ada 3 kelereng merah dan 5 biru. Peluang terambil merah = 3/8.\n\nUntuk dua kejadian saling bebas, kalikan peluangnya. Peluang dua kali lempar koin muncul angka keduanya = 1/2 × 1/2 = 1/4.' },
          { type: 'quiz', title: 'Kuis: peluang', questions: [
            { q: 'Peluang muncul mata dadu genap pada satu kali lempar adalah …', options: ['1/2', '1/3', '1/6', '2/3'], correct: 0 },
            { q: 'Dari 10 kartu bernomor 1–10, peluang terambil bilangan prima adalah …', options: ['2/5', '1/2', '3/10', '1/5'], correct: 0 },
          ] },
        ],
      },
    ],
  },
  {
    slug: 'english-conversation-beginners',
    title: 'English Conversation for Beginners',
    description: 'Belajar percakapan bahasa Inggris sehari-hari: memperkenalkan diri, bertanya arah, memesan makanan, dan berbincang ringan. Disertai contoh dialog dan latihan pengucapan. Gratis untuk semua.',
    category: 'bahasa-asing',
    level: 'pemula',
    educationLevel: null,
    price: 0,
    status: 'published',
    passingGrade: 60,
    issuesCertificate: true,
    cover: { accent: 'success', kicker: 'Bahasa Inggris' },
    modules: [
      {
        title: 'Greetings & introductions',
        lessons: [
          { type: 'article', title: 'Menyapa dan memperkenalkan diri', minutes: 6, body: 'Ungkapan dasar:\n- "Hi, I\'m Clara. Nice to meet you."\n- "Where are you from?" → "I\'m from Jakarta."\n- "What do you do?" → "I\'m a student / I work as a designer."\n\nLatihan: rekam dirimu memperkenalkan diri selama 30 detik, lalu dengarkan kembali pelafalanmu.' },
          { type: 'quiz', title: 'Quiz: introductions', questions: [
            { q: 'Respon yang tepat untuk "Nice to meet you" adalah …', options: ['Nice to meet you too.', 'I am fine.', 'See you tomorrow.', 'You are welcome.'], correct: 0 },
            { q: '"What do you do?" menanyakan tentang …', options: ['Pekerjaan', 'Hobi saat ini', 'Asal kota', 'Umur'], correct: 0 },
          ] },
        ],
      },
      {
        title: 'Daily situations',
        lessons: [
          { type: 'article', title: 'Memesan makanan dan minuman', minutes: 7, body: 'Dialog di kafe:\nA: "Hi, what can I get for you?"\nB: "Can I have an iced latte and a croissant, please?"\nA: "For here or to go?"\nB: "To go, please."\n\nGunakan "Could I…" atau "Can I have…" agar terdengar sopan.' },
          { type: 'article', title: 'Bertanya arah', minutes: 6, body: 'Ungkapan berguna: "Excuse me, how do I get to the train station?", "Go straight, then turn left at the traffic light.", "It\'s next to the bank."\n\nLatihan: jelaskan rute dari rumahmu ke sekolah atau kantor dalam 5 kalimat.' },
          { type: 'quiz', title: 'Quiz: daily situations', questions: [
            { q: '"For here or to go?" artinya …', options: ['Makan di sini atau dibawa pulang?', 'Mau pesan apa?', 'Bayar tunai atau kartu?', 'Duduk di mana?'], correct: 0 },
            { q: 'Kalimat paling sopan untuk memesan adalah …', options: ['Could I have a cup of tea, please?', 'Give me tea.', 'Tea now.', 'I want tea fast.'], correct: 0 },
          ] },
        ],
      },
      {
        title: 'Small talk',
        lessons: [
          { type: 'article', title: 'Obrolan ringan tentang cuaca dan akhir pekan', minutes: 5, body: 'Topik aman untuk small talk: cuaca, rencana akhir pekan, makanan favorit. Contoh: "How was your weekend?" → "It was great, I went hiking with friends."\n\nHindari topik pribadi seperti gaji atau umur pada pertemuan pertama.' },
          { type: 'assignment', title: 'Tugas: tulis dialog 8 baris', body: 'Tulis dialog percakapan 8 baris antara kamu dan teman baru di sebuah acara. Gunakan minimal 3 ungkapan dari kursus ini. Unggah sebagai PDF atau foto tulisan tangan.' },
        ],
      },
    ],
  },
  {
    slug: 'python-dari-nol',
    title: 'Belajar Python dari Nol',
    description: 'Kursus pemrograman untuk pemula total: variabel, percabangan, perulangan, fungsi, dan proyek kecil kalkulator nilai. Tanpa latar belakang IT pun bisa mengikuti.',
    category: 'keterampilan-digital',
    level: 'pemula',
    educationLevel: 'kuliah',
    price: 249000,
    status: 'published',
    passingGrade: 75,
    issuesCertificate: true,
    cover: { accent: 'warning', kicker: 'Pemrograman' },
    modules: [
      {
        title: 'Persiapan & variabel',
        lessons: [
          { type: 'article', title: 'Menyiapkan Python di laptop', minutes: 10, pdf: 'python-panduan-instalasi', body: 'Unduh Python dari situs resminya dan centang opsi "Add Python to PATH" saat instalasi di Windows. Setelah itu buka terminal dan ketik python --version untuk memastikan berhasil.\n\nKita akan menulis kode di editor teks sederhana atau Visual Studio Code. Panduan instalasi bergambar tersedia dalam PDF di bawah.' },
          { type: 'article', title: 'Variabel dan tipe data', minutes: 8, body: 'Variabel menyimpan nilai: nama = "Putri", umur = 20, ipk = 3.75. Python mengenali tipe datanya otomatis: string, integer, dan float.\n\nGunakan print(nama) untuk menampilkan nilai dan type(umur) untuk melihat tipenya. Nama variabel sebaiknya deskriptif dan memakai huruf kecil dengan garis bawah, misalnya nilai_akhir.' },
          { type: 'quiz', title: 'Kuis: variabel', questions: [
            { q: 'Tipe data dari nilai 3.14 adalah …', options: ['float', 'int', 'str', 'bool'], correct: 0 },
            { q: 'Penamaan variabel yang disarankan adalah …', options: ['nilai_akhir', 'NilaiAkhir!', '1nilai', 'nilai akhir'], correct: 0 },
            { q: 'Perintah untuk menampilkan isi variabel nama adalah …', options: ['print(nama)', 'show nama', 'echo(nama)', 'display nama'], correct: 0 },
          ] },
        ],
      },
      {
        title: 'Percabangan & perulangan',
        lessons: [
          { type: 'article', title: 'if, elif, else', minutes: 9, body: 'Percabangan menjalankan kode sesuai kondisi:\nif nilai >= 85: print("A")\nelif nilai >= 70: print("B")\nelse: print("Perlu remedial")\n\nPerhatikan indentasi: Python memakai spasi di awal baris untuk menandai blok kode.' },
          { type: 'article', title: 'Perulangan for dan while', minutes: 9, body: 'for dipakai jika jumlah pengulangan diketahui: for i in range(5): print(i) menampilkan 0 sampai 4.\n\nwhile dipakai selama kondisi masih benar, misalnya meminta input sampai pengguna mengetik "selesai". Pastikan kondisi suatu saat bernilai salah agar tidak terjadi perulangan tanpa akhir.' },
          { type: 'quiz', title: 'Kuis: logika program', questions: [
            { q: 'Output dari for i in range(3): print(i) adalah …', options: ['0 1 2', '1 2 3', '0 1 2 3', '3'], correct: 0 },
            { q: 'Kata kunci untuk kondisi lain setelah if adalah …', options: ['elif', 'elseif', 'else if', 'otherwise'], correct: 0 },
          ] },
        ],
      },
      {
        title: 'Fungsi & proyek mini',
        lessons: [
          { type: 'article', title: 'Membuat fungsi sendiri', minutes: 8, body: 'Fungsi membungkus kode yang dipakai berulang:\ndef rata_rata(nilai): return sum(nilai) / len(nilai)\n\nPanggil dengan rata_rata([80, 90, 75]). Fungsi membuat program lebih rapi dan mudah diuji.' },
          { type: 'assignment', title: 'Proyek: kalkulator nilai rapor', body: 'Buat program Python yang meminta 5 nilai mata pelajaran, menghitung rata-rata, lalu menampilkan predikat (A/B/C/D). Kirim kode (.py disalin ke PDF) beserta tangkapan layar hasil program saat dijalankan.' },
        ],
      },
    ],
  },
  {
    slug: 'menulis-esai-meyakinkan',
    title: 'Menulis Esai yang Meyakinkan',
    description: 'Belajar menyusun esai argumentatif untuk tugas sekolah, lomba, dan seleksi beasiswa: menentukan tesis, menyusun argumen dengan data, dan menutup dengan kuat.',
    category: 'pengembangan-diri',
    level: 'menengah',
    educationLevel: 'sma',
    price: 0,
    status: 'published',
    passingGrade: 70,
    issuesCertificate: false,
    cover: { accent: 'primary', kicker: 'Menulis' },
    modules: [
      {
        title: 'Tesis dan kerangka',
        lessons: [
          { type: 'article', title: 'Menulis kalimat tesis yang tajam', minutes: 7, body: 'Tesis adalah pendapat utama yang akan kamu buktikan. Tesis yang baik spesifik dan bisa diperdebatkan.\n\nKurang tajam: "Sampah plastik itu buruk."\nLebih tajam: "Sekolah perlu melarang botol plastik sekali pakai karena menghasilkan 40% sampah kantin setiap minggu."' },
          { type: 'article', title: 'Kerangka tiga argumen', minutes: 6, body: 'Susun kerangka: pendahuluan (latar + tesis), tiga paragraf argumen (klaim, bukti, penjelasan), paragraf sanggahan, dan penutup yang menegaskan kembali tesis dengan ajakan.' },
        ],
      },
      {
        title: 'Argumen dan bukti',
        lessons: [
          { type: 'article', title: 'Memilih bukti yang kuat', minutes: 8, body: 'Bukti bisa berupa data statistik, hasil penelitian, contoh kasus, atau kutipan ahli. Selalu sebutkan sumbernya dan jelaskan hubungannya dengan klaim — jangan biarkan data "berbicara sendiri".' },
          { type: 'quiz', title: 'Kuis: argumen', questions: [
            { q: 'Bagian paragraf yang menjelaskan hubungan bukti dengan klaim disebut …', options: ['Penjelasan/analisis', 'Tesis', 'Judul', 'Daftar pustaka'], correct: 0 },
            { q: 'Tesis yang paling tajam adalah …', options: ['Kantin sekolah perlu menyediakan air isi ulang gratis untuk mengurangi sampah botol plastik.', 'Plastik itu buruk.', 'Lingkungan penting.', 'Semua orang harus peduli.'], correct: 0 },
          ] },
        ],
      },
      {
        title: 'Merevisi tulisan',
        lessons: [
          { type: 'article', title: 'Daftar periksa revisi', minutes: 5, body: 'Sebelum mengumpulkan, periksa: apakah setiap paragraf mendukung tesis? Apakah ada kalimat yang terlalu panjang (lebih dari 25 kata)? Apakah ejaan sesuai PUEBI? Bacalah keras-keras untuk menemukan kalimat yang janggal.' },
          { type: 'assignment', title: 'Tugas: esai 500 kata', body: 'Tulis esai argumentatif 500 kata dengan tema "Perlukah gawai dilarang di sekolah?". Sertakan minimal dua sumber data. Unggah dalam format PDF.' },
        ],
      },
    ],
  },
  {
    slug: 'kimia-stoikiometri',
    title: 'Kimia Dasar: Stoikiometri',
    description: 'Konsep mol, massa molar, dan perhitungan reaksi kimia dijelaskan pelan-pelan dengan contoh soal bertahap. Untuk siswa kelas 10–11 yang sering bingung dengan hitungan kimia.',
    category: 'mata-pelajaran-sekolah',
    level: 'menengah',
    educationLevel: 'sma',
    price: 129000,
    status: 'published',
    passingGrade: 70,
    issuesCertificate: true,
    cover: { accent: 'success', kicker: 'Kimia SMA' },
    modules: [
      {
        title: 'Konsep mol',
        lessons: [
          { type: 'article', title: 'Mol dan bilangan Avogadro', minutes: 8, pdf: 'kimia-tabel-massa-atom', body: '1 mol zat mengandung 6,02 × 10²³ partikel (bilangan Avogadro). Massa 1 mol zat dalam gram sama dengan massa molekul relatifnya (Mr).\n\nContoh: Mr H₂O = 2(1) + 16 = 18, jadi 18 gram air = 1 mol. Tabel massa atom relatif tersedia dalam PDF.' },
          { type: 'quiz', title: 'Kuis: mol', questions: [
            { q: 'Jumlah mol dari 36 gram H₂O (Mr = 18) adalah …', options: ['2 mol', '0,5 mol', '18 mol', '36 mol'], correct: 0 },
            { q: 'Mr dari CO₂ (Ar C = 12, O = 16) adalah …', options: ['44', '28', '32', '40'], correct: 0 },
            { q: 'Satu mol zat mengandung … partikel.', options: ['6,02 × 10²³', '6,02 × 10²²', '22,4', '1000'], correct: 0 },
          ] },
        ],
      },
      {
        title: 'Persamaan reaksi',
        lessons: [
          { type: 'article', title: 'Menyetarakan persamaan reaksi', minutes: 9, body: 'Jumlah atom setiap unsur di ruas kiri harus sama dengan ruas kanan. Mulailah dari molekul paling kompleks, lalu setarakan O dan H terakhir.\n\nContoh: CH₄ + O₂ → CO₂ + H₂O menjadi CH₄ + 2O₂ → CO₂ + 2H₂O.' },
          { type: 'article', title: 'Perbandingan koefisien', minutes: 8, body: 'Koefisien reaksi menunjukkan perbandingan mol. Pada N₂ + 3H₂ → 2NH₃, 1 mol N₂ bereaksi dengan 3 mol H₂ menghasilkan 2 mol NH₃. Gunakan perbandingan ini untuk menghitung zat yang belum diketahui.' },
          { type: 'quiz', title: 'Kuis: persamaan reaksi', questions: [
            { q: 'Koefisien O₂ pada reaksi setara 2H₂ + … O₂ → 2H₂O adalah …', options: ['1', '2', '3', '4'], correct: 0 },
            { q: 'Pada N₂ + 3H₂ → 2NH₃, jika tersedia 2 mol N₂ maka NH₃ yang terbentuk …', options: ['4 mol', '2 mol', '6 mol', '3 mol'], correct: 0 },
          ] },
        ],
      },
      {
        title: 'Latihan terpadu',
        lessons: [
          { type: 'assignment', title: 'Tugas: 4 soal hitungan reaksi', body: 'Kerjakan 4 soal stoikiometri pada lembar PDF modul 1 (nomor 11–14) lengkap dengan langkah. Unggah foto atau scan jawabanmu.' },
        ],
      },
    ],
  },
  {
    slug: 'teknik-belajar-efektif',
    title: 'Teknik Belajar Efektif untuk Pelajar',
    description: 'Belajar lebih singkat tapi lebih nempel: teknik Pomodoro, catatan Cornell, active recall, dan pengulangan berjarak. Gratis dan bisa diselesaikan dalam satu akhir pekan.',
    category: 'pengembangan-diri',
    level: 'pemula',
    educationLevel: null,
    price: 0,
    status: 'published',
    passingGrade: 60,
    issuesCertificate: true,
    cover: { accent: 'info', kicker: 'Keterampilan belajar' },
    modules: [
      {
        title: 'Mengatur waktu',
        lessons: [
          { type: 'article', title: 'Teknik Pomodoro', minutes: 5, body: 'Belajar fokus 25 menit, istirahat 5 menit, ulangi empat kali lalu istirahat panjang 20 menit. Matikan notifikasi ponsel selama sesi fokus dan catat gangguan yang muncul untuk dikerjakan nanti.' },
          { type: 'article', title: 'Menyusun jadwal mingguan', minutes: 6, pdf: 'belajar-template-jadwal-mingguan', body: 'Tulis semua kegiatan tetap (sekolah, les, ibadah), lalu sisipkan blok belajar 2 × 25 menit di waktu paling segar. Template jadwal mingguan bisa diunduh di bawah.' },
        ],
      },
      {
        title: 'Mencatat & mengingat',
        lessons: [
          { type: 'article', title: 'Catatan Cornell', minutes: 7, body: 'Bagi kertas menjadi tiga: kolom kanan untuk catatan utama, kolom kiri untuk kata kunci/pertanyaan, dan bagian bawah untuk ringkasan 2–3 kalimat. Saat mengulang, tutup kolom kanan dan jawab pertanyaan di kolom kiri.' },
          { type: 'article', title: 'Active recall & pengulangan berjarak', minutes: 6, body: 'Mengingat kembali tanpa melihat catatan jauh lebih efektif daripada membaca ulang. Ulangi materi pada hari ke-1, ke-3, ke-7, dan ke-14 setelah belajar pertama kali.' },
          { type: 'quiz', title: 'Kuis: teknik belajar', questions: [
            { q: 'Durasi satu sesi fokus Pomodoro adalah …', options: ['25 menit', '45 menit', '10 menit', '60 menit'], correct: 0 },
            { q: 'Bagian bawah catatan Cornell dipakai untuk …', options: ['Ringkasan', 'Daftar tugas', 'Tanggal', 'Gambar'], correct: 0 },
            { q: 'Teknik mengingat tanpa melihat catatan disebut …', options: ['Active recall', 'Highlighting', 'Skimming', 'Multitasking'], correct: 0 },
          ] },
        ],
      },
      {
        title: 'Menjaga motivasi',
        lessons: [
          { type: 'article', title: 'Target kecil yang bisa dicapai', minutes: 4, body: 'Ganti target "belajar matematika" menjadi "menyelesaikan 10 soal persamaan linear sebelum pukul 19.30". Target yang spesifik lebih mudah dimulai dan memberi rasa berhasil.' },
        ],
      },
    ],
  },
  {
    slug: 'statistika-mahasiswa',
    title: 'Statistika untuk Mahasiswa',
    description: 'Statistika deskriptif dan inferensial dasar untuk tugas akhir: ukuran pemusatan, distribusi normal, uji t, dan interpretasi hasil. Dengan contoh data penelitian mahasiswa.',
    category: 'mata-pelajaran-sekolah',
    level: 'lanjut',
    educationLevel: 'kuliah',
    price: 179000,
    status: 'in_review',
    passingGrade: 75,
    issuesCertificate: true,
    cover: { accent: 'warning', kicker: 'Statistika' },
    modules: [
      {
        title: 'Statistika deskriptif',
        lessons: [
          { type: 'article', title: 'Mean, median, modus', minutes: 8, body: 'Mean adalah rata-rata, median nilai tengah data terurut, dan modus nilai yang paling sering muncul. Jika data memiliki pencilan (outlier), median lebih mewakili daripada mean.' },
          { type: 'quiz', title: 'Kuis: ukuran pemusatan', questions: [
            { q: 'Median dari 3, 7, 8, 12, 20 adalah …', options: ['8', '10', '7', '12'], correct: 0 },
            { q: 'Ukuran yang paling tahan terhadap pencilan adalah …', options: ['Median', 'Mean', 'Range', 'Varians'], correct: 0 },
          ] },
        ],
      },
      {
        title: 'Distribusi normal',
        lessons: [
          { type: 'article', title: 'Kurva normal dan skor z', minutes: 9, body: 'Skor z menunjukkan berapa simpangan baku sebuah nilai dari rata-rata: z = (x − μ) / σ. Sekitar 95% data berada dalam rentang ±2 simpangan baku dari rata-rata.' },
        ],
      },
      {
        title: 'Uji hipotesis',
        lessons: [
          { type: 'article', title: 'Uji t dua sampel', minutes: 10, body: 'Uji t membandingkan rata-rata dua kelompok. Rumuskan H₀ (tidak ada perbedaan) dan H₁, pilih taraf signifikansi 5%, lalu bandingkan nilai p dengan 0,05.' },
          { type: 'assignment', title: 'Tugas: analisis data kuesioner', body: 'Gunakan data kuesioner pada lampiran untuk menghitung statistik deskriptif dan melakukan uji t. Tuliskan interpretasi hasil dalam 2 paragraf.' },
        ],
      },
    ],
  },
  {
    slug: 'desain-grafis-pemula',
    title: 'Desain Grafis untuk Pemula',
    description: 'Dasar komposisi, tipografi, dan warna untuk membuat poster dan konten media sosial yang rapi menggunakan aplikasi gratis.',
    category: 'kursus-hobi',
    level: 'pemula',
    educationLevel: null,
    price: 99000,
    status: 'draft',
    passingGrade: 70,
    issuesCertificate: false,
    cover: { accent: 'primary', kicker: 'Desain grafis' },
    modules: [
      {
        title: 'Prinsip dasar desain',
        lessons: [
          { type: 'article', title: 'Hierarki visual', minutes: 6, body: 'Pembaca melihat elemen terbesar dan paling kontras lebih dulu. Tentukan satu pesan utama, lalu atur ukuran, warna, dan jarak agar mata bergerak dari judul ke informasi pendukung.' },
          { type: 'article', title: 'Memilih pasangan huruf', minutes: 6, body: 'Gunakan maksimal dua jenis huruf: satu untuk judul dan satu untuk isi. Pasangan serif untuk judul dan sans-serif untuk teks isi biasanya aman dan mudah dibaca.' },
        ],
      },
    ],
  },
  {
    slug: 'fisika-kelas-10-gerak-lurus',
    title: 'Fisika Kelas 10: Gerak Lurus',
    description: 'Gerak lurus beraturan dan berubah beraturan lengkap dengan grafik posisi–waktu dan kecepatan–waktu.',
    category: 'mata-pelajaran-sekolah',
    level: 'pemula',
    educationLevel: 'sma',
    price: 119000,
    status: 'draft',
    rejectedNotes: 'Materi modul 2 masih berupa poin singkat dan belum ada kuis di akhir modul. Mohon lengkapi contoh soal GLBB beserta pembahasan, lalu ajukan review kembali.',
    passingGrade: 70,
    issuesCertificate: true,
    cover: { accent: 'info', kicker: 'Fisika SMA' },
    modules: [
      {
        title: 'Gerak lurus beraturan',
        lessons: [
          { type: 'article', title: 'Kecepatan tetap', minutes: 7, body: 'Pada GLB, benda menempuh jarak yang sama dalam selang waktu yang sama. Rumus: s = v × t. Grafik posisi–waktu berupa garis lurus miring.' },
          { type: 'quiz', title: 'Kuis: GLB', questions: [
            { q: 'Mobil bergerak 20 m/s selama 15 s. Jarak tempuhnya …', options: ['300 m', '35 m', '150 m', '200 m'], correct: 0 },
          ] },
        ],
      },
      {
        title: 'Gerak lurus berubah beraturan',
        lessons: [{ type: 'article', title: 'Percepatan', minutes: 5, body: 'Percepatan = perubahan kecepatan per satuan waktu. Rumus: v = v₀ + at.' }],
      },
    ],
  },
];

// ---------- booking & transaksi ----------

export type DemoBookingState =
  | { kind: 'completed'; report: DemoReport; review?: DemoReview }
  | { kind: 'pending_confirmation' }
  | { kind: 'rejected'; reason: string }
  | { kind: 'awaiting_payment' }
  | { kind: 'verifying' }
  | { kind: 'confirmed'; meetingLink?: string }
  | { kind: 'traveling' }
  | { kind: 'in_session'; meetingLink?: string }
  | { kind: 'cancelled_refunded'; reason: string; refundNote: string }
  | { kind: 'cancelled_refund_pending'; reason: string; by: 'tutor' | 'student' }
  | { kind: 'payment_rejected'; transferred: number; reason: string };

export interface DemoReport {
  materials: string;
  level: number;
  mastered?: string;
  improve?: string;
  homework?: string;
  recommendation?: string;
}
export interface DemoReview {
  rating: number;
  comment: string;
  reply?: string;
  hidden?: string;
}

export interface DemoBooking {
  key: string;
  learner: string;
  tutor: string;
  subject: string;
  mode: 'online' | 'tatap_muka';
  /** hari relatif terhadap hari ini (WIB) + jam mulai WIB; `minutesFromNow` untuk sesi hari ini */
  day?: number;
  time?: string;
  minutesFromNow?: number;
  duration: number;
  state: DemoBookingState;
}

export const BOOKINGS: DemoBooking[] = [
  // --- sesi selesai + laporan (+ ulasan)
  { key: 'b01', learner: 'dimas', tutor: 'rizky', subject: 'fisika', mode: 'tatap_muka', day: -21, time: '16:00', duration: 90, state: { kind: 'completed', report: { materials: 'Hukum Newton I–III: diagram gaya benda pada bidang datar dan bidang miring, gaya gesek statis dan kinetis.', level: 4, mastered: 'Menggambar diagram gaya bebas dan menentukan resultan gaya.', improve: 'Menguraikan gaya berat pada bidang miring (sin/cos masih tertukar).', homework: 'Buku paket bab 4 nomor 1–10.', recommendation: 'Pertemuan berikutnya fokus pada soal bidang miring dan katrol.' }, review: { rating: 5, comment: 'Kak Rizky sabar sekali dan contohnya dekat dengan kehidupan sehari-hari. Dimas jadi lebih percaya diri mengerjakan soal Newton.', reply: 'Terima kasih Bu Sari! Dimas cepat menangkap konsepnya, tinggal latihan bidang miring.' } } },
  { key: 'b02', learner: 'dimas', tutor: 'rizky', subject: 'matematika', mode: 'tatap_muka', day: -14, time: '16:00', duration: 90, state: { kind: 'completed', report: { materials: 'Fungsi kuadrat: menentukan titik puncak, sumbu simetri, dan menggambar grafik parabola.', level: 4, mastered: 'Mencari titik puncak dengan rumus -b/2a.', improve: 'Menentukan titik potong sumbu x dengan rumus ABC.', homework: 'LKS halaman 58–59.' }, review: { rating: 4, comment: 'Penjelasannya jelas, hanya saja sesi terasa singkat karena banyak soal. Mungkin lain kali ambil 2 jam.' } } },
  { key: 'b03', learner: 'alya', tutor: 'anisa', subject: 'bahasa-inggris', mode: 'online', day: -12, time: '16:00', duration: 60, state: { kind: 'completed', report: { materials: 'Simple present tense untuk kebiasaan sehari-hari dan kosakata aktivitas pagi.', level: 5, mastered: 'Menyusun 10 kalimat tentang rutinitas pagi dengan benar.', improve: 'Pelafalan akhiran -s/-es.', homework: 'Rekam video 1 menit menceritakan rutinitas akhir pekan.', recommendation: 'Lanjut ke present continuous.' }, review: { rating: 5, comment: 'Alya yang biasanya pemalu jadi berani bicara. Metodenya menyenangkan!', reply: 'Senang sekali mendengarnya. Alya hebat, semangat terus!' } } },
  { key: 'b04', learner: 'raka', tutor: 'galih', subject: 'matematika', mode: 'tatap_muka', day: -9, time: '15:00', duration: 90, state: { kind: 'completed', report: { materials: 'Bangun ruang sisi datar: luas permukaan dan volume kubus, balok, prisma.', level: 3, mastered: 'Volume kubus dan balok.', improve: 'Luas permukaan prisma segitiga — masih lupa menghitung sisi tegak.', homework: 'Buat jaring-jaring prisma dari kardus bekas.', recommendation: 'Ulang luas permukaan prisma dengan model kardus.' }, review: { rating: 5, comment: 'Raka senang karena belajar pakai kardus bekas. Kak Galih kreatif.' } } },
  { key: 'b05', learner: 'kirana', tutor: 'hendra', subject: 'fisika', mode: 'tatap_muka', day: -4, time: '16:00', duration: 90, state: { kind: 'completed', report: { materials: 'Usaha dan energi: energi kinetik, potensial, dan hukum kekekalan energi mekanik.', level: 4, mastered: 'Menghitung energi kinetik dan potensial.', improve: 'Soal kekekalan energi pada bidang lengkung.', homework: 'Latihan soal HOTS nomor 1–6.' } } },
  { key: 'b06', learner: 'fajar', tutor: 'laras', subject: 'bahasa-indonesia', mode: 'tatap_muka', day: -10, time: '16:00', duration: 90, state: { kind: 'completed', report: { materials: 'Struktur teks eksposisi: tesis, argumentasi, penegasan ulang. Membedah dua contoh teks dari koran.', level: 4, mastered: 'Menemukan tesis dan argumen dalam teks.', improve: 'Menulis penegasan ulang yang tidak sekadar mengulang tesis.', homework: 'Tulis teks eksposisi 300 kata tentang sampah plastik di sekolah.' }, review: { rating: 4, comment: 'Catatan per paragraf sangat membantu Fajar merevisi tulisan.', reply: 'Terima kasih Pak Agus, tulisan Fajar sudah berkembang pesat.' } } },
  { key: 'b07', learner: 'putri', tutor: 'yoga', subject: 'statistika', mode: 'online', day: -8, time: '19:00', duration: 120, state: { kind: 'completed', report: { materials: 'Uji t independen untuk data skripsi: asumsi normalitas, homogenitas, dan interpretasi output.', level: 4, mastered: 'Menjalankan uji t dan membaca nilai p.', improve: 'Menuliskan interpretasi dalam bahasa akademik.', homework: 'Tulis ulang subbab hasil penelitian bagian uji beda.', recommendation: 'Sesi berikutnya bahas regresi linear sederhana.' }, review: { rating: 5, comment: 'Bab 4 skripsi saya akhirnya jalan. Penjelasan Kak Yoga runtut dan tidak menggurui.' } } },
  { key: 'b08', learner: 'arif', tutor: 'andreas', subject: 'bahasa-mandarin', mode: 'online', day: -6, time: '19:00', duration: 60, state: { kind: 'completed', report: { materials: 'Pinyin dan empat nada; perkenalan diri dasar (你好, 我叫…, 我是学生).', level: 3, mastered: 'Membaca pinyin sederhana.', improve: 'Membedakan nada 2 dan 3.', homework: 'Hafalkan 10 kosakata keluarga.' }, review: { rating: 4, comment: 'Seru belajar nada Mandarin. Latihan pengucapannya banyak.' } } },
  { key: 'b09', learner: 'clara', tutor: 'maya', subject: 'bahasa-inggris', mode: 'online', day: -15, time: '19:00', duration: 90, state: { kind: 'completed', report: { materials: 'IELTS Writing Task 2: struktur opinion essay dan parafrase pertanyaan.', level: 4, mastered: 'Menulis paragraf pembuka dengan parafrase yang baik.', improve: 'Variasi kosakata dan kalimat kompleks.', homework: 'Tulis satu essay 250 kata topik remote working.', recommendation: 'Target band 7 dalam 6 minggu realistis.' }, review: { rating: 5, comment: 'Feedback essay-nya detail sekali, per kalimat. Worth it!', reply: 'Thank you, Clara! Keep practising, you are on track for band 7.' } } },
  { key: 'b10', learner: 'nadia', tutor: 'galih', subject: 'matematika', mode: 'tatap_muka', day: -2, time: '15:00', duration: 60, state: { kind: 'completed', report: { materials: 'Pecahan senilai dan menyederhanakan pecahan dengan potongan kue kertas.', level: 5, mastered: 'Menyederhanakan pecahan dengan FPB.', homework: 'Lembar kerja pecahan halaman 3.' } } },
  { key: 'b11', learner: 'tiara', tutor: 'laras', subject: 'bahasa-indonesia', mode: 'tatap_muka', day: -18, time: '16:00', duration: 60, state: { kind: 'completed', report: { materials: 'Menulis puisi bebas: diksi, imaji, dan rima.', level: 3, improve: 'Memilih diksi yang tidak klise.', homework: 'Tulis dua puisi bertema keluarga.' }, review: { rating: 3, comment: 'Anak saya kurang cocok, silakan hubungi saya langsung di 0812-0000-1234 untuk les privat tanpa aplikasi.', hidden: 'Mengandung nomor telepon dan ajakan bertransaksi di luar platform.' } } },

  // --- menunggu konfirmasi tutor
  { key: 'b12', learner: 'alya', tutor: 'anisa', subject: 'bahasa-inggris', mode: 'tatap_muka', day: 2, time: '16:00', duration: 60, state: { kind: 'pending_confirmation' } },
  { key: 'b13', learner: 'bima', tutor: 'galih', subject: 'matematika', mode: 'tatap_muka', day: 3, time: '15:00', duration: 60, state: { kind: 'pending_confirmation' } },
  { key: 'b14', learner: 'kirana', tutor: 'rizky', subject: 'persiapan-utbk', mode: 'online', day: 4, time: '19:00', duration: 90, state: { kind: 'pending_confirmation' } },

  // --- menunggu pembayaran / verifikasi
  { key: 'b15', learner: 'dimas', tutor: 'rizky', subject: 'matematika', mode: 'tatap_muka', day: 3, time: '16:00', duration: 90, state: { kind: 'awaiting_payment' } },
  { key: 'b16', learner: 'kirana', tutor: 'hendra', subject: 'fisika', mode: 'tatap_muka', day: 5, time: '16:00', duration: 90, state: { kind: 'verifying' } },
  { key: 'b17', learner: 'fajar', tutor: 'yoga', subject: 'matematika', mode: 'online', day: 2, time: '19:00', duration: 60, state: { kind: 'verifying' } },

  // --- terkonfirmasi & sedang berjalan
  { key: 'b18', learner: 'raka', tutor: 'galih', subject: 'matematika', mode: 'tatap_muka', day: 1, time: '15:00', duration: 90, state: { kind: 'confirmed' } },
  { key: 'b19', learner: 'clara', tutor: 'dimasadi', subject: 'pemrograman', mode: 'online', day: 1, time: '19:00', duration: 120, state: { kind: 'confirmed', meetingLink: 'https://meet.google.com/lrn-demo-pyt' } },
  { key: 'b20', learner: 'tiara', tutor: 'laras', subject: 'bahasa-indonesia', mode: 'tatap_muka', minutesFromNow: 25, duration: 60, state: { kind: 'traveling' } },
  { key: 'b21', learner: 'putri', tutor: 'yoga', subject: 'kalkulus', mode: 'online', minutesFromNow: -30, duration: 90, state: { kind: 'in_session', meetingLink: 'https://meet.google.com/lrn-demo-klk' } },

  // --- batal, ditolak, bermasalah
  { key: 'b22', learner: 'alya', tutor: 'anisa', subject: 'bahasa-inggris', mode: 'online', day: 6, time: '16:00', duration: 60, state: { kind: 'cancelled_refunded', reason: 'Ada acara keluarga di luar kota.', refundNote: 'Transfer BCA ref DEMO-240915, dana dikembalikan penuh.' } },
  { key: 'b23', learner: 'arif', tutor: 'andreas', subject: 'bahasa-mandarin', mode: 'online', day: 3, time: '19:00', duration: 60, state: { kind: 'cancelled_refund_pending', reason: 'Tutor sakit dan tidak bisa mengajar minggu ini.', by: 'tutor' } },
  { key: 'b24', learner: 'bima', tutor: 'galih', subject: 'matematika', mode: 'tatap_muka', day: 4, time: '15:00', duration: 60, state: { kind: 'payment_rejected', transferred: 50000, reason: 'Nominal transfer Rp50.000 tidak sesuai tagihan Rp85.000.' } },
  { key: 'b25', learner: 'clara', tutor: 'maya', subject: 'bahasa-inggris', mode: 'online', day: 2, time: '19:00', duration: 90, state: { kind: 'rejected', reason: 'Jadwal minggu ini sudah penuh untuk persiapan tes murid lain. Silakan pilih minggu depan.' } },
];

// ---------- enrollment kursus ----------

export interface DemoEnrollment {
  learner: string;
  course: string;
  /** progres: none (0%), partial (sebagian lesson), full (semua lesson, kuis lulus, tugas dinilai) */
  progress: 'none' | 'partial' | 'full' | 'full_ungraded';
  payment?: 'paid' | 'verifying';
  review?: { rating: number; comment: string };
}

export const ENROLLMENTS: DemoEnrollment[] = [
  { learner: 'dimas', course: 'utbk-penalaran-matematika', progress: 'full', payment: 'paid', review: { rating: 5, comment: 'Soal-soalnya mirip UTBK asli dan pembahasannya jelas. Skor try out Dimas naik 80 poin.' } },
  { learner: 'alya', course: 'aljabar-dasar-smp', progress: 'partial', payment: 'paid' },
  { learner: 'nadia', course: 'teknik-belajar-efektif', progress: 'none' },
  { learner: 'putri', course: 'python-dari-nol', progress: 'full_ungraded', payment: 'paid' },
  { learner: 'clara', course: 'english-conversation-beginners', progress: 'full', review: { rating: 5, comment: 'Materi ringan tapi sangat terpakai untuk kerja. Dialognya natural.' } },
  { learner: 'arif', course: 'utbk-penalaran-matematika', progress: 'none', payment: 'verifying' },
  { learner: 'kirana', course: 'kimia-stoikiometri', progress: 'partial', payment: 'paid' },
  { learner: 'fajar', course: 'menulis-esai-meyakinkan', progress: 'full', review: { rating: 4, comment: 'Kerangka tiga argumen langsung dipakai Fajar untuk lomba esai sekolah.' } },
  { learner: 'raka', course: 'teknik-belajar-efektif', progress: 'full' },
];

export const QRIS_TEXT = 'LEARNLY-DEMO';
export const BANK_DEMO = { bankName: 'BCA', accountNumber: '1234567890', accountName: 'PT Learnly Demo (rekening contoh)' };
