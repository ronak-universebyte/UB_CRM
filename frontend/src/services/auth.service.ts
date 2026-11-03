import { apiClient } from '../lib/axios';
import { ILoginResponse, IUserProfile } from '../types/auth';

export const AuthService = {
  async login(email: string, password: string): Promise<ILoginResponse> {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data.data;
  },

  async refreshToken(refreshToken?: string): Promise<{ accessToken: string }> {
    const response = await apiClient.post('/auth/refresh-token', { refreshToken });
    return response.data.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  async getMe(): Promise<IUserProfile> {
    const response = await apiClient.get('/auth/me');
    return response.data.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  },

  async forgotPassword(email: string): Promise<{ resetToken?: string; message: string }> {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data.data || { message: response.data.message };
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/reset-password', {
      token,
      newPassword,
    });
  },
};

