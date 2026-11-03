import { IUser } from './auth';

export type LeadSource =
  | 'Website'
  | 'WhatsApp'
  | 'Google Ads'
  | 'Facebook Ads'
  | 'Instagram'
  | 'Phone Call'
  | 'Walk-in'
  | 'Referral'
  | 'Justdial'
  | 'Other';

export type CourseOption =
  | 'MERN Full Stack'
  | 'Python'
  | 'Python with AI'
  | 'Java'
  | 'React JS'
  | 'Node JS'
  | 'PHP & Laravel'
  | 'Frontend'
  | 'Backend'
  | 'Data Science'
  | 'AI/ML'
  | 'Digital Marketing'
  | 'WordPress';

export type LeadStatus =
  | 'New'
  | 'Not Contacted'
  | 'Contacted'
  | 'Interested'
  | 'Counselling Scheduled'
  | 'Demo Scheduled'
  | 'Follow-up Required'
  | 'Negotiation'
  | 'Admission Confirmed'
  | 'Not Interested'
  | 'Lost';

export type LeadPriority = 'Hot' | 'Warm' | 'Cold';

export interface ILeadActivity {
  action: string;
  changedBy: {
    id?: string;
    _id?: string;
    fullName: string;
    email: string;
    role: string;
  };
  changes?: Record<string, { from: unknown; to: unknown }>;
  timestamp: string;
  notes?: string;
}

export interface ILead {
  id: string;
  _id?: string;
  leadId: string;
  studentName: string;
  mobileNumber: string;
  whatsappNumber?: string;
  email?: string;
  city?: string;
  college?: string;
  qualification?: string;
  graduationYear?: number;
  interestedCourse: CourseOption;
  leadSource: LeadSource;
  campaign?: string;
  assignedCounsellor?: IUser;
  status: LeadStatus;
  priority: LeadPriority;
  budget?: number;
  expectedAdmissionDate?: string;
  nextFollowUpDate?: string;
  remarks?: string;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: {
    fullName: string;
    email: string;
  };
  activityHistory: ILeadActivity[];
  createdAt: string;
  updatedAt: string;
}

export interface IListLeadsFilter {
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

export interface ICreateLeadPayload {
  studentName: string;
  mobileNumber: string;
  whatsappNumber?: string;
  email?: string;
  city?: string;
  college?: string;
  qualification?: string;
  graduationYear?: number;
  interestedCourse: CourseOption;
  leadSource: LeadSource;
  campaign?: string;
  assignedCounsellor?: string;
  status?: LeadStatus;
  priority?: LeadPriority;
  budget?: number;
  expectedAdmissionDate?: string;
  nextFollowUpDate?: string;
  remarks?: string;
}

export interface IUpdateLeadPayload extends Partial<ICreateLeadPayload> {
  activityNotes?: string;
}

