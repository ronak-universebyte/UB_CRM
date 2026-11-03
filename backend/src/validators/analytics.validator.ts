import { z } from 'zod';

export const dashboardFilterSchema = z.object({
  preset: z
    .enum(['today', 'yesterday', 'last7days', 'last30days', 'thismonth', 'custom'])
    .optional()
    .default('last30days'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  counsellorId: z.string().optional(),
});

export const reportQuerySchema = z.object({
  reportType: z.enum([
    'source',
    'course',
    'counsellor',
    'admission',
    'lost',
    'followup',
    'campaign',
  ]),
  preset: z
    .enum(['today', 'yesterday', 'last7days', 'last30days', 'thismonth', 'custom'])
    .optional()
    .default('last30days'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  counsellorId: z.string().optional(),
});

