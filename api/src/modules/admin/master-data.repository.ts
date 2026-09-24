import { prisma } from '../../lib/prisma';
import type { MasterDataKind } from './master-data.schema';

interface MasterDataRow {
  id: bigint;
  name: string;
  slug: string;
}

// Tiga tabel master data berbentuk identik (id, name, slug) → satu repository generik.
interface Delegate {
  findMany(args: object): Promise<MasterDataRow[]>;
  findUnique(args: object): Promise<MasterDataRow | null>;
  create(args: object): Promise<MasterDataRow>;
  update(args: object): Promise<MasterDataRow>;
  delete(args: object): Promise<MasterDataRow>;
}

const delegates: Record<MasterDataKind, Delegate> = {
  subjects: prisma.subject as unknown as Delegate,
  'education-levels': prisma.educationLevel as unknown as Delegate,
  categories: prisma.category as unknown as Delegate,
};

export const masterDataRepository = {
  list(kind: MasterDataKind) {
    return delegates[kind].findMany({ orderBy: { name: 'asc' } });
  },
  findById(kind: MasterDataKind, id: bigint) {
    return delegates[kind].findUnique({ where: { id } });
  },
  findBySlug(kind: MasterDataKind, slug: string) {
    return delegates[kind].findUnique({ where: { slug } });
  },
  create(kind: MasterDataKind, data: { name: string; slug: string }) {
    return delegates[kind].create({ data });
  },
  update(kind: MasterDataKind, id: bigint, data: { name?: string; slug?: string }) {
    return delegates[kind].update({ where: { id }, data });
  },
  /** Jumlah data lain yang memakai item ini (ERD: tutor_subjects dll. CASCADE, jadi harus dicek manual) */
  async countUsage(kind: MasterDataKind, id: bigint): Promise<number> {
    if (kind === 'subjects') {
      const [tutors, bookings] = await Promise.all([
        prisma.tutorSubject.count({ where: { subjectId: id } }),
        prisma.booking.count({ where: { subjectId: id } }),
      ]);
      return tutors + bookings;
    }
    if (kind === 'education-levels') {
      const [tutors, learners, courses] = await Promise.all([
        prisma.tutorEducationLevel.count({ where: { educationLevelId: id } }),
        prisma.learner.count({ where: { educationLevelId: id } }),
        prisma.course.count({ where: { educationLevelId: id } }),
      ]);
      return tutors + learners + courses;
    }
    return prisma.course.count({ where: { categoryId: id } });
  },
  delete(kind: MasterDataKind, id: bigint) {
    return delegates[kind].delete({ where: { id } });
  },
};
