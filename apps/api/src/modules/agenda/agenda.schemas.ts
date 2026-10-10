import { z } from "zod";

const emptyToUndef = (v: string | undefined) =>
  v === undefined || v.trim() === "" ? undefined : v.trim();

export const AGENDA_TYPES = ["MEETING", "DELIVERY", "FOLLOW_UP", "OTHER"] as const;
export const AGENDA_STATUSES = ["SCHEDULED", "DONE", "CANCELLED"] as const;
export const AGENDA_RECURRENCES = ["NONE", "DAILY", "WEEKLY", "MONTHLY"] as const;
export type AgendaTypeValue = (typeof AGENDA_TYPES)[number];
export type AgendaStatusValue = (typeof AGENDA_STATUSES)[number];
export type AgendaRecurrenceValue = (typeof AGENDA_RECURRENCES)[number];

// Campos sem default: na edicao (PATCH) o que nao vem no corpo fica intacto.
const campos = z.object({
  title: z.string().trim().min(3, "Informe um título com pelo menos 3 caracteres").max(160),
  description: z.string().trim().max(1000).optional().transform(emptyToUndef),
  location: z.string().trim().max(160).optional().transform(emptyToUndef),
  type: z.enum(AGENDA_TYPES, { errorMap: () => ({ message: "Tipo de compromisso inválido" }) }),
  startAt: z.coerce.date({ errorMap: () => ({ message: "Informe a data e a hora do compromisso" }) }),
  endAt: z.coerce.date({ errorMap: () => ({ message: "Data de término inválida" }) }).optional(),
  allDay: z.boolean(),
  recorrencia: z.enum(AGENDA_RECURRENCES, { errorMap: () => ({ message: "Recorrência inválida" }) }),
  recorrenciaAte: z.coerce.date({ errorMap: () => ({ message: "Data final da recorrência inválida" }) }).optional(),
  clientId: z.string().trim().max(36).optional().transform(emptyToUndef),
  leadId: z.string().trim().max(36).optional().transform(emptyToUndef),
});

const comPadroes = {
  type: "MEETING" as AgendaTypeValue,
  allDay: false,
  recorrencia: "NONE" as AgendaRecurrenceValue,
};

// O termino nunca pode vir antes do inicio e a serie precisa terminar depois de comecar.
const periodoValido = (
  dados: { startAt?: Date; endAt?: Date; recorrencia?: AgendaRecurrenceValue; recorrenciaAte?: Date },
  ctx: z.RefinementCtx,
) => {
  if (dados.startAt && dados.endAt && dados.endAt.getTime() <= dados.startAt.getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endAt"],
      message: "O término precisa ser depois do início",
    });
  }
  if (dados.startAt && dados.recorrenciaAte && dados.recorrenciaAte.getTime() < dados.startAt.getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["recorrenciaAte"],
      message: "A recorrência precisa terminar depois do início do compromisso",
    });
  }
};

export const createEventSchema = campos
  .extend({ type: campos.shape.type.default(comPadroes.type), allDay: campos.shape.allDay.default(comPadroes.allDay), recorrencia: campos.shape.recorrencia.default(comPadroes.recorrencia) })
  .superRefine(periodoValido);

export const updateEventSchema = campos
  .extend({
    title: campos.shape.title.optional(),
    startAt: campos.shape.startAt.optional(),
    description: campos.shape.description,
    location: campos.shape.location,
    type: campos.shape.type.optional(),
    allDay: campos.shape.allDay.optional(),
    recorrencia: campos.shape.recorrencia.optional(),
    recorrenciaAte: campos.shape.recorrenciaAte,
    clientId: campos.shape.clientId,
    leadId: campos.shape.leadId,
  })
  .superRefine(periodoValido);

export const updateStatusSchema = z.object({
  status: z.enum(AGENDA_STATUSES, { errorMap: () => ({ message: "Estado inválido para o compromisso" }) }),
});

export const listEventsQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  status: z.enum(AGENDA_STATUSES).optional(),
  type: z.enum(AGENDA_TYPES).optional(),
  search: z.string().trim().max(120).optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
