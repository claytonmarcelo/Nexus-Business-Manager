import { z } from "zod";
import { paginationSchema } from "../../lib/pagination";
import { moeda } from "../../lib/money";

// ===== Categorias =====
export const createCategorySchema = z.object({
  name: z.string().trim().min(2, "Nome de categoria muito curto").max(80),
});
export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    active: z.boolean().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: "Nada para atualizar" });

// ===== Produtos =====
// Fase 3d: dinheiro entra como texto de duas casas (ver `lib/money.ts`), quantidade
// continua número porque a coluna é DECIMAL(12,3) de medida, não de valor.
const money = moeda({ mensagem: "Preço inválido — zero ou maior, até 99.999.999,99" });
const qty = z.coerce.number().min(0, "Quantidade não pode ser negativa").max(99999999);

const emptyToUndef = (v: string | undefined) =>
  v === undefined || v.trim() === "" ? undefined : v.trim();

export const listProductsQuery = paginationSchema.extend({
  search: z.string().trim().max(120).optional(),
  categoryId: z.string().trim().max(36).optional().transform(emptyToUndef),
  lowStock: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  active: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export const createProductSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(160),
  sku: z.string().trim().max(64).optional().transform(emptyToUndef),
  unit: z.string().trim().min(1).max(16).default("un"),
  categoryId: z.string().trim().max(36).optional().transform(emptyToUndef),
  costPrice: money.optional(),
  salePrice: money,
  stockQuantity: qty.default(0),
  minStock: qty.default(0),
  trackStock: z.boolean().default(true),
  description: z.string().trim().max(2000).optional().transform(emptyToUndef),
});

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(2).max(160).optional(),
    sku: z.string().trim().max(64).optional().transform(emptyToUndef),
    unit: z.string().trim().min(1).max(16).optional(),
    categoryId: z.string().trim().max(36).optional().transform(emptyToUndef),
    costPrice: money.optional(),
    salePrice: money.optional(),
    minStock: qty.optional(),
    trackStock: z.boolean().optional(),
    description: z.string().trim().max(2000).optional().transform(emptyToUndef),
    active: z.boolean().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: "Nada para atualizar" });

// ===== Movimentações de estoque =====
export const createMovementSchema = z.object({
  kind: z.enum(["IN", "OUT", "ADJUST"]),
  quantity: z.coerce.number().min(0.001, "Quantidade deve ser maior que zero").max(99999999),
  note: z.string().trim().max(255).optional().transform(emptyToUndef),
});

export const listMovementsQuery = paginationSchema.extend({
  kind: z.enum(["IN", "OUT", "ADJUST"]).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateMovementInput = z.infer<typeof createMovementSchema>;
