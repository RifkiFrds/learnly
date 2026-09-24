import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { Errors } from '../../lib/app-error';
import type { paginationQuery } from '../../lib/pagination';
import { sendCreated, sendSuccess } from '../../lib/response';
import { currentUser } from '../../middlewares/auth.middleware';
import type { idParam } from '../../middlewares/validate';
import type {
  AdminTutorListQuery,
  AvailableSlotsQuery,
  BlockedDateBody,
  CertificationBody,
  SetAvailabilitiesBody,
  SetEducationLevelsBody,
  SetServiceAreasBody,
  SetSubjectsBody,
  UpdateTutorProfileBody,
  VerifyTutorBody,
} from './tutor.schema';
import { tutorService } from './tutor.service';

type IdParam = z.infer<typeof idParam>;
type PageQuery = { page: number; limit: number } & Partial<typeof paginationQuery>;

export const tutorController = {
  getMine: (async (req, res) => {
    sendSuccess(res, await tutorService.getMine(currentUser(req).userId));
  }) satisfies RequestHandler,

  updateMine: (async (req, res) => {
    const body = req.valid.body as UpdateTutorProfileBody;
    sendSuccess(res, await tutorService.updateMine(currentUser(req).userId, body));
  }) satisfies RequestHandler,

  addCertification: (async (req, res) => {
    if (!req.uploadedFile) throw Errors.validation('File dokumen wajib diunggah');
    const body = req.valid.body as CertificationBody;
    sendCreated(
      res,
      await tutorService.addCertification(currentUser(req).userId, body, req.uploadedFile),
    );
  }) satisfies RequestHandler,

  deleteCertification: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    sendSuccess(res, await tutorService.deleteCertification(currentUser(req).userId, id));
  }) satisfies RequestHandler,

  setSubjects: (async (req, res) => {
    const body = req.valid.body as SetSubjectsBody;
    sendSuccess(res, await tutorService.setSubjects(currentUser(req).userId, body));
  }) satisfies RequestHandler,

  setEducationLevels: (async (req, res) => {
    const body = req.valid.body as SetEducationLevelsBody;
    sendSuccess(res, await tutorService.setEducationLevels(currentUser(req).userId, body));
  }) satisfies RequestHandler,

  setServiceAreas: (async (req, res) => {
    const body = req.valid.body as SetServiceAreasBody;
    sendSuccess(res, await tutorService.setServiceAreas(currentUser(req).userId, body));
  }) satisfies RequestHandler,

  setAvailabilities: (async (req, res) => {
    const body = req.valid.body as SetAvailabilitiesBody;
    sendSuccess(res, await tutorService.setAvailabilities(currentUser(req).userId, body));
  }) satisfies RequestHandler,

  addBlockedDate: (async (req, res) => {
    const body = req.valid.body as BlockedDateBody;
    sendCreated(res, await tutorService.addBlockedDate(currentUser(req).userId, body));
  }) satisfies RequestHandler,

  deleteBlockedDate: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    sendSuccess(res, await tutorService.deleteBlockedDate(currentUser(req).userId, id));
  }) satisfies RequestHandler,

  getPublic: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    sendSuccess(res, await tutorService.getPublic(id));
  }) satisfies RequestHandler,

  listReviews: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    const { page, limit } = req.valid.query as PageQuery;
    const { items, meta } = await tutorService.listReviews(id, page, limit);
    sendSuccess(res, items, 200, meta);
  }) satisfies RequestHandler,

  availableSlots: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    const { date } = req.valid.query as AvailableSlotsQuery;
    sendSuccess(res, await tutorService.availableSlots(id, date));
  }) satisfies RequestHandler,

  adminList: (async (req, res) => {
    const { items, meta } = await tutorService.adminList(req.valid.query as AdminTutorListQuery);
    sendSuccess(res, items, 200, meta);
  }) satisfies RequestHandler,

  adminVerify: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    sendSuccess(res, await tutorService.adminVerify(id, req.valid.body as VerifyTutorBody));
  }) satisfies RequestHandler,
};
