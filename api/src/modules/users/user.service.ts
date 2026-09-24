import { Errors } from '../../lib/app-error';
import { dateOnly, stringToDateColumn } from '../../lib/time';
import { hashPassword, verifyPassword } from '../auth/auth.service';
import { userRepository } from './user.repository';
import type {
  AddressBody,
  LearnerBody,
  UpdateAddressBody,
  UpdateLearnerBody,
  UpdateMeBody,
} from './user.schema';

/** DATE dikirim sebagai "YYYY-MM-DD", bukan timestamp */
export function formatLearner<T extends { dateOfBirth: Date | null }>(learner: T) {
  return { ...learner, dateOfBirth: dateOnly(learner.dateOfBirth) };
}

async function assertEducationLevel(id: bigint | null | undefined) {
  if (id && !(await userRepository.educationLevelExists(id))) {
    throw Errors.validation('Jenjang pendidikan tidak ditemukan', [
      { field: 'educationLevelId', message: 'not_found' },
    ]);
  }
}

export const userService = {
  async updateMe(userId: bigint, input: UpdateMeBody) {
    const user = await userRepository.findById(userId);
    if (!user) throw Errors.notFound('Akun tidak ditemukan');

    let passwordHash: string | undefined;
    if (input.newPassword) {
      if (!(await verifyPassword(input.currentPassword ?? '', user.passwordHash))) {
        throw Errors.validation('Password lama salah', [
          { field: 'currentPassword', message: 'invalid' },
        ]);
      }
      passwordHash = await hashPassword(input.newPassword);
    }

    return userRepository.update(userId, {
      fullName: input.fullName,
      phone: input.phone,
      passwordHash,
    });
  },

  // ---- learners (FR-AUTH-06)
  async listLearners(userId: bigint) {
    return (await userRepository.listLearners(userId)).map(formatLearner);
  },

  async createLearner(userId: bigint, input: LearnerBody) {
    await assertEducationLevel(input.educationLevelId);
    const learner = await userRepository.createLearner({
      ownerUserId: userId,
      fullName: input.fullName,
      dateOfBirth: input.dateOfBirth ? stringToDateColumn(input.dateOfBirth) : null,
      educationLevelId: input.educationLevelId ?? null,
      isSelf: false,
    });
    return formatLearner(learner);
  },

  async getOwnedChild(userId: bigint, learnerId: bigint) {
    const learner = await userRepository.findLearner(learnerId);
    if (!learner) throw Errors.notFound('Profil anak tidak ditemukan');
    if (learner.ownerUserId !== userId) throw Errors.forbidden('Profil ini bukan milikmu');
    if (learner.isSelf) throw Errors.businessRule('Profil diri sendiri tidak bisa diubah di sini');
    return learner;
  },

  async updateLearner(userId: bigint, learnerId: bigint, input: UpdateLearnerBody) {
    await this.getOwnedChild(userId, learnerId);
    await assertEducationLevel(input.educationLevelId);
    let dateOfBirth: Date | null | undefined;
    if (input.dateOfBirth !== undefined) {
      dateOfBirth = input.dateOfBirth ? stringToDateColumn(input.dateOfBirth) : null;
    }
    const learner = await userRepository.updateLearner(learnerId, {
      fullName: input.fullName,
      dateOfBirth,
      educationLevelId: input.educationLevelId,
    });
    return formatLearner(learner);
  },

  async deleteLearner(userId: bigint, learnerId: bigint) {
    await this.getOwnedChild(userId, learnerId);
    const [bookings, enrollments] = await userRepository.countLearnerActivity(learnerId);
    if (bookings + enrollments > 0) {
      throw Errors.conflict(
        'Profil anak ini sudah punya riwayat booking/kursus sehingga tidak bisa dihapus',
      );
    }
    await userRepository.deleteLearner(learnerId);
    return { deleted: true };
  },

  // ---- addresses (FR-BOOK-02)
  listAddresses(userId: bigint) {
    return userRepository.listAddresses(userId);
  },

  createAddress(userId: bigint, input: AddressBody) {
    return userRepository.createAddress({ ...input, userId });
  },

  async getOwnedAddress(userId: bigint, addressId: bigint) {
    const address = await userRepository.findAddress(addressId);
    if (!address) throw Errors.notFound('Alamat tidak ditemukan');
    if (address.userId !== userId) throw Errors.forbidden('Alamat ini bukan milikmu');
    return address;
  },

  async updateAddress(userId: bigint, addressId: bigint, input: UpdateAddressBody) {
    await this.getOwnedAddress(userId, addressId);
    return userRepository.updateAddress(addressId, input);
  },

  async deleteAddress(userId: bigint, addressId: bigint) {
    await this.getOwnedAddress(userId, addressId);
    if ((await userRepository.countAddressBookings(addressId)) > 0) {
      throw Errors.conflict('Alamat ini sudah dipakai di booking sehingga tidak bisa dihapus');
    }
    await userRepository.deleteAddress(addressId);
    return { deleted: true };
  },
};
