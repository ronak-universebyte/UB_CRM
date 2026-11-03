import { apiClient } from '../lib/axios';
import {
  ILead,
  IListLeadsFilter,
  ICreateLeadPayload,
  IUpdateLeadPayload,
  LeadStatus,
} from '../types/lead';
import { IPagination } from '../types/auth';

export const LeadService = {
  async listLeads(
    params: IListLeadsFilter
  ): Promise<{ data: ILead[]; pagination: IPagination }> {
    const response = await apiClient.get('/leads', { params });
    return {
      data: response.data.data,
      pagination: response.data.pagination,
    };
  },

  async getLead(id: string): Promise<ILead> {
    const response = await apiClient.get(`/leads/${id}`);
    return response.data.data;
  },

  async createLead(payload: ICreateLeadPayload): Promise<ILead> {
    const response = await apiClient.post('/leads', payload);
    return response.data.data;
  },

  async updateLead(id: string, payload: IUpdateLeadPayload): Promise<ILead> {
    const response = await apiClient.put(`/leads/${id}`, payload);
    return response.data.data;
  },

  async softDeleteLead(id: string): Promise<ILead> {
    const response = await apiClient.delete(`/leads/${id}`);
    return response.data.data;
  },

  async restoreLead(id: string): Promise<ILead> {
    const response = await apiClient.patch(`/leads/${id}/restore`);
    return response.data.data;
  },

  async permanentDeleteLead(id: string): Promise<void> {
    await apiClient.delete(`/leads/${id}/permanent`);
  },

  async checkDuplicateMobile(
    mobileNumber: string,
    excludeId?: string
  ): Promise<{ isDuplicate: boolean; existingLead: any }> {
    const response = await apiClient.get('/leads/check-duplicate', {
      params: { mobileNumber, excludeId },
    });
    return response.data.data;
  },

  async bulkAssign(
    leadIds: string[],
    counsellorId: string
  ): Promise<{ updatedCount: number }> {
    const response = await apiClient.post('/leads/bulk-assign', {
      leadIds,
      counsellorId,
    });
    return response.data.data;
  },

  async exportCsv(params: IListLeadsFilter): Promise<Blob> {
    const response = await apiClient.get('/leads/export/csv', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  async importLeads(
    leads: any[]
  ): Promise<{
    totalProcessed: number;
    successCount: number;
    failedRows: Array<{ row: number; mobileNumber?: string; reason: string }>;
  }> {
    const response = await apiClient.post('/leads/import', { leads });
    return response.data.data;
  },

  async updateStatus(
    id: string,
    status: LeadStatus,
    notes?: string
  ): Promise<ILead> {
    const response = await apiClient.patch(`/leads/${id}/status`, { status, notes });
    return response.data.data;
  },

  async getKanban(params?: IListLeadsFilter): Promise<ILead[]> {
    const response = await apiClient.get('/leads/kanban', { params });
    return response.data.data;
  },
};

