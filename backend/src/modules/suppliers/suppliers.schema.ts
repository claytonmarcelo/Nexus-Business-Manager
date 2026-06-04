import { z } from 'zod';

export const createSupplierSchema = z.object({
  company_name: z.string().min(2, 'Nome da empresa deve ter no minimo 2 caracteres'),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  contact_name: z.string().optional().nullable(),
});

export const updateSupplierSchema = z.object({
  company_name: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  contact_name: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
