import React, { useState, useEffect, useCallback } from 'react';
import {
  UserPlus,
  Search,
  Download,
  Upload,
  Trash2,
  RotateCcw,
  Eye,
  Edit2,
  Users,
  CheckSquare,
  Square,
  AlertCircle,
  CheckCircle2,
  Phone,
  MessageSquare,
  Clock,
  Flame,
  Columns3,
  List,
} from 'lucide-react';
import { LeadService } from '../../services/lead.service';
import { UserService } from '../../services/user.service';
import {
  ILead,
  CourseOption,
  LeadSource,
  LeadStatus,
  LeadPriority,
} from '../../types/lead';
import { IUser } from '../../types/auth';
import { useAuth } from '../../context/AuthContext';
import { formatDate, cn } from '../../lib/utils';
import { LeadFormModal } from './LeadFormModal';
import { LeadDetailDrawer } from './LeadDetailDrawer';
import { BulkAssignModal } from './BulkAssignModal';
import { ImportLeadsModal } from './ImportLeadsModal';
import { WhatsAppModal } from '../../components/whatsapp/WhatsAppModal';
import { KanbanBoard } from './KanbanBoard';

const courses: CourseOption[] = [
  'MERN Full Stack',
  'Python',
  'Python with AI',
  'Java',
  'React JS',
  'Node JS',
  'PHP & Laravel',
  'Frontend',
  'Backend',
  'Data Science',
  'AI/ML',
  'Digital Marketing',
  'WordPress',
];

const sources: LeadSource[] = [
  'Website',
  'WhatsApp',
  'Google Ads',
  'Facebook Ads',
  'Instagram',
  'Phone Call',
  'Walk-in',
  'Referral',
  'Justdial',
  'Other',
];

const statuses: LeadStatus[] = [
  'New',
  'Not Contacted',
  'Contacted',
  'Interested',
  'Counselling Scheduled',
  'Demo Scheduled',
  'Follow-up Required',
  'Negotiation',
  'Admission Confirmed',
  'Not Interested',
  'Lost',
];

const priorities: LeadPriority[] = ['Hot', 'Warm', 'Cold'];

