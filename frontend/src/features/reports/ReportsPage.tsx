import React, { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  Download,
  RefreshCw,
  Compass,
  GraduationCap,
  UserCheck,
  CheckCircle2,
  UserX,
  PhoneCall,
  Megaphone,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { AnalyticsService } from '../../services/analytics.service';
import { UserService } from '../../services/user.service';
import { ReportType, AnalyticsPreset, IDashboardFilter } from '../../types/analytics';
import { IUser } from '../../types/auth';

const reportTabs: {
  id: ReportType;
  title: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    id: 'source',
    title: 'Lead Source',
    description: 'Enquiry volume and conversion by acquisition channel',
    icon: Compass,
  },
  {
    id: 'course',
    title: 'Course Enquiry',
    description: 'Program popularity, admissions and revenue potential',
    icon: GraduationCap,
  },
  {
    id: 'counsellor',
    title: 'Counsellor Performance',
    description: 'Lead assignments, conversions, and revenue achieved',
    icon: UserCheck,
  },
  {
    id: 'admission',
    title: 'Admission Report',
    description: 'Confirmed enrolments with student details and fees',
    icon: CheckCircle2,
  },
  {
    id: 'lost',
    title: 'Lost Leads',
    description: 'Dropped enquiries with loss reasons and feedback',
    icon: UserX,
  },
  {
    id: 'followup',
    title: 'Follow-up Report',
    description: 'Interaction channel efficiency and completion rates',
    icon: PhoneCall,
  },
  {
    id: 'campaign',
    title: 'Campaign Report',
    description: 'Marketing campaign ROI, leads and conversions',
    icon: Megaphone,
  },
];

