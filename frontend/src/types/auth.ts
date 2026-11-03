export type UserRole =
  | 'SuperAdmin'
  | 'Admin'
  | 'AdmissionCounsellor'
  | 'Telecaller'
  | 'MarketingManager';

export interface IUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  permissions: string[];
  isActive: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ILoginActivityItem {
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  status: 'SUCCESS' | 'FAILED';
  reason?: string;
}

export interface IUserProfile extends IUser {
  loginHistory?: ILoginActivityItem[];
}

export interface ILoginResponse {
  user: IUser;
  accessToken: string;
  refreshToken?: string;
}

export interface IPagination {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