export const LeadsPage: React.FC = () => {
  const { user: currentUser } = useAuth();

  // Data states
  const [leads, setLeads] = useState<ILead[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedCounsellor, setSelectedCounsellor] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority' | 'nextFollowUp'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [isTrashView, setIsTrashView] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>(() => {
    const saved = localStorage.getItem('ub_crm_lead_view');
    return saved === 'table' ? 'table' : 'kanban';
  });

  useEffect(() => {
    localStorage.setItem('ub_crm_lead_view', viewMode);
  }, [viewMode]);

  // Selection states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [counsellors, setCounsellors] = useState<IUser[]>([]);

  // Feedback states
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<ILead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewingLead, setViewingLead] = useState<ILead | null>(null);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [whatsAppModalLead, setWhatsAppModalLead] = useState<ILead | null>(null);

  // Fetch Counsellors for filtering and assignment
  useEffect(() => {
    const fetchCounsellors = async () => {
      try {
        const list = await UserService.listCounsellors();
        setCounsellors(list);
      } catch (err) {
        console.error('Error loading counsellors:', err);
      }
    };
    fetchCounsellors();
  }, []);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await LeadService.listLeads({
        search: search || undefined,
        interestedCourse: selectedCourse || undefined,
        leadSource: selectedSource || undefined,
        status: selectedStatus || undefined,
        priority: selectedPriority || undefined,
        assignedCounsellor: selectedCounsellor || undefined,
        isDeleted: isTrashView,
        sortBy,
        page: currentPage,
        limit: pageSize,
      });

      setLeads(res.data);
      setTotalRecords(res.pagination.totalRecords);
      setTotalPages(res.pagination.totalPages);
      setSelectedIds([]);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to retrieve leads.');
    } finally {
      setLoading(false);
    }
  }, [
    search,
    selectedCourse,
    selectedSource,
    selectedStatus,
    selectedPriority,
    selectedCounsellor,
    isTrashView,
    sortBy,
    currentPage,
    pageSize,
  ]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleSelectAll = () => {
    if (selectedIds.length === leads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leads.map((l) => l.id || (l as any)._id));
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSoftDelete = async (lead: ILead) => {
    if (!confirm(`Are you sure you want to move ${lead.studentName}'s enquiry to trash?`)) {
      return;
    }
    try {
      await LeadService.softDeleteLead(lead.id || (lead as any)._id);
      setSuccessMessage(`Lead ${lead.leadId} moved to trash.`);
      fetchLeads();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to soft delete lead.');
    }
  };

  const handleRestore = async (lead: ILead) => {
    try {
      await LeadService.restoreLead(lead.id || (lead as any)._id);
      setSuccessMessage(`Lead ${lead.leadId} restored to active pipeline.`);
      fetchLeads();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to restore lead.');
    }
  };

  const handlePermanentDelete = async (lead: ILead) => {
    if (
      !confirm(
        `PERMANENT DELETION WARNING: Are you sure you want to completely erase ${lead.leadId} (${lead.studentName}) from the database? This action cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await LeadService.permanentDeleteLead(lead.id || (lead as any)._id);
      setSuccessMessage(`Lead ${lead.leadId} permanently erased.`);
      fetchLeads();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to permanently delete lead.');
    }
  };

  const handleExportCsv = async () => {
    try {
      const blob = await LeadService.exportCsv({
        search: search || undefined,
        interestedCourse: selectedCourse || undefined,
        leadSource: selectedSource || undefined,
        status: selectedStatus || undefined,
        priority: selectedPriority || undefined,
        isDeleted: isTrashView,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `universebyte_leads_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Error exporting CSV.');
    }
  };

  const openEditModal = (lead: ILead) => {
    setEditingLead(lead);
    setFormModalOpen(true);
  };

  const openViewDrawer = (lead: ILead) => {
    setViewingLead(lead);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Lead Management
            </h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              {totalRecords} Total
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Enquiry pipeline, follow-ups, and student lead conversions.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Active / Trash View Toggle */}
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs dark:border-slate-800 dark:bg-slate-900">
            <button
              onClick={() => {
                setIsTrashView(false);
                setCurrentPage(1);
              }}
              className={cn(
                'rounded-md px-3 py-1.5 font-medium transition-colors',
                !isTrashView
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              )}
            >
              Active Pipeline
            </button>
            <button
              onClick={() => {
                setIsTrashView(true);
                setCurrentPage(1);
              }}
              className={cn(
                'rounded-md px-3 py-1.5 font-medium transition-colors flex items-center gap-1.5',
                isTrashView
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              )}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Trash
            </button>
          </div>

          {/* View Mode Toggle (Kanban vs Table) */}
          {!isTrashView && (
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs dark:border-slate-800 dark:bg-slate-900">
              <button
                onClick={() => setViewMode('kanban')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition-colors',
                  viewMode === 'kanban'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                )}
                title="Kanban Pipeline Board"
              >
                <Columns3 className="h-3.5 w-3.5" />
                Pipeline
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition-colors',
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                )}
                title="Table View"
              >
                <List className="h-3.5 w-3.5" />
                Table
              </button>
            </div>
          )}

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Download CSV"
          >
            <Download className="h-4 w-4 text-slate-500" />
            Export
          </button>

          {(currentUser?.role === 'SuperAdmin' ||
            currentUser?.role === 'Admin' ||
            currentUser?.role === 'MarketingManager') && (
              <button
                onClick={() => setImportModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                title="Import CSV"
              >
                <Upload className="h-4 w-4 text-slate-500" />
                Import
              </button>
            )}

          <button
            onClick={() => {
              setEditingLead(null);
              setFormModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            New Lead
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

      {/* Main Content: Kanban Pipeline vs Table View */}
      {!isTrashView && viewMode === 'kanban' ? (
        <div className="flex h-[calc(100vh-175px)] min-h-[620px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <KanbanBoard
            onViewLead={openViewDrawer}
            onEditLead={openEditModal}
            counsellors={counsellors}
            courses={courses}
            sources={sources}
          />
        </div>
      ) : (
        <>
          {/* Search & Advanced Filters Bar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name, phone, WhatsApp, email, or Lead ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2 text-xs">
            {/* Course Filter */}
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-slate-700 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
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
              onChange={(e) => {
                setSelectedSource(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-slate-700 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="">All Sources</option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-slate-700 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="">All Statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={selectedPriority}
              onChange={(e) => {
                setSelectedPriority(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-slate-700 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="">All Priorities</option>
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {/* Counsellor Filter (If authorized) */}
            {(currentUser?.role === 'SuperAdmin' ||
              currentUser?.role === 'Admin' ||
              currentUser?.role === 'MarketingManager') && (
                <select
                  value={selectedCounsellor}
                  onChange={(e) => {
                    setSelectedCounsellor(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-slate-700 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <option value="">All Counsellors</option>
                  {counsellors.map((c) => (
                    <option key={c.id || (c as any)._id} value={c.id || (c as any)._id}>
                      {c.fullName}
                    </option>
                  ))}
                </select>
              )}

            {/* Sort Options */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 font-medium text-slate-700 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="priority">Sort: By Priority</option>
              <option value="nextFollowUp">Sort: Next Follow-Up</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Bar (when rows are selected) */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-blue-50 px-4 py-2.5 border border-blue-200 text-xs text-blue-900 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-200 animate-in fade-in">
            <span className="font-semibold">
              {selectedIds.length} leads selected
            </span>
            {(currentUser?.role === 'SuperAdmin' ||
              currentUser?.role === 'Admin' ||
              currentUser?.role === 'MarketingManager') && (
                <button
                  onClick={() => setBulkAssignOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1 font-semibold text-white hover:bg-blue-700 shadow-sm"
                >
                  <Users className="h-3.5 w-3.5" />
                  Assign Selected Leads
                </button>
              )}
          </div>
        )}
      </div>

      {/* Main Leads Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <button onClick={handleSelectAll} className="text-slate-400 hover:text-slate-600">
                    {selectedIds.length > 0 && selectedIds.length === leads.length ? (
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3 font-semibold">Lead ID</th>
                <th className="py-3 px-3 font-semibold">Student Name & Contact</th>
                <th className="py-3 px-3 font-semibold">Course & Source</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-3 font-semibold">Priority</th>
                <th className="py-3 px-3 font-semibold">Assigned To</th>
                <th className="py-3 px-3 font-semibold">Follow-Up</th>
                <th className="py-3 px-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="flex justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    </div>
                  </td>
                </tr>
              ) : leads.length > 0 ? (
                leads.map((lead) => {
                  const leadId = lead.id || (lead as any)._id;
                  const isSelected = selectedIds.includes(leadId);

                  return (
                    <tr
                      key={leadId}
                      className={cn(
                        'hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors',
                        isSelected && 'bg-blue-50/50 dark:bg-blue-950/20'
                      )}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleSelectOne(leadId)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </td>

                      {/* Lead ID */}
                      <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        <button
                          onClick={() => openViewDrawer(lead)}
                          className="hover:underline focus:outline-none"
                        >
                          {lead.leadId}
                        </button>
                      </td>

                      {/* Student & Contact */}
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-900 dark:text-white">
                          {lead.studentName}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                          <a
                            href={`tel:${lead.mobileNumber}`}
                            className="hover:text-blue-600 flex items-center gap-1"
                            title="Call Candidate"
                          >
                            <Phone className="h-3 w-3 text-slate-400" />
                            {lead.mobileNumber}
                          </a>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setWhatsAppModalLead(lead);
                            }}
                            className="hover:text-green-600 flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium"
                            title="Open WhatsApp Communication (Templates & Meta API)"
                          >
                            <MessageSquare className="h-3 w-3" />
                            WA
                          </button>
                        </div>
                      </td>

                      {/* Course & Source */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {lead.interestedCourse}
                        </span>
                        <p className="text-[11px] text-slate-400">Source: {lead.leadSource}</p>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border',
                            lead.status === 'New' && 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300',
                            lead.status === 'Not Contacted' && 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
                            lead.status === 'Contacted' && 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300',
                            lead.status === 'Interested' && 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300',
                            lead.status === 'Counselling Scheduled' && 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300',
                            lead.status === 'Demo Scheduled' && 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
                            lead.status === 'Follow-up Required' && 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300',
                            lead.status === 'Negotiation' && 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300',
                            lead.status === 'Admission Confirmed' && 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
                            lead.status === 'Not Interested' && 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300',
                            lead.status === 'Lost' && 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                          )}
                        >
                          {lead.status}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 font-semibold text-[11px]',
                            lead.priority === 'Hot' && 'text-red-600',
                            lead.priority === 'Warm' && 'text-amber-600',
                            lead.priority === 'Cold' && 'text-slate-500'
                          )}
                        >
                          {lead.priority === 'Hot' && <Flame className="h-3 w-3 fill-red-500 text-red-500" />}
                          {lead.priority}
                        </span>
                      </td>

                      {/* Counsellor */}
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-medium">
                        {lead.assignedCounsellor?.fullName || (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Next Follow Up */}
                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {lead.nextFollowUpDate ? (
                          <span className="flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
                            <Clock className="h-3 w-3" />
                            {formatDate(lead.nextFollowUpDate)}
                          </span>
                        ) : (
                          'None'
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openViewDrawer(lead)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                            title="View Lead Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {!isTrashView && (
                            <>
                              <button
                                onClick={() => openEditModal(lead)}
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                title="Edit Lead"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleSoftDelete(lead)}
                                className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                                title="Move to Trash"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}

                          {isTrashView && (
                            <>
                              <button
                                onClick={() => handleRestore(lead)}
                                className="rounded p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                title="Restore Lead from Trash"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                              {currentUser?.role === 'SuperAdmin' && (
                                <button
                                  onClick={() => handlePermanentDelete(lead)}
                                  className="rounded p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                  title="Permanently Delete Lead"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    {isTrashView
                      ? 'No deleted leads in trash bin.'
                      : 'No enquiries match the current filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Database-backed Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-slate-800">
          <div>
            Showing{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {Math.min(currentPage * pageSize, totalRecords)}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {totalRecords}
            </span>{' '}
            leads
          </div>

          <div className="mt-2 sm:mt-0 flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || loading}
              className="rounded-lg border border-slate-200 px-3 py-1 font-medium hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Previous
            </button>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || loading}
              className="rounded-lg border border-slate-200 px-3 py-1 font-medium hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      </>
      )}

      {/* Modals & Drawer */}
      <LeadFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSuccess={() => {
          setSuccessMessage(editingLead ? 'Lead updated successfully!' : 'Lead registered successfully!');
          fetchLeads();
        }}
        leadToEdit={editingLead}
      />

      <LeadDetailDrawer
        isOpen={drawerOpen}
        lead={viewingLead}
        onClose={() => setDrawerOpen(false)}
        onEdit={(lead) => openEditModal(lead)}
      />

      <BulkAssignModal
        isOpen={bulkAssignOpen}
        selectedLeadIds={selectedIds}
        counsellors={counsellors}
        onClose={() => setBulkAssignOpen(false)}
        onSuccess={() => {
          setSuccessMessage(`Assigned ${selectedIds.length} leads successfully!`);
          fetchLeads();
        }}
      />

      <ImportLeadsModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => {
          setSuccessMessage('Batch import completed.');
          fetchLeads();
        }}
      />

      {whatsAppModalLead && (
        <WhatsAppModal
          isOpen={Boolean(whatsAppModalLead)}
          lead={whatsAppModalLead}
          onClose={() => setWhatsAppModalLead(null)}
          onSuccess={() => fetchLeads()}
        />
      )}
    </div>
  );
};
