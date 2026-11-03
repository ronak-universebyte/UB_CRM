import { z } from 'zod';
import {
  COURSE_OPTIONS,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_STATUSES,
} from '../config/constants';

const mobileRegex = /^[5-9]\d{9}$/;
const mobileErrorMessage = 'Mobile number must be a valid 10-digit number';

export const createLeadSchema = z.object({
  studentName: z
    .string()
    .min(2, 'Student name must be at least 2 characters')
    .max(120, 'Student name cannot exceed 120 characters')
    .trim(),
  mobileNumber: z.string().regex(mobileRegex, mobileErrorMessage).trim(),
  whatsappNumber: z
    .string()
    .regex(mobileRegex, 'WhatsApp number must be a valid 10-digit number')
    .trim()
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .email('Please enter a valid email address')
    .trim()
    .toLowerCase()
    .optional()
    .or(z.literal('')),
  city: z.string().trim().max(100).optional().or(z.literal('')),
  college: z.string().trim().max(150).optional().or(z.literal('')),
  qualification: z.string().trim().max(100).optional().or(z.literal('')),
  graduationYear: z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : Number(val)),
    z.number().min(1990).max(2035).optional()
  ),
  interestedCourse: z.enum(COURSE_OPTIONS as unknown as [string, ...string[]], {
    errorMap: () => ({ message: 'Please select a valid interested course' }),
  }),
  leadSource: z.enum(LEAD_SOURCES as unknown as [string, ...string[]], {
    errorMap: () => ({ message: 'Please select a valid lead source' }),
  }),
  campaign: z.string().trim().max(100).optional().or(z.literal('')),
  assignedCounsellor: z.string().optional().or(z.literal('')),
  status: z
    .enum(LEAD_STATUSES as unknown as [string, ...string[]])
    .optional()
    .default('New'),
  priority: z
    .enum(LEAD_PRIORITIES as unknown as [string, ...string[]])
    .optional()
    .default('Warm'),
  budget: z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : Number(val)),
    z.number().min(0).optional()
  ),
  expectedAdmissionDate: z.string().datetime().optional().or(z.literal('')),
  nextFollowUpDate: z.string().datetime().optional().or(z.literal('')),
  remarks: z.string().trim().max(1000).optional().or(z.literal('')),
});

export const updateLeadSchema = createLeadSchema.partial().extend({
  activityNotes: z.string().max(500).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(LEAD_STATUSES as unknown as [string, ...string[]], {
    errorMap: () => ({ message: 'Please select a valid pipeline status' }),
  }),
  notes: z.string().max(500).optional(),
});

export const bulkAssignSchema = z.object({
  leadIds: z
    .array(z.string().min(1, 'Lead ID must not be empty'))
    .min(1, 'At least one lead must be selected for assignment'),
  counsellorId: z.string().min(1, 'Target counsellor ID is required'),
});

export const duplicateCheckQuerySchema = z.object({
  mobileNumber: z.string().regex(mobileRegex, mobileErrorMessage),
  excludeId: z.string().optional(),
});

