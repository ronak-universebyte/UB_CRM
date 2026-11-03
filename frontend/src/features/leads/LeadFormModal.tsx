import React, { useState, useEffect } from 'react';
import {
  X,
  AlertCircle,
  AlertTriangle,
  User,
  BookOpen,
  Calendar,
} from 'lucide-react';
import { LeadService } from '../../services/lead.service';
import { UserService } from '../../services/user.service';
import {
  ILead,
  ICreateLeadPayload,
  CourseOption,
  LeadSource,
  LeadStatus,
  LeadPriority,
} from '../../types/lead';
import { IUser } from '../../types/auth';

const courseOptions: CourseOption[] = [
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

const leadSourceOptions: LeadSource[] = [
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

const statusOptions: LeadStatus[] = [
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

const priorityOptions: LeadPriority[] = ['Hot', 'Warm', 'Cold'];

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  leadToEdit?: ILead | null;
}

export const LeadFormModal: React.FC<LeadFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  leadToEdit,
}) => {
  const isEditing = !!leadToEdit;

  const [formData, setFormData] = useState<ICreateLeadPayload>({
    studentName: '',
    mobileNumber: '',
    whatsappNumber: '',
    email: '',
    city: '',
    college: '',
    qualification: '',
    graduationYear: undefined,
    interestedCourse: 'MERN Full Stack',
    leadSource: 'Website',
    campaign: '',
    assignedCounsellor: '',
    status: 'New',
    priority: 'Warm',
    budget: undefined,
    expectedAdmissionDate: '',
    nextFollowUpDate: '',
    remarks: '',
  });

  const [activityNotes, setActivityNotes] = useState('');
  const [counsellors, setCounsellors] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Duplicate mobile check state
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  useEffect(() => {
    const fetchCounsellors = async () => {
      try {
        const list = await UserService.listCounsellors();
        setCounsellors(list);
      } catch (e) {
        console.error('Error fetching counsellors:', e);
      }
    };
    fetchCounsellors();
  }, []);

  useEffect(() => {
    if (leadToEdit) {
      setFormData({
        studentName: leadToEdit.studentName || '',
        mobileNumber: leadToEdit.mobileNumber || '',
        whatsappNumber: leadToEdit.whatsappNumber || '',
        email: leadToEdit.email || '',
        city: leadToEdit.city || '',
        college: leadToEdit.college || '',
        qualification: leadToEdit.qualification || '',
        graduationYear: leadToEdit.graduationYear,
        interestedCourse: leadToEdit.interestedCourse || 'MERN Full Stack',
        leadSource: leadToEdit.leadSource || 'Website',
        campaign: leadToEdit.campaign || '',
        assignedCounsellor: (leadToEdit.assignedCounsellor as any)?.id ||
          (leadToEdit.assignedCounsellor as any)?._id ||
          (leadToEdit.assignedCounsellor as any) ||
          '',
        status: leadToEdit.status || 'New',
        priority: leadToEdit.priority || 'Warm',
        budget: leadToEdit.budget,
        expectedAdmissionDate: leadToEdit.expectedAdmissionDate
          ? new Date(leadToEdit.expectedAdmissionDate).toISOString().slice(0, 10)
          : '',
        nextFollowUpDate: leadToEdit.nextFollowUpDate
          ? new Date(leadToEdit.nextFollowUpDate).toISOString().slice(0, 10)
          : '',
        remarks: leadToEdit.remarks || '',
      });
      setActivityNotes('');
      setDuplicateWarning(null);
    } else {
      setFormData({
        studentName: '',
        mobileNumber: '',
        whatsappNumber: '',
        email: '',
        city: '',
        college: '',
        qualification: '',
        graduationYear: undefined,
        interestedCourse: 'MERN Full Stack',
        leadSource: 'Website',
        campaign: '',
        assignedCounsellor: '',
        status: 'New',
        priority: 'Warm',
        budget: undefined,
        expectedAdmissionDate: '',
        nextFollowUpDate: '',
        remarks: '',
      });
      setActivityNotes('');
      setDuplicateWarning(null);
    }
  }, [leadToEdit]);

  const checkMobileDuplicate = async (mobile: string) => {
    const clean = mobile.trim();
    if (clean.length === 10 && /^[5-9]\d{9}$/.test(clean)) {
      setCheckingDuplicate(true);
      try {
        const res = await LeadService.checkDuplicateMobile(
          clean,
          leadToEdit?.id || (leadToEdit as any)?._id
        );
        if (res.isDuplicate) {
          const lead = res.existingLead;
          setDuplicateWarning(
            `⚠️ Mobile number is already registered under ${lead.leadId} (${lead.studentName}). Duplicate leads cannot be saved.`
          );
        } else {
          setDuplicateWarning(null);
        }
      } catch (err) {
        console.error('Duplicate check error:', err);
      } finally {
        setCheckingDuplicate(false);
      }
    } else {
      setDuplicateWarning(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (duplicateWarning) {
      setError('Please resolve duplicate mobile number warning before saving.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: any = {
        ...formData,
        whatsappNumber: formData.whatsappNumber || formData.mobileNumber,
        expectedAdmissionDate: formData.expectedAdmissionDate
          ? new Date(formData.expectedAdmissionDate).toISOString()
          : undefined,
        nextFollowUpDate: formData.nextFollowUpDate
          ? new Date(formData.nextFollowUpDate).toISOString()
          : undefined,
      };

      if (isEditing && leadToEdit) {
        await LeadService.updateLead(leadToEdit.id || (leadToEdit as any)._id, {
          ...payload,
          activityNotes: activityNotes || undefined,
        });
      } else {
        await LeadService.createLead(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error saving lead. Please check the fields.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {isEditing ? `Edit Lead: ${leadToEdit?.leadId}` : 'Register New Lead'}
            </h2>
            <p className="text-xs text-slate-500">
              {isEditing
                ? 'Update student details and record counseling notes.'
                : 'Enter prospect details with automatic mobile duplication detection.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Duplicate Warning */}
        {duplicateWarning && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-amber-50 p-3.5 text-xs text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <span>{duplicateWarning}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-rose-50 p-3.5 text-xs text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 flex-1 overflow-y-auto pr-1 space-y-6 text-xs">
          {/* Section 1: Student Information */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
              <User className="h-4 w-4 text-blue-600" />
              <span>Student Personal Details</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Student Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={formData.studentName}
                  onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Mobile Number (10 digits) *
                </label>
                <div className="relative mt-1">
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    maxLength={10}
                    value={formData.mobileNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setFormData({ ...formData, mobileNumber: val });
                      if (val.length === 10) {
                        checkMobileDuplicate(val);
                      }
                    }}
                    onBlur={() => checkMobileDuplicate(formData.mobileNumber)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  {checkingDuplicate && (
                    <div className="absolute right-2.5 top-2 h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  )}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  WhatsApp Number
                </label>
                <input
                  type="tel"
                  placeholder="Leave empty to use mobile number"
                  maxLength={10}
                  value={formData.whatsappNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      whatsappNumber: e.target.value.replace(/\D/g, ''),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="student@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  City
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bengaluru"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  College / Institute
                </label>
                <input
                  type="text"
                  placeholder="e.g. RVCE, PES, etc."
                  value={formData.college}
                  onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Qualification
                </label>
                <input
                  type="text"
                  placeholder="e.g. B.Tech CS, BCA, MCA, Working Pro"
                  value={formData.qualification}
                  onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Graduation Year
                </label>
                <input
                  type="number"
                  placeholder="e.g. 2025"
                  min={1990}
                  max={2035}
                  value={formData.graduationYear || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      graduationYear: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Course & Lead Details */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
              <BookOpen className="h-4 w-4 text-blue-600" />
              <span>Course & Acquisition Channel</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Interested Course *
                </label>
                <select
                  value={formData.interestedCourse}
                  onChange={(e) =>
                    setFormData({ ...formData, interestedCourse: e.target.value as CourseOption })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {courseOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Lead Source *
                </label>
                <select
                  value={formData.leadSource}
                  onChange={(e) =>
                    setFormData({ ...formData, leadSource: e.target.value as LeadSource })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {leadSourceOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Campaign / Tag
                </label>
                <input
                  type="text"
                  placeholder="e.g. DiwaliOffer2026, SummerBatch"
                  value={formData.campaign}
                  onChange={(e) => setFormData({ ...formData, campaign: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Status, Priority & Assignment */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span>Pipeline & Assignment</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as LeadStatus })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value as LeadPriority })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {priorityOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Assigned Counsellor
                </label>
                <select
                  value={formData.assignedCounsellor || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, assignedCounsellor: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Unassigned</option>
                  {counsellors.map((c) => (
                    <option key={c.id || (c as any)._id} value={c.id || (c as any)._id}>
                      {c.fullName} ({c.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Budget (INR)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 45000"
                  min={0}
                  value={formData.budget || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      budget: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Expected Admission Date
                </label>
                <input
                  type="date"
                  value={formData.expectedAdmissionDate}
                  onChange={(e) =>
                    setFormData({ ...formData, expectedAdmissionDate: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Next Follow-up Date
                </label>
                <input
                  type="date"
                  value={formData.nextFollowUpDate}
                  onChange={(e) =>
                    setFormData({ ...formData, nextFollowUpDate: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Remarks / Discussion Notes
              </label>
              <textarea
                rows={2}
                placeholder="Candidate background, batch preference, counseling notes..."
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {isEditing && (
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Audit History Change Notes
                </label>
                <input
                  type="text"
                  placeholder="Brief reason for change (e.g. 'Status updated after phone demo')"
                  value={activityNotes}
                  onChange={(e) => setActivityNotes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !!duplicateWarning}
              className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving...' : isEditing ? 'Update Lead' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
