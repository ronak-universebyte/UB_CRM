import React, { useState } from 'react';
import { X, Users, AlertCircle } from 'lucide-react';
import { LeadService } from '../../services/lead.service';
import { IUser } from '../../types/auth';

interface BulkAssignModalProps {
  isOpen: boolean;
  selectedLeadIds: string[];
  counsellors: IUser[];
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkAssignModal: React.FC<BulkAssignModalProps> = ({
  isOpen,
  selectedLeadIds,
  counsellors,
  onClose,
  onSuccess,
}) => {
  const [selectedCounsellor, setSelectedCounsellor] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCounsellor) {
      setError('Please select a target counsellor.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await LeadService.bulkAssign(selectedLeadIds, selectedCounsellor);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to assign leads.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Bulk Lead Assignment
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          You have selected <span className="font-bold text-blue-600">{selectedLeadIds.length}</span>{' '}
          leads. Choose the target admission counsellor or telecaller to receive them.
        </p>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Select Assignee
            </label>
            <select
              required
              value={selectedCounsellor}
              onChange={(e) => setSelectedCounsellor(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 p-2 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">Choose counsellor...</option>
              {counsellors.map((c) => (
                <option key={c.id || (c as any)._id} value={c.id || (c as any)._id}>
                  {c.fullName} ({c.role})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-1.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Assigning...' : `Assign ${selectedLeadIds.length} Leads`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

