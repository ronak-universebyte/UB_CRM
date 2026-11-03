import { apiClient } from '../lib/axios';
import {
  IAiStatus,
  ILeadScore,
  IFollowUpAdvice,
  ILeadSummary,
  IGenerateAiMessagePayload,
  IGenerateAiMessageResponse,
  ILostLeadAnalysis,
} from '../types/ai';

export const AiService = {
  async getStatus(): Promise<IAiStatus> {
    const response = await apiClient.get('/ai/status');
    return response.data.data;
  },

  async scoreLead(leadId: string): Promise<ILeadScore> {
    const response = await apiClient.get(`/ai/score/${leadId}`);
    return response.data.data;
  },

  async getFollowUpAdvice(leadId: string): Promise<IFollowUpAdvice> {
    const response = await apiClient.get(`/ai/followup-advice/${leadId}`);
    return response.data.data;
  },

  async generateAiMessage(
    payload: IGenerateAiMessagePayload
  ): Promise<IGenerateAiMessageResponse> {
    const response = await apiClient.post('/ai/generate-message', payload);
    return response.data.data;
  },

  async summarizeLead(leadId: string): Promise<ILeadSummary> {
    const response = await apiClient.get(`/ai/summary/${leadId}`);
    return response.data.data;
  },

  async analyzeLostLeads(params?: {
    course?: string;
    source?: string;
    counsellorId?: string;
    limit?: number;
  }): Promise<ILostLeadAnalysis> {
    const response = await apiClient.get('/ai/lost-analysis', { params });
    return response.data.data;
  },
};

