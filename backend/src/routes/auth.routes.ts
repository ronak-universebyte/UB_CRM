import { Router } from 'express';
import {
  login,
  refresh,
  logout,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator';

const router = Router();

router.post('/login', validateRequest(loginSchema), login);
router.post('/refresh-token', validateRequest(refreshTokenSchema), refresh);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, getMe);
router.post(
  '/change-password',
  requireAuth,
  validateRequest(changePasswordSchema),
  changePassword
);
router.post(
  '/forgot-password',
  validateRequest(forgotPasswordSchema),
  forgotPassword
);
router.post(
  '/reset-password',
  validateRequest(resetPasswordSchema),
  resetPassword
);

export const authRoutes = router;

