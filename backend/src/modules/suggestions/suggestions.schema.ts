import { z } from 'zod';

export const createSuggestionSchema = z.object({
  title: z.string().min(5, 'Titulo deve ter no minimo 5 caracteres').max(255),
  description: z.string().min(20, 'Descricao deve ter no minimo 20 caracteres'),
  category: z.enum(['general', 'improvement', 'feature', 'complaint', 'praise']).default('general'),
  accepted_terms: z.literal(true, { errorMap: () => ({ message: 'Voce precisa aceitar os termos legais' }) }),
});

export const updateSuggestionSchema = z.object({
  status: z.enum(['pending', 'under_review', 'approved', 'rejected', 'implemented']).optional(),
  admin_notes: z.string().max(1000).optional().nullable(),
});

export type CreateSuggestionInput = z.infer<typeof createSuggestionSchema>;
export type UpdateSuggestionInput = z.infer<typeof updateSuggestionSchema>;
