import mongoose, { Schema } from 'mongoose';
import { ILeadDocument } from '../types';
import {
  COURSE_OPTIONS,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_STATUSES,
} from '../config/constants';

const LeadActivitySchema = new Schema(
  {
    action: { type: String, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changes: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now },
    notes: { type: String },
  },
  { _id: false }
);

const LeadSchema = new Schema<ILeadDocument>(
  {
    leadId: {
      type: String,
      unique: true,
      index: true,
    },
    studentName: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
      minlength: [2, 'Student name must be at least 2 characters'],
      maxlength: [120, 'Student name cannot exceed 120 characters'],
      index: true,
    },
    mobileNumber: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
      match: [/^[5-9]\d{9}$/, 'Please provide a valid 10-digit mobile number'],
      index: true,
    },
    whatsappNumber: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },
    city: {
      type: String,
      trim: true,
    },
    college: {
      type: String,
      trim: true,
    },
    qualification: {
      type: String,
      trim: true,
    },
    graduationYear: {
      type: Number,
      min: 1990,
      max: 2035,
    },
    interestedCourse: {
      type: String,
      required: [true, 'Interested course is required'],
      enum: COURSE_OPTIONS,
      index: true,
    },
    leadSource: {
      type: String,
      required: [true, 'Lead source is required'],
      enum: LEAD_SOURCES,
      index: true,
    },
    campaign: {
      type: String,
      trim: true,
    },
    assignedCounsellor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    status: {
      type: String,
      enum: LEAD_STATUSES,
      default: 'New',
      index: true,
    },
    priority: {
      type: String,
      enum: LEAD_PRIORITIES,
      default: 'Warm',
      index: true,
    },
    budget: {
      type: Number,
      min: 0,
    },
    expectedAdmissionDate: {
      type: Date,
    },
    nextFollowUpDate: {
      type: Date,
      index: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    activityHistory: {
      type: [LeadActivitySchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes for optimal pipeline and counselor queries
LeadSchema.index({ isDeleted: 1, assignedCounsellor: 1, status: 1 });
LeadSchema.index({ isDeleted: 1, createdAt: -1 });
LeadSchema.index({ isDeleted: 1, mobileNumber: 1 });
LeadSchema.index({ isDeleted: 1, nextFollowUpDate: 1 });

// Helper to generate next unique Lead ID
export const generateNextLeadId = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const count = await mongoose.model('Lead').countDocuments();
  let candidate = `UB-LD-${year}-${(count + 1).toString().padStart(4, '0')}`;

  let exists = await mongoose.model('Lead').findOne({ leadId: candidate });
  let offset = 1;
  while (exists) {
    candidate = `UB-LD-${year}-${(count + 1 + offset).toString().padStart(4, '0')}`;
    exists = await mongoose.model('Lead').findOne({ leadId: candidate });
    offset++;
  }
  return candidate;
};

// Pre-save hook
LeadSchema.pre<ILeadDocument>('save', async function (next) {
  if (!this.whatsappNumber) {
    this.whatsappNumber = this.mobileNumber;
  }

  if (!this.leadId) {
    try {
      this.leadId = await generateNextLeadId();
    } catch (err: unknown) {
      return next(err as Error);
    }
  }

  next();
});

export const Lead = mongoose.model<ILeadDocument>('Lead', LeadSchema);

