import { z } from 'zod';
import { FOLLOWUP_STATUSES, FOLLOWUP_TYPES } from '../config/constants';

const mongoIdRegex = /^[0-9a-fA-F]{24}$/;

export const scheduleFollowUpSchema = z.object({
  leadId: z.string().regex(mongoIdRegex, 'Valid lead ID is required'),
  scheduledAt: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Valid scheduled date and time is required',
    }),
  type: z.enum(FOLLOWUP_TYPES as unknown as [string, ...string[]], {
    errorMap: () => ({ message: 'Please select a valid follow-up type (Call, WhatsApp, Meeting, Demo)' }),
  }),
  counsellingNotes: z
    .string()
    .min(2, 'Counselling notes must be at least 2 characters')
    .max(2000, 'Counselling notes cannot exceed 2000 characters')
    .trim(),
  counsellorId: z
    .string()
    .regex(mongoIdRegex, 'Invalid counsellor ID format')
    .optional(),
});

export const completeFollowUpSchema = z.object({
  completionRemarks: z
    .string()
    .min(2, 'Completion remarks must be at least 2 characters')
    .max(2000, 'Completion remarks cannot exceed 2000 characters')
    .trim(),
  nextFollowUpDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Valid next follow-up date and time is required',
    })
    .optional(),
  nextFollowUpType: z
    .enum(FOLLOWUP_TYPES as unknown as [string, ...string[]])
    .optional(),
  nextFollowUpNotes: z.string().trim().max(2000).optional(),
});

export const rescheduleFollowUpSchema = z.object({
  newScheduledAt: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Valid new scheduled date and time is required',
    }),
  rescheduledReason: z
    .string()
    .min(2, 'Rescheduling reason must be at least 2 characters')
    .max(1000, 'Rescheduling reason cannot exceed 1000 characters')
    .trim(),
  type: z
    .enum(FOLLOWUP_TYPES as unknown as [string, ...string[]])
    .optional(),
});

export const listFollowUpsQuerySchema = z.object({
  section: z
    .enum(['today', 'upcoming', 'overdue', 'completed'])
    .optional(),
  type: z
    .enum(FOLLOWUP_TYPES as unknown as [string, ...string[]])
    .optional(),
  status: z
    .enum(FOLLOWUP_STATUSES as unknown as [string, ...string[]])
    .optional(),
  counsellorId: z.string().optional(),
  leadId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  page: z.preprocess((val) => (val ? Number(val) : 1), z.number().min(1).default(1)),
  limit: z.preprocess((val) => (val ? Number(val) : 20), z.number().min(1).max(100).default(20)),
});

