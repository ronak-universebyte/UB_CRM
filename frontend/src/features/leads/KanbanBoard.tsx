import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  Phone,
  MessageSquare,
  Flame,
  User,
  GraduationCap,
  Ban,
  Clock,
  AlertCircle,
  CheckCircle2,
  X,
  Sparkles,
  Edit2,
} from 'lucide-react';
import { LeadService } from '../../services/lead.service';
import {
  ILead,
  LeadStatus,
  LeadPriority,
  LeadSource,
  CourseOption,
  IListLeadsFilter,
} from '../../types/lead';
import { IUser } from '../../types/auth';
import { useAuth } from '../../context/AuthContext';
import { formatDate, cn } from '../../lib/utils';
import { WhatsAppModal } from '../../components/whatsapp/WhatsAppModal';

export const getLeadKey = (lead: ILead): string => lead.id || lead._id || '';

export const PIPELINE_COLUMNS: {
  status: LeadStatus;
  label: string;
  badgeClass: string;
  headerBorder: string;
  accentDot: string;
  bgLight: string;
}[] = [
  {
    status: 'New',
    label: 'New',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
    headerBorder: 'border-t-blue-500',
    accentDot: 'bg-blue-500',
    bgLight: 'bg-blue-500/5',
  },
  {
    status: 'Not Contacted',
    label: 'Not Contacted',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    headerBorder: 'border-t-slate-400',
    accentDot: 'bg-slate-400',
    bgLight: 'bg-slate-400/5',
  },
  {
    status: 'Contacted',
    label: 'Contacted',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800',
    headerBorder: 'border-t-sky-500',
    accentDot: 'bg-sky-500',
    bgLight: 'bg-sky-500/5',
  },
  {
    status: 'Interested',
    label: 'Interested',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800',
    headerBorder: 'border-t-indigo-500',
    accentDot: 'bg-indigo-500',
    bgLight: 'bg-indigo-500/5',
  },
  {
    status: 'Counselling Scheduled',
    label: 'Counselling Sched.',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800',
    headerBorder: 'border-t-purple-500',
    accentDot: 'bg-purple-500',
    bgLight: 'bg-purple-500/5',
  },
  {
    status: 'Demo Scheduled',
    label: 'Demo Scheduled',
    badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-800',
    headerBorder: 'border-t-cyan-500',
    accentDot: 'bg-cyan-500',
    bgLight: 'bg-cyan-500/5',
  },
  {
    status: 'Follow-up Required',
    label: 'Follow-up Req.',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    headerBorder: 'border-t-amber-500',
    accentDot: 'bg-amber-500',
    bgLight: 'bg-amber-500/5',
  },
  {
    status: 'Negotiation',
    label: 'Negotiation',
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800',
    headerBorder: 'border-t-orange-500',
    accentDot: 'bg-orange-500',
    bgLight: 'bg-orange-500/5',
  },
  {
    status: 'Admission Confirmed',
    label: 'Admission Confirmed',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    headerBorder: 'border-t-emerald-500',
    accentDot: 'bg-emerald-500',
    bgLight: 'bg-emerald-500/5',
  },
  {
    status: 'Not Interested',
    label: 'Not Interested',
    badgeClass: 'bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700',
    headerBorder: 'border-t-stone-400',
    accentDot: 'bg-stone-400',
    bgLight: 'bg-stone-400/5',
  },
  {
    status: 'Lost',
    label: 'Lost',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
    headerBorder: 'border-t-rose-500',
    accentDot: 'bg-rose-500',
    bgLight: 'bg-rose-500/5',
  },
];

const LOSS_REASONS = [
  'Course fee too high / Budget mismatch',
  'Enrolled in a competitor institute',
  'Distance / Travel issue',
  'Batch timings not suitable',
  'Decided not to pursue IT courses',
  'No response after multiple calls',
  'Personal / Financial issues',
  'Other reasons',
];

