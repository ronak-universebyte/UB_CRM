import { Router } from 'express';
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  toggleStatus,
  listCounsellors,
} from '../controllers/user.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import { createUserSchema, updateUserSchema } from '../validators/auth.validator';
import { USER_ROLES } from '../config/constants';

const router = Router();

// All staff management routes require authentication
router.use(requireAuth);

// Counselor list for lead assignment dropdowns
router.get(
  '/counsellors',
  requireRoles(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.ADMIN,
    USER_ROLES.MARKETING_MANAGER
  ),
  listCounsellors
);

// Staff management operations (SuperAdmin and Admin)
router.get(
  '/',
  requireRoles(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
  listUsers
);

router.post(
  '/',
  requireRoles(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
  validateRequest(createUserSchema),
  createUser
);

router.get(
  '/:id',
  requireRoles(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
  getUser
);

router.put(
  '/:id',
  requireRoles(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
  validateRequest(updateUserSchema),
  updateUser
);

router.patch(
  '/:id/toggle-status',
  requireRoles(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
  toggleStatus
);

export const userRoutes = router;

