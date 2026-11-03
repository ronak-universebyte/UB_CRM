import { Types } from 'mongoose';
import { FollowUp } from '../models/followup.model';
import { Lead } from '../models/lead.model';
import { User } from '../models/user.model';
import { IAuthUser, IFollowUpDocument } from '../types';
import { ApiError } from '../utils/api-error';
import { USER_ROLES } from '../config/constants';

export interface IListFollowUpsParams {
  section?: 'today' | 'upcoming' | 'overdue' | 'completed';
  type?: 'Call' | 'WhatsApp' | 'Meeting' | 'Demo';
  status?: 'Scheduled' | 'Completed' | 'Rescheduled' | 'Cancelled';
  counsellorId?: string;
  leadId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface IScheduleFollowUpDTO {
  leadId: string;
  scheduledAt: string;
  type: 'Call' | 'WhatsApp' | 'Meeting' | 'Demo';
  counsellingNotes: string;
  counsellorId?: string;
}

export interface ICompleteFollowUpDTO {
  completionRemarks: string;
  nextFollowUpDate?: string;
  nextFollowUpType?: 'Call' | 'WhatsApp' | 'Meeting' | 'Demo';
  nextFollowUpNotes?: string;
}

export interface IRescheduleFollowUpDTO {
  newScheduledAt: string;
  rescheduledReason: string;
  type?: 'Call' | 'WhatsApp' | 'Meeting' | 'Demo';
}

export class FollowUpService {
  /**
   * Schedule a new follow-up for a lead
   * Validates lead existence, enforces RBAC, prevents duplicate records, and updates Lead activity history
   */
  static async scheduleFollowUp(
    data: IScheduleFollowUpDTO,
    actor: IAuthUser
  ): Promise<IFollowUpDocument> {
    const lead = await Lead.findById(data.leadId);
    if (!lead || lead.isDeleted) {
      throw ApiError.notFound('Lead not found or has been moved to trash');
    }

    // Role-based data access enforcement
    if (
      actor.role === USER_ROLES.ADMISSION_COUNSELLOR ||
      actor.role === USER_ROLES.TELECALLER
    ) {
      const assignedId = (lead.assignedCounsellor as any)?._id?.toString() ||
        lead.assignedCounsellor?.toString();
      if (assignedId && assignedId !== actor.id) {
        throw ApiError.forbidden(
          'You are not authorized to schedule follow-ups for leads assigned to another staff member.'
        );
      }
    }

    // Determine target counsellor
    let targetCounsellorId: Types.ObjectId;
    if (
      actor.role === USER_ROLES.ADMISSION_COUNSELLOR ||
      actor.role === USER_ROLES.TELECALLER
    ) {
      targetCounsellorId = new Types.ObjectId(actor.id);
    } else if (data.counsellorId) {
      const counsellor = await User.findById(data.counsellorId);
      if (!counsellor || !counsellor.isActive) {
        throw ApiError.badRequest('Assigned counsellor not found or is inactive');
      }
      targetCounsellorId = counsellor._id;
    } else if (lead.assignedCounsellor) {
      const assignedId = (lead.assignedCounsellor as any)?._id?.toString() ||
        lead.assignedCounsellor.toString();
      targetCounsellorId = new Types.ObjectId(assignedId);
    } else {
      targetCounsellorId = new Types.ObjectId(actor.id);
    }

    const scheduledDate = new Date(data.scheduledAt);
    const scheduledTime = scheduledDate.getTime();
    const duplicateWindowMs = 15 * 60 * 1000; // 15-minute slot safety guard

    // Check for accidental duplicate active follow-up
    const duplicate = await FollowUp.findOne({
      leadId: lead._id,
      status: { $in: ['Scheduled', 'Rescheduled'] },
      scheduledAt: {
        $gte: new Date(scheduledTime - duplicateWindowMs),
        $lte: new Date(scheduledTime + duplicateWindowMs),
      },
    });

    if (duplicate) {
      throw ApiError.conflict(
        `A follow-up is already scheduled for this student around ${new Date(
          duplicate.scheduledAt
        ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Please choose another time.`
      );
    }

    // Create the follow-up record
    const followUp = await FollowUp.create({
      leadId: lead._id,
      counsellorId: targetCounsellorId,
      scheduledAt: scheduledDate,
      type: data.type,
      status: 'Scheduled',
      counsellingNotes: data.counsellingNotes,
      history: [
        {
          action: 'SCHEDULED',
          changedBy: new Types.ObjectId(actor.id),
          timestamp: new Date(),
          newScheduledAt: scheduledDate,
          notes: data.counsellingNotes,
        },
      ],
    });

    // Update connected Lead: record next follow-up and append to activity history
    lead.nextFollowUpDate = scheduledDate;
    lead.activityHistory.unshift({
      action: 'FOLLOWUP_SCHEDULED',
      changedBy: new Types.ObjectId(actor.id),
      timestamp: new Date(),
      notes: `${data.type} follow-up scheduled for ${scheduledDate.toLocaleDateString()} ${scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}: "${data.counsellingNotes}"`,
    });
    await lead.save();

    return followUp.populate([
      {
        path: 'leadId',
        select: 'leadId studentName mobileNumber whatsappNumber email interestedCourse status priority',
      },
      {
        path: 'counsellorId',
        select: 'fullName email phone role',
      },
    ]);
  }

