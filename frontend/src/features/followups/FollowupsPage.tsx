import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Phone,
  MessageSquare,
  Users,
  Video,
  Search,
  Plus,
  RotateCcw,
  History,
  ExternalLink,
  Flame,
  UserCheck,
  RefreshCw,
  X,
  CalendarClock,
  Check,
} from 'lucide-react';
import { FollowUpService } from '../../services/followup.service';
import { UserService } from '../../services/user.service';
import {
  IFollowUp,
  FollowUpSection,
  FollowUpType,
  ICounsellorFollowUpMetrics,
  IFollowUpReminders,
} from '../../types/followup';
import { IUser } from '../../types/auth';
import { ILead } from '../../types/lead';
import { useAuth } from '../../context/AuthContext';
import { formatDate, cn } from '../../lib/utils';
import { ScheduleFollowupModal } from './ScheduleFollowupModal';
import { CompleteFollowupModal } from './CompleteFollowupModal';
import { RescheduleFollowupModal } from './RescheduleFollowupModal';
import { FollowupHistoryModal } from './FollowupHistoryModal';
import { LeadDetailDrawer } from '../leads/LeadDetailDrawer';

export const FollowupsPage: React.FC = () => {
  const { user: currentUser } = useAuth();

  // Active section tab
  const [activeSection, setActiveSection] = useState<FollowUpSection>('today');

  // Follow-up lists & data
  const [followUps, setFollowUps] = useState<IFollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedCounsellor, setSelectedCounsellor] = useState<string>('');

  // Counsellors and Metrics
  const [counsellors, setCounsellors] = useState<IUser[]>([]);
  const [counsellorMetrics, setCounsellorMetrics] = useState<ICounsellorFollowUpMetrics[]>([]);
  const [reminders, setReminders] = useState<IFollowUpReminders | null>(null);

  // Feedback notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [activeFollowUp, setActiveFollowUp] = useState<IFollowUp | null>(null);

  // Lead drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewingLead, setViewingLead] = useState<ILead | null>(null);

  // Load counsellors and reminders overview
  const loadCounsellorsAndOverview = useCallback(async () => {
    try {
      const [cList, rem, metrics] = await Promise.all([
        UserService.listCounsellors(),
        FollowUpService.getReminders(),
        ['SuperAdmin', 'Admin', 'MarketingManager'].includes(currentUser?.role || '')
          ? FollowUpService.getCounsellorMetrics()
          : Promise.resolve([]),
      ]);
      setCounsellors(cList);
      setReminders(rem);
      setCounsellorMetrics(metrics);
    } catch (err) {
      console.error('Error loading metadata:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    loadCounsellorsAndOverview();
  }, [loadCounsellorsAndOverview]);

  // Fetch follow-ups list
  const fetchFollowUps = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await FollowUpService.listFollowUps({
        section: activeSection,
        type: (selectedType as FollowUpType) || undefined,
        counsellorId: selectedCounsellor || undefined,
        search: search.trim() || undefined,
        page: currentPage,
        limit: 15,
      });

      setFollowUps(res.data);
      setTotalRecords(res.pagination.totalRecords);
      setTotalPages(res.pagination.totalPages);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to load follow-ups.');
    } finally {
      setLoading(false);
    }
  }, [activeSection, selectedType, selectedCounsellor, search, currentPage]);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  // Auto-dismiss alert
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const canModifyFollowup = (f: IFollowUp) => {
    if (!currentUser) return false;
    if (['SuperAdmin', 'Admin', 'MarketingManager'].includes(currentUser.role)) return true;
    const cId =
      typeof f.counsellorId === 'object' && f.counsellorId
        ? f.counsellorId.id || (f.counsellorId as any)._id
        : f.counsellorId;
    return cId === currentUser.id;
  };

  const getOverdueDuration = (scheduledAt: string) => {
    const diffMs = Date.now() - new Date(scheduledAt).getTime();
    if (diffMs <= 0) return null;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hr' : 'hrs'} overdue`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} overdue`;
  };

  const SECTIONS = [
    {
      id: 'today' as FollowUpSection,
      label: "Today's Follow-ups",
      icon: <Calendar className="h-4 w-4" />,
      badge: reminders?.todayCount ?? null,
      badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
    },
    {
      id: 'overdue' as FollowUpSection,
      label: 'Overdue Follow-ups',
      icon: <AlertCircle className="h-4 w-4" />,
      badge: reminders?.overdueCount ?? null,
      badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse',
    },
    {
      id: 'upcoming' as FollowUpSection,
      label: 'Upcoming Follow-ups',
      icon: <CalendarClock className="h-4 w-4" />,
      badge: reminders?.upcomingCount ?? null,
      badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    },
    {
      id: 'completed' as FollowUpSection,
      label: 'Completed Follow-ups',
      icon: <CheckCircle2 className="h-4 w-4" />,
      badge: reminders?.completedTodayCount ?? null,
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Top Banner & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Follow-up Management
            </h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              {totalRecords} Total
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Student counselling reminders, call logs, meetings, and conversion activities.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchFollowUps();
              loadCounsellorsAndOverview();
            }}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Refresh List"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin text-blue-600')} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setScheduleModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Schedule Follow-up</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Overdue Urgent Alert Banner */}
      {reminders && reminders.overdueCount > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50/90 p-4 dark:border-rose-900/60 dark:bg-rose-950/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-400">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                Action Required: {reminders.overdueCount} Overdue {reminders.overdueCount === 1 ? 'Follow-up' : 'Follow-ups'} Pending
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-300">
                Prospective students are waiting for a response. Please connect with them or reschedule immediately.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveSection('overdue');
              setCurrentPage(1);
            }}
            className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition-colors"
          >
            Review Overdue ({reminders.overdueCount})
          </button>
        </div>
      )}

      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        {SECTIONS.map((sec) => (
          <button
            key={sec.id}
            onClick={() => {
              setActiveSection(sec.id);
              setCurrentPage(1);
            }}
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all',
              activeSection === sec.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
            )}
          >
            {sec.icon}
            <span>{sec.label}</span>
            {sec.badge !== null && sec.badge > 0 && (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-bold',
                  activeSection === sec.id ? 'bg-white text-blue-700' : sec.badgeColor
                )}
              >
                {sec.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name, phone, or Lead ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        {/* Follow-up Type Filter */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <option value="">All Channels</option>
            <option value="Call">📞 Call</option>
            <option value="WhatsApp">💬 WhatsApp</option>
            <option value="Meeting">🤝 Meeting</option>
            <option value="Demo">💻 Demo</option>
          </select>

          {/* Counsellor Filter (Admin & Managers) */}
          {['SuperAdmin', 'Admin', 'MarketingManager'].includes(currentUser?.role || '') && (
            <select
              value={selectedCounsellor}
              onChange={(e) => {
                setSelectedCounsellor(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="">All Counsellors</option>
              {counsellors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                </option>
              ))}
            </select>
          )}

          {(search || selectedType || selectedCounsellor) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedType('');
                setSelectedCounsellor('');
                setCurrentPage(1);
              }}
              className="flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <X className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Follow-up Cards List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin text-blue-600" />
            Loading follow-up records...
          </div>
        ) : followUps.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
            <Check className="h-8 w-8 text-emerald-500 mb-2" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              No follow-ups in this view
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm">
              {activeSection === 'overdue'
                ? 'Great job! You have zero overdue follow-ups pending.'
                : activeSection === 'today'
                ? "No follow-ups scheduled for today. Click 'Schedule Follow-up' to plan your agenda."
                : 'No follow-up records found matching the filter criteria.'}
            </p>
          </div>
        ) : (
          followUps.map((f) => {
            const overdueBadge = f.status !== 'Completed' ? getOverdueDuration(f.scheduledAt) : null;
            const cleanWhatsapp = (
              f.leadId?.whatsappNumber ||
              f.leadId?.mobileNumber ||
              ''
            ).replace(/\D/g, '');

            let channelIcon = <Phone className="h-4 w-4 text-blue-600" />;
            if (f.type === 'WhatsApp') channelIcon = <MessageSquare className="h-4 w-4 text-emerald-600" />;
            if (f.type === 'Meeting') channelIcon = <Users className="h-4 w-4 text-purple-600" />;
            if (f.type === 'Demo') channelIcon = <Video className="h-4 w-4 text-cyan-600" />;

            return (
              <div
                key={f.id || (f as any)._id}
                className={cn(
                  'group flex flex-col justify-between rounded-2xl border bg-white p-4 shadow-xs transition-all hover:border-slate-300 hover:shadow-md dark:bg-slate-900 sm:flex-row sm:items-center',
                  overdueBadge
                    ? 'border-rose-300/80 bg-rose-50/20 dark:border-rose-900/60 dark:bg-rose-950/10'
                    : 'border-slate-200 dark:border-slate-800'
                )}
              >
                {/* Left Info Column */}
                <div className="space-y-1.5 flex-1 pr-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Channel Tag */}
                    <span className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {channelIcon}
                      <span>{f.type}</span>
                    </span>

                    {/* Status Badge */}
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-[11px] font-bold border',
                        f.status === 'Completed'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : f.status === 'Rescheduled'
                          ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                      )}
                    >
                      {f.status}
                    </span>

                    {/* Overdue Warning Pill */}
                    {overdueBadge && (
                      <span className="flex items-center gap-1 rounded-full border border-rose-300 bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:border-rose-800 dark:bg-rose-950/80 dark:text-rose-300 animate-pulse">
                        <AlertCircle className="h-3 w-3" />
                        <span>{overdueBadge}</span>
                      </span>
                    )}

                    {/* Priority Flame */}
                    {f.leadId?.priority === 'Hot' && (
                      <span className="flex items-center gap-0.5 text-[11px] font-bold text-red-600">
                        <Flame className="h-3.5 w-3.5 fill-red-500 text-red-500" /> Hot
                      </span>
                    )}
                  </div>

                  {/* Student Title & Course */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setViewingLead(f.leadId);
                        setDrawerOpen(true);
                      }}
                      className="text-base font-bold text-slate-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400 flex items-center gap-1.5"
                    >
                      <span>{f.leadId?.studentName || 'Student'}</span>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600" />
                    </button>
                    <span className="text-xs text-slate-400">({f.leadId?.leadId})</span>
                    <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                      {f.leadId?.interestedCourse}
                    </span>
                  </div>

                  {/* Scheduled Slot Time */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                      <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      {formatDate(f.scheduledAt)}
                    </span>
                    <span>•</span>
                    <span>Counsellor: <span className="font-medium text-slate-700 dark:text-slate-300">{f.counsellorId?.fullName || 'Assigned Staff'}</span></span>
                    <span>•</span>
                    <span>Phone: <span className="font-mono">{f.leadId?.mobileNumber}</span></span>
                  </div>

                  {/* Notes / Remarks */}
                  <div className="rounded-xl bg-slate-50 p-2.5 text-xs text-slate-700 italic dark:bg-slate-800/60 dark:text-slate-300">
                    "{f.counsellingNotes}"
                  </div>

                  {/* Completion Remarks if completed */}
                  {f.status === 'Completed' && f.completionRemarks && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                      <span className="font-bold">Outcome:</span> {f.completionRemarks}
                    </div>
                  )}

                  {/* Reschedule Reason if rescheduled */}
                  {f.status === 'Rescheduled' && f.rescheduledReason && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                      <span className="font-bold">Rescheduled Reason:</span> {f.rescheduledReason}
                    </div>
                  )}
                </div>

                {/* Right Action Buttons */}
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800 sm:mt-0 sm:border-t-0 sm:pt-0 shrink-0">
                  {/* Quick Call */}
                  <a
                    href={`tel:${f.leadId?.mobileNumber}`}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-400"
                    title={`Call ${f.leadId?.studentName}`}
                  >
                    <Phone className="h-4 w-4" />
                  </a>

                  {/* Quick WhatsApp */}
                  <a
                    href={`https://wa.me/91${cleanWhatsapp}?text=${encodeURIComponent(
                      `Hello ${f.leadId?.studentName}, greetings from UniverseByte – Technology Redefined regarding your inquiry for ${f.leadId?.interestedCourse}!`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-400"
                    title={`WhatsApp ${f.leadId?.studentName}`}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </a>

                  {/* View History Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveFollowUp(f);
                      setHistoryModalOpen(true);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-purple-50 hover:text-purple-600 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-purple-950/60 dark:hover:text-purple-400"
                    title="View Activity History"
                  >
                    <History className="h-4 w-4" />
                  </button>

                  {/* Complete Action Button */}
                  {f.status !== 'Completed' && canModifyFollowup(f) && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveFollowUp(f);
                        setCompleteModalOpen(true);
                      }}
                      className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Complete</span>
                    </button>
                  )}

                  {/* Reschedule Action Button */}
                  {f.status !== 'Completed' && canModifyFollowup(f) && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveFollowUp(f);
                        setRescheduleModalOpen(true);
                      }}
                      className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Reschedule</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-xs dark:border-slate-800">
            <span className="text-slate-500">
              Page {currentPage} of {totalPages} ({totalRecords} items)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1 || loading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Previous
              </button>
              <button
                disabled={currentPage >= totalPages || loading}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Counsellor Follow-up Metrics Breakdown (Admin / SuperAdmin / MarketingManager) */}
      {counsellorMetrics.length > 0 && (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Follow-up Breakdown per Counsellor
              </h3>
            </div>
            <span className="text-xs text-slate-400">Team performance & pending workload</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {counsellorMetrics.map((cm) => (
              <div
                key={cm.counsellorId}
                className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-800/60 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">{cm.counsellorName}</span>
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                    {cm.role}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1 text-center">
                  <div className="rounded-lg bg-white p-1.5 shadow-2xs dark:bg-slate-900">
                    <span className="block font-bold text-blue-600 dark:text-blue-400">{cm.todayPending}</span>
                    <span className="block text-[10px] text-slate-400">Today</span>
                  </div>
                  <div className="rounded-lg bg-white p-1.5 shadow-2xs dark:bg-slate-900">
                    <span className={cn('block font-bold', cm.overdue > 0 ? 'text-rose-600' : 'text-slate-600')}>
                      {cm.overdue}
                    </span>
                    <span className="block text-[10px] text-slate-400">Overdue</span>
                  </div>
                  <div className="rounded-lg bg-white p-1.5 shadow-2xs dark:bg-slate-900">
                    <span className="block font-bold text-slate-700 dark:text-slate-300">{cm.upcoming}</span>
                    <span className="block text-[10px] text-slate-400">Upcoming</span>
                  </div>
                  <div className="rounded-lg bg-white p-1.5 shadow-2xs dark:bg-slate-900">
                    <span className="block font-bold text-emerald-600">{cm.totalCompleted}</span>
                    <span className="block text-[10px] text-slate-400">Done</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <ScheduleFollowupModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        onSuccess={() => {
          setSuccessMessage('Follow-up scheduled successfully!');
          fetchFollowUps();
          loadCounsellorsAndOverview();
        }}
        counsellors={counsellors}
      />

      <CompleteFollowupModal
        isOpen={completeModalOpen}
        followUp={activeFollowUp}
        onClose={() => {
          setCompleteModalOpen(false);
          setActiveFollowUp(null);
        }}
        onSuccess={() => {
          setSuccessMessage('Follow-up marked as completed!');
          fetchFollowUps();
          loadCounsellorsAndOverview();
        }}
      />

      <RescheduleFollowupModal
        isOpen={rescheduleModalOpen}
        followUp={activeFollowUp}
        onClose={() => {
          setRescheduleModalOpen(false);
          setActiveFollowUp(null);
        }}
        onSuccess={() => {
          setSuccessMessage('Follow-up rescheduled successfully!');
          fetchFollowUps();
          loadCounsellorsAndOverview();
        }}
      />

      <FollowupHistoryModal
        isOpen={historyModalOpen}
        followUp={activeFollowUp}
        onClose={() => {
          setHistoryModalOpen(false);
          setActiveFollowUp(null);
        }}
      />

      <LeadDetailDrawer
        isOpen={drawerOpen}
        lead={viewingLead}
        onClose={() => {
          setDrawerOpen(false);
          setViewingLead(null);
        }}
        onEdit={() => {}}
      />
    </div>
  );
};

