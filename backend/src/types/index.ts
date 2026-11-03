import { Request } from 'express';
import { Document, Types } from 'mongoose';

export type UserRole =
  | 'SuperAdmin'
  | 'Admin'
  | 'AdmissionCounsellor'
  | 'Telecaller'
  | 'MarketingManager';

export interface ILoginActivity {
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  status: 'SUCCESS' | 'FAILED';
  reason?: string;
}

export interface IRefreshTokenSession {
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

export interface IUser {
  _id: Types.ObjectId;
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  permissions: string[];
  isActive: boolean;
  loginHistory: ILoginActivity[];
  refreshTokens: IRefreshTokenSession[];
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {
  _id: Types.ObjectId;
  comparePassword(candidatePassword: string): Promise<boolean>;
  generatePasswordResetToken(): string;
}

export interface IAuthUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  permissions: string[];
  isActive: boolean;
  lastLoginAt?: Date;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface IJwtAccessPayload {
  userId: string;
  email: string;
  role: UserRole;
  permissions: string[];
}

export interface IJwtRefreshPayload {
  userId: string;
  tokenVersion?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: IAuthUser;
}

export interface ILeadActivity {
  action: string;
  changedBy: Types.ObjectId | IAuthUser;
  changes?: Record<string, { from: unknown; to: unknown }>;
  timestamp: Date;
  notes?: string;
}

export interface ILead {
  _id: Types.ObjectId;
  leadId: string;
  studentName: string;
  mobileNumber: string;
  whatsappNumber?: string;
  email?: string;
  city?: string;
  college?: string;
  qualification?: string;
  graduationYear?: number;
  interestedCourse: string;
  leadSource: string;
  campaign?: string;
  assignedCounsellor?: Types.ObjectId | IUser;
  status: string;
  priority: 'Hot' | 'Warm' | 'Cold';
  budget?: number;
  expectedAdmissionDate?: Date;
  nextFollowUpDate?: Date;
  remarks?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId | IUser;
  activityHistory: ILeadActivity[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ILeadDocument extends ILead, Document {
  _id: Types.ObjectId;
}

export interface IFollowUpHistory {
  action: string;
  changedBy: Types.ObjectId | IUser;
  timestamp: Date;
  previousScheduledAt?: Date;
  newScheduledAt?: Date;
  notes?: string;
}

export interface IFollowUp {
  _id: Types.ObjectId;
  leadId: Types.ObjectId | ILead;
  counsellorId: Types.ObjectId | IUser;
  scheduledAt: Date;
  type: 'Call' | 'WhatsApp' | 'Meeting' | 'Demo';
  status: 'Scheduled' | 'Completed' | 'Rescheduled' | 'Cancelled';
  counsellingNotes: string;
  completedAt?: Date;
  completionRemarks?: string;
  rescheduledAt?: Date;
  rescheduledReason?: string;
  history: IFollowUpHistory[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IFollowUpDocument extends IFollowUp, Document {
  _id: Types.ObjectId;
}