  /**
   * Retrieve follow-ups with database filtering, date-based queries, section categorization, and pagination
   */
  static async getFollowUps(
    params: IListFollowUpsParams,
    actor: IAuthUser
  ): Promise<{
    data: IFollowUpDocument[];
    pagination: {
      totalRecords: number;
      totalPages: number;
      currentPage: number;
      limit: number;
    };
  }> {
    const query: Record<string, unknown> = {};

    // Data isolation: Telecallers & Admission Counsellors strictly see their assigned follow-ups
    if (
      actor.role === USER_ROLES.ADMISSION_COUNSELLOR ||
      actor.role === USER_ROLES.TELECALLER
    ) {
      query.counsellorId = new Types.ObjectId(actor.id);
    } else if (params.counsellorId) {
      query.counsellorId = new Types.ObjectId(params.counsellorId);
    }

    if (params.leadId) {
      query.leadId = new Types.ObjectId(params.leadId);
    }

    if (params.type) {
      query.type = params.type;
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Section queries (Today, Upcoming, Overdue, Completed)
    let sortQuery: Record<string, 1 | -1> = { scheduledAt: 1 };

    if (params.section === 'today') {
      query.scheduledAt = { $gte: startOfToday, $lte: endOfToday };
      query.status = { $in: ['Scheduled', 'Rescheduled'] };
      sortQuery = { scheduledAt: 1 };
    } else if (params.section === 'upcoming') {
      query.scheduledAt = { $gt: endOfToday };
      query.status = { $in: ['Scheduled', 'Rescheduled'] };
      sortQuery = { scheduledAt: 1 };
    } else if (params.section === 'overdue') {
      query.scheduledAt = { $lt: now };
      query.status = { $in: ['Scheduled', 'Rescheduled'] };
      sortQuery = { scheduledAt: 1 }; // Most overdue first
    } else if (params.section === 'completed') {
      query.status = 'Completed';
      sortQuery = { completedAt: -1, updatedAt: -1 };
    } else {
      if (params.status) {
        query.status = params.status;
      }
      if (params.startDate || params.endDate) {
        const dateRange: Record<string, Date> = {};
        if (params.startDate) dateRange.$gte = new Date(params.startDate);
        if (params.endDate) dateRange.$lte = new Date(params.endDate);
        query.scheduledAt = dateRange;
      }
    }

    // Lead search filter (student name, mobile, lead ID)
    if (params.search && params.search.trim()) {
      const searchRegex = { $regex: params.search.trim(), $options: 'i' };
      const matchedLeads = await Lead.find({
        $or: [
          { studentName: searchRegex },
          { mobileNumber: searchRegex },
          { leadId: searchRegex },
        ],
      }).select('_id');

      const leadIds = matchedLeads.map((l) => l._id);
      query.leadId = { $in: leadIds };
    }

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const [totalRecords, followUps] = await Promise.all([
      FollowUp.countDocuments(query),
      FollowUp.find(query)
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .populate([
          {
            path: 'leadId',
            select: 'leadId studentName mobileNumber whatsappNumber email interestedCourse status priority budget',
          },
          {
            path: 'counsellorId',
            select: 'fullName email phone role',
          },
          {
            path: 'history.changedBy',
            select: 'fullName role',
          },
        ]),
    ]);

    const totalPages = Math.ceil(totalRecords / limit) || 1;

    return {
      data: followUps,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        limit,
      },
    };
  }

