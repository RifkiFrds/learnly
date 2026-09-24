import type { Prisma, UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export const publicUserSelect = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  role: true,
  status: true,
  emailVerifiedAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export const authRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findById(id: bigint) {
    return prisma.user.findUnique({ where: { id } });
  },

  findProfile(id: bigint) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        ...publicUserSelect,
        learners: {
          select: {
            id: true,
            fullName: true,
            isSelf: true,
            dateOfBirth: true,
            educationLevel: { select: { id: true, name: true } },
          },
          orderBy: { id: 'asc' },
        },
        tutorProfile: { select: { id: true, verificationStatus: true, verificationNotes: true } },
      },
    });
  },

  /** Registrasi: user + learner diri sendiri (student) / profil tutor kosong (tutor), atomik. */
  createUser(data: {
    email: string;
    passwordHash: string;
    fullName: string;
    phone?: string;
    role: UserRole;
  }) {
    return prisma.user.create({
      data: {
        ...data,
        learners:
          data.role === 'student'
            ? { create: { fullName: data.fullName, isSelf: true } }
            : undefined,
        tutorProfile: data.role === 'tutor' ? { create: {} } : undefined,
      },
      select: publicUserSelect,
    });
  },

  createRefreshToken(userId: bigint, tokenHash: string, expiresAt: Date) {
    return prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
  },

  findActiveRefreshToken(tokenHash: string) {
    return prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: { select: publicUserSelect } },
    });
  },

  revokeRefreshToken(tokenHash: string) {
    return prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  revokeAllRefreshTokens(userId: bigint) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  updatePassword(userId: bigint, passwordHash: string) {
    return prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  },

  markEmailVerified(userId: bigint) {
    return prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
      select: publicUserSelect,
    });
  },
};
