import { Types } from 'mongoose';
import { Lead } from '../models/lead.model';
import { FollowUp } from '../models/followup.model';
import { User } from '../models/user.model';
import { IAuthUser } from '../types';
import { USER_ROLES } from '../config/constants';
import { ApiError } from '../utils/api-error';

export interface IDashboardFilter {
  preset?: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thismonth' | 'custom';
  startDate?: string;
  endDate?: string;
  counsellorId?: string;
}

export class AnalyticsService {
  /**
   * Helper to compute exact date boundaries based on filter presets
   */
  static getDateBoundaries(filter: IDashboardFilter): { start: Date; end: Date } {
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    let start = new Date(startOfToday);
    let end = new Date(endOfToday);

    switch (filter.preset) {
      case 'today':
        start = startOfToday;
        end = endOfToday;
        break;
      case 'yesterday': {
        const yStart = new Date(startOfToday);
        yStart.setDate(yStart.getDate() - 1);
        const yEnd = new Date(yStart);
        yEnd.setHours(23, 59, 59, 999);
        start = yStart;
        end = yEnd;
        break;
      }
      case 'last7days': {
        const d7 = new Date(startOfToday);
        d7.setDate(d7.getDate() - 6);
        start = d7;
        end = endOfToday;
        break;
      }
      case 'last30days': {
        const d30 = new Date(startOfToday);
        d30.setDate(d30.getDate() - 29);
        start = d30;
        end = endOfToday;
        break;
      }
      case 'thismonth': {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        end = endOfToday;
        break;
      }
      case 'custom':
        if (filter.startDate) {
          start = new Date(filter.startDate);
          start.setHours(0, 0, 0, 0);
        }
        if (filter.endDate) {
          end = new Date(filter.endDate);
          end.setHours(23, 59, 59, 999);
        }
        break;
      default: {
        const d30 = new Date(startOfToday);
        d30.setDate(d30.getDate() - 29);
        start = d30;
        end = endOfToday;
      }
    }

    return { start, end };
  }

  /**
   * 1. Dashboard KPI Cards (10 Core Metrics via MongoDB Aggregation)
   */
  static async getDashboardCards(filter: IDashboardFilter, actor: IAuthUser) {
    const { start, end } = this.getDateBoundaries(filter);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const leadMatch: Record<string, unknown> = {
      isDeleted: false,
    };

    // Role-based data access enforcement
    if (
      actor.role === USER_ROLES.ADMISSION_COUNSELLOR ||
      actor.role === USER_ROLES.TELECALLER
    ) {
      leadMatch.assignedCounsellor = new Types.ObjectId(actor.id);
    } else if (filter.counsellorId) {
      leadMatch.assignedCounsellor = new Types.ObjectId(filter.counsellorId);
    }

    // Facet aggregation for total, today, status breakdowns, and budget
    const [leadMetrics] = await Lead.aggregate([
      { $match: leadMatch },
      {
        $facet: {
          total: [{ $count: 'count' }],
          inFilterRange: [
            { $match: { createdAt: { $gte: start, $lte: end } } },
            { $count: 'count' },
          ],
          today: [
            { $match: { createdAt: { $gte: startOfToday, $lte: endOfToday } } },
            { $count: 'count' },
          ],
          byStatus: [
            { $match: { createdAt: { $gte: start, $lte: end } } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ],
          totalAdmissions: [
            {
              $match: {
                status: 'Admission Confirmed',
                createdAt: { $gte: start, $lte: end },
              },
            },
            { $group: { _id: null, count: { $sum: 1 }, totalFee: { $sum: '$budget' } } },
          ],
        },
      },
    ]);

    // Follow-up Aggregation for Follow-up Due & Overdue
    const followupMatch: Record<string, unknown> = {};
    if (
      actor.role === USER_ROLES.ADMISSION_COUNSELLOR ||
      actor.role === USER_ROLES.TELECALLER
    ) {
      followupMatch.counsellorId = new Types.ObjectId(actor.id);
    } else if (filter.counsellorId) {
      followupMatch.counsellorId = new Types.ObjectId(filter.counsellorId);
    }

    const [followupMetrics] = await FollowUp.aggregate([
      { $match: followupMatch },
      {
        $facet: {
          todayDue: [
            {
              $match: {
                status: { $in: ['Scheduled', 'Rescheduled'] },
                scheduledAt: { $gte: startOfToday, $lte: endOfToday },
              },
            },
            { $count: 'count' },
          ],
          overdue: [
            {
              $match: {
                status: { $in: ['Scheduled', 'Rescheduled'] },
                scheduledAt: { $lt: now },
              },
            },
            { $count: 'count' },
          ],
        },
      },
    ]);

    // Parse status counts
    const statusMap: Record<string, number> = {};
    if (leadMetrics?.byStatus) {
      for (const item of leadMetrics.byStatus) {
        statusMap[item._id] = item.count;
      }
    }

    const totalLeads = leadMetrics?.inFilterRange?.[0]?.count || 0;
    const allTimeLeads = leadMetrics?.total?.[0]?.count || 0;
    const todayLeads = leadMetrics?.today?.[0]?.count || 0;
    const newLeads = statusMap['New'] || 0;
    const contacted = (statusMap['Contacted'] || 0) + (statusMap['Not Contacted'] || 0);
    const interested = statusMap['Interested'] || 0;
    const followUpDue = followupMetrics?.todayDue?.[0]?.count || 0;
    const overdue = followupMetrics?.overdue?.[0]?.count || 0;
    const admissionConfirmed = statusMap['Admission Confirmed'] || 0;
    const lostLeads = (statusMap['Lost'] || 0) + (statusMap['Not Interested'] || 0);

    const conversionRateNumber =
      totalLeads > 0 ? (admissionConfirmed / totalLeads) * 100 : 0;
    const conversionRate = `${conversionRateNumber.toFixed(1)}%`;
    const totalRevenuePotential = leadMetrics?.totalAdmissions?.[0]?.totalFee || 0;

    return {
      totalLeads,
      allTimeLeads,
      todayLeads,
      newLeads,
      contacted,
      interested,
      followUpDue,
      overdue,
      admissionConfirmed,
      lostLeads,
      conversionRate,
      conversionRateNumber: Number(conversionRateNumber.toFixed(1)),
      totalRevenuePotential,
      dateRange: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        preset: filter.preset || 'last30days',
      },
    };
  }

