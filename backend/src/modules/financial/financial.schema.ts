import { z } from 'zod';

export const createTransactionSchema = z.object({
  type: z.enum(['revenue', 'expense']),
  category: z.string().min(2, 'Categoria obrigatoria'),
  description: z.string().min(2, 'Descricao obrigatoria'),
  value: z.number().positive('Valor deve ser maior que zero'),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve ser no formato YYYY-MM-DD'),
  status: z.enum(['PENDENTE', 'PAGO', 'VENCIDO', 'CANCELADO']).optional().default('PENDENTE'),
});

export const updateTransactionSchema = z.object({
  type: z.enum(['revenue', 'expense']).optional(),
  category: z.string().min(2).optional(),
  description: z.string().min(2).optional(),
  value: z.number().positive().optional(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['PENDENTE', 'PAGO', 'VENCIDO', 'CANCELADO']).optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
