import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { publicUserSelect } from '../auth/auth.repository';

const learnerInclude = {
  educationLevel: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.LearnerInclude;

export const userRepository = {
  findById(id: bigint) {
    return prisma.user.findUnique({ where: { id } });
  },

  update(id: bigint, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id }, data, select: publicUserSelect });
  },

  // ---- learners
  listLearners(ownerUserId: bigint) {
    return prisma.learner.findMany({
      where: { ownerUserId },
      include: learnerInclude,
      orderBy: [{ isSelf: 'desc' }, { id: 'asc' }],
    });
  },

  findLearner(id: bigint) {
    return prisma.learner.findUnique({ where: { id }, include: learnerInclude });
  },

  createLearner(data: Prisma.LearnerUncheckedCreateInput) {
    return prisma.learner.create({ data, include: learnerInclude });
  },

  updateLearner(id: bigint, data: Prisma.LearnerUncheckedUpdateInput) {
    return prisma.learner.update({ where: { id }, data, include: learnerInclude });
  },

  countLearnerActivity(id: bigint) {
    return Promise.all([
      prisma.booking.count({ where: { learnerId: id } }),
      prisma.courseEnrollment.count({ where: { learnerId: id } }),
    ]);
  },

  deleteLearner(id: bigint) {
    return prisma.learner.delete({ where: { id } });
  },

  educationLevelExists(id: bigint) {
    return prisma.educationLevel.count({ where: { id } }).then((count) => count > 0);
  },

  // ---- addresses
  listAddresses(userId: bigint) {
    return prisma.address.findMany({ where: { userId }, orderBy: { id: 'desc' } });
  },

  findAddress(id: bigint) {
    return prisma.address.findUnique({ where: { id } });
  },

  createAddress(data: Prisma.AddressUncheckedCreateInput) {
    return prisma.address.create({ data });
  },

  updateAddress(id: bigint, data: Prisma.AddressUncheckedUpdateInput) {
    return prisma.address.update({ where: { id }, data });
  },

  countAddressBookings(id: bigint) {
    return prisma.booking.count({ where: { addressId: id } });
  },

  deleteAddress(id: bigint) {
    return prisma.address.delete({ where: { id } });
  },
};
