import React from 'react';
import {
  X,
  History,
  Clock,
  User,
  CheckCircle2,
  RotateCcw,
  PlusCircle,
} from 'lucide-react';
import { IFollowUp } from '../../types/followup';
import { formatDate } from '../../lib/utils';

interface FollowupHistoryModalProps {
  isOpen: boolean;
  followUp: IFollowUp | null;
  onClose: () => void;
}

export const FollowupHistoryModal: React.FC<FollowupHistoryModalProps> = ({
  isOpen,
  followUp,
  onClose,
}) => {
  if (!isOpen || !followUp) return null;

  const history = followUp.history || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Follow-up Activity History
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Audit trail for {followUp.leadId?.studentName}
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
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
          {/* Summary Box */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white">
                {followUp.leadId?.studentName} ({followUp.leadId?.leadId})
              </span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {followUp.type} Follow-up
              </span>
            </div>
            <div className="text-slate-600 dark:text-slate-300">
              Assigned Counsellor: {followUp.counsellorId?.fullName}
            </div>
            <div className="text-slate-600 dark:text-slate-300">
              Status: <span className="font-semibold">{followUp.status}</span>
            </div>
          </div>

          {/* Timeline List */}
          <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {history.length === 0 ? (
              <div className="text-xs text-slate-400 py-4 text-center">No history logs recorded yet</div>
            ) : (
              history.map((item, idx) => {
                let icon = <PlusCircle className="h-3 w-3 text-blue-600" />;
                let dotBg = 'bg-blue-100 dark:bg-blue-950/60 border-blue-400';

                if (item.action === 'COMPLETED') {
                  icon = <CheckCircle2 className="h-3 w-3 text-emerald-600" />;
                  dotBg = 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-400';
                } else if (item.action === 'RESCHEDULED') {
                  icon = <RotateCcw className="h-3 w-3 text-amber-600" />;
                  dotBg = 'bg-amber-100 dark:bg-amber-950/60 border-amber-400';
                }

                return (
                  <div key={idx} className="relative">
                    <div
                      className={`absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${dotBg}`}
                    >
                      {icon}
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-800/80">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                        <span>{item.action}</span>
                        <span className="flex items-center gap-1 text-[11px] font-normal text-slate-400">
                          <Clock className="h-3 w-3" />
                          {formatDate(item.timestamp)}
                        </span>
                      </div>

                      {item.previousScheduledAt && item.newScheduledAt && (
                        <div className="mt-1 text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                          From: {formatDate(item.previousScheduledAt)} → To: {formatDate(item.newScheduledAt)}
                        </div>
                      )}

                      {item.notes && (
                        <div className="mt-1.5 rounded-lg bg-slate-50 p-2 text-xs text-slate-600 italic dark:bg-slate-900/60 dark:text-slate-300">
                          "{item.notes}"
                        </div>
                      )}

                      <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                        <User className="h-3 w-3" />
                        <span>Action by {item.changedBy?.fullName || 'Staff'}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
