import { z } from 'zod';

export const purchaseItemSchema = z.object({
  product_id: z.number().int().positive(),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive(),
});

export const createPurchaseSchema = z.object({
  supplier_id: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(purchaseItemSchema).min(1, 'Adicione pelo menos um item'),
});

export const updatePurchaseStatusSchema = z.object({
  status: z.enum(['received', 'cancelled']),
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type UpdatePurchaseStatusInput = z.infer<typeof updatePurchaseStatusSchema>;
