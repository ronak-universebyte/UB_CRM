import { Request, Response } from 'express';
import { AiService } from '../services/ai.service';
import { ApiResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { ApiError } from '../utils/api-error';

export const getAiStatus = asyncHandler(async (_req: Request, res: Response) => {
  const status = AiService.getStatus();
  res.json(ApiResponse.success('AI CRM Assistant status retrieved', status));
});

export const scoreLead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const leadId = req.params.leadId;
  const result = await AiService.scoreLead(leadId, req.user);
  res.json(ApiResponse.success('Lead scored successfully', result));
});

export const getFollowUpAdvice = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const leadId = req.params.leadId;
  const result = await AiService.getFollowUpAdvice(leadId, req.user);
  res.json(ApiResponse.success('Follow-up advice generated', result));
});

export const generateAiMessage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const result = await AiService.generateAiMessage(req.body, req.user);
  res.json(ApiResponse.success('AI personalized message generated', result));
});

export const summarizeLead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const leadId = req.params.leadId;
  const result = await AiService.summarizeLead(leadId, req.user);
  res.json(ApiResponse.success('Lead summarized successfully', result));
});

export const analyzeLostLeads = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const result = await AiService.analyzeLostLeads(
    {
      course: req.query.course as string | undefined,
      source: req.query.source as string | undefined,
      counsellorId: req.query.counsellorId as string | undefined,
      limit: req.query.limit ? Number(req.query.limit) : 50,
    },
    req.user
  );
  res.json(ApiResponse.success('Lost leads analysis completed', result));
});

