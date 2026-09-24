import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { sendCreated, sendSuccess } from '../../lib/response';
import type { idParam } from '../../middlewares/validate';
import type {
  CreateMasterDataBody,
  MasterDataKind,
  UpdateMasterDataBody,
} from './master-data.schema';
import { masterDataService } from './master-data.service';

type IdParam = z.infer<typeof idParam>;

/** Handler dibuat per jenis master data (subjects / education-levels / categories). */
export function masterDataController(kind: MasterDataKind) {
  return {
    list: (async (_req, res) => {
      sendSuccess(res, await masterDataService.list(kind));
    }) satisfies RequestHandler,

    create: (async (req, res) => {
      sendCreated(
        res,
        await masterDataService.create(kind, req.valid.body as CreateMasterDataBody),
      );
    }) satisfies RequestHandler,

    update: (async (req, res) => {
      const { id } = req.valid.params as IdParam;
      const body = req.valid.body as UpdateMasterDataBody;
      sendSuccess(res, await masterDataService.update(kind, id, body));
    }) satisfies RequestHandler,

    remove: (async (req, res) => {
      const { id } = req.valid.params as IdParam;
      sendSuccess(res, await masterDataService.remove(kind, id));
    }) satisfies RequestHandler,
  };
}
