import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { idParam, validate } from '../../middlewares/validate';
import { userController } from './user.controller';
import {
  addressBody,
  learnerBody,
  updateAddressBody,
  updateLearnerBody,
  updateMeBody,
} from './user.schema';

// /users
export const userRouter = Router();
userRouter.patch('/me', authenticate, validate({ body: updateMeBody }), userController.updateMe);

// /learners
export const learnerRouter = Router();
learnerRouter.use(authenticate);
learnerRouter.get('/', authorize('student', 'parent'), userController.listLearners);
learnerRouter.post(
  '/',
  authorize('parent'),
  validate({ body: learnerBody }),
  userController.createLearner,
);
learnerRouter.patch(
  '/:id',
  authorize('parent'),
  validate({ params: idParam, body: updateLearnerBody }),
  userController.updateLearner,
);
learnerRouter.delete(
  '/:id',
  authorize('parent'),
  validate({ params: idParam }),
  userController.deleteLearner,
);

// /addresses
export const addressRouter = Router();
addressRouter.use(authenticate, authorize('student', 'parent'));
addressRouter.get('/', userController.listAddresses);
addressRouter.post('/', validate({ body: addressBody }), userController.createAddress);
addressRouter.patch(
  '/:id',
  validate({ params: idParam, body: updateAddressBody }),
  userController.updateAddress,
);
addressRouter.delete('/:id', validate({ params: idParam }), userController.deleteAddress);
