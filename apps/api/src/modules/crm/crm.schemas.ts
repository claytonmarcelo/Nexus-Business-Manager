import { z } from "zod";
import { paginationSchema } from "../../lib/pagination";
import { moeda } from "../../lib/money";

const emptyToUndef = (v: string | undefined) =>
  v === undefined || v.trim() === "" ? undefined : v.trim();

export const LEAD_STATUSES = ["NEW", "CONTACTED", "PROPOSAL", "WON", "LOST"] as const;
export type LeadStatusValue = (typeof LEAD_STATUSES)[number];

export const listLeadsQuery = paginationSchema.extend({
  search: z.string().trim().max(120).optional(),
  status: z.enum(LEAD_STATUSES).optional(),
});

export const createLeadSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(160),
  email: z.string().trim().email("E-mail inválido").max(160).optional().transform(emptyToUndef),
  phone: z.string().trim().max(40).optional().transform(emptyToUndef),
  source: z.string().trim().max(60).optional().transform(emptyToUndef),
  // O default é o texto que o schema devolve: um lead sem valor declarado nasce
  // com "0.00" e não com um número que a camada de serviço teria que converter.
  value: moeda({ mensagem: "Valor do lead inválido — zero ou maior, até 99.999.999,99" }).default("0.00"),
  notes: z.string().trim().max(1000).optional().transform(emptyToUndef),
});

export const updateLeadSchema = createLeadSchema.partial();

export const updateLeadStatusSchema = z.object({
  status: z.enum(LEAD_STATUSES),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
