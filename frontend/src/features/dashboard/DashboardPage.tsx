import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Target,
  Calendar,
  AlertCircle,
  Phone,
  MessageSquare,
  CalendarClock,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  Flame,
  UserCheck,
  UserX,
  Compass,
  GraduationCap,
  Clock,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatDate, cn } from '../../lib/utils';
import { AnalyticsService } from '../../services/analytics.service';
import { FollowUpService } from '../../services/followup.service';
import { UserService } from '../../services/user.service';
import {
  IDashboardCards,
  IDashboardCharts,
  AnalyticsPreset,
  IDashboardFilter,
} from '../../types/analytics';
import { IFollowUpReminders } from '../../types/followup';
import { IUser } from '../../types/auth';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  // Filter State
  const [preset, setPreset] = useState<AnalyticsPreset>('last30days');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [counsellorId, setCounsellorId] = useState<string>('');
  const [counsellors, setCounsellors] = useState<IUser[]>([]);

  // Data State
  const [cards, setCards] = useState<IDashboardCards | null>(null);
  const [charts, setCharts] = useState<IDashboardCharts | null>(null);
  const [reminders, setReminders] = useState<IFollowUpReminders | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const canFilterByCounsellor =
    user?.role === 'SuperAdmin' ||
    user?.role === 'Admin' ||
    user?.role === 'MarketingManager';

  // Load Counsellors for Dropdown
  useEffect(() => {
    if (canFilterByCounsellor) {
      UserService.listCounsellors()
        .then(setCounsellors)
        .catch((err) => console.error('Failed to load counsellors', err));
    }
  }, [canFilterByCounsellor]);

  // Load Dashboard Data
  const loadDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const filter: IDashboardFilter = {
        preset,
        startDate: preset === 'custom' ? startDate : undefined,
        endDate: preset === 'custom' ? endDate : undefined,
        counsellorId: counsellorId || undefined,
      };

      const [cardsData, chartsData, remindersData] = await Promise.all([
        AnalyticsService.getDashboardCards(filter),
        AnalyticsService.getDashboardCharts(filter),
        FollowUpService.getReminders(),
      ]);

      setCards(cardsData);
      setCharts(chartsData);
      setReminders(remindersData);
    } catch (err) {
      console.error('Failed to load analytics dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [preset, startDate, endDate, counsellorId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Preset labels
  const presets: { id: AnalyticsPreset; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'last7days', label: 'Last 7 Days' },
    { id: 'last30days', label: 'Last 30 Days' },
    { id: 'thismonth', label: 'This Month' },
    { id: 'custom', label: 'Custom' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Greeting */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-ping" />
            UniverseByte – Technology Redefined
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Executive Analytics Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time lead conversions, counsellor performance, and pipeline intelligence.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Refresh Metrics"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            <span>Refresh</span>
          </button>
          <Link
            to="/reports"
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Full Reports & CSV</span>
          </Link>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-1.5">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
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
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
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

      {/* 10 CORE KPI CARDS */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-5">
        {/* 1. Total Leads */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Leads</span>
            <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {loading ? '...' : cards?.totalLeads ?? 0}
          </p>
          <span className="mt-1 block text-[10px] text-slate-400">
            All-time: {cards?.allTimeLeads ?? 0}
          </span>
        </div>

        {/* 2. Today's Leads */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Today's Leads</span>
            <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {loading ? '...' : cards?.todayLeads ?? 0}
          </p>
          <span className="mt-1 block text-[10px] text-slate-400">Generated today</span>
        </div>

        {/* 3. New Leads */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">New Enquiries</span>
            <Flame className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {loading ? '...' : cards?.newLeads ?? 0}
          </p>
          <span className="mt-1 block text-[10px] text-slate-400">Awaiting contact</span>
        </div>

        {/* 4. Contacted */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Contacted</span>
            <Phone className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {loading ? '...' : cards?.contacted ?? 0}
          </p>
          <span className="mt-1 block text-[10px] text-slate-400">Engaged leads</span>
        </div>

        {/* 5. Interested */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Interested</span>
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {loading ? '...' : cards?.interested ?? 0}
          </p>
          <span className="mt-1 block text-[10px] text-slate-400">High intent prospects</span>
        </div>

        {/* 6. Follow-up Due */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Follow-up Due</span>
            <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {loading ? '...' : cards?.followUpDue ?? 0}
          </p>
          <Link
            to="/followups"
            className="mt-1 block text-[10px] font-semibold text-blue-600 hover:underline dark:text-blue-400"
          >
            Due today &rarr;
          </Link>
        </div>

        {/* 7. Overdue */}
        <div
          className={cn(
            'rounded-2xl border p-4 shadow-sm transition-all',
            (cards?.overdue ?? 0) > 0
              ? 'border-rose-300 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20'
              : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
          )}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Overdue</span>
            <AlertCircle
              className={cn(
                'h-4 w-4',
                (cards?.overdue ?? 0) > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'
              )}
            />
          </div>
          <p
            className={cn(
              'mt-2 text-2xl font-bold',
              (cards?.overdue ?? 0) > 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-slate-900 dark:text-white'
            )}
          >
            {loading ? '...' : cards?.overdue ?? 0}
          </p>
          <span className="mt-1 block text-[10px] text-slate-400">Missed deadlines</span>
        </div>

        {/* 8. Admission Confirmed */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Admissions
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
            {loading ? '...' : cards?.admissionConfirmed ?? 0}
          </p>
          <span className="mt-1 block text-[10px] text-emerald-600 dark:text-emerald-400">
            Converted students
          </span>
        </div>

        {/* 9. Lost Leads */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Lost Leads</span>
            <UserX className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-700 dark:text-slate-300">
            {loading ? '...' : cards?.lostLeads ?? 0}
          </p>
          <span className="mt-1 block text-[10px] text-slate-400">Unconverted / Dropped</span>
        </div>

        {/* 10. Conversion Rate */}
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50/50 p-4 shadow-sm dark:border-blue-900/60 dark:from-blue-950/30 dark:to-indigo-950/20">
          <div className="flex items-center justify-between text-blue-700 dark:text-blue-300">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Conversion Rate</span>
            <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-300">
            {loading ? '...' : cards?.conversionRate ?? '0.0%'}
          </p>
          <span className="mt-1 block text-[10px] text-blue-600/80 dark:text-blue-400/80">
            Revenue: ₹{(cards?.totalRevenuePotential ?? 0).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* 6 ANALYTICS CHARTS SECTION */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart 1: Daily Lead Generation */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Daily Lead Generation Trend
              </h2>
              <p className="text-[11px] text-slate-400">Volume of incoming leads vs admissions</p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" /> Leads
              </span>
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Admissions
              </span>
            </div>
          </div>

          <div className="mt-4">
            {charts?.dailyGeneration && charts.dailyGeneration.length > 0 ? (
              <div className="space-y-2">
                {charts.dailyGeneration.slice(-7).map((d) => {
                  const maxVal = Math.max(...charts.dailyGeneration.map((x) => x.leads), 1);
                  const leadPct = Math.round((d.leads / maxVal) * 100);
                  const admPct = Math.round((d.admissions / maxVal) * 100);

                  return (
                    <div key={d.date} className="flex items-center gap-3 text-xs">
                      <span className="w-20 shrink-0 font-medium text-slate-500 dark:text-slate-400">
                        {d.date.slice(5)}
                      </span>
                      <div className="relative flex-1 h-6 rounded-md bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center">
                        <div
                          style={{ width: `${leadPct}%` }}
                          className="h-full bg-blue-500 transition-all duration-500 flex items-center justify-end px-2"
                        >
                          <span className="text-[10px] font-bold text-white">{d.leads}</span>
                        </div>
                        {d.admissions > 0 && (
                          <div
                            style={{ width: `${admPct}%` }}
                            className="h-full bg-emerald-500 transition-all duration-500 flex items-center justify-end px-1.5"
                          >
                            <span className="text-[10px] font-bold text-white">{d.admissions}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-36 items-center justify-center text-xs text-slate-400">
                No generation data recorded in this period.
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Monthly Lead Generation */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Monthly Lead Generation & Growth
              </h2>
              <p className="text-[11px] text-slate-400">Past 6 months cumulative performance</p>
            </div>
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
              6-Month Trend
            </span>
          </div>

          <div className="mt-4">
            {charts?.monthlyGeneration && charts.monthlyGeneration.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {charts.monthlyGeneration.map((m) => (
                  <div
                    key={m.month}
                    className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {m.month}
                    </div>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-lg font-bold text-slate-900 dark:text-white">
                        {m.leads} Leads
                      </span>
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {m.admissions} Adm
                      </span>
                    </div>
                    <div className="mt-2 text-[10px] text-slate-400">
                      Conv. Rate: <span className="font-semibold text-slate-700 dark:text-slate-200">{m.conversionRate.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-36 items-center justify-center text-xs text-slate-400">
                No monthly data recorded.
              </div>
            )}
          </div>
        </div>

        {/* Chart 3: Source-wise Lead Distribution */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Source-wise Lead Distribution
              </h2>
              <p className="text-[11px] text-slate-400">Effectiveness across channels</p>
            </div>
            <Compass className="h-4 w-4 text-slate-400" />
          </div>

          <div className="mt-4 space-y-3">
            {charts?.sourceDistribution && charts.sourceDistribution.length > 0 ? (
              charts.sourceDistribution.slice(0, 6).map((s) => {
                const total = cards?.totalLeads || 1;
                const sharePct = Math.round((s.leads / total) * 100);

                return (
                  <div key={s.source} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {s.source}
                      </span>
                      <span className="text-slate-500">
                        {s.leads} leads ({sharePct}%) • {s.admissions} admissions ({s.conversionRate.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        style={{ width: `${Math.min(sharePct, 100)}%` }}
                        className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex h-36 items-center justify-center text-xs text-slate-400">
                No source distribution data available.
              </div>
            )}
          </div>
        </div>

        {/* Chart 4: Course-wise Enquiries */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Course-wise Enquiries & Revenue
              </h2>
              <p className="text-[11px] text-slate-400">Market demand across IT training programs</p>
            </div>
            <GraduationCap className="h-4 w-4 text-slate-400" />
          </div>

          <div className="mt-4 space-y-2.5">
            {charts?.courseDistribution && charts.courseDistribution.length > 0 ? (
              charts.courseDistribution.slice(0, 5).map((c) => (
                <div
                  key={c.course}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-800/30"
                >
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      {c.course}
                    </span>
                    <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      {c.enquiries} enquiries
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {c.admissions} admissions
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      ₹{(c.totalRevenue || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-36 items-center justify-center text-xs text-slate-400">
                No course enquiry data available.
              </div>
            )}
          </div>
        </div>

        {/* Chart 5: Counsellor Performance */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Counsellor Conversion Performance
              </h2>
              <p className="text-[11px] text-slate-400">Pipeline conversion and closure rates</p>
            </div>
            <UserCheck className="h-4 w-4 text-slate-400" />
          </div>

          <div className="mt-4 overflow-x-auto">
            {charts?.counsellorPerformance && charts.counsellorPerformance.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-semibold uppercase text-slate-400 dark:border-slate-800">
                    <th className="pb-2">Counsellor</th>
                    <th className="pb-2 text-center">Assigned</th>
                    <th className="pb-2 text-center">Admissions</th>
                    <th className="pb-2 text-center">Conversion</th>
                    <th className="pb-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {charts.counsellorPerformance.map((cp) => (
                    <tr key={cp.counsellorId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2.5 font-medium text-slate-900 dark:text-white">
                        {cp.counsellorName}
                      </td>
                      <td className="py-2.5 text-center text-slate-600 dark:text-slate-300">
                        {cp.totalAssigned}
                      </td>
                      <td className="py-2.5 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {cp.admissions}
                      </td>
                      <td className="py-2.5 text-center">
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          {cp.conversionRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-medium text-slate-700 dark:text-slate-200">
                        ₹{(cp.totalRevenue || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex h-36 items-center justify-center text-xs text-slate-400">
                No counsellor performance records.
              </div>
            )}
          </div>
        </div>

        {/* Chart 6: Admission Conversion Trends */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Admission Conversion Trends
              </h2>
              <p className="text-[11px] text-slate-400">Conversion efficiency across timeline</p>
            </div>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>

          <div className="mt-4">
            {charts?.admissionConversionTrends && charts.admissionConversionTrends.length > 0 ? (
              <div className="space-y-3">
                {charts.admissionConversionTrends.slice(-6).map((tr) => (
                  <div key={tr.date} className="flex items-center justify-between text-xs">
                    <span className="w-24 text-slate-500 dark:text-slate-400">{tr.date}</span>
                    <div className="flex-1 mx-3 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        style={{ width: `${Math.min(tr.conversionRate, 100)}%` }}
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      />
                    </div>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 w-12 text-right">
                      {tr.conversionRate.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-36 items-center justify-center text-xs text-slate-400">
                No conversion trend data recorded.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* OVERDUE FOLLOW-UP REMINDER ALERT (From Phase 5) */}
      {reminders && reminders.overdueCount > 0 && (
        <div className="rounded-2xl border border-rose-300 bg-white p-5 shadow-sm dark:border-rose-900/60 dark:bg-slate-900 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-600 animate-pulse" />
              <h2 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                Overdue Follow-up Reminders ({reminders.overdueCount})
              </h2>
            </div>
            <Link
              to="/followups"
              className="text-xs font-semibold text-rose-600 hover:underline dark:text-rose-400 flex items-center gap-1"
            >
              <span>Manage in Follow-ups</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {reminders.overdueList.slice(0, 4).map((item) => {
              const cleanWhatsapp = (
                item.leadId?.whatsappNumber ||
                item.leadId?.mobileNumber ||
                ''
              ).replace(/\D/g, '');

              return (
                <div
                  key={item.id || (item as any)._id}
                  className="flex items-center justify-between rounded-xl border border-rose-200/80 bg-rose-50/30 p-3 text-xs dark:border-rose-900/40 dark:bg-rose-950/20"
                >
                  <div className="space-y-0.5 truncate pr-2">
                    <div className="font-bold text-slate-900 dark:text-white truncate">
                      {item.leadId?.studentName}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {item.leadId?.interestedCourse} • {item.type}
                    </div>
                    <div className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                      Scheduled: {formatDate(item.scheduledAt)}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <a
                      href={`tel:${item.leadId?.mobileNumber}`}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 dark:border-slate-700 dark:text-slate-300"
                      title="Call Student"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                    <a
                      href={`https://wa.me/91${cleanWhatsapp}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 dark:border-slate-700 dark:text-slate-300"
                      title="WhatsApp Student"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Action Navigation Grid */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">CRM Workspace Quick Links</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/leads"
            className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 text-xs hover:border-blue-500 hover:shadow-sm dark:border-slate-800"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-white">Leads Pipeline</div>
              <div className="text-[11px] text-slate-500">Kanban CRM & Lead CRUD</div>
            </div>
          </Link>

          <Link
            to="/followups"
            className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 text-xs hover:border-blue-500 hover:shadow-sm dark:border-slate-800"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <CalendarClock className="h-4 w-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-white">Follow-up Manager</div>
              <div className="text-[11px] text-slate-500">Reminders & Call Logs</div>
            </div>
          </Link>

          <Link
            to="/reports"
            className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 text-xs hover:border-blue-500 hover:shadow-sm dark:border-slate-800"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-white">Domain Reports</div>
              <div className="text-[11px] text-slate-500">7 Detailed Reports & CSV</div>
            </div>
          </Link>

          <Link
            to="/profile"
            className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 text-xs hover:border-blue-500 hover:shadow-sm dark:border-slate-800"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-white">User Profile</div>
              <div className="text-[11px] text-slate-500">Account & Security</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};
