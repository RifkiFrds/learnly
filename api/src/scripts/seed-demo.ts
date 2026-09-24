import bcrypt from 'bcryptjs';
import type { PrismaClient, TeachingMode } from '@prisma/client';

// Data demo untuk dev lokal (TIDAK dijalankan di production): tutor terverifikasi di beberapa kota
// dan dua kursus terbit, supaya halaman pencarian & katalog FE langsung berisi data.
// Semua akun demo memakai password yang sama: DemoLearnly123

const DEMO_PASSWORD = 'DemoLearnly123';

const TUTORS: {
  email: string;
  fullName: string;
  bio: string;
  hourlyRate: number;
  mode: TeachingMode;
  subjects: string[];
  levels: string[];
  area: { name: string; lat: number; lng: number; radiusKm: number };
}[] = [
  {
    email: 'demo.tutor.budi@learnly.id',
    fullName: 'Budi Hartono',
    bio: 'Guru fisika SMA 8 tahun. Senang menjelaskan konsep lewat eksperimen sederhana di rumah.',
    hourlyRate: 120000,
    mode: 'both',
    subjects: ['fisika', 'matematika'],
    levels: ['smp', 'sma'],
    area: { name: 'Jakarta Selatan', lat: -6.2615, lng: 106.8106, radiusKm: 10 },
  },
  {
    email: 'demo.tutor.dewi@learnly.id',
    fullName: 'Dewi Anggraini',
    bio: 'Lulusan Sastra Inggris UI, pengajar IELTS & conversation untuk pelajar dan pekerja.',
    hourlyRate: 150000,
    mode: 'online',
    subjects: ['bahasa-inggris'],
    levels: ['sma', 'kuliah', 'umum'],
    area: { name: 'Depok', lat: -6.4025, lng: 106.7942, radiusKm: 5 },
  },
  {
    email: 'demo.tutor.fajar@learnly.id',
    fullName: 'Fajar Nugroho',
    bio: 'Mahasiswa Teknik Informatika ITB. Mengajar dasar pemrograman & matematika SD–SMP dengan sabar.',
    hourlyRate: 80000,
    mode: 'tatap_muka',
    subjects: ['pemrograman', 'matematika'],
    levels: ['sd', 'smp'],
    area: { name: 'Bandung', lat: -6.9175, lng: 107.6191, radiusKm: 12 },
  },
];

export async function seedDemo(prisma: PrismaClient, adminId: bigint): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const subjects = new Map((await prisma.subject.findMany()).map((row) => [row.slug, row.id]));
  const levels = new Map((await prisma.educationLevel.findMany()).map((row) => [row.slug, row.id]));
  const categories = new Map((await prisma.category.findMany()).map((row) => [row.slug, row.id]));

  for (const tutor of TUTORS) {
    if (await prisma.user.findUnique({ where: { email: tutor.email } })) continue;
    await prisma.user.create({
      data: {
        email: tutor.email,
        passwordHash,
        fullName: tutor.fullName,
        role: 'tutor',
        emailVerifiedAt: new Date(),
        tutorProfile: {
          create: {
            bio: tutor.bio,
            hourlyRate: tutor.hourlyRate,
            teachingMode: tutor.mode,
            teachingExperienceYears: 5,
            verificationStatus: 'verified',
            subjects: {
              create: tutor.subjects.map((slug) => ({ subjectId: subjects.get(slug)! })),
            },
            educationLevels: {
              create: tutor.levels.map((slug) => ({ educationLevelId: levels.get(slug)! })),
            },
            serviceAreas: {
              create: [
                {
                  areaType: 'radius',
                  areaName: tutor.area.name,
                  centerLatitude: tutor.area.lat,
                  centerLongitude: tutor.area.lng,
                  radiusKm: tutor.area.radiusKm,
                },
              ],
            },
            availabilities: {
              create: [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
                dayOfWeek,
                startTime: new Date('1970-01-01T13:00:00.000Z'),
                endTime: new Date('1970-01-01T20:00:00.000Z'),
              })),
            },
          },
        },
      },
    });
  }

  const courses = [
    {
      slug: 'demo-tips-belajar-efektif',
      title: 'Tips Belajar Efektif untuk Pelajar',
      isFree: true,
      price: 0,
      category: 'pengembangan-diri',
      lessons: [
        {
          title: 'Teknik Pomodoro',
          type: 'article' as const,
          contentBody: 'Belajar fokus 25 menit, istirahat 5 menit, ulangi 4 kali.',
        },
        {
          title: 'Membuat catatan Cornell',
          type: 'video' as const,
          contentUrl: 'https://example.com/video/catatan-cornell.mp4',
        },
      ],
    },
    {
      slug: 'demo-persiapan-utbk-penalaran-matematika',
      title: 'Persiapan UTBK: Penalaran Matematika',
      isFree: false,
      price: 199000,
      category: 'persiapan-ujian',
      lessons: [
        {
          title: 'Pola bilangan & barisan',
          type: 'article' as const,
          contentBody: 'Kenali pola aritmetika dan geometri yang sering muncul di UTBK.',
        },
        {
          title: 'Pembahasan soal perbandingan',
          type: 'video' as const,
          contentUrl: 'https://example.com/video/utbk-perbandingan.mp4',
        },
      ],
    },
  ];
  for (const course of courses) {
    if (await prisma.course.findUnique({ where: { slug: course.slug } })) continue;
    await prisma.course.create({
      data: {
        slug: course.slug,
        title: course.title,
        description: 'Kursus demo untuk pengembangan frontend.',
        categoryId: categories.get(course.category)!,
        level: 'pemula',
        isFree: course.isFree,
        price: course.price,
        status: 'published',
        issuesCertificate: true,
        createdByUserId: adminId,
        modules: {
          create: [
            {
              title: 'Modul 1',
              orderIndex: 0,
              lessons: {
                create: course.lessons.map((lesson, index) => ({ ...lesson, orderIndex: index })),
              },
            },
          ],
        },
      },
    });
  }

  console.log(
    `[seed] demo: ${TUTORS.length} tutor terverifikasi (password ${DEMO_PASSWORD}), ${courses.length} kursus terbit`,
  );
}
