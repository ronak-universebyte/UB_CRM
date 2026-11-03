import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Phone,
  Users,
  Video,
} from 'lucide-react';
import { FollowUpService } from '../../services/followup.service';
import { IFollowUp, FollowUpType } from '../../types/followup';
import { formatDate, cn } from '../../lib/utils';

interface CompleteFollowupModalProps {
  isOpen: boolean;
  followUp: IFollowUp | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const CompleteFollowupModal: React.FC<CompleteFollowupModalProps> = ({
  isOpen,
  followUp,
  onClose,
  onSuccess,
}) => {
  const [completionRemarks, setCompletionRemarks] = useState('');
  const [scheduleNext, setScheduleNext] = useState(false);
  const [nextDate, setNextDate] = useState('');
  const [nextTime, setNextTime] = useState('11:00');
  const [nextType, setNextType] = useState<FollowUpType>('Call');
  const [nextNotes, setNextNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !followUp) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completionRemarks.trim()) {
      setError('Please enter follow-up completion remarks / outcome.');
      return;
    }

    let nextFollowUpDateISO: string | undefined;
    if (scheduleNext) {
      if (!nextDate || !nextTime) {
        setError('Please provide date and time for the next follow-up.');
        return;
      }
      const dt = new Date(`${nextDate}T${nextTime}:00`);
      if (isNaN(dt.getTime())) {
        setError('Please provide a valid date and time for the next follow-up.');
        return;
      }
      nextFollowUpDateISO = dt.toISOString();
    }

    setLoading(true);
    setError(null);

    try {
      const followUpId = followUp.id || (followUp as any)._id;
      await FollowUpService.completeFollowUp(followUpId, {
        completionRemarks: completionRemarks.trim(),
        nextFollowUpDate: nextFollowUpDateISO,
        nextFollowUpType: scheduleNext ? nextType : undefined,
        nextFollowUpNotes: scheduleNext ? nextNotes.trim() : undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete follow-up.');
    } finally {
      setLoading(false);
    }
  };

  const TYPE_OPTIONS: { type: FollowUpType; label: string; icon: React.ReactNode }[] = [
    { type: 'Call', label: 'Call', icon: <Phone className="h-3.5 w-3.5" /> },
    { type: 'WhatsApp', label: 'WhatsApp', icon: <MessageSquare className="h-3.5 w-3.5" /> },
    { type: 'Meeting', label: 'Meeting', icon: <Users className="h-3.5 w-3.5" /> },
    { type: 'Demo', label: 'Demo', icon: <Video className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Complete Follow-up
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Log conversation summary and discussion outcome
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

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Follow-up Context Box */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white">
                {followUp.leadId?.studentName} ({followUp.leadId?.leadId})
              </span>
              <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                {followUp.type}
              </span>
            </div>
            <div>Course: {followUp.leadId?.interestedCourse} • Phone: {followUp.leadId?.mobileNumber}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Scheduled For: {formatDate(followUp.scheduledAt)}
            </div>
            <div className="text-[11px] italic text-slate-500">
              Agenda: "{followUp.counsellingNotes}"
            </div>
          </div>

          {/* Completion Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Conversation Outcome / Counselling Remarks <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={completionRemarks}
              onChange={(e) => setCompletionRemarks(e.target.value)}
              placeholder="e.g. Connected with candidate. Discussed syllabus and fees. Candidate agreed to attend demo session this Saturday..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Schedule Next Follow-up Checkbox */}
          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={scheduleNext}
                onChange={(e) => setScheduleNext(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Schedule subsequent follow-up for this lead</span>
            </label>

            {scheduleNext && (
              <div className="mt-3 space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Next Date
                    </label>
                    <input
                      type="date"
                      value={nextDate}
                      onChange={(e) => setNextDate(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Next Time
                    </label>
                    <input
                      type="time"
                      value={nextTime}
                      onChange={(e) => setNextTime(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Channel
                  </label>
                  <div className="mt-1 grid grid-cols-4 gap-1.5">
                    {TYPE_OPTIONS.map((t) => (
                      <button
                        key={t.type}
                        type="button"
                        onClick={() => setNextType(t.type)}
                        className={cn(
                          'flex items-center justify-center gap-1 rounded-lg border py-1.5 text-[11px] font-medium transition-colors',
                          nextType === t.type
                            ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        )}
                      >
                        {t.icon}
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Next Follow-up Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={nextNotes}
                    onChange={(e) => setNextNotes(e.target.value)}
                    placeholder="e.g. Call to confirm demo attendance"
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            )}
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
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{loading ? 'Completing...' : 'Mark as Completed'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
