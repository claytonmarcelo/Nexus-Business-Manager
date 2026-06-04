import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no minimo 2 caracteres'),
  sku: z.string().min(1, 'SKU obrigatorio'),
  category: z.string().optional().nullable(),
  price: z.number().positive('Preco deve ser positivo'),
  quantity: z.number().int().min(0, 'Quantidade nao pode ser negativa'),
  image: z.string().optional().nullable(),
});

export const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  sku: z.string().min(1).optional(),
  category: z.string().optional().nullable(),
  price: z.number().positive().optional(),
  quantity: z.number().int().min(0).optional(),
  image: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