interface KanbanBoardProps {
  onViewLead: (lead: ILead) => void;
  onEditLead: (lead: ILead) => void;
  counsellors: IUser[];
  courses: CourseOption[];
  sources: LeadSource[];
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  onViewLead,
  onEditLead,
  counsellors,
  courses,
  sources,
}) => {
  const { user: currentUser } = useAuth();

  // Kanban Data & Filter state
  const [leads, setLeads] = useState<ILead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedCounsellor, setSelectedCounsellor] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Drag & drop interactive state
  const [draggedLead, setDraggedLead] = useState<ILead | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<LeadStatus | null>(null);
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);

  // Status transition confirmation modals
  const [pendingTransition, setPendingTransition] = useState<{
    lead: ILead;
    targetStatus: LeadStatus;
  } | null>(null);
  const [transitionNotes, setTransitionNotes] = useState('');
  const [lossReason, setLossReason] = useState(LOSS_REASONS[0]);
  const [whatsAppModalLead, setWhatsAppModalLead] = useState<ILead | null>(null);

  // Notifications
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchKanbanLeads = useCallback(async () => {
    setLoading(true);
    try {
      const filterParams: IListLeadsFilter = {};
      if (search.trim()) filterParams.search = search.trim();
      if (selectedCourse) filterParams.interestedCourse = selectedCourse as CourseOption;
      if (selectedSource) filterParams.leadSource = selectedSource as LeadSource;
      if (selectedPriority) filterParams.priority = selectedPriority as LeadPriority;
      if (selectedCounsellor) filterParams.assignedCounsellor = selectedCounsellor;

      // Date range calculations
      const now = new Date();
      if (dateRangeFilter === 'today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        filterParams.startDate = start.toISOString();
      } else if (dateRangeFilter === 'week') {
        const start = new Date(now);
        start.setDate(now.getDate() - 7);
        filterParams.startDate = start.toISOString();
      } else if (dateRangeFilter === 'month') {
        const start = new Date(now);
        start.setDate(now.getDate() - 30);
        filterParams.startDate = start.toISOString();
      }

      const data = await LeadService.getKanban(filterParams);
      setLeads(data);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to load pipeline leads.',
      });
    } finally {
      setLoading(false);
    }
  }, [
    search,
    selectedCourse,
    selectedSource,
    selectedPriority,
    selectedCounsellor,
    dateRangeFilter,
  ]);

  useEffect(() => {
    fetchKanbanLeads();
  }, [fetchKanbanLeads]);

  // Clear feedback after 4s
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Authorization helper
  const canModifyLead = useCallback(
    (lead: ILead) => {
      if (!currentUser) return false;
      if (['SuperAdmin', 'Admin', 'MarketingManager'].includes(currentUser.role)) {
        return true;
      }
      const counsellorId =
        typeof lead.assignedCounsellor === 'object' && lead.assignedCounsellor
          ? lead.assignedCounsellor.id || (lead.assignedCounsellor as any)._id
          : lead.assignedCounsellor;
      return counsellorId === currentUser.id;
    },
    [currentUser]
  );

  // Group leads by status
  const leadsByStatus = useMemo(() => {
    const map: Record<LeadStatus, ILead[]> = {
      New: [],
      'Not Contacted': [],
      Contacted: [],
      Interested: [],
      'Counselling Scheduled': [],
      'Demo Scheduled': [],
      'Follow-up Required': [],
      Negotiation: [],
      'Admission Confirmed': [],
      'Not Interested': [],
      Lost: [],
    };

    for (const lead of leads) {
      if (map[lead.status]) {
        map[lead.status].push(lead);
      } else {
        map['New'].push(lead);
      }
    }
    return map;
  }, [leads]);

  // Execute status update in MongoDB
  const executeStatusUpdate = async (
    lead: ILead,
    targetStatus: LeadStatus,
    notes?: string
  ) => {
    const leadKey = getLeadKey(lead);
    const originalLeads = [...leads];
    setUpdatingLeadId(leadKey);

    // Optimistic UI update
    setLeads((prev) =>
      prev.map((l) =>
        getLeadKey(l) === leadKey
          ? {
              ...l,
              status: targetStatus,
              updatedAt: new Date().toISOString(),
            }
          : l
      )
    );

    try {
      const updatedLead = await LeadService.updateStatus(
        leadKey,
        targetStatus,
        notes
      );

      // Refresh with canonical updated data from server
      setLeads((prev) =>
        prev.map((l) => (getLeadKey(l) === leadKey ? updatedLead : l))
      );

      setFeedback({
        type: 'success',
        message: `Lead ${lead.studentName} moved to "${targetStatus}".`,
      });
    } catch (err: any) {
      // Rollback to original leads on error
      setLeads(originalLeads);
      setFeedback({
        type: 'error',
        message:
          err.response?.data?.message ||
          'Failed to update lead status. Changes reverted.',
      });
    } finally {
      setUpdatingLeadId(null);
      setPendingTransition(null);
      setTransitionNotes('');
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, lead: ILead) => {
    if (!canModifyLead(lead)) {
      e.preventDefault();
      setFeedback({
        type: 'error',
        message: 'Permission Denied: You cannot modify leads assigned to another staff member.',
      });
      return;
    }
    const leadKey = getLeadKey(lead);
    e.dataTransfer.setData('text/plain', leadKey);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedLead(lead);
  };

  const handleDragEnd = () => {
    setDraggedLead(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, status: LeadStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>, status: LeadStatus) => {
    // Only unset if leaving the column element itself
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverColumn === status) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetStatus: LeadStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    const leadId = e.dataTransfer.getData('text/plain');
    const lead = leads.find((l) => getLeadKey(l) === leadId) || draggedLead;

    if (!lead) return;
    if (lead.status === targetStatus) return; // No change

    // Check permissions
    if (!canModifyLead(lead)) {
      setFeedback({
        type: 'error',
        message: 'Permission Denied: You can only modify your assigned leads.',
      });
      return;
    }

    // Confirmation gate for critical milestones: Admission Confirmed and Lost
    if (targetStatus === 'Admission Confirmed') {
      setPendingTransition({ lead, targetStatus });
      setTransitionNotes('');
      return;
    }

    if (targetStatus === 'Lost') {
      setPendingTransition({ lead, targetStatus });
      setLossReason(LOSS_REASONS[0]);
      setTransitionNotes('');
      return;
    }

    // Direct transition for standard pipeline stages
    await executeStatusUpdate(lead, targetStatus);
  };

  const handleConfirmTransition = async () => {
    if (!pendingTransition) return;
    const { lead, targetStatus } = pendingTransition;

    let finalNotes = transitionNotes.trim();
    if (targetStatus === 'Lost') {
      finalNotes = `Reason: ${lossReason}${finalNotes ? ` | Notes: ${finalNotes}` : ''}`;
    }

    await executeStatusUpdate(lead, targetStatus, finalNotes);
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedCourse('');
    setSelectedSource('');
    setSelectedPriority('');
    setSelectedCounsellor('');
    setDateRangeFilter('all');
  };

  return (
    <div className="flex h-full flex-col">
      {/* Toast Feedback Alert */}
      {feedback && (
        <div
          className={cn(
            'fixed top-5 right-5 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-4',
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50/95 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/95 dark:text-emerald-200'
              : 'border-rose-200 bg-rose-50/95 text-rose-900 dark:border-rose-800 dark:bg-rose-950/95 dark:text-rose-200'
          )}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Pipeline Filter Bar */}
      <div className="border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative min-w-[280px] flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student, phone, or Lead ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:focus:border-blue-400"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Preset */}
            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value as any)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:border-slate-300 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="all">All Time</option>
              <option value="today">Created Today</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
            </select>

            {/* Course Filter */}
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:border-slate-300 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="">All Courses</option>
              {courses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Source Filter */}
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:border-slate-300 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="">All Sources</option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:border-slate-300 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="">All Priorities</option>
              <option value="Hot">🔥 Hot</option>
              <option value="Warm">⚡ Warm</option>
              <option value="Cold">❄️ Cold</option>
            </select>

            {/* Counsellor Filter (for admins & managers) */}
            {['SuperAdmin', 'Admin', 'MarketingManager'].includes(currentUser?.role || '') && (
              <select
                value={selectedCounsellor}
                onChange={(e) => setSelectedCounsellor(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:border-slate-300 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <option value="">All Counsellors</option>
                {counsellors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName}
                  </option>
                ))}
              </select>
            )}

            {/* Reset Filters */}
            {(search ||
              selectedCourse ||
              selectedSource ||
              selectedPriority ||
              selectedCounsellor ||
              dateRangeFilter !== 'all') && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
                Reset
              </button>
            )}

            {/* Refresh Button */}
            <button
              onClick={() => fetchKanbanLeads()}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              title="Refresh Pipeline Leads"
            >
              <RefreshCw
                className={cn('h-3.5 w-3.5 text-slate-500', loading && 'animate-spin text-blue-600')}
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Pipeline Summary Bar */}
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-500 dark:border-slate-800/80 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Total Active Pipeline: {leads.length} Leads
            </span>
            <span>•</span>
            <span>11 Pipeline Stages</span>
          </div>
          <div className="text-[11px] italic text-slate-400 dark:text-slate-500">
            Tip: Drag and drop cards across columns to update lead stages in real-time.
          </div>
        </div>
      </div>

      {/* Horizontal Scrollable Kanban Columns Container */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden bg-slate-100/70 p-4 dark:bg-slate-950/60">
        <div className="inline-flex h-full gap-3 pb-2">
          {PIPELINE_COLUMNS.map((col) => {
            const columnLeads = leadsByStatus[col.status] || [];
            const isDropTarget = dragOverColumn === col.status;
            const totalBudget = columnLeads.reduce(
              (acc, curr) => acc + (curr.budget || 0),
              0
            );

            return (
              <div
                key={col.status}
                onDragOver={(e) => handleDragOver(e, col.status)}
                onDragLeave={(e) => handleDragLeave(e, col.status)}
                onDrop={(e) => handleDrop(e, col.status)}
                className={cn(
                  'flex h-full w-[310px] min-w-[310px] flex-col rounded-2xl border border-slate-200/90 bg-white/95 shadow-sm transition-all duration-200 dark:border-slate-800/90 dark:bg-slate-900/95',
                  col.headerBorder,
                  'border-t-4',
                  isDropTarget &&
                    'border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/40 dark:bg-blue-950/30'
                )}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-3 dark:border-slate-800">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', col.accentDot)} />
                    <h3 className="truncate text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      {col.label}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-bold border',
                        col.badgeClass
                      )}
                    >
                      {columnLeads.length}
                    </span>
                  </div>
                </div>

                {/* Sub-header metric (value / count) */}
                <div className="flex items-center justify-between bg-slate-50/60 px-3.5 py-1.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
                  <span>Potential</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {totalBudget > 0 ? `₹${totalBudget.toLocaleString('en-IN')}` : '—'}
                  </span>
                </div>

                {/* Scrollable Column Cards Container */}
                <div className="flex-1 space-y-2.5 overflow-y-auto p-2.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                  {columnLeads.length === 0 ? (
                    <div
                      className={cn(
                        'flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 transition-colors dark:border-slate-800 dark:text-slate-500',
                        isDropTarget && 'border-blue-400 bg-blue-50/50 text-blue-600 dark:bg-blue-950/40'
                      )}
                    >
                      {isDropTarget ? (
                        <div className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
                          <Sparkles className="h-4 w-4" /> Drop lead here
                        </div>
                      ) : (
                        <span>No leads in this stage</span>
                      )}
                    </div>
                  ) : (
                    columnLeads.map((lead) => {
                      const leadKey = getLeadKey(lead);
                      const isDragging = draggedLead && getLeadKey(draggedLead) === leadKey;
                      const isUpdating = updatingLeadId === leadKey;
                      const counsellor =
                        typeof lead.assignedCounsellor === 'object' && lead.assignedCounsellor
                          ? lead.assignedCounsellor.fullName
                          : 'Unassigned';

                      return (
                        <div
                          key={leadKey}
                          draggable={canModifyLead(lead)}
                          onDragStart={(e) => handleDragStart(e, lead)}
                          onDragEnd={handleDragEnd}
                          onClick={() => onViewLead(lead)}
                          className={cn(
                            'group relative cursor-grab rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-slate-300 hover:shadow-md active:cursor-grabbing dark:border-slate-800 dark:bg-slate-800/90 dark:hover:border-slate-700',
                            isDragging && 'opacity-40 ring-2 ring-blue-500 ring-offset-2',
                            isUpdating && 'pointer-events-none opacity-60 animate-pulse'
                          )}
                        >
                          {/* Top Row: Lead ID & Priority Flame */}
                          <div className="flex items-center justify-between gap-1 text-[11px]">
                            <span className="font-mono font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400">
                              {lead.leadId}
                            </span>
                            <div className="flex items-center gap-1">
                              {lead.priority === 'Hot' && (
                                <span className="flex items-center gap-0.5 rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 font-bold text-red-600 dark:border-red-800 dark:bg-red-950/60 dark:text-red-400">
                                  <Flame className="h-3 w-3 fill-red-500 text-red-500" /> Hot
                                </span>
                              )}
                              {lead.priority === 'Warm' && (
                                <span className="flex items-center gap-0.5 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-bold text-amber-600 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
                                  <Flame className="h-3 w-3 fill-amber-500 text-amber-500" /> Warm
                                </span>
                              )}
                              {lead.priority === 'Cold' && (
                                <span className="rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                                  Cold
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Student Name */}
                          <div className="mt-1.5 flex items-center justify-between">
                            <h4 className="truncate font-bold text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                              {lead.studentName}
                            </h4>
                          </div>

                          {/* Interested Course */}
                          <div className="mt-1">
                            <span className="inline-block truncate rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                              {lead.interestedCourse}
                            </span>
                          </div>

                          {/* Contact Info & Direct Actions */}
                          <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-700/60">
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                              {lead.mobileNumber}
                            </span>
                            <div
                              className="flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Quick Phone Call Action */}
                              <a
                                href={`tel:${lead.mobileNumber}`}
                                title={`Call ${lead.studentName} (${lead.mobileNumber})`}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:text-slate-400 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-400"
                              >
                                <Phone className="h-3.5 w-3.5" />
                              </a>

                              {/* Quick WhatsApp Action */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setWhatsAppModalLead(lead);
                                }}
                                title={`WhatsApp ${lead.studentName} (Templates & Cloud API)`}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:text-slate-400 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-400"
                              >
                                <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                              </button>
                              {/* Quick Edit Action */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditLead(lead);
                                }}
                                title={`Edit ${lead.studentName}`}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-blue-950/60 dark:hover:text-blue-400"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Counsellor & Next Follow-Up Date */}
                          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-1 truncate max-w-[150px]">
                              <User className="h-3 w-3 shrink-0 text-slate-400" />
                              <span className="truncate">{counsellor}</span>
                            </div>

                            {lead.nextFollowUpDate ? (
                              <div
                                className={cn(
                                  'flex items-center gap-1 font-medium',
                                  new Date(lead.nextFollowUpDate) <= new Date()
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-slate-500 dark:text-slate-400'
                                )}
                                title={`Next Follow-up: ${formatDate(lead.nextFollowUpDate)}`}
                              >
                                <Clock className="h-3 w-3 shrink-0" />
                                <span>{new Date(lead.nextFollowUpDate).toLocaleDateString()}</span>
                              </div>
                            ) : (
                              <span>{lead.leadSource}</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Modal for ADMISSION CONFIRMED */}
      {pendingTransition && pendingTransition.targetStatus === 'Admission Confirmed' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-300">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Confirm Student Admission
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Moving {pendingTransition.lead.studentName} to Admission Confirmed stage
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/70 dark:text-slate-300 space-y-1">
              <div>
                <span className="font-semibold">Course:</span> {pendingTransition.lead.interestedCourse}
              </div>
              <div>
                <span className="font-semibold">Contact:</span> {pendingTransition.lead.mobileNumber}
              </div>
              {pendingTransition.lead.budget && (
                <div>
                  <span className="font-semibold">Agreed Fee:</span> ₹{pendingTransition.lead.budget.toLocaleString('en-IN')}
                </div>
              )}
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Admission Remarks / Receipt / Batch Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={transitionNotes}
                onChange={(e) => setTransitionNotes(e.target.value)}
                placeholder="Enter batch preferences, token fee paid details, or counseling notes..."
                className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingTransition(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmTransition}
                disabled={Boolean(updatingLeadId)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirm Admission</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for LOST LEADS */}
      {pendingTransition && pendingTransition.targetStatus === 'Lost' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-300">
                <Ban className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Mark Lead as Lost
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Record reason for losing {pendingTransition.lead.studentName}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Reason for Drop / Loss <span className="text-rose-500">*</span>
              </label>
              <select
                value={lossReason}
                onChange={(e) => setLossReason(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {LOSS_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Detailed Feedback / Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={transitionNotes}
                onChange={(e) => setTransitionNotes(e.target.value)}
                placeholder="Candidate feedback, competitor details, or telecaller observations..."
                className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingTransition(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmTransition}
                disabled={Boolean(updatingLeadId)}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-rose-600/20 hover:bg-rose-700 disabled:opacity-50"
              >
                <Ban className="h-4 w-4" />
                <span>Mark as Lost</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Communication Modal */}
      {whatsAppModalLead && (
        <WhatsAppModal
          isOpen={Boolean(whatsAppModalLead)}
          onClose={() => setWhatsAppModalLead(null)}
          lead={whatsAppModalLead}
          onSuccess={() => fetchKanbanLeads()}
        />
      )}
    </div>
  );
};
