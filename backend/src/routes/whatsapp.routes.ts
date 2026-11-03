import { Router } from 'express';
import {
  getConfigStatus,
  getTemplates,
  generateMessage,
  recordAttempt,
  sendOfficialMessage,
  getLeadMessages,
  listLogs,
  verifyWebhook,
  processWebhook,
} from '../controllers/whatsapp.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validateRequest, validateQuery } from '../middlewares/validate.middleware';
import {
  generateMessageSchema,
  recordAttemptSchema,
  sendOfficialSchema,
  listLogsQuerySchema,
} from '../validators/whatsapp.validator';

const router = Router();

// ==============================================================================
// 1. PUBLIC META WEBHOOK ENDPOINTS (Verified via Meta Token)
// ==============================================================================
router.get('/webhook', verifyWebhook);
router.post('/webhook', processWebhook);

// ==============================================================================
// 2. PROTECTED CRM WHATSAPP ENDPOINTS (Requires Active JWT)
// ==============================================================================
router.use(requireAuth);

// Configuration & Templates
router.get('/config', getConfigStatus);
router.get('/templates', getTemplates);

// Method A: Manual Click-to-WhatsApp
router.post('/generate-message', validateRequest(generateMessageSchema), generateMessage);
router.post('/record-attempt', validateRequest(recordAttemptSchema), recordAttempt);

// Method B: Official Meta WhatsApp Cloud API
router.post('/send-official', validateRequest(sendOfficialSchema), sendOfficialMessage);

// Lead Timeline & Communication History
router.get('/messages/lead/:leadId', getLeadMessages);

// Communication Audit Logs
router.get('/logs', validateQuery(listLogsQuerySchema), listLogs);

export default router;

