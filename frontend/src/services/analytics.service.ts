import { apiClient } from '../lib/axios';
import {
  IDashboardCards,
  IDashboardCharts,
  IDashboardFilter,
  IReportResponse,
  ReportType,
} from '../types/analytics';

export const AnalyticsService = {
  async getDashboardCards(filter: IDashboardFilter): Promise<IDashboardCards> {
    const response = await apiClient.get('/analytics/cards', { params: filter });
    return response.data.data;
  },

  async getDashboardCharts(filter: IDashboardFilter): Promise<IDashboardCharts> {
    const response = await apiClient.get('/analytics/charts', { params: filter });
    return response.data.data;
  },

  async getReportData(
    reportType: ReportType,
    filter: IDashboardFilter
  ): Promise<IReportResponse> {
    const response = await apiClient.get('/analytics/reports', {
      params: { ...filter, reportType },
    });
    return response.data.data;
  },

  async exportReportCsv(
    reportType: ReportType,
    filter: IDashboardFilter
  ): Promise<Blob> {
    const response = await apiClient.get('/analytics/reports/export', {
      params: { ...filter, reportType },
      responseType: 'blob',
    });
    return response.data;
  },
};

