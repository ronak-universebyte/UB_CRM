import { z } from 'zod';

export const generateMessageSchema = z.object({
  leadId: z.string().optional(),
  studentName: z.string().min(1, 'Student name is required'),
  phoneNumber: z.string().min(10, 'Valid phone number is required'),
  course: z.string().optional(),
  templateName: z
    .enum(['new_enquiry', 'followup', 'counselling', 'demo', 'admission', 'custom'])
    .default('new_enquiry'),
  language: z.enum(['en', 'hi', 'hinglish']).default('en'),
  customBody: z.string().optional(),
});

export const recordAttemptSchema = z.object({
  leadId: z.string().optional(),
  studentName: z.string().min(1, 'Student name is required'),
  phoneNumber: z.string().min(10, 'Valid phone number is required'),
  templateName: z
    .enum(['new_enquiry', 'followup', 'counselling', 'demo', 'admission', 'custom'])
    .optional(),
  language: z.enum(['en', 'hi', 'hinglish']).optional(),
  messageBody: z.string().min(1, 'Message body is required'),
});

export const sendOfficialSchema = z.object({
  leadId: z.string().optional(),
  studentName: z.string().min(1, 'Student name is required'),
  phoneNumber: z.string().min(10, 'Valid phone number is required'),
  course: z.string().optional(),
  templateName: z
    .enum(['new_enquiry', 'followup', 'counselling', 'demo', 'admission', 'custom'])
    .default('new_enquiry'),
  language: z.enum(['en', 'hi', 'hinglish']).default('en'),
  customBody: z.string().optional(),
});

export const listLogsQuerySchema = z.object({
  leadId: z.string().optional(),
  phoneNumber: z.string().optional(),
  method: z.enum(['manual_click', 'meta_api']).optional(),
  status: z.enum(['attempted', 'pending', 'sent', 'delivered', 'read', 'failed']).optional(),
  page: z.string().optional().default('1').transform((v) => parseInt(v, 10) || 1),
  limit: z.string().optional().default('20').transform((v) => parseInt(v, 10) || 20),
});

