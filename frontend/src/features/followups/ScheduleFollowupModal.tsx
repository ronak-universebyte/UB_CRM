import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Phone,
  MessageSquare,
  Users,
  Video,
  AlertCircle,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { FollowUpService } from '../../services/followup.service';
import { LeadService } from '../../services/lead.service';
import { ILead } from '../../types/lead';
import { IUser } from '../../types/auth';
import { FollowUpType } from '../../types/followup';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

interface ScheduleFollowupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedLead?: ILead | null;
  counsellors?: IUser[];
}

export const ScheduleFollowupModal: React.FC<ScheduleFollowupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedLead,
  counsellors = [],
}) => {
  const { user: currentUser } = useAuth();

  const [leadId, setLeadId] = useState<string>('');
  const [selectedLead, setSelectedLead] = useState<ILead | null>(null);
  const [searchLeadTerm, setSearchLeadTerm] = useState('');
  const [leadSearchResults, setLeadSearchResults] = useState<ILead[]>([]);
  const [searchingLeads, setSearchingLeads] = useState(false);

  // Form states
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('11:00');
  const [type, setType] = useState<FollowUpType>('Call');
  const [counsellingNotes, setCounsellingNotes] = useState('');
  const [assignedCounsellorId, setAssignedCounsellorId] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize defaults
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setCounsellingNotes('');
      setType('Call');

      // Default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const dd = String(tomorrow.getDate()).padStart(2, '0');
      setScheduledDate(`${yyyy}-${mm}-${dd}`);
      setScheduledTime('11:00');

      if (preselectedLead) {
        setLeadId(preselectedLead.id || (preselectedLead as any)._id);
        setSelectedLead(preselectedLead);
      } else {
        setLeadId('');
        setSelectedLead(null);
        setSearchLeadTerm('');
        setLeadSearchResults([]);
      }

      setAssignedCounsellorId(currentUser?.id || '');
    }
  }, [isOpen, preselectedLead, currentUser]);

  // Search leads for lead picker
  useEffect(() => {
    if (!preselectedLead && searchLeadTerm.trim().length >= 2) {
      const delayDebounce = setTimeout(async () => {
        setSearchingLeads(true);
        try {
          const res = await LeadService.listLeads({
            search: searchLeadTerm.trim(),
            limit: 5,
          });
          setLeadSearchResults(res.data);
        } catch (err) {
          console.error(err);
        } finally {
          setSearchingLeads(false);
        }
      }, 300);
      return () => clearTimeout(delayDebounce);
    } else {
      setLeadSearchResults([]);
    }
  }, [searchLeadTerm, preselectedLead]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId) {
      setError('Please select a student lead for this follow-up.');
      return;
    }
    if (!scheduledDate || !scheduledTime) {
      setError('Please select both date and time.');
      return;
    }
    if (!counsellingNotes.trim()) {
      setError('Counselling notes are required.');
      return;
    }

    const combinedDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`);
    if (isNaN(combinedDateTime.getTime())) {
      setError('Please provide a valid scheduled date and time.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await FollowUpService.scheduleFollowUp({
        leadId,
        scheduledAt: combinedDateTime.toISOString(),
        type,
        counsellingNotes: counsellingNotes.trim(),
        counsellorId:
          ['SuperAdmin', 'Admin', 'MarketingManager'].includes(currentUser?.role || '') &&
          assignedCounsellorId
            ? assignedCounsellorId
            : undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Failed to schedule follow-up. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const TYPE_OPTIONS: { type: FollowUpType; label: string; icon: React.ReactNode; color: string }[] = [
    { type: 'Call', label: 'Phone Call', icon: <Phone className="h-4 w-4" />, color: 'hover:border-blue-500' },
    { type: 'WhatsApp', label: 'WhatsApp', icon: <MessageSquare className="h-4 w-4" />, color: 'hover:border-emerald-500' },
    { type: 'Meeting', label: 'Meeting', icon: <Users className="h-4 w-4" />, color: 'hover:border-purple-500' },
    { type: 'Demo', label: 'Online Demo', icon: <Video className="h-4 w-4" />, color: 'hover:border-cyan-500' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Schedule New Follow-up
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Log upcoming student contact and agenda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Lead Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Connected Lead <span className="text-rose-500">*</span>
            </label>
            {selectedLead ? (
              <div className="mt-1.5 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs dark:border-blue-800 dark:bg-blue-950/40">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {selectedLead.studentName} ({selectedLead.leadId})
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    {selectedLead.interestedCourse} • {selectedLead.mobileNumber}
                  </div>
                </div>
                {!preselectedLead && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLead(null);
                      setLeadId('');
                    }}
                    className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Change
                  </button>
                )}
              </div>
            ) : (
              <div className="relative mt-1.5">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student by name, phone, or Lead ID..."
                  value={searchLeadTerm}
                  onChange={(e) => setSearchLeadTerm(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                {searchingLeads && (
                  <div className="mt-1 text-[11px] text-slate-400">Searching leads...</div>
                )}
                {leadSearchResults.length > 0 && (
                  <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    {leadSearchResults.map((l) => (
                      <button
                        key={l.id || (l as any)._id}
                        type="button"
                        onClick={() => {
                          setSelectedLead(l);
                          setLeadId(l.id || (l as any)._id);
                          setSearchLeadTerm('');
                          setLeadSearchResults([]);
                        }}
                        className="w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-blue-50 dark:hover:bg-slate-700/60"
                      >
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {l.studentName} ({l.leadId})
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {l.interestedCourse} • {l.mobileNumber}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Follow-up Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Follow-up Channel / Type <span className="text-rose-500">*</span>
            </label>
            <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setType(opt.type)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition-all',
                    type === opt.type
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-300 ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  )}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Scheduled Date & Time */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Scheduled Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Scheduled Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          {/* Assign to Counsellor (if admin / manager) */}
          {['SuperAdmin', 'Admin', 'MarketingManager'].includes(currentUser?.role || '') &&
            counsellors.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Assign Follow-up to Counsellor
                </label>
                <select
                  value={assignedCounsellorId}
                  onChange={(e) => setAssignedCounsellorId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {counsellors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

          {/* Counselling Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Counselling Notes / Call Agenda <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={counsellingNotes}
              onChange={(e) => setCounsellingNotes(e.target.value)}
              placeholder="e.g. Call student to discuss scholarship discount, batch timings, and syllabus..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{loading ? 'Scheduling...' : 'Schedule Follow-up'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

