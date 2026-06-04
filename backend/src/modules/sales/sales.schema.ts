import { z } from 'zod';

export const saleItemSchema = z.object({
  product_id: z.number().int().positive(),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive(),
});

export const createSaleSchema = z.object({
  client_id: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['ABERTA', 'CONCLUIDA', 'CANCELADA']).optional().default('CONCLUIDA'),
  items: z.array(saleItemSchema).min(1, 'Adicione pelo menos um item'),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
