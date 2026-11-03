import mongoose, { Schema, Document, Types } from 'mongoose';

export type WhatsAppMethod = 'manual_click' | 'meta_api';
export type WhatsAppDirection = 'outbound' | 'inbound';
export type WhatsAppLanguage = 'en' | 'hi' | 'hinglish';
export type WhatsAppTemplateName =
  | 'new_enquiry'
  | 'followup'
  | 'counselling'
  | 'demo'
  | 'admission'
  | 'custom';

export type WhatsAppStatus =
  | 'attempted' // For manual click-to-chat
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

export interface IWhatsAppStatusHistory {
  status: WhatsAppStatus;
  timestamp: Date;
  details?: string;
}

export interface IWhatsAppMessageDocument extends Document {
  leadId?: Types.ObjectId;
  studentName: string;
  phoneNumber: string;
  direction: WhatsAppDirection;
  method: WhatsAppMethod;
  type: 'template' | 'text' | 'interactive';
  templateName?: WhatsAppTemplateName;
  language?: WhatsAppLanguage;
  messageBody: string;
  metaMessageId?: string;
  status: WhatsAppStatus;
  statusHistory: IWhatsAppStatusHistory[];
  errorMessage?: string;
  senderId?: Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppStatusHistorySchema = new Schema<IWhatsAppStatusHistory>(
  {
    status: {
      type: String,
      enum: ['attempted', 'pending', 'sent', 'delivered', 'read', 'failed'],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    details: {
      type: String,
    },
  },
  { _id: false }
);

const WhatsAppMessageSchema = new Schema<IWhatsAppMessageDocument>(
  {
    leadId: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
      index: true,
    },
    studentName: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      index: true,
    },
    direction: {
      type: String,
      enum: ['outbound', 'inbound'],
      default: 'outbound',
      index: true,
    },
    method: {
      type: String,
      enum: ['manual_click', 'meta_api'],
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['template', 'text', 'interactive'],
      default: 'template',
    },
    templateName: {
      type: String,
      enum: ['new_enquiry', 'followup', 'counselling', 'demo', 'admission', 'custom'],
      default: 'new_enquiry',
    },
    language: {
      type: String,
      enum: ['en', 'hi', 'hinglish'],
      default: 'en',
    },
    messageBody: {
      type: String,
      required: [true, 'Message body is required'],
    },
    metaMessageId: {
      type: String,
      sparse: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['attempted', 'pending', 'sent', 'delivered', 'read', 'failed'],
      default: 'attempted',
      index: true,
    },
    statusHistory: {
      type: [WhatsAppStatusHistorySchema],
      default: () => [],
    },
    errorMessage: {
      type: String,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes for lead messaging timeline and audit queries
WhatsAppMessageSchema.index({ leadId: 1, createdAt: -1 });
WhatsAppMessageSchema.index({ method: 1, status: 1, createdAt: -1 });

export const WhatsAppMessage = mongoose.model<IWhatsAppMessageDocument>(
  'WhatsAppMessage',
  WhatsAppMessageSchema
);

