import { Request, Response } from 'express';
import { FollowUpService } from '../services/followup.service';
import { ApiResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { ApiError } from '../utils/api-error';

export const scheduleFollowUp = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const followUp = await FollowUpService.scheduleFollowUp(req.body, req.user);
  res.status(201).json(ApiResponse.created('Follow-up scheduled successfully', followUp));
});

export const listFollowUps = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();

  const {
    section,
    type,
    status,
    counsellorId,
    leadId,
    startDate,
    endDate,
    search,
    page,
    limit,
  } = req.query;

  const result = await FollowUpService.getFollowUps(
    {
      section: section as any,
      type: type as any,
      status: status as any,
      counsellorId: counsellorId as string | undefined,
      leadId: leadId as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      search: search as string | undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    },
    req.user
  );

  const { totalRecords, totalPages, currentPage, limit: pLimit } = result.pagination;

  res.json(
    ApiResponse.paginated('Follow-ups retrieved successfully', result.data, {
      totalRecords,
      totalPages,
      page: currentPage,
      limit: pLimit,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
    })
  );
});

export const getFollowUpById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const followUp = await FollowUpService.getFollowUpById(req.params.id, req.user);
  res.json(ApiResponse.success('Follow-up details retrieved successfully', followUp));
});

export const completeFollowUp = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const followUp = await FollowUpService.completeFollowUp(req.params.id, req.body, req.user);
  res.json(ApiResponse.success('Follow-up marked as completed', followUp));
});

export const rescheduleFollowUp = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const followUp = await FollowUpService.rescheduleFollowUp(req.params.id, req.body, req.user);
  res.json(ApiResponse.success('Follow-up rescheduled successfully', followUp));
});

export const getReminders = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const reminders = await FollowUpService.getReminders(req.user);
  res.json(ApiResponse.success('Follow-up reminders retrieved successfully', reminders));
});

export const getCounsellorMetrics = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const metrics = await FollowUpService.getCounsellorMetrics(req.user);
  res.json(ApiResponse.success('Counsellor follow-up metrics retrieved successfully', metrics));
});

export const getLeadFollowUps = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const followUps = await FollowUpService.getLeadFollowUps(req.params.leadId, req.user);
  res.json(ApiResponse.success('Lead follow-ups history retrieved successfully', followUps));
});
