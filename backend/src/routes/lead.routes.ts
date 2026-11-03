import { Router } from 'express';
import {
  createLead,
  listLeads,
  getLead,
  updateLead,
  updateStatus,
  getKanban,
  softDeleteLead,
  restoreLead,
  permanentDeleteLead,
  checkDuplicate,
  bulkAssign,
  exportCsv,
  importLeads,
} from '../controllers/lead.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  createLeadSchema,
  updateLeadSchema,
  updateStatusSchema,
  bulkAssignSchema,
} from '../validators/lead.validator';
import { USER_ROLES } from '../config/constants';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Duplicate mobile number checker (useful for live UI warnings)
router.get('/check-duplicate', checkDuplicate);

// Export leads to CSV
router.get('/export/csv', exportCsv);

// Kanban pipeline grouping
router.get('/kanban', getKanban);

// Import leads from array (Excel/CSV parse result)
router.post('/import', importLeads);

// Bulk assignment (SuperAdmin, Admin, MarketingManager)
router.post(
  '/bulk-assign',
  requireRoles(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.ADMIN,
    USER_ROLES.MARKETING_MANAGER
  ),
  validateRequest(bulkAssignSchema),
  bulkAssign
);

// Standard CRUD
router.get('/', listLeads);
router.post('/', validateRequest(createLeadSchema), createLead);
router.get('/:id', getLead);
router.put('/:id', validateRequest(updateLeadSchema), updateLead);
router.patch('/:id/status', validateRequest(updateStatusSchema), updateStatus);

// Soft delete & restore
router.delete('/:id', softDeleteLead);
router.patch('/:id/restore', restoreLead);

// Permanent deletion: Strictly SuperAdmin
router.delete(
  '/:id/permanent',
  requireRoles(USER_ROLES.SUPER_ADMIN),
  permanentDeleteLead
);

export const leadRoutes = router;

