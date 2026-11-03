import { Router } from 'express';
import {
  scheduleFollowUp,
  listFollowUps,
  getFollowUpById,
  completeFollowUp,
  rescheduleFollowUp,
  getReminders,
  getCounsellorMetrics,
  getLeadFollowUps,
} from '../controllers/followup.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validateRequest, validateQuery } from '../middlewares/validate.middleware';
import {
  scheduleFollowUpSchema,
  completeFollowUpSchema,
  rescheduleFollowUpSchema,
  listFollowUpsQuerySchema,
} from '../validators/followup.validator';

const router = Router();

// All follow-up routes require authentication
router.use(requireAuth);

// Summary & Aggregation endpoints
router.get('/reminders', getReminders);
router.get('/counsellor-metrics', getCounsellorMetrics);
router.get('/lead/:leadId', getLeadFollowUps);

// Listing with date queries, section filters, search and pagination
router.get('/', validateQuery(listFollowUpsQuerySchema), listFollowUps);

// Schedule a new follow-up
router.post('/', validateRequest(scheduleFollowUpSchema), scheduleFollowUp);

// Single follow-up detail
router.get('/:id', getFollowUpById);

// State transitions: Complete and Reschedule
router.patch('/:id/complete', validateRequest(completeFollowUpSchema), completeFollowUp);
router.patch('/:id/reschedule', validateRequest(rescheduleFollowUpSchema), rescheduleFollowUp);

export default router;