const presets: { id: AnalyticsPreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7days', label: 'Last 7 Days' },
  { id: 'last30days', label: 'Last 30 Days' },
  { id: 'thismonth', label: 'This Month' },
  { id: 'custom', label: 'Custom' },
];

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();

  // Active Tab & Filters
  const [activeTab, setActiveTab] = useState<ReportType>('source');
  const [preset, setPreset] = useState<AnalyticsPreset>('last30days');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [counsellorId, setCounsellorId] = useState<string>('');
  const [counsellors, setCounsellors] = useState<IUser[]>([]);

  // Report Data State
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);

  const canFilterByCounsellor =
    user?.role === 'SuperAdmin' ||
    user?.role === 'Admin' ||
    user?.role === 'MarketingManager';

  // Load Counsellors
  useEffect(() => {
    if (canFilterByCounsellor) {
      UserService.listCounsellors()
        .then(setCounsellors)
        .catch((err) => console.error('Failed to load counsellors for reports', err));
    }
  }, [canFilterByCounsellor]);

  // Load Report Data
  const loadReportData = useCallback(async () => {
    setLoading(true);
    try {
      const filter: IDashboardFilter = {
        preset,
        startDate: preset === 'custom' ? startDate : undefined,
        endDate: preset === 'custom' ? endDate : undefined,
        counsellorId: counsellorId || undefined,
      };

      const res = await AnalyticsService.getReportData(activeTab, filter);
      setRows(res.rows || []);
    } catch (err) {
      console.error('Failed to load report data:', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, preset, startDate, endDate, counsellorId]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // CSV Export Action
  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const filter: IDashboardFilter = {
        preset,
        startDate: preset === 'custom' ? startDate : undefined,
        endDate: preset === 'custom' ? endDate : undefined,
        counsellorId: counsellorId || undefined,
      };

      const blob = await AnalyticsService.exportReportCsv(activeTab, filter);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `universebyte-${activeTab}-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to export CSV report:', err);
    } finally {
      setExporting(false);
    }
  };

  const activeTabMeta = reportTabs.find((t) => t.id === activeTab)!;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            UniverseByte Intelligence
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Domain Analytics & Reports
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Exportable business insights, conversion summaries, and counselor performance audits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadReportData()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            <span>Reload</span>
          </button>
          <button
            onClick={handleExportCsv}
            disabled={exporting || rows.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            <Download className={cn('h-3.5 w-3.5', exporting && 'animate-bounce')} />
            <span>{exporting ? 'Generating...' : 'Export to CSV'}</span>
          </button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-2 dark:border-slate-800">
        {reportTabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'flex items-center gap-2 shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all',
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{t.title}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-slate-400 mr-1" />
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-medium transition-all',
                preset === p.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
          )}

          {canFilterByCounsellor && (
            <select
              value={counsellorId}
              onChange={(e) => setCounsellorId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">All Counsellors</option>
              {counsellors.map((c) => (
                <option key={c.id || (c as any)._id} value={c.id || (c as any)._id}>
                  {c.fullName}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Report Info Banner */}
      <div className="flex items-center justify-between rounded-xl bg-slate-100/70 p-3.5 text-xs text-slate-600 dark:bg-slate-800/40 dark:text-slate-400">
        <div>
          <span className="font-bold text-slate-900 dark:text-white">
            {activeTabMeta.title}
          </span>
          <span className="ml-2 text-slate-500">— {activeTabMeta.description}</span>
        </div>
        <div className="font-semibold text-slate-700 dark:text-slate-300">
          {rows.length} {rows.length === 1 ? 'record' : 'records'} found
        </div>
      </div>

      {/* Dynamic Data Table by Report Type */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex h-48 items-center justify-center text-xs text-slate-400">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin text-blue-600" />
              Aggregating MongoDB report records...
            </div>
          ) : rows.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-xs text-slate-400">
              No data available for the chosen date range and filter criteria.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              {/* 1. Lead Source Table Header */}
              {activeTab === 'source' && (
                <>
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Lead Source</th>
                      <th className="px-4 py-3 text-center">Total Leads</th>
                      <th className="px-4 py-3 text-center">Admissions</th>
                      <th className="px-4 py-3 text-center">Lost</th>
                      <th className="px-4 py-3 text-center">In Progress</th>
                      <th className="px-4 py-3 text-right">Potential Budget</th>
                      <th className="px-4 py-3 text-center">Conversion Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                          {r.source}
                        </td>
                        <td className="px-4 py-3 text-center font-medium">{r.totalLeads}</td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                          {r.admissions}
                        </td>
                        <td className="px-4 py-3 text-center text-rose-500">{r.lost}</td>
                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">
                          {r.inProgress}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          ₹{(r.totalBudget || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            {r.conversionRate ? `${Number(r.conversionRate).toFixed(1)}%` : '0.0%'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {/* 2. Course Enquiry Table */}
              {activeTab === 'course' && (
                <>
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Course Program</th>
                      <th className="px-4 py-3 text-center">Enquiries</th>
                      <th className="px-4 py-3 text-center">Admissions</th>
                      <th className="px-4 py-3 text-center">Lost</th>
                      <th className="px-4 py-3 text-right">Potential Revenue</th>
                      <th className="px-4 py-3 text-center">Conversion Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                          {r.course}
                        </td>
                        <td className="px-4 py-3 text-center font-medium">{r.totalEnquiries}</td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                          {r.admissions}
                        </td>
                        <td className="px-4 py-3 text-center text-rose-500">{r.lost}</td>
                        <td className="px-4 py-3 text-right font-medium">
                          ₹{(r.potentialRevenue || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {r.conversionRate ? `${Number(r.conversionRate).toFixed(1)}%` : '0.0%'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {/* 3. Counsellor Performance Table */}
              {activeTab === 'counsellor' && (
                <>
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Counsellor</th>
                      <th className="px-4 py-3 text-center">Assigned Leads</th>
                      <th className="px-4 py-3 text-center">Admissions</th>
                      <th className="px-4 py-3 text-center">Lost</th>
                      <th className="px-4 py-3 text-center">In Progress</th>
                      <th className="px-4 py-3 text-right">Revenue Generated</th>
                      <th className="px-4 py-3 text-center">Conversion %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                          {r.counsellorName}
                        </td>
                        <td className="px-4 py-3 text-center font-medium">{r.assignedLeads}</td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                          {r.admissions}
                        </td>
                        <td className="px-4 py-3 text-center text-rose-500">{r.lost}</td>
                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">
                          {r.inProgress}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          ₹{(r.totalRevenue || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            {r.conversionRate ? `${Number(r.conversionRate).toFixed(1)}%` : '0.0%'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {/* 4. Admission Report Table */}
              {activeTab === 'admission' && (
                <>
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Lead ID</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Mobile</th>
                      <th className="px-4 py-3">Enrolled Course</th>
                      <th className="px-4 py-3">Lead Source</th>
                      <th className="px-4 py-3 text-right">Fee / Budget</th>
                      <th className="px-4 py-3">Counsellor</th>
                      <th className="px-4 py-3 text-center">Admission Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-mono font-medium text-blue-600 dark:text-blue-400">
                          {r.leadId}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                          {r.studentName}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                          {r.mobileNumber}
                        </td>
                        <td className="px-4 py-3">{r.course}</td>
                        <td className="px-4 py-3 text-slate-500">{r.source}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          ₹{(r.fee || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.counsellor}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{r.admissionDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {/* 5. Lost Lead Report Table */}
              {activeTab === 'lost' && (
                <>
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Lead ID</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Mobile</th>
                      <th className="px-4 py-3">Course</th>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Remarks / Reason</th>
                      <th className="px-4 py-3">Counsellor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-mono text-blue-600 dark:text-blue-400">
                          {r.leadId}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                          {r.studentName}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                          {r.mobileNumber}
                        </td>
                        <td className="px-4 py-3">{r.course}</td>
                        <td className="px-4 py-3 text-slate-500">{r.source}</td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate text-slate-600 dark:text-slate-400">
                          {r.remarks || 'No reason recorded'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.counsellor}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {/* 6. Follow-up Report Table */}
              {activeTab === 'followup' && (
                <>
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Follow-up Channel</th>
                      <th className="px-4 py-3 text-center">Total Scheduled</th>
                      <th className="px-4 py-3 text-center">Completed</th>
                      <th className="px-4 py-3 text-center">Rescheduled</th>
                      <th className="px-4 py-3 text-center">Pending</th>
                      <th className="px-4 py-3 text-center">Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                          {r.channel}
                        </td>
                        <td className="px-4 py-3 text-center font-medium">{r.total}</td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                          {r.completed}
                        </td>
                        <td className="px-4 py-3 text-center text-amber-500">{r.rescheduled}</td>
                        <td className="px-4 py-3 text-center text-blue-500">{r.pending}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {r.completionRate ? `${Number(r.completionRate).toFixed(1)}%` : '0.0%'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {/* 7. Campaign Report Table */}
              {activeTab === 'campaign' && (
                <>
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Campaign Name</th>
                      <th className="px-4 py-3 text-center">Total Leads</th>
                      <th className="px-4 py-3 text-center">Admissions</th>
                      <th className="px-4 py-3 text-center">Lost</th>
                      <th className="px-4 py-3 text-right">Potential Revenue</th>
                      <th className="px-4 py-3 text-center">Conversion Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                          {r.campaign || 'Direct / None'}
                        </td>
                        <td className="px-4 py-3 text-center font-medium">{r.totalLeads}</td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                          {r.admissions}
                        </td>
                        <td className="px-4 py-3 text-center text-rose-500">{r.lost}</td>
                        <td className="px-4 py-3 text-right font-medium">
                          ₹{(r.totalBudget || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            {r.conversionRate ? `${Number(r.conversionRate).toFixed(1)}%` : '0.0%'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
