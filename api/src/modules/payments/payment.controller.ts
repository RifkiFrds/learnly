import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { Errors } from '../../lib/app-error';
import { sendSuccess } from '../../lib/response';
import { currentUser } from '../../middlewares/auth.middleware';
import type { idParam } from '../../middlewares/validate';
import type {
  AdminPaymentsQuery,
  EarningsQuery,
  ListPaymentsQuery,
  RefundPaymentBody,
  VerifyPaymentBody,
} from './payment.schema';
import { paymentService } from './payment.service';

type IdParam = z.infer<typeof idParam>;

export const paymentController = {
  list: (async (req, res) => {
    const { items, meta } = await paymentService.list(
      currentUser(req),
      req.valid.query as ListPaymentsQuery,
    );
    sendSuccess(res, items, 200, meta);
  }) satisfies RequestHandler,

  getById: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    sendSuccess(res, await paymentService.getById(currentUser(req), id));
  }) satisfies RequestHandler,

  uploadProof: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    if (!req.uploadedFile) throw Errors.validation('Bukti transfer wajib diunggah');
    sendSuccess(res, await paymentService.uploadProof(currentUser(req), id, req.uploadedFile));
  }) satisfies RequestHandler,

  adminList: (async (req, res) => {
    const { items, meta } = await paymentService.adminList(req.valid.query as AdminPaymentsQuery);
    sendSuccess(res, items, 200, meta);
  }) satisfies RequestHandler,

  verify: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    const body = req.valid.body as VerifyPaymentBody;
    sendSuccess(res, await paymentService.verify(currentUser(req).userId, id, body));
  }) satisfies RequestHandler,

  refund: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    const body = req.valid.body as RefundPaymentBody;
    sendSuccess(res, await paymentService.refund(currentUser(req).userId, id, body));
  }) satisfies RequestHandler,

  earnings: (async (req, res) => {
    const query = req.valid.query as EarningsQuery;
    sendSuccess(res, await paymentService.earnings(currentUser(req).userId, query));
  }) satisfies RequestHandler,
};
