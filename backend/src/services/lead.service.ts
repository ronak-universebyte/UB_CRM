import mongoose, { Types } from 'mongoose';
import { Lead } from '../models/lead.model';
import { User } from '../models/user.model';
import { ApiError } from '../utils/api-error';
import { IAuthUser, ILead, UserRole } from '../types';
import { USER_ROLES } from '../config/constants';

export interface IListLeadsParams {
  search?: string;
  status?: string;
  priority?: string;
  interestedCourse?: string;
  leadSource?: string;
  assignedCounsellor?: string;
  city?: string;
  startDate?: string;
  endDate?: string;
  isDeleted?: boolean;
  sortBy?: 'newest' | 'oldest' | 'priority' | 'nextFollowUp';
  page?: number;
  limit?: number;
}

export class LeadService {
  private static enforceAccessFilter(
    query: Record<string, unknown>,
    actor: IAuthUser
  ): void {
    // SuperAdmin, Admin, and MarketingManager can view all leads
    if (
      actor.role === USER_ROLES.SUPER_ADMIN ||
      actor.role === USER_ROLES.ADMIN ||
      actor.role === USER_ROLES.MARKETING_MANAGER
    ) {
      return;
    }

    // Admission Counsellors and Telecallers can strictly view ONLY their assigned leads
    query.assignedCounsellor = new Types.ObjectId(actor.id);
  }

  static async checkDuplicateMobile(
    mobileNumber: string,
    excludeId?: string
  ): Promise<ILead | null> {
    const query: Record<string, unknown> = {
      mobileNumber,
      isDeleted: false,
    };

    if (excludeId && Types.ObjectId.isValid(excludeId)) {
      query._id = { $ne: new Types.ObjectId(excludeId) };
    }

    return Lead.findOne(query).populate('assignedCounsellor', 'fullName email phone');
  }

  static async createLead(data: any, actor: IAuthUser): Promise<ILead> {
    // 1. Strict Duplicate Mobile Detection
    const duplicate = await this.checkDuplicateMobile(data.mobileNumber);
    if (duplicate) {
      const counsellorName =
        (duplicate.assignedCounsellor as any)?.fullName || 'Unassigned';
      throw ApiError.conflict(
        `A lead with mobile number ${data.mobileNumber} already exists (${duplicate.leadId} - ${duplicate.studentName}, assigned to ${counsellorName}). Duplicate leads cannot be silently overwritten.`
      );
    }

    // 2. Default assignment if counsellor self-creates
    let assignedCounsellor = data.assignedCounsellor;
    if (
      !assignedCounsellor &&
      (actor.role === USER_ROLES.ADMISSION_COUNSELLOR || actor.role === USER_ROLES.TELECALLER)
    ) {
      assignedCounsellor = actor.id;
    }

    const lead = new Lead({
      ...data,
      assignedCounsellor: assignedCounsellor || undefined,
      activityHistory: [
        {
          action: 'LEAD_CREATED',
          changedBy: new Types.ObjectId(actor.id),
          timestamp: new Date(),
          notes: data.remarks || 'Lead entered into system',
        },
      ],
    });

    await lead.save();
    return lead.populate('assignedCounsellor', 'fullName email phone role');
  }

  static async listLeads(params: IListLeadsParams, actor: IAuthUser) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(200, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      isDeleted: params.isDeleted === true,
    };

    // Apply strict RBAC access boundary
    this.enforceAccessFilter(query, actor);

    // Search query on name, mobile, email, or leadId
    if (params.search) {
      const searchRegex = { $regex: params.search.trim(), $options: 'i' };
      query.$or = [
        { studentName: searchRegex },
        { mobileNumber: searchRegex },
        { whatsappNumber: searchRegex },
        { email: searchRegex },
        { leadId: searchRegex },
      ];
    }

