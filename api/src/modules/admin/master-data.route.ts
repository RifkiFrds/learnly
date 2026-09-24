import { Router } from 'express';
import { idParam, validate } from '../../middlewares/validate';
import { masterDataController } from './master-data.controller';
import {
  createMasterDataBody,
  MASTER_DATA_KINDS,
  updateMasterDataBody,
} from './master-data.schema';

// Publik (read-only): GET /subjects, /education-levels, /categories — untuk dropdown filter di FE
export const masterDataPublicRouter = Router();

// Admin CRUD: /admin/subjects, /admin/education-levels, /admin/categories
// (dipasang di admin.route yang sudah memasang authenticate + authorize('admin'))
export const masterDataAdminRouter = Router();

for (const kind of MASTER_DATA_KINDS) {
  const controller = masterDataController(kind);
  masterDataPublicRouter.get(`/${kind}`, controller.list);

  const admin = Router();
  admin.get('/', controller.list);
  admin.post('/', validate({ body: createMasterDataBody }), controller.create);
  admin.patch('/:id', validate({ params: idParam, body: updateMasterDataBody }), controller.update);
  admin.delete('/:id', validate({ params: idParam }), controller.remove);
  masterDataAdminRouter.use(`/${kind}`, admin);
}
