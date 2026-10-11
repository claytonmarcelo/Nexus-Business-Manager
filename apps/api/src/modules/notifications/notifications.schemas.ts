import { z } from "zod";
import { paginationSchema } from "../../lib/pagination";

// Tipos de aviso sustentados pelo sistema (seção 44). Cada tipo tem a própria
// preferência, então desligar "estoque" não silencia vendas.
export const TIPOS_NOTIFICACAO = ["sale", "stock", "lead", "billing", "report"] as const;
export type TipoNotificacao = (typeof TIPOS_NOTIFICACAO)[number];

export const listaNotificacoesQuery = paginationSchema.extend({
  status: z.enum(["todas", "naolidas", "lidas"]).default("todas"),
  kind: z.enum(TIPOS_NOTIFICACAO).optional(),
});

export const preferenciasSchema = z.object({
  saleAlerts: z.boolean(),
  lowStock: z.boolean(),
  dailyReport: z.boolean(),
  overdueBills: z.boolean(),
  newLead: z.boolean(),
  emailChannel: z.boolean(),
  inAppChannel: z.boolean(),
});

// varreduraSchema saiu na Fase 1: a rota de scan não aceita mais empresa
// nenhuma pelo corpo — a empresa varrida é sempre a do token.

export type PreferenciasInput = z.infer<typeof preferenciasSchema>;