    if (params.status) query.status = params.status;
    if (params.priority) query.priority = params.priority;
    if (params.interestedCourse) query.interestedCourse = params.interestedCourse;
    if (params.leadSource) query.leadSource = params.leadSource;
    if (params.city) query.city = { $regex: params.city.trim(), $options: 'i' };

    // Assigned Counsellor filter (only if actor is allowed to view other counsellors)
    if (
      params.assignedCounsellor &&
      (actor.role === USER_ROLES.SUPER_ADMIN ||
        actor.role === USER_ROLES.ADMIN ||
        actor.role === USER_ROLES.MARKETING_MANAGER)
    ) {
      query.assignedCounsellor = new Types.ObjectId(params.assignedCounsellor);
    }

    // Date range filter
    if (params.startDate || params.endDate) {
      const dateRange: Record<string, Date> = {};
      if (params.startDate) dateRange.$gte = new Date(params.startDate);
      if (params.endDate) dateRange.$lte = new Date(params.endDate);
      query.createdAt = dateRange;
    }

    // Sorting
    let sort: Record<string, 1 | -1> = { createdAt: -1 }; // Default: newest
    if (params.sortBy === 'oldest') {
      sort = { createdAt: 1 };
    } else if (params.sortBy === 'priority') {
      // Hot first, then Warm, then Cold
      sort = { priority: 1, createdAt: -1 };
    } else if (params.sortBy === 'nextFollowUp') {
      sort = { nextFollowUpDate: 1 };
    }

