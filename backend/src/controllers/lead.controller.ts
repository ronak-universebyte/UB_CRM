import { Request, Response } from 'express';
import { LeadService } from '../services/lead.service';
import { ApiResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { ApiError } from '../utils/api-error';

export const createLead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const lead = await LeadService.createLead(req.body, req.user);
  res.status(201).json(ApiResponse.created('Lead registered successfully', lead));
});

export const listLeads = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();

  const {
    search,
    status,
    priority,
    interestedCourse,
    leadSource,
    assignedCounsellor,
    city,
    startDate,
    endDate,
    isDeleted,
    sortBy,
    page,
    limit,
  } = req.query;

  const result = await LeadService.listLeads(
    {
      search: search as string | undefined,
      status: status as string | undefined,
      priority: priority as string | undefined,
      interestedCourse: interestedCourse as string | undefined,
      leadSource: leadSource as string | undefined,
      assignedCounsellor: assignedCounsellor as string | undefined,
      city: city as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      isDeleted: isDeleted === 'true',
      sortBy: sortBy as any,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    },
    req.user
  );

  res.status(200).json(
    ApiResponse.paginated('Leads retrieved successfully', result.leads, result.pagination)
  );
});

export const getLead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const lead = await LeadService.getLeadById(req.params.id, req.user);
  res.status(200).json(ApiResponse.success('Lead retrieved successfully', lead));
});

export const updateLead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const lead = await LeadService.updateLead(req.params.id, req.body, req.user);
  res.status(200).json(ApiResponse.success('Lead updated successfully', lead));
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const { status, notes } = req.body;
  const lead = await LeadService.updateLeadStatus(req.params.id, status, notes, req.user);
  res.status(200).json(ApiResponse.success(`Lead stage transitioned to ${status}`, lead));
});

export const getKanban = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const {
    search,
    priority,
    interestedCourse,
    leadSource,
    assignedCounsellor,
    startDate,
    endDate,
  } = req.query;

  const leads = await LeadService.getKanbanLeads(
    {
      search: search as string | undefined,
      priority: priority as string | undefined,
      interestedCourse: interestedCourse as string | undefined,
      leadSource: leadSource as string | undefined,
      assignedCounsellor: assignedCounsellor as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    },
    req.user
  );

  res.status(200).json(ApiResponse.success('Kanban pipeline retrieved', leads));
});

export const softDeleteLead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const lead = await LeadService.softDeleteLead(req.params.id, req.user);
  res.status(200).json(ApiResponse.success('Lead moved to trash successfully', lead));
});

export const restoreLead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const lead = await LeadService.restoreLead(req.params.id, req.user);
  res.status(200).json(ApiResponse.success('Lead restored successfully', lead));
});

export const permanentDeleteLead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  await LeadService.permanentDeleteLead(req.params.id, req.user.role);
  res.status(200).json(ApiResponse.success('Lead permanently removed from database'));
});

export const checkDuplicate = asyncHandler(async (req: Request, res: Response) => {
  const { mobileNumber, excludeId } = req.query;
  if (!mobileNumber || typeof mobileNumber !== 'string') {
    throw ApiError.badRequest('mobileNumber query parameter is required');
  }

  const existing = await LeadService.checkDuplicateMobile(
    mobileNumber,
    excludeId as string | undefined
  );

  res.status(200).json(
    ApiResponse.success('Duplicate check complete', {
      isDuplicate: !!existing,
      existingLead: existing
        ? {
            id: (existing as any).id,
            leadId: existing.leadId,
            studentName: existing.studentName,
            mobileNumber: existing.mobileNumber,
            assignedCounsellor: existing.assignedCounsellor,
            status: existing.status,
            createdAt: existing.createdAt,
          }
        : null,
    })
  );
});

export const bulkAssign = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const { leadIds, counsellorId } = req.body;
  const result = await LeadService.bulkAssign(leadIds, counsellorId, req.user);
  res.status(200).json(ApiResponse.success(`Assigned ${result.updatedCount} leads successfully`, result));
});

export const exportCsv = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const csvContent = await LeadService.exportCsv(req.query as any, req.user);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="universebyte_leads_${new Date().toISOString().slice(0, 10)}.csv"`
  );
  res.status(200).send(csvContent);
});

export const importLeads = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const { leads } = req.body;
  if (!Array.isArray(leads) || leads.length === 0) {
    throw ApiError.badRequest('Payload must contain a non-empty "leads" array.');
  }

  const result = await LeadService.importLeads(leads, req.user);
  res.status(200).json(ApiResponse.success('Leads import processed', result));
});

