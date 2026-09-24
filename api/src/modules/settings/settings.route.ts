import { Router, type RequestHandler } from 'express';
import { sendSuccess } from '../../lib/response';
import { settingsService } from './settings.service';

export const settingsRouter = Router();

// Publik: aturan platform yang perlu ditampilkan sebelum booking (ringkasan biaya & kebijakan batal).
// Rekening/QRIS tetap hanya lewat payment-info agar tidak tampil di luar konteks tagihan.
settingsRouter.get('/public', (async (_req, res) => {
  const settings = await settingsService.get();
  sendSuccess(res, {
    serviceFee: settings.serviceFee,
    cancellationPolicy: settings.cancellationPolicy,
    bookingResponseHours: settings.bookingResponseHours,
    paymentWindowHours: settings.paymentWindowHours,
    meetingLinkVisibleHours: settings.meetingLinkVisibleHours,
    reviewEditDays: settings.reviewEditDays,
  });
}) satisfies RequestHandler);
