import { z } from "zod";
import { paginationSchema } from "../../lib/pagination";

const emptyToUndef = (v: string | undefined) =>
  v === undefined || v.trim() === "" ? undefined : v.trim();

export const listFinanceCategoriesQuery = paginationSchema.extend({
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
});

export const createFinanceCategorySchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(80),
  type: z.enum(["INCOME", "EXPENSE"]),
});

export const listFinanceEntriesQuery = paginationSchema.extend({
  search: z.string().trim().max(120).optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  status: z.enum(["PENDING", "PAID", "CANCELLED"]).optional(),
  month: z.string().trim().regex(/^\d{4}-\d{2}$/, "Use o formato AAAA-MM").optional(),
});

export const financeEntrySchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  description: z.string().trim().min(3, "Descrição muito curta").max(200),
  amount: z.coerce.number().positive("Valor deve ser maior que zero").max(99999999),
  dueDate: z.coerce.date(),
  categoryId: z.string().trim().max(36).optional().transform(emptyToUndef),
  clientId: z.string().trim().max(36).optional().transform(emptyToUndef),
  supplierId: z.string().trim().max(36).optional().transform(emptyToUndef),
  notes: z.string().trim().max(500).optional().transform(emptyToUndef),
  paid: z.boolean().default(false),
});

export const updateFinanceEntrySchema = financeEntrySchema.partial();

export const updateFinanceStatusSchema = z.object({
  status: z.enum(["PAID", "CANCELLED", "PENDING"]),
});

export type FinanceEntryInput = z.infer<typeof financeEntrySchema>;
export type FinanceCategoryInput = z.infer<typeof createFinanceCategorySchema>;
