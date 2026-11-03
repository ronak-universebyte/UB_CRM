import { apiClient } from '../lib/axios';
import {
  IWhatsAppConfigStatus,
  IWhatsAppTemplate,
  IWhatsAppMessage,
  IGenerateMessagePayload,
  IGenerateMessageResponse,
  IRecordAttemptPayload,
  ISendOfficialPayload,
  IWhatsAppLogsFilter,
} from '../types/whatsapp';
import { IPagination } from '../types/auth';

export const WhatsAppService = {
  async getConfigStatus(): Promise<IWhatsAppConfigStatus> {
    const response = await apiClient.get('/whatsapp/config');
    return response.data.data;
  },

  async getTemplates(): Promise<IWhatsAppTemplate[]> {
    const response = await apiClient.get('/whatsapp/templates');
    return response.data.data;
  },

  async generateMessage(payload: IGenerateMessagePayload): Promise<IGenerateMessageResponse> {
    const response = await apiClient.post('/whatsapp/generate-message', payload);
    return response.data.data;
  },

  async recordAttempt(payload: IRecordAttemptPayload): Promise<IWhatsAppMessage> {
    const response = await apiClient.post('/whatsapp/record-attempt', payload);
    return response.data.data;
  },

  async sendOfficialMessage(payload: ISendOfficialPayload): Promise<IWhatsAppMessage> {
    const response = await apiClient.post('/whatsapp/send-official', payload);
    return response.data.data;
  },

  async getLeadMessages(leadId: string): Promise<IWhatsAppMessage[]> {
    const response = await apiClient.get(`/whatsapp/messages/lead/${leadId}`);
    return response.data.data;
  },

  async listLogs(
    params: IWhatsAppLogsFilter
  ): Promise<{ data: IWhatsAppMessage[]; pagination: IPagination }> {
    const response = await apiClient.get('/whatsapp/logs', { params });
    return {
      data: response.data.data,
      pagination: response.data.pagination,
    };
  },
};

