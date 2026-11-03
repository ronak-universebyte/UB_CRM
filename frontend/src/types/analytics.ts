export type AnalyticsPreset =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'thismonth'
  | 'custom';

export interface IDashboardFilter {
  preset?: AnalyticsPreset;
  startDate?: string;
  endDate?: string;
  counsellorId?: string;
}

export interface IDashboardCards {
  totalLeads: number;
  allTimeLeads: number;
  todayLeads: number;
  newLeads: number;
  contacted: number;
  interested: number;
  followUpDue: number;
  overdue: number;
  admissionConfirmed: number;
  lostLeads: number;
  conversionRate: string;
  conversionRateNumber: number;
  totalRevenuePotential: number;
  dateRange: {
    startDate: string;
    endDate: string;
    preset: string;
  };
}

export interface IDailyGenerationItem {
  date: string;
  leads: number;
  admissions: number;
}

export interface IMonthlyGenerationItem {
  month: string;
  leads: number;
  admissions: number;
  conversionRate: number;
}

export interface ISourceDistributionItem {
  source: string;
  leads: number;
  admissions: number;
  conversionRate: number;
}

export interface ICourseDistributionItem {
  course: string;
  enquiries: number;
  admissions: number;
  totalRevenue: number;
}

export interface ICounsellorPerformanceItem {
  counsellorId: string;
  counsellorName: string;
  totalAssigned: number;
  admissions: number;
  lost: number;
  inProgress: number;
  totalRevenue: number;
  conversionRate: number;
}

export interface IConversionTrendItem {
  date: string;
  leads: number;
  admissions: number;
  conversionRate: number;
}

export interface IDashboardCharts {
  dailyGeneration: IDailyGenerationItem[];
  monthlyGeneration: IMonthlyGenerationItem[];
  sourceDistribution: ISourceDistributionItem[];
  courseDistribution: ICourseDistributionItem[];
  counsellorPerformance: ICounsellorPerformanceItem[];
  admissionConversionTrends: IConversionTrendItem[];
}

export type ReportType =
  | 'source'
  | 'course'
  | 'counsellor'
  | 'admission'
  | 'lost'
  | 'followup'
  | 'campaign';

export interface IReportResponse {
  reportType: ReportType;
  rows: Record<string, any>[];
}

