import { z } from 'zod';

export const leadIdParamSchema = z.object({
  leadId: z.string().min(1, 'Valid Lead ID is required'),
});

export const generateAiMessageSchema = z.object({
  leadId: z.string().optional(),
  studentName: z.string().min(1, 'Student name is required'),
  course: z.string().optional(),
  scenario: z
    .enum([
      'new_enquiry',
      'followup',
      'counselling',
      'demo',
      'admission',
      'discount_offer',
      'urgent_reminder',
    ])
    .default('new_enquiry'),
  language: z.enum(['en', 'hi', 'hinglish']).default('en'),
  tone: z.enum(['friendly', 'professional', 'urgent', 'motivational']).default('friendly'),
  extraInstructions: z.string().max(300).optional(),
});

export const lostLeadAnalysisQuerySchema = z.object({
  course: z.string().optional(),
  source: z.string().optional(),
  counsellorId: z.string().optional(),
  limit: z.string().optional().default('50').transform((v) => Math.min(parseInt(v, 10) || 50, 200)),
});