    const [leads, totalRecords] = await Promise.all([
      Lead.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('assignedCounsellor', 'fullName email phone role')
        .populate('deletedBy', 'fullName email'),
      Lead.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalRecords / limit) || 1;

    return {
      leads,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  static async getLeadById(id: string, actor: IAuthUser): Promise<ILead> {
    const lead = await Lead.findById(id)
      .populate('assignedCounsellor', 'fullName email phone role')
      .populate('deletedBy', 'fullName email')
      .populate('activityHistory.changedBy', 'fullName email role');

    if (!lead) {
      throw ApiError.notFound('Lead not found');
    }

    // Security Gate: Ensure Telecaller/Counsellor can only access their assigned leads
    if (
      actor.role === USER_ROLES.ADMISSION_COUNSELLOR ||
      actor.role === USER_ROLES.TELECALLER
    ) {
      const assignedId = (lead.assignedCounsellor as any)?._id?.toString() ||
        lead.assignedCounsellor?.toString();

      if (assignedId !== actor.id) {
        throw ApiError.forbidden('You are not authorized to view this lead.');
      }
    }

    return lead;
  }

  static async updateLead(id: string, data: any, actor: IAuthUser): Promise<ILead> {
    const lead = await Lead.findById(id);
    if (!lead) {
      throw ApiError.notFound('Lead not found');
    }

    // Security Gate
    if (
      actor.role === USER_ROLES.ADMISSION_COUNSELLOR ||
      actor.role === USER_ROLES.TELECALLER
    ) {
      const assignedId = lead.assignedCounsellor?.toString();
      if (assignedId !== actor.id) {
        throw ApiError.forbidden('You are not authorized to update this lead.');
      }
    }

    // If mobile number is being updated, ensure uniqueness
    if (data.mobileNumber && data.mobileNumber !== lead.mobileNumber) {
      const duplicate = await this.checkDuplicateMobile(data.mobileNumber, id);
      if (duplicate) {
        throw ApiError.conflict(
          `Cannot update: mobile number ${data.mobileNumber} is already used by ${duplicate.leadId} (${duplicate.studentName}).`
        );
      }
    }

    // Diff calculation for audit history
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    const trackFields = [
      'studentName',
      'mobileNumber',
      'whatsappNumber',
      'email',
      'city',
      'college',
      'qualification',
      'graduationYear',
      'interestedCourse',
      'leadSource',
      'campaign',
      'assignedCounsellor',
      'status',
      'priority',
      'budget',
      'expectedAdmissionDate',
      'nextFollowUpDate',
    ];

    for (const field of trackFields) {
      if (data[field] !== undefined) {
        const oldVal = (lead as any)[field]?.toString();
        const newVal = data[field]?.toString();
        if (oldVal !== newVal) {
          changes[field] = {
            from: (lead as any)[field],
            to: data[field],
          };
          (lead as any)[field] = data[field] === '' ? undefined : data[field];
        }
      }
    }

    if (data.remarks !== undefined) {
      lead.remarks = data.remarks;
    }

    // Log Activity Entry if meaningful changes occurred
    if (Object.keys(changes).length > 0 || data.activityNotes) {
      lead.activityHistory.unshift({
        action: 'LEAD_UPDATED',
        changedBy: new Types.ObjectId(actor.id),
        changes: Object.keys(changes).length > 0 ? changes : undefined,
        timestamp: new Date(),
        notes: data.activityNotes || 'Lead details updated',
      });
    }

    await lead.save();
    return lead.populate('assignedCounsellor', 'fullName email phone role');
  }

  static async updateLeadStatus(
    id: string,
    status: string,
    notes: string | undefined,
    actor: IAuthUser
  ): Promise<ILead> {
    const lead = await Lead.findById(id);
    if (!lead) {
      throw ApiError.notFound('Lead not found');
    }

    // Security Gate: Ensure Telecaller/Counsellor can only update their assigned leads
    if (
      actor.role === USER_ROLES.ADMISSION_COUNSELLOR ||
      actor.role === USER_ROLES.TELECALLER
    ) {
      const assignedId = (lead.assignedCounsellor as any)?._id?.toString() ||
        lead.assignedCounsellor?.toString();

      if (assignedId !== actor.id) {
        throw ApiError.forbidden('You are not authorized to update the status of this lead.');
      }
    }

    const oldStatus = lead.status;
    if (oldStatus === status) {
      return lead;
    }

    lead.status = status;
    lead.activityHistory.unshift({
      action: 'STATUS_CHANGED',
      changedBy: new Types.ObjectId(actor.id),
      changes: {
        status: {
          from: oldStatus,
          to: status,
        },
      },
      timestamp: new Date(),
      notes: notes || `Lead stage changed from ${oldStatus} to ${status}`,
    });

    await lead.save();
    return lead.populate('assignedCounsellor', 'fullName email phone role');
  }

  static async getKanbanLeads(params: IListLeadsParams, actor: IAuthUser) {
    const query: Record<string, unknown> = {
      isDeleted: false,
    };

    this.enforceAccessFilter(query, actor);

    if (params.search) {
      const searchRegex = { $regex: params.search.trim(), $options: 'i' };
      query.$or = [
        { studentName: searchRegex },
        { mobileNumber: searchRegex },
        { whatsappNumber: searchRegex },
        { email: searchRegex },
        { leadId: searchRegex },
      ];
    }

    if (params.priority) query.priority = params.priority;
    if (params.interestedCourse) query.interestedCourse = params.interestedCourse;
    if (params.leadSource) query.leadSource = params.leadSource;
    if (
      params.assignedCounsellor &&
      (actor.role === USER_ROLES.SUPER_ADMIN ||
        actor.role === USER_ROLES.ADMIN ||
        actor.role === USER_ROLES.MARKETING_MANAGER)
    ) {
      query.assignedCounsellor = new Types.ObjectId(params.assignedCounsellor);
    }

    if (params.startDate || params.endDate) {
      const dateRange: Record<string, Date> = {};
      if (params.startDate) dateRange.$gte = new Date(params.startDate);
      if (params.endDate) dateRange.$lte = new Date(params.endDate);
      query.createdAt = dateRange;
    }

    const leads = await Lead.find(query)
      .sort({ updatedAt: -1 })
      .populate('assignedCounsellor', 'fullName email phone role');

    return leads;
  }

  static async softDeleteLead(id: string, actor: IAuthUser): Promise<ILead> {
    const lead = await Lead.findById(id);
    if (!lead) {
      throw ApiError.notFound('Lead not found');
    }

    if (lead.isDeleted) {
      throw ApiError.badRequest('Lead is already in trash bin');
    }

    // Check authorization: Telecallers cannot delete leads
    if (actor.role === USER_ROLES.TELECALLER) {
      throw ApiError.forbidden('Telecallers do not have permission to delete leads.');
    }

    lead.isDeleted = true;
    lead.deletedAt = new Date();
    lead.deletedBy = new Types.ObjectId(actor.id);

    lead.activityHistory.unshift({
      action: 'LEAD_SOFT_DELETED',
      changedBy: new Types.ObjectId(actor.id),
      timestamp: new Date(),
      notes: 'Lead moved to trash',
    });

    await lead.save();
    return lead;
  }

  static async restoreLead(id: string, actor: IAuthUser): Promise<ILead> {
    const lead = await Lead.findById(id);
    if (!lead) {
      throw ApiError.notFound('Lead not found');
    }

    if (!lead.isDeleted) {
      throw ApiError.badRequest('Lead is not deleted');
    }

    lead.isDeleted = false;
    lead.deletedAt = undefined;
    lead.deletedBy = undefined;

    lead.activityHistory.unshift({
      action: 'LEAD_RESTORED',
      changedBy: new Types.ObjectId(actor.id),
      timestamp: new Date(),
      notes: 'Lead restored from trash',
    });

    await lead.save();
    return lead;
  }

  static async permanentDeleteLead(id: string, actorRole: UserRole): Promise<void> {
    if (actorRole !== USER_ROLES.SUPER_ADMIN) {
      throw ApiError.forbidden(
        'Permanent deletion is strictly restricted to Super Administrators.'
      );
    }

    const lead = await Lead.findById(id);
    if (!lead) {
      throw ApiError.notFound('Lead not found');
    }

    await Lead.findByIdAndDelete(id);
  }

  static async bulkAssign(
    leadIds: string[],
    counsellorId: string,
    actor: IAuthUser
  ): Promise<{ updatedCount: number }> {
    if (
      actor.role !== USER_ROLES.SUPER_ADMIN &&
      actor.role === USER_ROLES.TELECALLER
    ) {
      throw ApiError.forbidden('You do not have permission to perform bulk assignments.');
    }

    const targetUser = await User.findById(counsellorId);
    if (!targetUser) {
      throw ApiError.notFound('Target counsellor not found');
    }

    const validObjectIds = leadIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    if (validObjectIds.length === 0) {
      throw ApiError.badRequest('No valid lead IDs provided');
    }

    const leads = await Lead.find({ _id: { $in: validObjectIds } });

    for (const lead of leads) {
      const oldCounsellor = lead.assignedCounsellor;
      lead.assignedCounsellor = new Types.ObjectId(counsellorId);
      lead.activityHistory.unshift({
        action: 'COUNSELLOR_REASSIGNED',
        changedBy: new Types.ObjectId(actor.id),
        changes: {
          assignedCounsellor: {
            from: oldCounsellor,
            to: counsellorId,
          },
        },
        timestamp: new Date(),
        notes: `Bulk assigned to ${targetUser.fullName}`,
      });
      await lead.save();
    }

    return { updatedCount: leads.length };
  }

  static async exportCsv(params: IListLeadsParams, actor: IAuthUser): Promise<string> {
    const query: Record<string, unknown> = {
      isDeleted: params.isDeleted === true,
    };

    this.enforceAccessFilter(query, actor);

    if (params.status) query.status = params.status;
    if (params.priority) query.priority = params.priority;
    if (params.interestedCourse) query.interestedCourse = params.interestedCourse;
    if (params.leadSource) query.leadSource = params.leadSource;

    const leads = await Lead.find(query)
      .sort({ createdAt: -1 })
      .populate('assignedCounsellor', 'fullName email')
      .lean();

    const headers = [
      'Lead ID',
      'Student Name',
      'Mobile Number',
      'WhatsApp Number',
      'Email',
      'City',
      'College',
      'Qualification',
      'Graduation Year',
      'Interested Course',
      'Lead Source',
      'Campaign',
      'Assigned Counsellor',
      'Status',
      'Priority',
      'Budget (INR)',
      'Next Follow-Up Date',
      'Remarks',
      'Created Date',
    ];

    const escapeCsv = (str: unknown) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = leads.map((l: any) => [
      escapeCsv(l.leadId),
      escapeCsv(l.studentName),
      escapeCsv(l.mobileNumber),
      escapeCsv(l.whatsappNumber),
      escapeCsv(l.email || ''),
      escapeCsv(l.city || ''),
      escapeCsv(l.college || ''),
      escapeCsv(l.qualification || ''),
      escapeCsv(l.graduationYear || ''),
      escapeCsv(l.interestedCourse),
      escapeCsv(l.leadSource),
      escapeCsv(l.campaign || ''),
      escapeCsv(l.assignedCounsellor?.fullName || 'Unassigned'),
      escapeCsv(l.status),
      escapeCsv(l.priority),
      escapeCsv(l.budget || ''),
      escapeCsv(l.nextFollowUpDate ? new Date(l.nextFollowUpDate).toISOString().slice(0, 10) : ''),
      escapeCsv(l.remarks || ''),
      escapeCsv(new Date(l.createdAt).toISOString().slice(0, 10)),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  static async importLeads(
    leadsData: any[],
    actor: IAuthUser
  ): Promise<{
    totalProcessed: number;
    successCount: number;
    failedRows: Array<{ row: number; mobileNumber?: string; reason: string }>;
  }> {
    const failedRows: Array<{ row: number; mobileNumber?: string; reason: string }> = [];
    let successCount = 0;

    const seenMobileInBatch = new Set<string>();

    for (let i = 0; i < leadsData.length; i++) {
      const row = leadsData[i];
      const rowNum = i + 1;

      try {
        if (!row.studentName || !row.mobileNumber || !row.interestedCourse || !row.leadSource) {
          failedRows.push({
            row: rowNum,
            mobileNumber: row.mobileNumber,
            reason: 'Missing required fields (studentName, mobileNumber, interestedCourse, leadSource)',
          });
          continue;
        }

        const cleanMobile = String(row.mobileNumber).replace(/\D/g, '').slice(-10);
        if (!/^[5-9]\d{9}$/.test(cleanMobile)) {
          failedRows.push({
            row: rowNum,
            mobileNumber: row.mobileNumber,
            reason: 'Invalid 10-digit mobile number format',
          });
          continue;
        }

        if (seenMobileInBatch.has(cleanMobile)) {
          failedRows.push({
            row: rowNum,
            mobileNumber: cleanMobile,
            reason: 'Duplicate mobile number in uploaded file batch',
          });
          continue;
        }
        seenMobileInBatch.add(cleanMobile);

        // Check MongoDB duplicate
        const existing = await this.checkDuplicateMobile(cleanMobile);
        if (existing) {
          failedRows.push({
            row: rowNum,
            mobileNumber: cleanMobile,
            reason: `Mobile number already registered in database (${existing.leadId})`,
          });
          continue;
        }

        await this.createLead(
          {
            ...row,
            mobileNumber: cleanMobile,
            whatsappNumber: row.whatsappNumber ? String(row.whatsappNumber).replace(/\D/g, '').slice(-10) : cleanMobile,
          },
          actor
        );

        successCount++;
      } catch (err: any) {
        failedRows.push({
          row: rowNum,
          mobileNumber: row.mobileNumber,
          reason: err.message || 'Validation error',
        });
      }
    }

    return {
      totalProcessed: leadsData.length,
      successCount,
      failedRows,
    };
  }
}

