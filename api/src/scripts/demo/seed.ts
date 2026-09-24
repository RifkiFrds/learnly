/**
 * Isi database dengan data demo realistis (lihat data.ts). Dipanggil oleh demo-seed.ts.
 * Semua waktu relatif terhadap saat seeding, supaya jadwal mendatang selalu ada.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import type { BookingStatus, Prisma, PrismaClient } from '@prisma/client';
import { uploadFile } from '../../lib/storage';
import { refreshProgress } from '../../modules/courses/enrollment.service';
import { reviewRepository } from '../../modules/reviews/review.repository';
import {
  ACCOUNTS,
  BANK_DEMO,
  BOOKINGS,
  CITIES,
  COURSES,
  DEMO_DOMAIN,
  DEMO_PASSWORD,
  DEMO_SERVICE_FEE,
  demoEmail,
  ENROLLMENTS,
  EXTRA_SUBJECTS,
  TUTORS,
} from './data';
import { SUBMISSIONS } from './content';
import { bookingPrice, courseBySlug, hasPayment, hasProof, learnerIndex, roundedFromNow, tutorByKey, wib } from './derived';

export const SEED_ASSETS_DIR = path.resolve(__dirname, '../../../seed-assets');

const MIME: Record<string, string> = { '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.png': 'image/png' };
const HOUR = 3_600_000;
const MINUTE = 60_000;
const minutesAfter = (date: Date, minutes: number) => new Date(date.getTime() + minutes * MINUTE);
const time = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);
const num = (id: bigint) => Number(id);

async function asset(relative: string, folder: string, isPrivate = false): Promise<string> {
  const buffer = await fs.readFile(path.join(SEED_ASSETS_DIR, relative));
  return uploadFile({ buffer, mimeType: MIME[path.extname(relative)] ?? 'application/octet-stream' }, { folder, isPrivate });
}

/** Hapus data demo lama (akun @demo.learnly.id, kursus demo, dan semua transaksi yang terkait) */
export async function purgeDemo(prisma: PrismaClient) {
  const users = await prisma.user.findMany({ where: { email: { endsWith: `@${DEMO_DOMAIN}` } }, select: { id: true } });
  const userIds = users.map((u) => u.id);
  const learners = await prisma.learner.findMany({ where: { ownerUserId: { in: userIds } }, select: { id: true } });
  const learnerIds = learners.map((l) => l.id);
  const tutors = await prisma.tutorProfile.findMany({ where: { userId: { in: userIds } }, select: { id: true } });
  const tutorIds = tutors.map((t) => t.id);
  const courses = await prisma.course.findMany({
    where: { OR: [{ slug: { in: COURSES.map((c) => c.slug) } }, { createdByUserId: { in: userIds } }] },
    select: { id: true },
  });
  const courseIds = courses.map((c) => c.id);
  const bookings = await prisma.booking.findMany({
    where: { OR: [{ learnerId: { in: learnerIds } }, { tutorProfileId: { in: tutorIds } }] },
    select: { id: true },
  });
  const bookingIds = bookings.map((b) => b.id);
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { OR: [{ learnerId: { in: learnerIds } }, { courseId: { in: courseIds } }] },
    select: { id: true },
  });
  const enrollmentIds = enrollments.map((e) => e.id);

  await prisma.review.deleteMany({
    where: {
      OR: [
        { reviewerUserId: { in: userIds } },
        { reviewableType: 'tutor_booking', reviewableId: { in: bookingIds } },
        { reviewableType: 'course', reviewableId: { in: courseIds } },
      ],
    },
  });
  await prisma.payment.deleteMany({
    where: {
      OR: [
        { userId: { in: userIds } },
        { payableType: 'booking', payableId: { in: bookingIds } },
        { payableType: 'course_enrollment', payableId: { in: enrollmentIds } },
      ],
    },
  });
  await prisma.payment.updateMany({ where: { verifiedByUserId: { in: userIds } }, data: { verifiedByUserId: null } });
  await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
  await prisma.courseEnrollment.deleteMany({ where: { id: { in: enrollmentIds } } });
  await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  return { users: userIds.length, bookings: bookingIds.length, courses: courseIds.length };
}


