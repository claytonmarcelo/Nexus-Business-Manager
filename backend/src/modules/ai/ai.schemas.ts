import { z } from 'zod';

export const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  module: z.string().optional(),
  page: z.string().optional(),
});

export const analyzeSchema = z.object({
  module: z.string().min(1),
  period: z.enum(['week', 'month', 'quarter', 'year']).optional().default('month'),
});

export type ChatInput = z.infer<typeof chatSchema>;
export type AnalyzeInput = z.infer<typeof analyzeSchema>;