  /**
   * 2. Dashboard Charts (All 6 Visualizations via MongoDB Aggregations)
   */
  static async getDashboardCharts(filter: IDashboardFilter, actor: IAuthUser) {
    const { start, end } = this.getDateBoundaries(filter);

    const leadMatch: Record<string, unknown> = {
      isDeleted: false,
      createdAt: { $gte: start, $lte: end },
    };

    if (
      actor.role === USER_ROLES.ADMISSION_COUNSELLOR ||
      actor.role === USER_ROLES.TELECALLER
    ) {
      leadMatch.assignedCounsellor = new Types.ObjectId(actor.id);
    } else if (filter.counsellorId) {
      leadMatch.assignedCounsellor = new Types.ObjectId(filter.counsellorId);
    }

    const [
      dailyGeneration,
      sourceDistribution,
      courseDistribution,
      counsellorPerformance,
    ] = await Promise.all([
      // Chart 1: Daily Lead Generation
      Lead.aggregate([
        { $match: leadMatch },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            leads: { $sum: 1 },
            admissions: {
              $sum: { $cond: [{ $eq: ['$status', 'Admission Confirmed'] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            date: '$_id',
            leads: 1,
            admissions: 1,
            _id: 0,
          },
        },
      ]),

      // Chart 3: Source-wise Lead Distribution
      Lead.aggregate([
        { $match: leadMatch },
        {
          $group: {
            _id: '$leadSource',
            count: { $sum: 1 },
            admissions: {
              $sum: { $cond: [{ $eq: ['$status', 'Admission Confirmed'] }, 1, 0] },
            },
          },
        },
        { $sort: { count: -1 } },
        {
          $project: {
            source: '$_id',
            count: 1,
            admissions: 1,
            _id: 0,
          },
        },
      ]),

      // Chart 4: Course-wise Enquiries
      Lead.aggregate([
        { $match: leadMatch },
        {
          $group: {
            _id: '$interestedCourse',
            count: { $sum: 1 },
            admissions: {
              $sum: { $cond: [{ $eq: ['$status', 'Admission Confirmed'] }, 1, 0] },
            },
          },
        },
        { $sort: { count: -1 } },
        {
          $project: {
            course: '$_id',
            count: 1,
            admissions: 1,
            _id: 0,
          },
        },
      ]),

      // Chart 5: Counsellor Performance
      Lead.aggregate([
        { $match: leadMatch },
        {
          $group: {
            _id: '$assignedCounsellor',
            assignedLeads: { $sum: 1 },
            admissions: {
              $sum: { $cond: [{ $eq: ['$status', 'Admission Confirmed'] }, 1, 0] },
            },
            lost: {
              $sum: { $cond: [{ $in: ['$status', ['Lost', 'Not Interested']] }, 1, 0] },
            },
            inProgress: {
              $sum: {
                $cond: [
                  {
                    $not: [
                      {
                        $in: ['$status', ['Admission Confirmed', 'Lost', 'Not Interested']],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'counsellor',
          },
        },
        {
          $unwind: {
            path: '$counsellor',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            counsellorId: '$_id',
            name: { $ifNull: ['$counsellor.fullName', 'Unassigned'] },
            assignedLeads: 1,
            admissions: 1,
            lost: 1,
            inProgress: 1,
            conversionRate: {
              $cond: [
                { $gt: ['$assignedLeads', 0] },
                {
                  $multiply: [
                    { $divide: ['$admissions', '$assignedLeads'] },
                    100,
                  ],
                },
                0,
              ],
            },
            _id: 0,
          },
        },
        { $sort: { assignedLeads: -1 } },
      ]),
    ]);

    // Chart 2: Monthly Lead Generation (Past 6 Months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyLeadMatch: Record<string, unknown> = {
      isDeleted: false,
      createdAt: { $gte: sixMonthsAgo },
    };
    if (
      actor.role === USER_ROLES.ADMISSION_COUNSELLOR ||
      actor.role === USER_ROLES.TELECALLER
    ) {
      monthlyLeadMatch.assignedCounsellor = new Types.ObjectId(actor.id);
    } else if (filter.counsellorId) {
      monthlyLeadMatch.assignedCounsellor = new Types.ObjectId(filter.counsellorId);
    }

    const monthlyGeneration = await Lead.aggregate([
      { $match: monthlyLeadMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          leads: { $sum: 1 },
          admissions: {
            $sum: { $cond: [{ $eq: ['$status', 'Admission Confirmed'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          month: '$_id',
          leads: 1,
          admissions: 1,
          conversionRate: {
            $cond: [
              { $gt: ['$leads', 0] },
              { $multiply: [{ $divide: ['$admissions', '$leads'] }, 100] },
              0,
            ],
          },
          _id: 0,
        },
      },
    ]);

    // Chart 6: Admission Conversion Trends (Weekly / Daily)
    const conversionTrends = dailyGeneration.map((item) => ({
      date: item.date,
      leads: item.leads,
      admissions: item.admissions,
      conversionRate: item.leads > 0 ? Number(((item.admissions / item.leads) * 100).toFixed(1)) : 0,
    }));

    return {
      dailyGeneration,
      monthlyGeneration,
      sourceDistribution,
      courseDistribution,
      counsellorPerformance,
      admissionConversionTrends: conversionTrends,
    };
  }

  /**
   * 3. Comprehensive Report Generator (7 Domain Reports)
   */
  static async getReportData(
    reportType: string,
    filter: IDashboardFilter,
    actor: IAuthUser
  ) {
    const { start, end } = this.getDateBoundaries(filter);

    const leadMatch: Record<string, unknown> = {
      isDeleted: false,
      createdAt: { $gte: start, $lte: end },
    };

    if (
      actor.role === USER_ROLES.ADMISSION_COUNSELLOR ||
      actor.role === USER_ROLES.TELECALLER
    ) {
      leadMatch.assignedCounsellor = new Types.ObjectId(actor.id);
    } else if (filter.counsellorId) {
      leadMatch.assignedCounsellor = new Types.ObjectId(filter.counsellorId);
    }

    switch (reportType) {
      // 1. Lead Source Report
      case 'source': {
        const rows = await Lead.aggregate([
          { $match: leadMatch },
          {
            $group: {
              _id: '$leadSource',
              totalLeads: { $sum: 1 },
              admissions: {
                $sum: { $cond: [{ $eq: ['$status', 'Admission Confirmed'] }, 1, 0] },
              },
              lost: {
                $sum: { $cond: [{ $in: ['$status', ['Lost', 'Not Interested']] }, 1, 0] },
              },
              inProgress: {
                $sum: {
                  $cond: [
                    {
                      $not: [
                        { $in: ['$status', ['Admission Confirmed', 'Lost', 'Not Interested']] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              totalBudget: { $sum: '$budget' },
            },
          },
          { $sort: { totalLeads: -1 } },
          {
            $project: {
              source: '$_id',
              totalLeads: 1,
              admissions: 1,
              lost: 1,
              inProgress: 1,
              totalBudget: 1,
              conversionRate: {
                $cond: [
                  { $gt: ['$totalLeads', 0] },
                  { $multiply: [{ $divide: ['$admissions', '$totalLeads'] }, 100] },
                  0,
                ],
              },
              _id: 0,
            },
          },
        ]);
        return { reportType, rows };
      }

      // 2. Course Enquiry Report
      case 'course': {
        const rows = await Lead.aggregate([
          { $match: leadMatch },
          {
            $group: {
              _id: '$interestedCourse',
              totalEnquiries: { $sum: 1 },
              admissions: {
                $sum: { $cond: [{ $eq: ['$status', 'Admission Confirmed'] }, 1, 0] },
              },
              lost: {
                $sum: { $cond: [{ $in: ['$status', ['Lost', 'Not Interested']] }, 1, 0] },
              },
              potentialRevenue: { $sum: '$budget' },
            },
          },
          { $sort: { totalEnquiries: -1 } },
          {
            $project: {
              course: '$_id',
              totalEnquiries: 1,
              admissions: 1,
              lost: 1,
              potentialRevenue: 1,
              conversionRate: {
                $cond: [
                  { $gt: ['$totalEnquiries', 0] },
                  { $multiply: [{ $divide: ['$admissions', '$totalEnquiries'] }, 100] },
                  0,
                ],
              },
              _id: 0,
            },
          },
        ]);
        return { reportType, rows };
      }

      // 3. Counsellor Performance Report
      case 'counsellor': {
        const rows = await Lead.aggregate([
          { $match: leadMatch },
          {
            $group: {
              _id: '$assignedCounsellor',
              assignedLeads: { $sum: 1 },
              admissions: {
                $sum: { $cond: [{ $eq: ['$status', 'Admission Confirmed'] }, 1, 0] },
              },
              lost: {
                $sum: { $cond: [{ $in: ['$status', ['Lost', 'Not Interested']] }, 1, 0] },
              },
              inProgress: {
                $sum: {
                  $cond: [
                    {
                      $not: [
                        { $in: ['$status', ['Admission Confirmed', 'Lost', 'Not Interested']] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              totalRevenue: {
                $sum: {
                  $cond: [
                    { $eq: ['$status', 'Admission Confirmed'] },
                    { $ifNull: ['$budget', 0] },
                    0,
                  ],
                },
              },
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'counsellor',
            },
          },
          { $unwind: { path: '$counsellor', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              counsellorName: { $ifNull: ['$counsellor.fullName', 'Unassigned'] },
              email: { $ifNull: ['$counsellor.email', 'N/A'] },
              assignedLeads: 1,
              admissions: 1,
              lost: 1,
              inProgress: 1,
              totalRevenue: 1,
              conversionRate: {
                $cond: [
                  { $gt: ['$assignedLeads', 0] },
                  { $multiply: [{ $divide: ['$admissions', '$assignedLeads'] }, 100] },
                  0,
                ],
              },
              _id: 0,
            },
          },
          { $sort: { assignedLeads: -1 } },
        ]);
        return { reportType, rows };
      }

      // 4. Admission Report (Detailed conversion records)
      case 'admission': {
        const rows = await Lead.find({
          ...leadMatch,
          status: 'Admission Confirmed',
        })
          .sort({ updatedAt: -1 })
          .populate('assignedCounsellor', 'fullName email')
          .select('leadId studentName mobileNumber interestedCourse leadSource budget updatedAt');

        return {
          reportType,
          rows: rows.map((r) => ({
            leadId: r.leadId,
            studentName: r.studentName,
            mobileNumber: r.mobileNumber,
            course: r.interestedCourse,
            source: r.leadSource,
            fee: r.budget || 0,
            counsellor: (r.assignedCounsellor as any)?.fullName || 'Unassigned',
            admissionDate: r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : 'N/A',
          })),
        };
      }

      // 5. Lost Lead Report
      case 'lost': {
        const rows = await Lead.find({
          ...leadMatch,
          status: { $in: ['Lost', 'Not Interested'] },
        })
          .sort({ updatedAt: -1 })
          .populate('assignedCounsellor', 'fullName email')
          .select('leadId studentName mobileNumber interestedCourse leadSource status remarks updatedAt activityHistory');

        return {
          reportType,
          rows: rows.map((r) => {
            const statusChange = r.activityHistory?.find((h) => h.action === 'STATUS_CHANGED');
            return {
              leadId: r.leadId,
              studentName: r.studentName,
              mobileNumber: r.mobileNumber,
              course: r.interestedCourse,
              source: r.leadSource,
              status: r.status,
              reason: statusChange?.notes || r.remarks || 'Not Specified',
              counsellor: (r.assignedCounsellor as any)?.fullName || 'Unassigned',
              date: r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : 'N/A',
            };
          }),
        };
      }

      // 6. Follow-up Report
      case 'followup': {
        const fMatch: Record<string, unknown> = {
          scheduledAt: { $gte: start, $lte: end },
        };
        if (
          actor.role === USER_ROLES.ADMISSION_COUNSELLOR ||
          actor.role === USER_ROLES.TELECALLER
        ) {
          fMatch.counsellorId = new Types.ObjectId(actor.id);
        } else if (filter.counsellorId) {
          fMatch.counsellorId = new Types.ObjectId(filter.counsellorId);
        }

        const rows = await FollowUp.aggregate([
          { $match: fMatch },
          {
            $group: {
              _id: '$type',
              total: { $sum: 1 },
              completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
              rescheduled: { $sum: { $cond: [{ $eq: ['$status', 'Rescheduled'] }, 1, 0] } },
              pending: { $sum: { $cond: [{ $eq: ['$status', 'Scheduled'] }, 1, 0] } },
            },
          },
          { $sort: { total: -1 } },
          {
            $project: {
              channel: '$_id',
              total: 1,
              completed: 1,
              rescheduled: 1,
              pending: 1,
              completionRate: {
                $cond: [
                  { $gt: ['$total', 0] },
                  { $multiply: [{ $divide: ['$completed', '$total'] }, 100] },
                  0,
                ],
              },
              _id: 0,
            },
          },
        ]);
        return { reportType, rows };
      }

      // 7. Campaign Report
      case 'campaign': {
        const rows = await Lead.aggregate([
          {
            $match: {
              ...leadMatch,
              campaign: { $exists: true, $ne: '' },
            },
          },
          {
            $group: {
              _id: '$campaign',
              totalLeads: { $sum: 1 },
              admissions: {
                $sum: { $cond: [{ $eq: ['$status', 'Admission Confirmed'] }, 1, 0] },
              },
              lost: {
                $sum: { $cond: [{ $in: ['$status', ['Lost', 'Not Interested']] }, 1, 0] },
              },
              totalBudget: { $sum: '$budget' },
            },
          },
          { $sort: { totalLeads: -1 } },
          {
            $project: {
              campaign: '$_id',
              totalLeads: 1,
              admissions: 1,
              lost: 1,
              totalBudget: 1,
              conversionRate: {
                $cond: [
                  { $gt: ['$totalLeads', 0] },
                  { $multiply: [{ $divide: ['$admissions', '$totalLeads'] }, 100] },
                  0,
                ],
              },
              _id: 0,
            },
          },
        ]);
        return { reportType, rows };
      }

      default:
        throw ApiError.badRequest(`Unsupported report type: ${reportType}`);
    }
  }

  /**
   * 4. Export Report Data as RFC-compliant CSV
   */
  static async exportReportCsv(
    reportType: string,
    filter: IDashboardFilter,
    actor: IAuthUser
  ): Promise<string> {
    const { rows } = await this.getReportData(reportType, filter, actor);

    if (!rows || rows.length === 0) {
      return 'No data available for the selected filters.';
    }

    const escapeCsv = (val: unknown): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = Object.keys(rows[0]);
    const csvRows = rows.map((r: any) =>
      headers
        .map((h) => {
          let val = r[h];
          if (typeof val === 'number' && h.includes('Rate')) {
            val = `${val.toFixed(1)}%`;
          }
          return escapeCsv(val);
        })
        .join(',')
    );

    return [headers.join(','), ...csvRows].join('\n');
  }
}

