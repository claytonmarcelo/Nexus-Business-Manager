import { z } from "zod";
import { paginationSchema } from "../../lib/pagination";

// Validação de entrada no backend (seção 47). Nunca confiar no cliente.
export const listClientsQuery = paginationSchema.extend({
  search: z.string().trim().max(120).optional(),
  active: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

const emptyToUndef = (v: string | undefined) => (v && v.trim() === "" ? undefined : v);

const emailField = z
  .string()
  .trim()
  .max(160)
  .email("E-mail inválido")
  .optional()
  .transform(emptyToUndef);

const baseCreate = {
  name: z.string().trim().min(2, "Nome muito curto").max(160),
  email: emailField,
  phone: z.string().trim().max(32).optional().transform(emptyToUndef),
  document: z.string().trim().max(32).optional().transform(emptyToUndef),
  notes: z.string().trim().max(2000).optional().transform(emptyToUndef),
};

export const createClientSchema = z.object(baseCreate);

export const updateClientSchema = z
  .object({
    name: z.string().trim().min(2).max(160).optional(),
    email: emailField,
    phone: z.string().trim().max(32).optional().transform(emptyToUndef),
    document: z.string().trim().max(32).optional().transform(emptyToUndef),
    notes: z.string().trim().max(2000).optional().transform(emptyToUndef),
    active: z.boolean().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: "Nada para atualizar" });

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
