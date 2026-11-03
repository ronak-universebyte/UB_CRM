import { apiClient } from '../lib/axios';
import {
  IFollowUp,
  IFollowUpFilter,
  IScheduleFollowUpPayload,
  ICompleteFollowUpPayload,
  IRescheduleFollowUpPayload,
  IFollowUpReminders,
  ICounsellorFollowUpMetrics,
} from '../types/followup';
import { IPagination } from '../types/auth';

export const FollowUpService = {
  async listFollowUps(
    params: IFollowUpFilter
  ): Promise<{ data: IFollowUp[]; pagination: IPagination }> {
    const response = await apiClient.get('/followups', { params });
    return {
      data: response.data.data,
      pagination: response.data.pagination,
    };
  },

  async getFollowUp(id: string): Promise<IFollowUp> {
    const response = await apiClient.get(`/followups/${id}`);
    return response.data.data;
  },

  async scheduleFollowUp(payload: IScheduleFollowUpPayload): Promise<IFollowUp> {
    const response = await apiClient.post('/followups', payload);
    return response.data.data;
  },

  async completeFollowUp(
    id: string,
    payload: ICompleteFollowUpPayload
  ): Promise<IFollowUp> {
    const response = await apiClient.patch(`/followups/${id}/complete`, payload);
    return response.data.data;
  },

  async rescheduleFollowUp(
    id: string,
    payload: IRescheduleFollowUpPayload
  ): Promise<IFollowUp> {
    const response = await apiClient.patch(`/followups/${id}/reschedule`, payload);
    return response.data.data;
  },

  async getReminders(): Promise<IFollowUpReminders> {
    const response = await apiClient.get('/followups/reminders');
    return response.data.data;
  },

  async getCounsellorMetrics(): Promise<ICounsellorFollowUpMetrics[]> {
    const response = await apiClient.get('/followups/counsellor-metrics');
    return response.data.data;
  },

  async getLeadFollowUps(leadId: string): Promise<IFollowUp[]> {
    const response = await apiClient.get(`/followups/lead/${leadId}`);
    return response.data.data;
  },
};

