import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Phone,
  MessageSquare,
  Mail,
  GraduationCap,
  BookOpen,
  History,
  Clock,
  Copy,
  Check,
  Calendar,
} from 'lucide-react';
import { ILead } from '../../types/lead';
import { formatDate } from '../../lib/utils';
import { FollowUpService } from '../../services/followup.service';
import { IFollowUp } from '../../types/followup';
import { ScheduleFollowupModal } from '../followups/ScheduleFollowupModal';
import { WhatsAppModal } from '../../components/whatsapp/WhatsAppModal';
import { AiLeadInsightsCard } from '../../components/ai/AiLeadInsightsCard';

interface LeadDetailDrawerProps {
  lead: ILead | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (lead: ILead) => void;
}

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({
  lead,
  isOpen,
  onClose,
  onEdit,
}) => {
  const [copied, setCopied] = useState(false);
  const [leadFollowUps, setLeadFollowUps] = useState<IFollowUp[]>([]);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);

  const loadFollowUps = useCallback(async () => {
    if (!lead) return;
    const leadId = lead.id || (lead as any)._id;
    try {
      const list = await FollowUpService.getLeadFollowUps(leadId);
      setLeadFollowUps(list);
    } catch (err) {
      console.error(err);
    }
  }, [lead]);

  useEffect(() => {
    if (isOpen && lead) {
      loadFollowUps();
    }
  }, [isOpen, lead, loadFollowUps]);

  if (!isOpen || !lead) return null;

  const handleCopyLeadId = () => {
    navigator.clipboard.writeText(lead.leadId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className="relative z-10 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl dark:bg-slate-900">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
              {lead.studentName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {lead.studentName}
                </h2>
                <button
                  onClick={handleCopyLeadId}
                  className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  title="Copy Lead ID"
                >
                  <span>{lead.leadId}</span>
                  {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Created {formatDate(lead.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onEdit(lead);
              }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Edit
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Quick Contact Action Bar */}
        <div className="flex items-center justify-between bg-slate-50 px-6 py-3 border-b border-slate-200 dark:bg-slate-800/50 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <a
              href={`tel:${lead.mobileNumber}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              <Phone className="h-3.5 w-3.5" />
              Call ({lead.mobileNumber})
            </a>
            <button
              type="button"
              onClick={() => setWhatsappModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-green-600 transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              WhatsApp
            </button>
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <Mail className="h-3.5 w-3.5" />
                Email
              </a>
            )}
            <button
              type="button"
              onClick={() => setScheduleModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Calendar className="h-3.5 w-3.5" />
              Follow-up
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Status & Assignment Badges */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
              <span className="text-[10px] font-semibold uppercase text-slate-400">Status</span>
              <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{lead.status}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
              <span className="text-[10px] font-semibold uppercase text-slate-400">Priority</span>
              <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{lead.priority}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
              <span className="text-[10px] font-semibold uppercase text-slate-400">Course</span>
              <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200 truncate">{lead.interestedCourse}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
              <span className="text-[10px] font-semibold uppercase text-slate-400">Counsellor</span>
              <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200 truncate">
                {lead.assignedCounsellor?.fullName || 'Unassigned'}
              </p>
            </div>
          </div>

          {/* AI Insights & Predictive Scoring */}
          <AiLeadInsightsCard leadId={lead.id || (lead as any)._id} />

          {/* Details Section */}
          <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-600" />
              Acquisition & Follow-Up
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400">Source:</span>{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">{lead.leadSource}</span>
              </div>
              <div>
                <span className="text-slate-400">Campaign:</span>{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">{lead.campaign || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400">Budget:</span>{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {lead.budget ? `₹${lead.budget.toLocaleString()}` : 'Not Specified'}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Next Follow-Up:</span>{' '}
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {lead.nextFollowUpDate ? formatDate(lead.nextFollowUpDate) : 'None Scheduled'}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Expected Admission:</span>{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {lead.expectedAdmissionDate ? formatDate(lead.expectedAdmissionDate) : 'Not Specified'}
                </span>
              </div>
              <div>
                <span className="text-slate-400">City:</span>{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">{lead.city || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Academic Background */}
          <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-blue-600" />
              Academic Background
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400">College:</span>{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">{lead.college || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400">Qualification:</span>{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">{lead.qualification || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400">Graduation Year:</span>{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">{lead.graduationYear || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Remarks */}
          {lead.remarks && (
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white mb-1">Remarks</h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{lead.remarks}</p>
            </div>
          )}

          {/* Follow-ups Timeline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                Follow-ups & Agendas ({leadFollowUps.length})
              </h3>
              <button
                type="button"
                onClick={() => setScheduleModalOpen(true)}
                className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                + Schedule
              </button>
            </div>

            <div className="space-y-2">
              {leadFollowUps.length > 0 ? (
                leadFollowUps.map((f) => (
                  <div
                    key={f.id || (f as any)._id}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {f.type} Follow-up
                      </span>
                      <span className="font-semibold text-slate-500">
                        {formatDate(f.scheduledAt)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-300">
                      Status: <span className="font-semibold">{f.status}</span> • Counsellor: {f.counsellorId?.fullName || 'Assigned'}
                    </div>
                    <div className="text-[11px] italic text-slate-500">
                      "{f.counsellingNotes}"
                    </div>
                    {f.completionRemarks && (
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                        Outcome: {f.completionRemarks}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-slate-400 italic">No follow-ups recorded yet for this student.</p>
              )}
            </div>
          </div>

          {/* Activity History Audit Trail */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="h-4 w-4 text-blue-600" />
              Activity & Audit History
            </h3>

            <div className="space-y-2.5 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {lead.activityHistory && lead.activityHistory.length > 0 ? (
                lead.activityHistory.map((item, index) => (
                  <div key={index} className="relative flex items-start gap-3 pl-1">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 z-10 dark:bg-blue-900/60 dark:text-blue-300">
                      <Clock className="h-3 w-3" />
                    </div>
                    <div className="flex-1 rounded-xl bg-slate-50 p-3 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {item.action.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400">{formatDate(item.timestamp)}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        By {item.changedBy?.fullName || 'Staff Member'} ({item.changedBy?.role || 'User'})
                      </p>
                      {item.notes && (
                        <p className="mt-1 text-slate-700 dark:text-slate-300 text-[11px] italic">
                          "{item.notes}"
                        </p>
                      )}
                      {item.changes && (
                        <div className="mt-2 space-y-1 bg-white p-2 rounded-lg border border-slate-100 text-[10px] dark:bg-slate-900 dark:border-slate-800">
                          {Object.entries(item.changes).map(([field, delta]: [string, any]) => (
                            <div key={field} className="flex justify-between">
                              <span className="font-semibold text-slate-600 dark:text-slate-400 capitalize">
                                {field}:
                              </span>
                              <span className="text-slate-500">
                                <span className="line-through text-rose-500">{String(delta.from ?? 'None')}</span>
                                {' → '}
                                <span className="text-emerald-600 font-medium">{String(delta.to ?? 'None')}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 italic">No activity recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <ScheduleFollowupModal
        isOpen={scheduleModalOpen}
        preselectedLead={lead}
        onClose={() => setScheduleModalOpen(false)}
        onSuccess={() => {
          loadFollowUps();
        }}
      />

      {lead && (
        <WhatsAppModal
          isOpen={whatsappModalOpen}
          lead={lead}
          onClose={() => setWhatsappModalOpen(false)}
        />
      )}
    </div>
  );
};
