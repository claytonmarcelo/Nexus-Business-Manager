import { z } from "zod";
import { paginationSchema } from "../../lib/pagination";
import { moeda } from "../../lib/money";

const emptyToUndef = (v: string | undefined) =>
  v === undefined || v.trim() === "" ? undefined : v.trim();

/* Fornecedores */

export const listSuppliersQuery = paginationSchema.extend({
  search: z.string().trim().max(120).optional(),
  active: z.enum(["true", "false"]).optional(),
});

export const createSupplierSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(160),
  email: z.string().trim().email("E-mail inválido").max(160).optional().transform(emptyToUndef),
  phone: z.string().trim().max(40).optional().transform(emptyToUndef),
  document: z.string().trim().max(25).optional().transform(emptyToUndef),
  notes: z.string().trim().max(500).optional().transform(emptyToUndef),
});

export const updateSupplierSchema = createSupplierSchema.partial();

/* Compras */

export const listPurchasesQuery = paginationSchema.extend({
  search: z.string().trim().max(120).optional(),
  status: z.enum(["DRAFT", "RECEIVED", "CANCELLED"]).optional(),
  supplierId: z.string().trim().max(36).optional(),
});

export const purchaseItemSchema = z.object({
  productId: z.string().trim().min(1, "Produto obrigatório"),
  quantity: z.coerce.number().positive("Quantidade deve ser maior que zero").max(999999),
  unitCost: moeda({ mensagem: "Custo unitário inválido — zero ou maior, até 99.999.999,99" }),
});

export const createPurchaseSchema = z.object({
  supplierId: z.string().trim().min(1, "Fornecedor obrigatório"),
  notes: z.string().trim().max(500).optional().transform(emptyToUndef),
  receive: z.boolean().default(false),
  // Fase 3e: o mesmo parcelamento da venda, do lado da despesa — quantas parcelas
  // mensais o fornecedor vai receber. 1 é à vista, e ausente também é: quem não
  // fala de parcelas não pode ser barrado na porta.
  installments: z.coerce
    .number()
    .int("Número de parcelas deve ser inteiro")
    .min(1, "A compra tem pelo menos uma parcela")
    .max(120, "O parcelamento vai no máximo até 120 vezes")
    .default(1),
  items: z.array(purchaseItemSchema).min(1, "Inclua ao menos um item na compra"),
});

export const updatePurchaseStatusSchema = z.object({
  status: z.enum(["RECEIVED", "CANCELLED"]),
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
