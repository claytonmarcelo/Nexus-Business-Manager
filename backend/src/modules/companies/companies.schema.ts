import { z } from 'zod';

export const createCompanySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  document: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
});

export const updateCompanySchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  document: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  active: z.boolean().optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
