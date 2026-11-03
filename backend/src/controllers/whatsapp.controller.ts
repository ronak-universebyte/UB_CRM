import { Request, Response } from 'express';
import { WhatsAppService } from '../services/whatsapp.service';
import { ApiResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { ApiError } from '../utils/api-error';

export const getConfigStatus = asyncHandler(async (_req: Request, res: Response) => {
  const status = WhatsAppService.getConfigStatus();
  res.json(ApiResponse.success('WhatsApp integration status retrieved', status));
});

export const getTemplates = asyncHandler(async (_req: Request, res: Response) => {
  const templates = WhatsAppService.getTemplates();
  res.json(ApiResponse.success('WhatsApp message templates retrieved', templates));
});

export const generateMessage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const result = await WhatsAppService.generateMessage(req.body, req.user);
  res.json(ApiResponse.success('Personalized WhatsApp message generated', result));
});

export const recordAttempt = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const message = await WhatsAppService.recordManualAttempt(req.body, req.user);
  res.status(201).json(ApiResponse.created('Manual Click-to-WhatsApp attempt recorded', message));
});

export const sendOfficialMessage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const message = await WhatsAppService.sendOfficialMetaMessage(req.body, req.user);
  res.status(201).json(ApiResponse.created('Official message dispatched via Meta Cloud API', message));
});

export const getLeadMessages = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const messages = await WhatsAppService.getMessageHistory(req.params.leadId);
  res.json(ApiResponse.success('WhatsApp communication history retrieved', messages));
});

export const listLogs = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const result = await WhatsAppService.listLogs(
    {
      leadId: req.query.leadId as string | undefined,
      phoneNumber: req.query.phoneNumber as string | undefined,
      method: req.query.method as any,
      status: req.query.status as string | undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    },
    req.user
  );

  res.json(
    ApiResponse.paginated('WhatsApp communication logs retrieved', result.data, result.pagination)
  );
});

export const verifyWebhook = (req: Request, res: Response) => {
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;

  try {
    const verifiedChallenge = WhatsAppService.verifyWebhook(mode, token, challenge);
    res.status(200).send(verifiedChallenge);
  } catch (err: any) {
    res.status(403).send(err.message || 'Verification failed');
  }
};

export const processWebhook = asyncHandler(async (req: Request, res: Response) => {
  const result = await WhatsAppService.processWebhook(req.body);
  res.status(200).json(result);
});

