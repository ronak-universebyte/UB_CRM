import { apiClient } from '../lib/axios';
import { IUser, IPagination, UserRole } from '../types/auth';

export interface IListUsersFilter {
  search?: string;
  role?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface ICreateUserPayload {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  permissions?: string[];
}

export interface IUpdateUserPayload {
  fullName?: string;
  phone?: string;
  role?: UserRole;
  permissions?: string[];
  isActive?: boolean;
}

export const UserService = {
  async listUsers(
    params: IListUsersFilter
  ): Promise<{ data: IUser[]; pagination: IPagination }> {
    const response = await apiClient.get('/users', { params });
    return {
      data: response.data.data,
      pagination: response.data.pagination,
    };
  },

  async getUser(id: string): Promise<IUser> {
    const response = await apiClient.get(`/users/${id}`);
    return response.data.data;
  },

  async createUser(payload: ICreateUserPayload): Promise<IUser> {
    const response = await apiClient.post('/users', payload);
    return response.data.data;
  },

  async updateUser(id: string, payload: IUpdateUserPayload): Promise<IUser> {
    const response = await apiClient.put(`/users/${id}`, payload);
    return response.data.data;
  },

  async toggleStatus(id: string, isActive: boolean): Promise<IUser> {
    const response = await apiClient.patch(`/users/${id}/toggle-status`, { isActive });
    return response.data.data;
  },

  async listCounsellors(): Promise<IUser[]> {
    const response = await apiClient.get('/users/counsellors');
    return response.data.data;
  },
};

