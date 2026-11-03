import React, { useState, useEffect } from 'react';
import {
  X,
  RotateCcw,
  AlertCircle,
  Phone,
  MessageSquare,
  Users,
  Video,
} from 'lucide-react';
import { FollowUpService } from '../../services/followup.service';
import { IFollowUp, FollowUpType } from '../../types/followup';
import { formatDate, cn } from '../../lib/utils';

interface RescheduleFollowupModalProps {
  isOpen: boolean;
  followUp: IFollowUp | null;
  onClose: () => void;
  onSuccess: () => void;
}

const COMMON_RESCHEDULE_REASONS = [
  'Student requested callback at later time',
  'Student busy in college exams / office work',
  'Phone ringing / No response after 3 tries',
  'Student traveling / out of station',
  'Requested weekend counseling session',
  'Requested WhatsApp info first before call',
];

export const RescheduleFollowupModal: React.FC<RescheduleFollowupModalProps> = ({
  isOpen,
  followUp,
  onClose,
  onSuccess,
}) => {
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('11:00');
  const [rescheduledReason, setRescheduledReason] = useState('');
  const [type, setType] = useState<FollowUpType>('Call');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && followUp) {
      setError(null);
      setRescheduledReason('');
      setType(followUp.type);

      // Default new date to tomorrow or 2 days later
      const d = new Date();
      d.setDate(d.getDate() + 2);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setNewDate(`${yyyy}-${mm}-${dd}`);
      setNewTime('11:00');
    }
  }, [isOpen, followUp]);

  if (!isOpen || !followUp) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !newTime) {
      setError('Please select both new date and time.');
      return;
    }
    if (!rescheduledReason.trim()) {
      setError('Please specify the reason for rescheduling.');
      return;
    }

    const combinedDateTime = new Date(`${newDate}T${newTime}:00`);
    if (isNaN(combinedDateTime.getTime())) {
      setError('Please provide a valid date and time.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const followUpId = followUp.id || (followUp as any)._id;
      await FollowUpService.rescheduleFollowUp(followUpId, {
        newScheduledAt: combinedDateTime.toISOString(),
        rescheduledReason: rescheduledReason.trim(),
        type,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reschedule follow-up.');
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Reschedule Follow-up
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Move upcoming follow-up to a different slot
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

          {/* Current Info */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 space-y-1">
            <div className="font-bold text-slate-900 dark:text-white">
              {followUp.leadId?.studentName} ({followUp.leadId?.leadId})
            </div>
            <div className="text-slate-500 dark:text-slate-400">
              Current Scheduled Slot: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatDate(followUp.scheduledAt)}</span>
            </div>
            <div className="text-[11px] italic text-slate-500">
              Notes: "{followUp.counsellingNotes}"
            </div>
          </div>

          {/* New Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                New Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                New Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          {/* Channel / Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Follow-up Channel
            </label>
            <div className="mt-1.5 grid grid-cols-4 gap-2">
              {TYPE_OPTIONS.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => setType(t.type)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-medium transition-colors',
                    type === t.type
                      ? 'border-amber-600 bg-amber-50 text-amber-800 dark:border-amber-500 dark:bg-amber-950/60 dark:text-amber-300 ring-2 ring-amber-500/20'
                      : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  )}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Reschedule Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Reason for Rescheduling <span className="text-rose-500">*</span>
            </label>
            <div className="mt-1.5 flex flex-wrap gap-1.5 pb-2">
              {COMMON_RESCHEDULE_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRescheduledReason(r)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] text-slate-600 hover:border-amber-400 hover:bg-amber-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  {r}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              value={rescheduledReason}
              onChange={(e) => setRescheduledReason(e.target.value)}
              placeholder="Enter reason or click one of the quick options above..."
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
              className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-amber-500/20 hover:bg-amber-700 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              <span>{loading ? 'Rescheduling...' : 'Confirm Reschedule'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

