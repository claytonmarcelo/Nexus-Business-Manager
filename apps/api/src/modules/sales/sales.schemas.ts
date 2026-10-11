import { z } from "zod";
import { paginationSchema } from "../../lib/pagination";
import { moeda } from "../../lib/money";

const emptyToUndef = (v: string | undefined) =>
  v === undefined || v.trim() === "" ? undefined : v.trim();

export const listSalesQuery = paginationSchema.extend({
  search: z.string().trim().max(120).optional(),
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]).optional(),
});

export const saleItemSchema = z.object({
  productId: z.string().trim().min(1, "Produto obrigatório"),
  quantity: z.coerce.number().positive("Quantidade deve ser maior que zero").max(999999),
  // Fase 3d: preço entra como dinheiro (texto de duas casas), quantidade entra como
  // medida — o produto dos dois é o que a lib/money.ts arredonda uma única vez.
  unitPrice: moeda({ mensagem: "Preço unitário inválido — zero ou maior, até 99.999.999,99" }),
});

export const createSaleSchema = z.object({
  clientId: z.string().trim().max(36).optional().transform(emptyToUndef),
  notes: z.string().trim().max(500).optional().transform(emptyToUndef),
  confirm: z.boolean().default(false),
  items: z.array(saleItemSchema).min(1, "Inclua ao menos um item na venda"),
});

export const updateSaleStatusSchema = z.object({
  status: z.enum(["CONFIRMED", "CANCELLED"]),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