export async function seedDemo(prisma: PrismaClient) {
  const now = new Date();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // ---------- master data & pengaturan ----------
  for (const [name, slug] of EXTRA_SUBJECTS) {
    await prisma.subject.upsert({ where: { slug }, create: { name, slug }, update: { name } });
  }
  const subjectId = new Map((await prisma.subject.findMany()).map((row) => [row.slug, row.id]));
  const subjectName = new Map((await prisma.subject.findMany()).map((row) => [row.slug, row.name]));
  const levelId = new Map((await prisma.educationLevel.findMany()).map((row) => [row.slug, row.id]));
  const categoryId = new Map((await prisma.category.findMany()).map((row) => [row.slug, row.id]));

  const qrisUrl = await asset('qris/qris-contoh.svg', 'settings');
  const settings: Record<string, unknown> = {
    service_fee: { type: 'flat', value: DEMO_SERVICE_FEE },
    cancellation_policy: { freeCancelHours: 24, lateRefundPercent: 50 },
    booking_response_hours: 24,
    payment_window_hours: 24,
    default_passing_grade: 70,
    review_edit_days: 7,
    meeting_link_visible_hours: 24,
    qris_image_url: qrisUrl,
    bank_transfer: BANK_DEMO,
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.platformSetting.upsert({ where: { key }, create: { key, value: value as Prisma.InputJsonValue }, update: { value: value as Prisma.InputJsonValue } });
  }

  // ---------- admin demo ----------
  const admin = await prisma.user.create({
    data: { email: demoEmail('admin'), passwordHash, fullName: 'Nadia Admin Learnly', phone: '081100000001', role: 'admin', emailVerifiedAt: now, createdAt: new Date(now.getTime() - 200 * 24 * HOUR) },
  });

  // ---------- tutor ----------
  const tutorProfileId = new Map<string, bigint>();
  const tutorUserId = new Map<string, bigint>();
  for (const [index, tutor] of TUTORS.entries()) {
    const city = CITIES[tutor.city];
    const joined = new Date(now.getTime() - (150 - index * 7) * 24 * HOUR);
    const certifications = [];
    for (const doc of tutor.documents) {
      certifications.push({
        title: doc.title,
        issuer: doc.issuer,
        issuedAt: new Date(doc.issuedAt),
        fileUrl: await asset(`documents/${tutor.key}-${doc.kind}.pdf`, 'tutor-documents', true),
      });
    }
    const user = await prisma.user.create({
      data: {
        email: demoEmail(tutor.key),
        passwordHash,
        fullName: tutor.fullName,
        phone: tutor.phone,
        role: 'tutor',
        emailVerifiedAt: joined,
        createdAt: joined,
        tutorProfile: {
          create: {
            bio: tutor.bio,
            educationBackground: tutor.education,
            teachingExperienceYears: tutor.experienceYears,
            curriculum: tutor.curriculum,
            hourlyRate: tutor.hourlyRate,
            teachingMode: tutor.mode,
            verificationStatus: tutor.status,
            verificationNotes: tutor.verificationNotes ?? null,
            autoAccept: tutor.autoAccept ?? false,
            createdAt: joined,
            subjects: { create: tutor.subjects.map((slug) => ({ subjectId: subjectId.get(slug)! })) },
            educationLevels: { create: tutor.levels.map((slug) => ({ educationLevelId: levelId.get(slug)! })) },
            serviceAreas: {
              create:
                tutor.mode === 'online'
                  ? []
                  : [
                      { areaType: 'radius' as const, areaName: city.name, centerLatitude: city.lat, centerLongitude: city.lng, radiusKm: tutor.radiusKm },
                      ...(tutor.extraArea ? [{ areaType: 'area_name' as const, areaName: tutor.extraArea }] : []),
                    ],
            },
            availabilities: { create: tutor.schedule.map(([dayOfWeek, start, end]) => ({ dayOfWeek, startTime: time(start), endTime: time(end) })) },
            certifications: { create: certifications },
            blockedDates: {
              create: tutor.status === 'verified' && index % 3 === 0 ? [{ blockedDate: wib(9, '12:00', now), reason: 'Mengawas ujian sekolah' }] : [],
            },
          },
        },
      },
      include: { tutorProfile: true },
    });
    tutorProfileId.set(tutor.key, user.tutorProfile!.id);
    tutorUserId.set(tutor.key, user.id);
  }

  // ---------- keluarga & siswa ----------
  const accountUserId = new Map<string, bigint>();
  const addressId = new Map<string, bigint>();
  const learnerId = new Map<string, bigint>();
  for (const [index, account] of ACCOUNTS.entries()) {
    const joined = new Date(now.getTime() - (90 - index * 6) * 24 * HOUR);
    const user = await prisma.user.create({
      data: {
        email: demoEmail(account.key),
        passwordHash,
        fullName: account.fullName,
        phone: account.phone,
        role: account.role,
        emailVerifiedAt: joined,
        createdAt: joined,
        addresses: { create: [{ label: account.address.label, fullAddress: account.address.fullAddress, detailNote: account.address.detailNote, latitude: account.address.lat, longitude: account.address.lng }] },
        learners: {
          create:
            account.role === 'student'
              ? [{ fullName: account.fullName, isSelf: true, dateOfBirth: new Date(account.self!.birth), educationLevelId: levelId.get(account.self!.level) }]
              : account.children!.map((child) => ({ fullName: child.fullName, dateOfBirth: new Date(child.birth), educationLevelId: levelId.get(child.level) })),
        },
      },
      include: { learners: true, addresses: true },
    });
    accountUserId.set(account.key, user.id);
    addressId.set(account.key, user.addresses[0].id);
    if (account.role === 'student') learnerId.set(account.key, user.learners[0].id);
    for (const child of account.children ?? []) learnerId.set(child.key, user.learners.find((l) => l.fullName === child.fullName)!.id);
  }

  // ---------- kursus ----------
  const courseId = new Map<string, bigint>();
  for (const [index, course] of COURSES.entries()) {
    const created = new Date(now.getTime() - (120 - index * 8) * 24 * HOUR);
    const thumbnailUrl = await asset(`covers/${course.slug}.svg`, 'course-thumbnails');
    const modules = [];
    for (const [mi, mod] of course.modules.entries()) {
      const lessons = [];
      for (const [li, lesson] of mod.lessons.entries()) {
        if (lesson.type === 'article') {
          lessons.push({
            title: lesson.title,
            type: 'article' as const,
            contentBody: lesson.body,
            contentUrl: lesson.pdf ? await asset(`lessons/${lesson.pdf}.pdf`, 'lesson-materials') : null,
            durationSeconds: lesson.minutes ? lesson.minutes * 60 : null,
            orderIndex: li,
          });
        } else if (lesson.type === 'quiz') {
          lessons.push({
            title: lesson.title,
            type: 'quiz' as const,
            orderIndex: li,
            quizQuestions: {
              create: lesson.questions.map((question, qi) => ({
                questionText: question.q,
                orderIndex: qi,
                options: { create: question.options.map((optionText, oi) => ({ optionText, isCorrect: oi === question.correct })) },
              })),
            },
          });
        } else {
          lessons.push({ title: lesson.title, type: 'assignment' as const, contentBody: lesson.body, orderIndex: li });
        }
      }
      modules.push({ title: mod.title, orderIndex: mi, lessons: { create: lessons } });
    }
    const row = await prisma.course.create({
      data: {
        slug: course.slug,
        title: course.title,
        description: course.description,
        categoryId: categoryId.get(course.category)!,
        educationLevelId: course.educationLevel ? levelId.get(course.educationLevel) : null,
        level: course.level,
        price: course.price,
        isFree: course.price === 0,
        thumbnailUrl,
        status: course.status,
        passingGrade: course.passingGrade,
        issuesCertificate: course.issuesCertificate,
        createdByUserId: admin.id,
        createdAt: created,
        modules: { create: modules },
      },
    });
    courseId.set(course.slug, row.id);
    if (course.rejectedNotes) {
      await prisma.notification.create({
        data: { userId: admin.id, type: 'course_rejected', title: 'Kursus perlu diperbaiki sebelum terbit', body: `Catatan reviewer untuk "${course.title}": ${course.rejectedNotes}`, data: { courseId: num(row.id) }, createdAt: new Date(now.getTime() - 2 * 24 * HOUR), readAt: new Date(now.getTime() - 2 * 24 * HOUR + HOUR) },
      });
    }
    if (course.status === 'in_review') {
      await prisma.notification.create({
        data: { userId: admin.id, type: 'course_submitted', title: 'Kursus baru menunggu review', body: `"${course.title}" diajukan untuk dipublikasikan.`, data: { courseId: num(row.id) }, createdAt: new Date(now.getTime() - 5 * HOUR) },
      });
    }
  }

  // ---------- booking & pembayaran ----------
  const counts: Record<string, number> = {};
  const tutorsToRecalc = new Set<bigint>();
  let pendingIndex = 0;
  const notify = (userId: bigint, type: string, title: string, body: string, data: Record<string, number>, createdAt: Date, read = true) =>
    prisma.notification.create({ data: { userId, type, title, body, data, createdAt, readAt: read ? minutesAfter(createdAt, 45) : null } });

  for (const booking of BOOKINGS) {
    const learner = learnerIndex.get(booking.learner)!;
    const tutor = tutorByKey.get(booking.tutor)!;
    const ownerId = accountUserId.get(learner.account.key)!;
    const tutorUser = tutorUserId.get(booking.tutor)!;
    const start = booking.minutesFromNow !== undefined ? roundedFromNow(booking.minutesFromNow, now) : wib(booking.day!, booking.time!, now);
    const end = minutesAfter(start, booking.duration);
    const price = bookingPrice(booking);
    const past = booking.state.kind === 'completed';
    // pending < 24 jam (belum auto-batal); tagihan aktif < window bayar; sisanya cukup lama agar urutan terima→bayar→verifikasi→batal konsisten
    const createdAt = past
      ? new Date(start.getTime() - 3 * 24 * HOUR)
      : booking.state.kind === 'pending_confirmation'
        ? new Date(now.getTime() - (1 + (pendingIndex++ % 3)) * HOUR)
        : ['awaiting_payment', 'verifying'].includes(booking.state.kind)
          ? new Date(now.getTime() - 5 * HOUR)
          : new Date(now.getTime() - 30 * HOUR);
    const accepted = minutesAfter(createdAt, 95);
    const submitted = minutesAfter(accepted, 110);
    const verified = minutesAfter(submitted, 140);
    const subject = subjectName.get(booking.subject)!;
    const learnerFirst = learner.fullName.split(' ')[0];

    const history: { status: BookingStatus; at: Date; by: bigint | null }[] = [{ status: 'pending_confirmation', at: createdAt, by: ownerId }];
    let status: BookingStatus = 'pending_confirmation';
    const push = (next: BookingStatus, at: Date, by: bigint | null) => {
      history.push({ status: next, at, by });
      status = next;
    };
    const data: Prisma.BookingUncheckedCreateInput = {
      learnerId: learnerId.get(booking.learner)!,
      tutorProfileId: tutorProfileId.get(booking.tutor)!,
      subjectId: subjectId.get(booking.subject)!,
      mode: booking.mode,
      scheduledStartAt: start,
      scheduledEndAt: end,
      durationMinutes: booking.duration,
      addressId: booking.mode === 'tatap_muka' ? addressId.get(learner.account.key)! : null,
      hourlyRateSnapshot: tutor.hourlyRate,
      serviceFee: price.serviceFee,
      totalAmount: price.total,
      createdAt,
    };

    const state = booking.state;
    const travel = (arrive: Date) => {
      if (booking.mode !== 'tatap_muka') return;
      push('tutor_bersiap', minutesAfter(arrive, -55), tutorUser);
      push('tutor_dalam_perjalanan', minutesAfter(arrive, -40), tutorUser);
      push('tutor_tiba', minutesAfter(arrive, -3), tutorUser);
    };
    if (state.kind === 'rejected') {
      push('rejected', minutesAfter(createdAt, 70), tutorUser);
      data.cancelReason = state.reason;
      data.cancelledBy = 'tutor';
    }
    if (hasPayment(booking)) push('menunggu_pembayaran', accepted, tutorUser);
    const paid = ['completed', 'confirmed', 'traveling', 'in_session', 'cancelled_refunded', 'cancelled_refund_pending'].includes(state.kind);
    if (paid) push('dikonfirmasi', verified, admin.id);
    if (state.kind === 'completed') {
      travel(start);
      push('sesi_berlangsung', start, tutorUser);
      push('sesi_selesai', end, tutorUser);
      data.checkedInAt = start;
      data.checkedOutAt = minutesAfter(end, 4);
      if (booking.mode === 'online') data.meetingLink = `https://meet.google.com/lrn-${booking.key}-demo`;
    }
    if (state.kind === 'confirmed' && state.meetingLink) data.meetingLink = state.meetingLink;
    if (state.kind === 'traveling') {
      push('tutor_bersiap', new Date(now.getTime() - 35 * MINUTE), tutorUser);
      push('tutor_dalam_perjalanan', new Date(now.getTime() - 15 * MINUTE), tutorUser);
    }
    if (state.kind === 'in_session') {
      push('sesi_berlangsung', start, tutorUser);
      data.checkedInAt = start;
      data.meetingLink = state.meetingLink ?? null;
    }
    if (state.kind === 'cancelled_refunded' || state.kind === 'cancelled_refund_pending') {
      const by = state.kind === 'cancelled_refund_pending' ? state.by : 'student';
      push('dibatalkan', new Date(now.getTime() - 20 * HOUR), by === 'tutor' ? tutorUser : ownerId);
      data.cancelReason = state.reason;
      data.cancelledBy = by;
    }
    if (state.kind === 'payment_rejected') {
      push('dibatalkan', verified, admin.id);
      data.cancelReason = `Pembayaran ditolak: ${state.reason}`;
      data.cancelledBy = 'system';
    }
    data.status = status;
    counts[status] = (counts[status] ?? 0) + 1;

    const row = await prisma.booking.create({
      data: { ...data, statusHistory: { create: history.map((entry) => ({ status: entry.status, changedAt: entry.at, changedByUserId: entry.by })) } },
    });
    const bookingIdNum = num(row.id);

    // tagihan
    if (hasPayment(booking)) {
      const proof = hasProof(booking) ? await asset(`receipts/struk-${booking.key}.svg`, 'payment-proofs', true) : null;
      const payment: Prisma.PaymentUncheckedCreateInput = {
        payableType: 'booking',
        payableId: row.id,
        userId: ownerId,
        amount: price.total,
        method: booking.key.charCodeAt(2) % 2 ? 'qris' : 'transfer_manual',
        proofImageUrl: proof,
        status: 'menunggu_pembayaran',
        createdAt: accepted,
      };
      if (state.kind === 'verifying') {
        payment.status = 'menunggu_verifikasi';
        payment.submittedAt = new Date(now.getTime() - 70 * MINUTE);
      }
      if (paid) Object.assign(payment, { status: 'paid', submittedAt: submitted, verifiedByUserId: admin.id, verifiedAt: verified, paidAt: verified });
      if (state.kind === 'cancelled_refunded') Object.assign(payment, { status: 'refunded', refundAmount: price.total, refundNote: state.refundNote, refundedAt: new Date(now.getTime() - 4 * HOUR) });
      if (state.kind === 'cancelled_refund_pending') payment.refundAmount = price.total;
      if (state.kind === 'payment_rejected') Object.assign(payment, { status: 'ditolak', submittedAt: submitted, verifiedByUserId: admin.id, verifiedAt: verified, rejectionReason: state.reason });
      const pay = await prisma.payment.create({ data: payment });
      const paymentId = num(pay.id);

      if (state.kind === 'awaiting_payment') await notify(ownerId, 'booking_accepted', 'Booking diterima tutor', `${tutor.fullName} menerima sesi ${subject} untuk ${learnerFirst}. Selesaikan pembayaran dalam 24 jam.`, { bookingId: bookingIdNum, paymentId }, accepted, false);
      if (state.kind === 'verifying') await notify(admin.id, 'payment_proof_submitted', 'Bukti bayar baru perlu diverifikasi', `${learner.account.fullName} mengunggah bukti transfer ${price.total.toLocaleString('id-ID')} untuk les ${subject}.`, { paymentId, bookingId: bookingIdNum }, payment.submittedAt as Date, false);
      if (paid) await notify(ownerId, 'payment_approved', 'Pembayaran terverifikasi', `Sesi ${subject} ${learnerFirst} bersama ${tutor.fullName} sudah dikonfirmasi.`, { bookingId: bookingIdNum, paymentId }, verified, state.kind === 'completed');
      if (state.kind === 'payment_rejected') await notify(ownerId, 'payment_rejected', 'Pembayaran ditolak', state.reason, { bookingId: bookingIdNum, paymentId }, verified, false);
      if (state.kind === 'cancelled_refunded') await notify(ownerId, 'payment_refunded', 'Dana sudah dikembalikan', `Refund Rp${price.total.toLocaleString('id-ID')} sudah ditransfer. ${state.refundNote}`, { paymentId }, payment.refundedAt as Date, false);
      if (state.kind === 'cancelled_refund_pending') {
        await notify(ownerId, 'booking_cancelled', 'Tutor membatalkan sesi', `${tutor.fullName} membatalkan sesi ${subject}: ${state.reason} Dana dikembalikan penuh oleh tim Learnly.`, { bookingId: bookingIdNum }, new Date(now.getTime() - 20 * HOUR), false);
        await notify(admin.id, 'refund_required', 'Refund perlu ditransfer', `Booking ${subject} ${learnerFirst} dibatalkan tutor. Transfer refund Rp${price.total.toLocaleString('id-ID')} lalu catat di Dispute.`, { bookingId: bookingIdNum, paymentId }, new Date(now.getTime() - 20 * HOUR), false);
      }
    }
    if (state.kind === 'pending_confirmation') await notify(tutorUser, 'booking_created', 'Permintaan booking baru', `${learner.account.fullName} memesan sesi ${subject} untuk ${learnerFirst}. Terima atau tolak dalam 24 jam.`, { bookingId: bookingIdNum }, createdAt, false);
    if (state.kind === 'rejected') await notify(ownerId, 'booking_rejected', 'Booking ditolak tutor', `${tutor.fullName}: ${state.reason}`, { bookingId: bookingIdNum }, minutesAfter(createdAt, 70), false);
    if (state.kind === 'traveling') {
      await notify(ownerId, 'booking_status_changed', 'Tutor dalam perjalanan', `${tutor.fullName} sedang menuju lokasi belajar ${learnerFirst}.`, { bookingId: bookingIdNum }, new Date(now.getTime() - 15 * MINUTE), false);
      const address = learner.account.address;
      const city = CITIES[tutor.city];
      for (const [i, factor] of [0.25, 0.55, 0.8].entries()) {
        await prisma.tutorLocation.create({
          data: { bookingId: row.id, latitude: city.lat + (address.lat - city.lat) * factor, longitude: city.lng + (address.lng - city.lng) * factor, recordedAt: new Date(now.getTime() - (12 - i * 5) * MINUTE) },
        });
      }
    }
    if (state.kind === 'completed') {
      await prisma.progressReport.create({
        data: {
          bookingId: row.id,
          materialsCovered: state.report.materials,
          understandingLevel: state.report.level,
          masteredSkills: state.report.mastered ?? null,
          areasToImprove: state.report.improve ?? null,
          homeworkGiven: state.report.homework ?? null,
          recommendationNotes: state.report.recommendation ?? null,
          createdAt: minutesAfter(end, 4),
        },
      });
      await notify(ownerId, 'progress_report_ready', 'Laporan sesi sudah tersedia', `${tutor.fullName} mengirim laporan sesi ${subject} ${learnerFirst}.`, { bookingId: bookingIdNum }, minutesAfter(end, 5), booking.day! < -5);
      if (state.review) {
        const reviewAt = minutesAfter(end, 180);
        const review = await prisma.review.create({
          data: {
            reviewableType: 'tutor_booking',
            reviewableId: row.id,
            reviewerUserId: ownerId,
            rating: state.review.rating,
            comment: state.review.comment,
            replyText: state.review.reply ?? null,
            repliedAt: state.review.reply ? minutesAfter(reviewAt, 300) : null,
            isHidden: Boolean(state.review.hidden),
            createdAt: reviewAt,
          },
        });
        await notify(tutorUser, 'review_received', `Ulasan baru ★${state.review.rating}`, `"${state.review.comment.slice(0, 120)}"`, { reviewId: num(review.id), bookingId: bookingIdNum }, reviewAt, true);
        if (state.review.reply) await notify(ownerId, 'review_replied', 'Tutor membalas ulasanmu', `"${state.review.reply.slice(0, 120)}"`, { reviewId: num(review.id), bookingId: bookingIdNum }, minutesAfter(reviewAt, 300), booking.day! < -10);
        if (state.review.hidden) await notify(ownerId, 'review_hidden', 'Ulasanmu disembunyikan', `Alasan: ${state.review.hidden}`, { reviewId: num(review.id) }, minutesAfter(reviewAt, 600), true);
      }
      tutorsToRecalc.add(tutorProfileId.get(booking.tutor)!);
    }
  }
  for (const id of tutorsToRecalc) await reviewRepository.recalcTutor(prisma, id);

  // ---------- enrollment kursus ----------
  const enrollmentStats = { none: 0, partial: 0, full: 0, certificates: 0 };
  for (const [index, spec] of ENROLLMENTS.entries()) {
    const course = courseBySlug.get(spec.course)!;
    const learner = learnerIndex.get(spec.learner)!;
    const ownerId = accountUserId.get(learner.account.key)!;
    const enrolledAt = new Date(now.getTime() - (30 - index * 2) * 24 * HOUR);
    const enrollment = await prisma.courseEnrollment.create({
      data: { courseId: courseId.get(course.slug)!, learnerId: learnerId.get(spec.learner)!, enrolledAt },
    });
    if (spec.payment) {
      const verifying = spec.payment === 'verifying';
      const submittedAt = verifying ? new Date(now.getTime() - 40 * MINUTE) : minutesAfter(enrolledAt, 60);
      const pay = await prisma.payment.create({
        data: {
          payableType: 'course_enrollment',
          payableId: enrollment.id,
          userId: ownerId,
          amount: course.price,
          method: 'qris',
          proofImageUrl: await asset(`receipts/struk-kursus-${spec.learner}-${course.slug}.svg`, 'payment-proofs', true),
          status: verifying ? 'menunggu_verifikasi' : 'paid',
          submittedAt,
          createdAt: verifying ? new Date(now.getTime() - 2 * HOUR) : enrolledAt,
          ...(verifying ? {} : { verifiedByUserId: admin.id, verifiedAt: minutesAfter(submittedAt, 90), paidAt: minutesAfter(submittedAt, 90) }),
        },
      });
      if (verifying) await notify(admin.id, 'payment_proof_submitted', 'Bukti bayar kursus perlu diverifikasi', `${learner.account.fullName} membayar kursus "${course.title}".`, { paymentId: num(pay.id), enrollmentId: num(enrollment.id) }, submittedAt, false);
    }

    const full = await prisma.courseEnrollment.findUniqueOrThrow({
      where: { id: enrollment.id },
      include: { course: { include: { modules: { include: { lessons: { orderBy: { orderIndex: 'asc' } } }, orderBy: { orderIndex: 'asc' } } } } },
    });
    const lessons = full.course.modules.flatMap((mod) => mod.lessons);
    const upto = spec.progress === 'none' ? 0 : spec.progress === 'partial' ? Math.ceil(lessons.length / 2) : lessons.length;
    for (const [li, lesson] of lessons.slice(0, upto).entries()) {
      const at = minutesAfter(enrolledAt, 60 * 24 * Math.min(li, 12) + 180);
      if (lesson.type === 'quiz') {
        if (li % 2 === 0) await prisma.quizAttempt.create({ data: { enrollmentId: enrollment.id, lessonId: lesson.id, score: 50, passed: false, attemptedAt: minutesAfter(at, -20) } });
        await prisma.quizAttempt.create({ data: { enrollmentId: enrollment.id, lessonId: lesson.id, score: 100, passed: true, attemptedAt: at } });
      }
      if (lesson.type === 'assignment') {
        const sample = SUBMISSIONS[`${spec.learner}-${course.slug}`] ? `submissions/${spec.learner}-${course.slug}.pdf` : null;
        if (!sample) continue; // tanpa contoh file: biarkan tugas belum dikerjakan
        const graded = spec.progress === 'full';
        await prisma.assignmentSubmission.create({
          data: {
            enrollmentId: enrollment.id,
            lessonId: lesson.id,
            fileUrl: await asset(sample, 'assignments', true),
            submittedAt: at,
            ...(graded ? { score: 88, feedback: 'Struktur rapi dan sesuai instruksi. Pertahankan, dan perhatikan detail kecil di bagian akhir.', gradedByUserId: admin.id, gradedAt: minutesAfter(at, 1440) } : {}),
          },
        });
        if (!graded) await notify(admin.id, 'assignment_submitted', 'Tugas baru perlu dinilai', `${learner.fullName} mengumpulkan "${lesson.title}" di kursus "${course.title}".`, { courseId: num(full.courseId) }, at, false);
      }
      await prisma.lessonProgress.create({ data: { enrollmentId: enrollment.id, lessonId: lesson.id, status: 'completed', completedAt: at } });
    }
    await refreshProgress(enrollment.id); // hitung progres, tandai selesai, terbitkan sertifikat (logika produksi)
    const after = await prisma.courseEnrollment.findUniqueOrThrow({ where: { id: enrollment.id }, include: { certificate: true } });
    if (after.certificate) enrollmentStats.certificates += 1;
    enrollmentStats[spec.progress === 'full_ungraded' ? 'full' : spec.progress] += 1;

    if (spec.review && after.status === 'completed') {
      await prisma.review.create({
        data: { reviewableType: 'course', reviewableId: full.courseId, reviewerUserId: ownerId, rating: spec.review.rating, comment: spec.review.comment, createdAt: minutesAfter(after.completedAt ?? now, 60) },
      });
      await reviewRepository.recalcCourse(prisma, full.courseId);
    }
  }

  // tutor pending → antrian admin
  for (const tutor of TUTORS.filter((t) => t.status === 'pending_verification')) {
    await notify(admin.id, 'tutor_verification_requested', 'Tutor baru menunggu verifikasi', `${tutor.fullName} (${CITIES[tutor.city].name}) melengkapi profil dan dokumen.`, { tutorProfileId: num(tutorProfileId.get(tutor.key)!) }, new Date(now.getTime() - 26 * HOUR), false);
  }
  const rejected = TUTORS.find((t) => t.status === 'rejected');
  if (rejected) await notify(tutorUserId.get(rejected.key)!, 'tutor_rejected', 'Profil perlu diperbaiki', rejected.verificationNotes!, {}, new Date(now.getTime() - 3 * 24 * HOUR), false);
  for (const tutor of TUTORS.filter((t) => t.status === 'verified')) {
    await notify(tutorUserId.get(tutor.key)!, 'tutor_verified', 'Profilmu sudah terverifikasi', 'Selamat! Profilmu kini tampil di pencarian dan siap menerima booking.', {}, new Date(now.getTime() - 60 * 24 * HOUR), true);
  }

  return {
    admin: demoEmail('admin'),
    tutors: TUTORS.length,
    parents: ACCOUNTS.filter((a) => a.role === 'parent').length,
    children: ACCOUNTS.reduce((sum, a) => sum + (a.children?.length ?? 0), 0),
    students: ACCOUNTS.filter((a) => a.role === 'student').length,
    courses: COURSES.length,
    bookings: BOOKINGS.length,
    bookingStatus: counts,
    enrollments: ENROLLMENTS.length,
    enrollmentStats,
  };
}
