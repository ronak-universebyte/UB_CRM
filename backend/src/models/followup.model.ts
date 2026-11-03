import mongoose, { Schema } from 'mongoose';
import { IFollowUpDocument } from '../types';
import { FOLLOWUP_STATUSES, FOLLOWUP_TYPES } from '../config/constants';

const FollowUpHistorySchema = new Schema(
  {
    action: {
      type: String,
      required: true,
      enum: ['SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED', 'NOTES_UPDATED'],
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    previousScheduledAt: {
      type: Date,
    },
    newScheduledAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const FollowUpSchema = new Schema<IFollowUpDocument>(
  {
    leadId: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
      required: [true, 'Follow-up must be connected to a valid lead'],
      index: true,
    },
    counsellorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Follow-up must be assigned to a counsellor'],
      index: true,
    },
    scheduledAt: {
      type: Date,
      required: [true, 'Scheduled date and time is required'],
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Follow-up type is required'],
      enum: {
        values: FOLLOWUP_TYPES,
        message: '{VALUE} is not a supported follow-up type',
      },
      default: 'Call',
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: FOLLOWUP_STATUSES,
        message: '{VALUE} is not a valid follow-up status',
      },
      default: 'Scheduled',
      index: true,
    },
    counsellingNotes: {
      type: String,
      required: [true, 'Counselling notes are required'],
      trim: true,
      minlength: [2, 'Counselling notes must be at least 2 characters'],
      maxlength: [2000, 'Counselling notes cannot exceed 2000 characters'],
    },
    completedAt: {
      type: Date,
    },
    completionRemarks: {
      type: String,
      trim: true,
      maxlength: [2000, 'Completion remarks cannot exceed 2000 characters'],
    },
    rescheduledAt: {
      type: Date,
    },
    rescheduledReason: {
      type: String,
      trim: true,
      maxlength: [1000, 'Rescheduling reason cannot exceed 1000 characters'],
    },
    history: [FollowUpHistorySchema],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id ? ret._id.toString() : undefined;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id ? ret._id.toString() : undefined;
        return ret;
      },
    },
  }
);

// High-performance compound indexes for date-based pipeline queries
FollowUpSchema.index({ counsellorId: 1, status: 1, scheduledAt: 1 });
FollowUpSchema.index({ leadId: 1, scheduledAt: 1 });
FollowUpSchema.index({ status: 1, scheduledAt: 1 });

export const FollowUp = mongoose.model<IFollowUpDocument>('FollowUp', FollowUpSchema);