  /**
   * Get single follow-up by ID with full history and relationships
   */
  static async getFollowUpById(
    id: string,
    actor: IAuthUser
  ): Promise<IFollowUpDocument> {
    const followUp = await FollowUp.findById(id).populate([
      {
        path: 'leadId',
        select: 'leadId studentName mobileNumber whatsappNumber email interestedCourse status priority budget',
      },
      {
        path: 'counsellorId',
        select: 'fullName email phone role',
      },
      {
        path: 'history.changedBy',
        select: 'fullName role',
      },
    ]);

    if (!followUp) {
      throw ApiError.notFound('Follow-up record not found');
    }

    if (
      (actor.role === USER_ROLES.ADMISSION_COUNSELLOR ||
        actor.role === USER_ROLES.TELECALLER) &&
      followUp.counsellorId &&
      (followUp.counsellorId as any)._id?.toString() !== actor.id
    ) {
      throw ApiError.forbidden('You are not authorized to view this follow-up.');
    }

    return followUp;
  }

  /**
   * Complete a follow-up with user action and mandatory completion remarks
   * Updates lead activity history and optionally schedules the subsequent follow-up
   */
  static async completeFollowUp(
    id: string,
    data: ICompleteFollowUpDTO,
    actor: IAuthUser
  ): Promise<IFollowUpDocument> {
    const followUp = await FollowUp.findById(id);
    if (!followUp) {
      throw ApiError.notFound('Follow-up record not found');
    }

    // Role-based authorization
    if (
      actor.role === USER_ROLES.ADMISSION_COUNSELLOR ||
      actor.role === USER_ROLES.TELECALLER
    ) {
      if (followUp.counsellorId.toString() !== actor.id) {
        throw ApiError.forbidden(
          'You are not authorized to complete follow-ups assigned to another counsellor.'
        );
      }
    }

    if (followUp.status === 'Completed') {
      throw ApiError.badRequest('This follow-up has already been marked as completed.');
    }

    const completedTimestamp = new Date();
    followUp.status = 'Completed';
    followUp.completedAt = completedTimestamp;
    followUp.completionRemarks = data.completionRemarks;

    followUp.history.push({
      action: 'COMPLETED',
      changedBy: new Types.ObjectId(actor.id),
      timestamp: completedTimestamp,
      notes: data.completionRemarks,
    });

    await followUp.save();

    // Synchronize connected Lead
    const lead = await Lead.findById(followUp.leadId);
    if (lead) {
      lead.activityHistory.unshift({
        action: 'FOLLOWUP_COMPLETED',
        changedBy: new Types.ObjectId(actor.id),
        timestamp: completedTimestamp,
        notes: `Follow-up completed: "${data.completionRemarks}"`,
      });

      // If counselor scheduled next follow-up directly upon completion
      if (data.nextFollowUpDate) {
        const nextDate = new Date(data.nextFollowUpDate);
        lead.nextFollowUpDate = nextDate;

        // Create the subsequent follow-up record
        await FollowUp.create({
          leadId: lead._id,
          counsellorId: followUp.counsellorId,
          scheduledAt: nextDate,
          type: data.nextFollowUpType || followUp.type,
          status: 'Scheduled',
          counsellingNotes: data.nextFollowUpNotes || `Follow-up after: ${data.completionRemarks}`,
          history: [
            {
              action: 'SCHEDULED',
              changedBy: new Types.ObjectId(actor.id),
              timestamp: new Date(),
              newScheduledAt: nextDate,
              notes: data.nextFollowUpNotes || 'Next follow-up scheduled upon completion',
            },
          ],
        });

        lead.activityHistory.unshift({
          action: 'FOLLOWUP_SCHEDULED',
          changedBy: new Types.ObjectId(actor.id),
          timestamp: new Date(),
          notes: `Next follow-up scheduled for ${nextDate.toLocaleDateString()} ${nextDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        });
      } else {
        // Find if there is any other pending follow-up for this lead
        const nextPending = await FollowUp.findOne({
          leadId: lead._id,
          status: { $in: ['Scheduled', 'Rescheduled'] },
        }).sort({ scheduledAt: 1 });

        lead.nextFollowUpDate = nextPending ? nextPending.scheduledAt : undefined;
      }

      await lead.save();
    }

    return followUp.populate([
      {
        path: 'leadId',
        select: 'leadId studentName mobileNumber whatsappNumber email interestedCourse status priority',
      },
      {
        path: 'counsellorId',
        select: 'fullName email phone role',
      },
      {
        path: 'history.changedBy',
        select: 'fullName role',
      },
    ]);
  }

  /**
   * Reschedule follow-up to a new date & time with reason
   */
  static async rescheduleFollowUp(
    id: string,
    data: IRescheduleFollowUpDTO,
    actor: IAuthUser
  ): Promise<IFollowUpDocument> {
    const followUp = await FollowUp.findById(id);
    if (!followUp) {
      throw ApiError.notFound('Follow-up record not found');
    }

    // Role-based authorization
    if (
      actor.role === USER_ROLES.ADMISSION_COUNSELLOR ||
      actor.role === USER_ROLES.TELECALLER
    ) {
      if (followUp.counsellorId.toString() !== actor.id) {
        throw ApiError.forbidden(
          'You are not authorized to reschedule follow-ups assigned to another counsellor.'
        );
      }
    }

    if (followUp.status === 'Completed') {
      throw ApiError.badRequest('Cannot reschedule a completed follow-up. Please schedule a new one.');
    }

    const newDate = new Date(data.newScheduledAt);
    const oldDate = followUp.scheduledAt;

    // Check duplicate slot for this lead
    const duplicateWindowMs = 15 * 60 * 1000;
    const duplicate = await FollowUp.findOne({
      _id: { $ne: followUp._id },
      leadId: followUp.leadId,
      status: { $in: ['Scheduled', 'Rescheduled'] },
      scheduledAt: {
        $gte: new Date(newDate.getTime() - duplicateWindowMs),
        $lte: new Date(newDate.getTime() + duplicateWindowMs),
      },
    });

    if (duplicate) {
      throw ApiError.conflict(
        `Another follow-up is already scheduled for this student around ${new Date(
          duplicate.scheduledAt
        ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Please select another slot.`
      );
    }

    followUp.scheduledAt = newDate;
    followUp.status = 'Rescheduled';
    followUp.rescheduledAt = new Date();
    followUp.rescheduledReason = data.rescheduledReason;
    if (data.type) {
      followUp.type = data.type;
    }

    followUp.history.push({
      action: 'RESCHEDULED',
      changedBy: new Types.ObjectId(actor.id),
      timestamp: new Date(),
      previousScheduledAt: oldDate,
      newScheduledAt: newDate,
      notes: data.rescheduledReason,
    });

    await followUp.save();

    // Synchronize connected Lead
    const lead = await Lead.findById(followUp.leadId);
    if (lead) {
      lead.nextFollowUpDate = newDate;
      lead.activityHistory.unshift({
        action: 'FOLLOWUP_RESCHEDULED',
        changedBy: new Types.ObjectId(actor.id),
        timestamp: new Date(),
        notes: `Follow-up rescheduled from ${oldDate.toLocaleDateString()} ${oldDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to ${newDate.toLocaleDateString()} ${newDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}: "${data.rescheduledReason}"`,
      });
      await lead.save();
    }

    return followUp.populate([
      {
        path: 'leadId',
        select: 'leadId studentName mobileNumber whatsappNumber email interestedCourse status priority',
      },
      {
        path: 'counsellorId',
        select: 'fullName email phone role',
      },
      {
        path: 'history.changedBy',
        select: 'fullName role',
      },
    ]);
  }

  /**
   * Get reminders and urgency metrics for dashboard
   */
  static async getReminders(actor: IAuthUser) {
    const baseQuery: Record<string, unknown> = {};

    if (
      actor.role === USER_ROLES.ADMISSION_COUNSELLOR ||
      actor.role === USER_ROLES.TELECALLER
    ) {
      baseQuery.counsellorId = new Types.ObjectId(actor.id);
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [overdueCount, todayCount, upcomingCount, completedTodayCount, overdueList, todayList] =
      await Promise.all([
        FollowUp.countDocuments({
          ...baseQuery,
          status: { $in: ['Scheduled', 'Rescheduled'] },
          scheduledAt: { $lt: now },
        }),
        FollowUp.countDocuments({
          ...baseQuery,
          status: { $in: ['Scheduled', 'Rescheduled'] },
          scheduledAt: { $gte: startOfToday, $lte: endOfToday },
        }),
        FollowUp.countDocuments({
          ...baseQuery,
          status: { $in: ['Scheduled', 'Rescheduled'] },
          scheduledAt: { $gt: endOfToday },
        }),
        FollowUp.countDocuments({
          ...baseQuery,
          status: 'Completed',
          completedAt: { $gte: startOfToday, $lte: endOfToday },
        }),
        FollowUp.find({
          ...baseQuery,
          status: { $in: ['Scheduled', 'Rescheduled'] },
          scheduledAt: { $lt: now },
        })
          .sort({ scheduledAt: 1 })
          .limit(8)
          .populate([
            {
              path: 'leadId',
              select: 'leadId studentName mobileNumber whatsappNumber interestedCourse priority',
            },
            {
              path: 'counsellorId',
              select: 'fullName',
            },
          ]),
        FollowUp.find({
          ...baseQuery,
          status: { $in: ['Scheduled', 'Rescheduled'] },
          scheduledAt: { $gte: startOfToday, $lte: endOfToday },
        })
          .sort({ scheduledAt: 1 })
          .limit(8)
          .populate([
            {
              path: 'leadId',
              select: 'leadId studentName mobileNumber whatsappNumber interestedCourse priority',
            },
            {
              path: 'counsellorId',
              select: 'fullName',
            },
          ]),
      ]);

    return {
      overdueCount,
      todayCount,
      upcomingCount,
      completedTodayCount,
      overdueList,
      todayList,
    };
  }

  /**
   * Display follow-up breakdown and counts per counsellor
   */
  static async getCounsellorMetrics(_actor: IAuthUser) {
    const counsellors = await User.find({
      role: {
        $in: [
          USER_ROLES.ADMISSION_COUNSELLOR,
          USER_ROLES.TELECALLER,
          USER_ROLES.ADMIN,
        ],
      },
      isActive: true,
    }).select('fullName email phone role');

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const metrics = await Promise.all(
      counsellors.map(async (c) => {
        const cId = c._id;
        const [todayPending, overdue, upcoming, totalCompleted] = await Promise.all([
          FollowUp.countDocuments({
            counsellorId: cId,
            status: { $in: ['Scheduled', 'Rescheduled'] },
            scheduledAt: { $gte: startOfToday, $lte: endOfToday },
          }),
          FollowUp.countDocuments({
            counsellorId: cId,
            status: { $in: ['Scheduled', 'Rescheduled'] },
            scheduledAt: { $lt: now },
          }),
          FollowUp.countDocuments({
            counsellorId: cId,
            status: { $in: ['Scheduled', 'Rescheduled'] },
            scheduledAt: { $gt: endOfToday },
          }),
          FollowUp.countDocuments({
            counsellorId: cId,
            status: 'Completed',
          }),
        ]);

        return {
          counsellorId: cId.toString(),
          counsellorName: c.fullName,
          email: c.email,
          role: c.role,
          todayPending,
          overdue,
          upcoming,
          totalCompleted,
          totalActive: todayPending + overdue + upcoming,
        };
      })
    );

    return metrics;
  }

  /**
   * Get all follow-ups specifically linked to a given lead
   */
  static async getLeadFollowUps(leadId: string, actor: IAuthUser) {
    const lead = await Lead.findById(leadId);
    if (!lead || lead.isDeleted) {
      throw ApiError.notFound('Lead not found');
    }

    if (
      actor.role === USER_ROLES.ADMISSION_COUNSELLOR ||
      actor.role === USER_ROLES.TELECALLER
    ) {
      const assignedId = (lead.assignedCounsellor as any)?._id?.toString() ||
        lead.assignedCounsellor?.toString();
      if (assignedId && assignedId !== actor.id) {
        throw ApiError.forbidden('You are not authorized to view follow-ups for this lead.');
      }
    }

    const followUps = await FollowUp.find({ leadId: lead._id })
      .sort({ scheduledAt: -1 })
      .populate([
        {
          path: 'counsellorId',
          select: 'fullName email phone role',
        },
        {
          path: 'history.changedBy',
          select: 'fullName role',
        },
      ]);

    return followUps;
  }
}
