import { z } from 'zod';

export const createMovementSchema = z.object({
  product_id: z.number().int().positive(),
  type: z.enum(['in', 'out']),
  quantity: z.number().int().positive(),
  description: z.string().optional().nullable(),
});

export type CreateMovementInput = z.infer<typeof createMovementSchema>;
