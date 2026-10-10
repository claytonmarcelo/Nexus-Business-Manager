import { z } from "zod";
import { paginationSchema } from "../../lib/pagination";

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
  value: z.coerce.number().min(0).max(99999999).default(0),
  notes: z.string().trim().max(1000).optional().transform(emptyToUndef),
});

export const updateLeadSchema = createLeadSchema.partial();

export const updateLeadStatusSchema = z.object({
  status: z.enum(LEAD_STATUSES),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
