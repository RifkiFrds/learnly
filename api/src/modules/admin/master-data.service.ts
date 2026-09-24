import { Errors } from '../../lib/app-error';
import { slugify } from '../../lib/slug';
import { masterDataRepository } from './master-data.repository';
import type {
  CreateMasterDataBody,
  MasterDataKind,
  UpdateMasterDataBody,
} from './master-data.schema';

const LABEL: Record<MasterDataKind, string> = {
  subjects: 'Mata pelajaran',
  'education-levels': 'Jenjang pendidikan',
  categories: 'Kategori',
};

async function assertSlugFree(kind: MasterDataKind, slug: string, exceptId?: bigint) {
  const existing = await masterDataRepository.findBySlug(kind, slug);
  if (existing && existing.id !== exceptId) {
    throw Errors.conflict(`${LABEL[kind]} dengan slug "${slug}" sudah ada`);
  }
}

// FR-ADMIN-03: CRUD master data
export const masterDataService = {
  list(kind: MasterDataKind) {
    return masterDataRepository.list(kind);
  },

  async create(kind: MasterDataKind, input: CreateMasterDataBody) {
    const slug = input.slug ?? slugify(input.name);
    if (!slug) throw Errors.validation('Nama tidak bisa dijadikan slug');
    await assertSlugFree(kind, slug);
    return masterDataRepository.create(kind, { name: input.name, slug });
  },

  async update(kind: MasterDataKind, id: bigint, input: UpdateMasterDataBody) {
    if (!(await masterDataRepository.findById(kind, id))) {
      throw Errors.notFound(`${LABEL[kind]} tidak ditemukan`);
    }
    if (input.slug) await assertSlugFree(kind, input.slug, id);
    return masterDataRepository.update(kind, id, input);
  },

  async remove(kind: MasterDataKind, id: bigint) {
    if (!(await masterDataRepository.findById(kind, id))) {
      throw Errors.notFound(`${LABEL[kind]} tidak ditemukan`);
    }
    // Dicek eksplisit: relasi tutor_subjects/tutor_education_levels ber-CASCADE di DB,
    // sehingga tanpa cek ini menghapus mapel diam-diam menghapus mapel dari profil tutor.
    const usage = await masterDataRepository.countUsage(kind, id);
    if (usage > 0) {
      throw Errors.conflict(
        `${LABEL[kind]} ini masih dipakai oleh ${usage} data (tutor/booking/kursus/siswa) sehingga tidak bisa dihapus`,
      );
    }
    await masterDataRepository.delete(kind, id);
    return { deleted: true };
  },
};
