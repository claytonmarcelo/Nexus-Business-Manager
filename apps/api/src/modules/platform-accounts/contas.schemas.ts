import { z } from "zod";
import { paginationSchema } from "../../lib/pagination";

// T5.5 (N61): as duas portas da área de plataforma que cuida de contas. A busca é
// livre (nome ou endereço) porque quem atende um cliente sabe um dos dois, e o
// motivo é opcional — a porta é de suporte, e exigir texto levaria gente a
// escrever "suporte" em toda linha. O que não é opcional é o rastro: quem
// confirmou, quando e por qual conta, isso a auditoria carimba sozinha.
export const listarContasQuery = paginationSchema.extend({
  search: z.string().trim().max(120).optional(),
});

export const confirmarEmailSchema = z.object({
  motivo: z.string().trim().max(200).optional(),
});

export type ListarContasQuery = z.infer<typeof listarContasQuery>;
export type ConfirmarEmailInput = z.infer<typeof confirmarEmailSchema>;
