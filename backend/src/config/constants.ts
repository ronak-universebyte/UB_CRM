import { UserRole } from '../types';

export const USER_ROLES: Record<string, UserRole> = {
  SUPER_ADMIN: 'SuperAdmin',
  ADMIN: 'Admin',
  ADMISSION_COUNSELLOR: 'AdmissionCounsellor',
  TELECALLER: 'Telecaller',
  MARKETING_MANAGER: 'MarketingManager',
} as const;

export const DEFAULT_PERMISSIONS: Record<UserRole, string[]> = {
  SuperAdmin: ['*'],
  Admin: [
    'staff:read',
    'staff:create',
    'staff:update',
    'staff:deactivate',
    'leads:manage',
    'courses:manage',
    'batches:manage',
    'admissions:manage',
    'reports:view',
  ],
  AdmissionCounsellor: [
    'leads:read:assigned',
    'leads:update:assigned',
    'followups:manage',
    'admissions:create',
    'courses:view',
    'batches:view',
  ],
  Telecaller: [
    'leads:read:assigned',
    'leads:update:assigned',
    'followups:create',
    'calls:log',
  ],
  MarketingManager: [
    'leads:read:all',
    'campaigns:manage',
    'sources:manage',
    'reports:marketing',
  ],
};

export const REFRESH_TOKEN_COOKIE_NAME = 'ub_refresh_token';

export const LEAD_SOURCES = [
  'Website',
  'WhatsApp',
  'Google Ads',
  'Facebook Ads',
  'Instagram',
  'Phone Call',
  'Walk-in',
  'Referral',
  'Justdial',
  'Other',
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

export const COURSE_OPTIONS = [
  'MERN Full Stack',
  'Python',
  'Python with AI',
  'Java',
  'React JS',
  'Node JS',
  'PHP & Laravel',
  'Frontend',
  'Backend',
  'Data Science',
  'AI/ML',
  'Digital Marketing',
  'WordPress',
] as const;

export type CourseOption = (typeof COURSE_OPTIONS)[number];

export const LEAD_STATUSES = [
  'New',
  'Not Contacted',
  'Contacted',
  'Interested',
  'Counselling Scheduled',
  'Demo Scheduled',
  'Follow-up Required',
  'Negotiation',
  'Admission Confirmed',
  'Not Interested',
  'Lost',
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_PRIORITIES = ['Hot', 'Warm', 'Cold'] as const;

export type LeadPriority = (typeof LEAD_PRIORITIES)[number];

export const FOLLOWUP_TYPES = ['Call', 'WhatsApp', 'Meeting', 'Demo'] as const;

export type FollowUpType = (typeof FOLLOWUP_TYPES)[number];

export const FOLLOWUP_STATUSES = [
  'Scheduled',
  'Completed',
  'Rescheduled',
  'Cancelled',
] as const;

export type FollowUpStatus = (typeof FOLLOWUP_STATUSES)[number];


