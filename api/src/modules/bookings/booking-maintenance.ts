import { prisma } from '../../lib/prisma';
import { addHours } from '../../lib/time';
import { notificationService } from '../notifications/notification.service';
import { paymentRepository } from '../payments/payment.repository';
import { settingsService } from '../settings/settings.service';
import { cancelInTx } from './booking.lifecycle';
import { bookingRepository } from './booking.repository';

// Auto-cancel & kedaluwarsa pembayaran TANPA job queue/cron (docs/03-tech-stack.md §2.3):
// dijalankan "lazy" di awal request booking/pembayaran, maksimal sekali per interval.
// Karena FE mem-polling endpoint ini, status kedaluwarsa tetap ter-update tepat waktu.

const SWEEP_INTERVAL_MS = 30_000;
let lastSweepAt = 0;
let running: Promise<void> | null = null;

export async function sweepExpired(force = false): Promise<void> {
  if (running) return running;
  if (!force && Date.now() - lastSweepAt < SWEEP_INTERVAL_MS) return;
  lastSweepAt = Date.now();
  running = doSweep()
    .catch((err) => console.error('[sweep] gagal:', err))
    .finally(() => {
      running = null;
    });
  return running;
}

async function doSweep() {
  const settings = await settingsService.get();
  const now = new Date();

  // FR-BOOK-04: tutor tidak merespons dalam batas waktu (atau jadwal sudah lewat) → auto-cancel
  const stale = await bookingRepository.findStalePending(
    addHours(now, -settings.bookingResponseHours),
    now,
  );
  for (const booking of stale) {
    await prisma
      .$transaction((tx) =>
        cancelInTx(tx, booking, {
          cancelledBy: 'system',
          reason: `Tutor tidak merespons dalam ${settings.bookingResponseHours} jam`,
          actorUserId: null,
          settings,
        }),
      )
      .catch(() => undefined); // status sudah berubah oleh request lain → abaikan
  }

  // FR-PAY-04: tagihan tidak dibayar dalam window → expired, booking dibatalkan & slot dilepas
  const unpaid = await paymentRepository.findExpiredUnpaid(
    addHours(now, -settings.paymentWindowHours),
  );
  const pastStart = await bookingRepository.findUnpaidPastStart(now);
  const bookingIds = new Set([
    ...unpaid.filter((p) => p.payableType === 'booking').map((p) => p.payableId),
    ...pastStart.map((b) => b.id),
  ]);

  for (const payment of unpaid.filter((p) => p.payableType === 'course_enrollment')) {
    await prisma.$transaction(async (tx) => {
      const updated = await paymentRepository.updateIfStatus(
        tx,
        payment.id,
        'menunggu_pembayaran',
        {
          status: 'expired',
        },
      );
      if (updated.count) {
        await notificationService.notify(tx, payment.userId, {
          type: 'payment_expired',
          title: 'Tagihan kursus kedaluwarsa',
          body: 'Pembayaran tidak diterima tepat waktu. Kamu bisa mendaftar ulang kapan saja.',
          data: { paymentId: payment.id },
        });
      }
    });
  }

  for (const bookingId of bookingIds) {
    await prisma
      .$transaction(async (tx) => {
        const booking = await bookingRepository.findById(tx, bookingId);
        if (!booking || booking.status !== 'menunggu_pembayaran') return;
        // Bukti transfer sudah diunggah & menunggu admin → jangan dibatalkan otomatis
        const payment = await paymentRepository.findLatestForPayable(tx, 'booking', booking.id);
        if (payment?.status === 'menunggu_verifikasi') return;
        await cancelInTx(tx, booking, {
          cancelledBy: 'system',
          reason: `Pembayaran tidak diterima dalam ${settings.paymentWindowHours} jam`,
          actorUserId: null,
          settings,
        });
      })
      .catch(() => undefined);
  }
}
