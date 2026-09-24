import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import {
  forgotPasswordRateLimit,
  loginRateLimit,
  resetPasswordRateLimit,
} from '../../middlewares/rate-limit';
import { validate } from '../../middlewares/validate';
import { authController } from './auth.controller';
import {
  forgotPasswordBody,
  loginBody,
  refreshBody,
  registerBody,
  resetPasswordBody,
  verifyEmailBody,
} from './auth.schema';

export const authRouter = Router();

authRouter.post('/register', validate({ body: registerBody }), authController.register);
authRouter.post('/verify-email', validate({ body: verifyEmailBody }), authController.verifyEmail);
authRouter.post('/login', loginRateLimit, validate({ body: loginBody }), authController.login);
authRouter.post('/refresh', validate({ body: refreshBody }), authController.refresh);
authRouter.post('/logout', authenticate, validate({ body: refreshBody }), authController.logout);
authRouter.post(
  '/forgot-password',
  forgotPasswordRateLimit,
  validate({ body: forgotPasswordBody }),
  authController.forgotPassword,
);
authRouter.post(
  '/reset-password',
  resetPasswordRateLimit,
  validate({ body: resetPasswordBody }),
  authController.resetPassword,
);
authRouter.get('/me', authenticate, authController.me);
