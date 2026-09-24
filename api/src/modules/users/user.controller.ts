import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { sendCreated, sendSuccess } from '../../lib/response';
import { currentUser } from '../../middlewares/auth.middleware';
import type { idParam } from '../../middlewares/validate';
import type {
  AddressBody,
  LearnerBody,
  UpdateAddressBody,
  UpdateLearnerBody,
  UpdateMeBody,
} from './user.schema';
import { userService } from './user.service';

type IdParam = z.infer<typeof idParam>;

export const userController = {
  updateMe: (async (req, res) => {
    const body = req.valid.body as UpdateMeBody;
    sendSuccess(res, await userService.updateMe(currentUser(req).userId, body));
  }) satisfies RequestHandler,

  listLearners: (async (req, res) => {
    sendSuccess(res, await userService.listLearners(currentUser(req).userId));
  }) satisfies RequestHandler,

  createLearner: (async (req, res) => {
    const body = req.valid.body as LearnerBody;
    sendCreated(res, await userService.createLearner(currentUser(req).userId, body));
  }) satisfies RequestHandler,

  updateLearner: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    const body = req.valid.body as UpdateLearnerBody;
    sendSuccess(res, await userService.updateLearner(currentUser(req).userId, id, body));
  }) satisfies RequestHandler,

  deleteLearner: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    sendSuccess(res, await userService.deleteLearner(currentUser(req).userId, id));
  }) satisfies RequestHandler,

  listAddresses: (async (req, res) => {
    sendSuccess(res, await userService.listAddresses(currentUser(req).userId));
  }) satisfies RequestHandler,

  createAddress: (async (req, res) => {
    const body = req.valid.body as AddressBody;
    sendCreated(res, await userService.createAddress(currentUser(req).userId, body));
  }) satisfies RequestHandler,

  updateAddress: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    const body = req.valid.body as UpdateAddressBody;
    sendSuccess(res, await userService.updateAddress(currentUser(req).userId, id, body));
  }) satisfies RequestHandler,

  deleteAddress: (async (req, res) => {
    const { id } = req.valid.params as IdParam;
    sendSuccess(res, await userService.deleteAddress(currentUser(req).userId, id));
  }) satisfies RequestHandler,
};
