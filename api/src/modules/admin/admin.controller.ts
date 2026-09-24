import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { Errors } from '../../lib/app-error';
import { sendSuccess } from '../../lib/response';
import { currentUser } from '../../middlewares/auth.middleware';
import type { idParam } from '../../middlewares/validate';
import { settingsService } from '../settings/settings.service';
import type { PlatformSettings } from '../settings/settings.schema';
import type {
  AdminReviewsQuery,
  AdminUsersQuery,
  DashboardQuery,
  SuspendUserBody,
} from './admin.schema';
import { adminService } from './admin.service';

type IdParam = z.infer<typeof idParam>;

export const adminController = {
  setUserStatus: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    const body = req.valid.body as SuspendUserBody;
    sendSuccess(res, await adminService.setUserStatus(currentUser(req).userId, id, body));
  }) satisfies RequestHandler,

  listUsers: (async (req, res) => {
    const { items, meta } = await adminService.listUsers(req.valid.query as AdminUsersQuery);
    sendSuccess(res, items, 200, meta);
  }) satisfies RequestHandler,

  listReviews: (async (req, res) => {
    const { items, meta } = await adminService.listReviews(req.valid.query as AdminReviewsQuery);
    sendSuccess(res, items, 200, meta);
  }) satisfies RequestHandler,

  dashboardSummary: (async (req, res) => {
    sendSuccess(res, await adminService.dashboardSummary(req.valid.query as DashboardQuery));
  }) satisfies RequestHandler,

  disputes: (async (_req, res) => {
    sendSuccess(res, await adminService.disputes());
  }) satisfies RequestHandler,

  getSettings: (async (_req, res) => {
    sendSuccess(res, await settingsService.get());
  }) satisfies RequestHandler,

  updateSettings: (async (req, res) => {
    sendSuccess(res, await settingsService.update(req.valid.body as Partial<PlatformSettings>));
  }) satisfies RequestHandler,

  uploadQrisImage: (async (req, res) => {
    if (!req.uploadedFile) throw Errors.validation('Gambar QRIS wajib diunggah');
    sendSuccess(res, await settingsService.uploadQrisImage(req.uploadedFile));
  }) satisfies RequestHandler,
};
