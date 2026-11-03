import { ILead } from './lead';
import { IUser } from './auth';

export type FollowUpType = 'Call' | 'WhatsApp' | 'Meeting' | 'Demo';

export type FollowUpStatus = 'Scheduled' | 'Completed' | 'Rescheduled' | 'Cancelled';

export type FollowUpSection = 'today' | 'upcoming' | 'overdue' | 'completed';

export interface IFollowUpHistoryItem {
  action: 'SCHEDULED' | 'RESCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NOTES_UPDATED';
  changedBy: {
    id?: string;
    _id?: string;
    fullName: string;
    role?: string;
  };
  timestamp: string;
  previousScheduledAt?: string;
  newScheduledAt?: string;
  notes?: string;
}

export interface IFollowUp {
  id: string;
  _id?: string;
  leadId: ILead;
  counsellorId: IUser;
  scheduledAt: string;
  type: FollowUpType;
  status: FollowUpStatus;
  counsellingNotes: string;
  completedAt?: string;
  completionRemarks?: string;
  rescheduledAt?: string;
  rescheduledReason?: string;
  history: IFollowUpHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface IScheduleFollowUpPayload {
  leadId: string;
  scheduledAt: string;
  type: FollowUpType;
  counsellingNotes: string;
  counsellorId?: string;
}

export interface ICompleteFollowUpPayload {
  completionRemarks: string;
  nextFollowUpDate?: string;
  nextFollowUpType?: FollowUpType;
  nextFollowUpNotes?: string;
}

export interface IRescheduleFollowUpPayload {
  newScheduledAt: string;
  rescheduledReason: string;
  type?: FollowUpType;
}

export interface IFollowUpFilter {
  section?: FollowUpSection;
  type?: FollowUpType;
  status?: FollowUpStatus;
  counsellorId?: string;
  leadId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface IFollowUpReminders {
  overdueCount: number;
  todayCount: number;
  upcomingCount: number;
  completedTodayCount: number;
  overdueList: IFollowUp[];
  todayList: IFollowUp[];
}

export interface ICounsellorFollowUpMetrics {
  counsellorId: string;
  counsellorName: string;
  email: string;
  role: string;
  todayPending: number;
  overdue: number;
  upcoming: number;
  totalCompleted: number;
  totalActive: number;
}
