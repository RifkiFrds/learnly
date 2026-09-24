import type { PayableType, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

type Db = Prisma.TransactionClient | typeof prisma;

const payerSelect = { id: true, fullName: true, email: true, phone: true } as const;

export const paymentRepository = {
  create(db: Db, data: Prisma.PaymentUncheckedCreateInput) {
    return db.payment.create({ data });
  },

  findById(db: Db, id: bigint) {
    return db.payment.findUnique({ where: { id }, include: { user: { select: payerSelect } } });
  },

  /** Pembayaran terbaru untuk satu booking/enrollment (satu payable bisa punya >1 jika dibayar ulang) */
  findLatestForPayable(db: Db, payableType: PayableType, payableId: bigint) {
    return db.payment.findFirst({
      where: { payableType, payableId },
      orderBy: { id: 'desc' },
    });
  },

  findLatestForPayables(payableType: PayableType, payableIds: bigint[]) {
    if (payableIds.length === 0) return Promise.resolve([]);
    return prisma.payment.findMany({
      where: { payableType, payableId: { in: payableIds } },
      orderBy: { id: 'desc' },
    });
  },

  update(db: Db, id: bigint, data: Prisma.PaymentUncheckedUpdateInput) {
    return db.payment.update({ where: { id }, data });
  },

  /** Update bersyarat status (optimistic lock) → mencegah double-approve saat dua admin klik bersamaan */
  updateIfStatus(
    db: Db,
    id: bigint,
    expected: PaymentStatus,
    data: Prisma.PaymentUncheckedUpdateInput,
  ) {
    return db.payment.updateMany({ where: { id, status: expected }, data });
  },

  list(where: Prisma.PaymentWhereInput, skip: number, take: number) {
    return prisma.$transaction([
      prisma.payment.findMany({
        where,
        orderBy: { id: 'desc' },
        skip,
        take,
        include: { user: { select: payerSelect } },
      }),
      prisma.payment.count({ where }),
    ]);
  },

  /** Ringkasan payable untuk ditampilkan bersama pembayaran (booking / enrollment kursus) */
  async loadPayables(payments: { payableType: PayableType; payableId: bigint }[]) {
    const bookingIds = payments.filter((p) => p.payableType === 'booking').map((p) => p.payableId);
    const enrollmentIds = payments
      .filter((p) => p.payableType === 'course_enrollment')
      .map((p) => p.payableId);
    const [bookings, enrollments] = await Promise.all([
      bookingIds.length
        ? prisma.booking.findMany({
            where: { id: { in: bookingIds } },
            select: {
              id: true,
              status: true,
              mode: true,
              scheduledStartAt: true,
              scheduledEndAt: true,
              durationMinutes: true,
              totalAmount: true,
              learner: { select: { id: true, fullName: true } },
              subject: { select: { id: true, name: true } },
              tutorProfile: {
                select: { id: true, userId: true, user: { select: { fullName: true } } },
              },
            },
          })
        : [],
      enrollmentIds.length
        ? prisma.courseEnrollment.findMany({
            where: { id: { in: enrollmentIds } },
            select: {
              id: true,
              status: true,
              learner: { select: { id: true, fullName: true } },
              course: { select: { id: true, title: true, slug: true, price: true } },
            },
          })
        : [],
    ]);
    return {
      bookings: new Map(bookings.map((row) => [row.id, row])),
      enrollments: new Map(enrollments.map((row) => [row.id, row])),
    };
  },

  tutorBookingIds(tutorProfileId: bigint) {
    return prisma.booking
      .findMany({ where: { tutorProfileId }, select: { id: true } })
      .then((rows) => rows.map((row) => row.id));
  },

  findExpiredUnpaid(before: Date) {
    return prisma.payment.findMany({
      where: { status: 'menunggu_pembayaran', createdAt: { lt: before } },
      select: { id: true, payableType: true, payableId: true, userId: true },
    });
  },
};
