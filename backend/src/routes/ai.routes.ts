import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  getAiStatus,
  scoreLead,
  getFollowUpAdvice,
  generateAiMessage,
  summarizeLead,
  analyzeLostLeads,
} from '../controllers/ai.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validateRequest, validateQuery } from '../middlewares/validate.middleware';
import {
  generateAiMessageSchema,
  lostLeadAnalysisQuerySchema,
} from '../validators/ai.validator';

const router = Router();

// Protect all AI routes with authentication
router.use(requireAuth);

// Dedicated rate limiter for AI operations: 60 requests per 15 minutes
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'AI Assistant rate limit reached. Please wait a moment before sending more AI requests.',
  },
});

router.use(aiLimiter);

// AI CRM Operations
router.get('/status', getAiStatus);
router.get('/score/:leadId', scoreLead);
router.get('/followup-advice/:leadId', getFollowUpAdvice);
router.post('/generate-message', validateRequest(generateAiMessageSchema), generateAiMessage);
router.get('/summary/:leadId', summarizeLead);
router.get('/lost-analysis', validateQuery(lostLeadAnalysisQuerySchema), analyzeLostLeads);

export default router;

