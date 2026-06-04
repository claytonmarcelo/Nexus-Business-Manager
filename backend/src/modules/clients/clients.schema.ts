import { z } from 'zod';

export const createClientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no minimo 2 caracteres'),
  phone: z.string().optional().nullable(),
  email: z.string().email('Email invalido').optional().nullable(),
  document: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['ATIVO', 'INATIVO']).optional().default('ATIVO'),
});

export const updateClientSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  document: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['ATIVO', 'INATIVO']).optional(),
  active: z.boolean().optional(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
