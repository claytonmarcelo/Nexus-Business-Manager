import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { badRequest, notFound } from "../../lib/errors";
import { audit } from "../../lib/audit";
import type {
  AgendaRecurrenceValue,
  AgendaStatusValue,
  AgendaTypeValue,
  CreateEventInput,
  UpdateEventInput,
} from "./agenda.schemas";

interface EventoBase {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  type: AgendaTypeValue;
  status: AgendaStatusValue;
  startAt: Date;
  endAt: Date | null;
  allDay: boolean;
  recorrencia: AgendaRecurrenceValue;
  recorrenciaAte: Date | null;
  clientId: string | null;
  leadId: string | null;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type Linha = EventoBase & {
  client: { name: string } | null;
  lead: { name: string } | null;
  user: { name: string } | null;
};

// Linha ja expandida: em series recorrentes cada data e uma linha propria,
// com id sufixado (master--2) e masterId apontando para o cadastro original.
export interface EventoSerializeido extends EventoBase {
  masterId: string;
  clientName: string | null;
  leadName: string | null;
  userName: string | null;
  recorrente: boolean;
  ocorrencia: number;
  meu: boolean;
}

const fullInclude = {
  client: { select: { name: true } },
  lead: { select: { name: true } },
  user: { select: { name: true } },
} satisfies Prisma.AgendaEventInclude;

const DIA = 86_400_000;
const LIMITE_OCORRENCIAS = 366;

function serialize(e: Linha, userId?: string): EventoSerializeido {
  return {
    id: e.id,
    masterId: e.id,
    title: e.title,
    description: e.description,
    location: e.location,
    type: e.type,
    status: e.status,
    startAt: e.startAt,
    endAt: e.endAt,
    allDay: e.allDay,
    recorrencia: e.recorrencia,
    recorrenciaAte: e.recorrenciaAte,
    clientId: e.clientId,
    leadId: e.leadId,
    userId: e.userId,
    clientName: e.client?.name ?? null,
    leadName: e.lead?.name ?? null,
    userName: e.user?.name ?? null,
    recorrente: e.recorrencia !== "NONE",
    ocorrencia: 0,
    meu: userId ? e.userId === userId : true,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

export const serializeEvento = serialize;

// Proxima data da serie. Mensal conserva o dia do mes e encolhe para o ultimo
// dia quando o mes de destino nao tem aquele dia (31/01 -> 28/02), como no Google Agenda.
function proximaData(mestre: Date, original: Date, recorrencia: AgendaRecurrenceValue): Date {
  if (recorrencia === "DAILY") {
    const d = new Date(mestre.getTime() + DIA);
    d.setHours(original.getHours(), original.getMinutes(), 0, 0);
    return d;
  }
  if (recorrencia === "WEEKLY") {
    const d = new Date(mestre.getTime() + 7 * DIA);
    d.setHours(original.getHours(), original.getMinutes(), 0, 0);
    return d;
  }
  const diaOriginal = original.getDate();
  const alvo = new Date(mestre.getFullYear(), mestre.getMonth() + 1, 1, original.getHours(), original.getMinutes(), 0, 0);
  const ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  alvo.setDate(Math.min(diaOriginal, ultimoDia));
  return alvo;
}

// Todas as datas de um compromisso dentro da janela pedida, com o indice que a
// data ocupa na serie inteira (0 = primeira). O indice fixo no cadastro e o que
// forma o id da ocorrencia, entao a mesma data tem o mesmo id em qualquer janela.
interface Ocorrencia { data: Date; indice: number; }

function datasDeOcorrencia(e: EventoBase, de: Date, ate: Date): Ocorrencia[] {
  const teto = e.recorrenciaAte && e.recorrenciaAte.getTime() < ate.getTime() ? e.recorrenciaAte : ate;
  if (e.recorrencia === "NONE") {
    const dentro = e.startAt.getTime() >= de.getTime() && e.startAt.getTime() <= teto.getTime();
    return dentro ? [{ data: e.startAt, indice: 0 }] : [];
  }
  const datas: Ocorrencia[] = [];
  let cursor = new Date(e.startAt.getTime());
  let indice = 0;
  while (cursor.getTime() <= teto.getTime() && datas.length < LIMITE_OCORRENCIAS && indice < LIMITE_OCORRENCIAS * 4) {
    if (cursor.getTime() >= de.getTime()) datas.push({ data: new Date(cursor.getTime()), indice });
    cursor = proximaData(cursor, e.startAt, e.recorrencia);
    indice += 1;
  }
  return datas;
}

// A agenda e lida por janela (o que o calendario mostra), por isso devolve a
// lista direta em vez de pagina de tabela. Series comecadas antes da janela
// entram na busca e sao expandidas em uma linha por data.
export async function listEvents(
  companyId: string,
  f: { from?: Date; to?: Date; status?: AgendaStatusValue; type?: AgendaTypeValue; search?: string; userId?: string },
) {
  const de = f.from ?? new Date(0);
  const ate = f.to ?? new Date(Date.now() + 366 * DIA);

  const where: Prisma.AgendaEventWhereInput = {
    companyId,
    startAt: { lte: ate },
    OR: [
      { startAt: { gte: de } },
      {
        recorrencia: { not: "NONE" },
        OR: [{ recorrenciaAte: null }, { recorrenciaAte: { gte: de } }],
      },
    ],
    ...(f.status ? { status: f.status } : {}),
    ...(f.type ? { type: f.type } : {}),
    ...(f.search
      ? { OR: [{ title: { contains: f.search } }, { description: { contains: f.search } }, { location: { contains: f.search } }] }
      : {}),
  };

  const rows = (await prisma.agendaEvent.findMany({
    where,
    orderBy: { startAt: "asc" },
    include: fullInclude,
    take: 1000,
  })) as unknown as Linha[];

  const linhas: EventoSerializeido[] = [];
  for (const row of rows) {
    const datas = datasDeOcorrencia(row, de, ate);
    if (!datas.length) continue;
    const duracao = row.endAt ? row.endAt.getTime() - row.startAt.getTime() : 0;
    for (const o of datas) {
      linhas.push({
        ...serialize(row, f.userId),
        id: row.recorrencia === "NONE" ? row.id : row.id + "--" + o.indice,
        startAt: o.data,
        endAt: duracao > 0 ? new Date(o.data.getTime() + duracao) : row.endAt,
        ocorrencia: o.indice,
      });
    }
  }
  linhas.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  return linhas;
}

export async function getEvent(companyId: string, id: string) {
  const bruto = id.split("--")[0];
  const found = (await prisma.agendaEvent.findFirst({ where: { id: bruto, companyId }, include: fullInclude })) as unknown as
    | (Linha & { id: string })
    | null;
  if (!found) throw notFound("Compromisso não encontrado na agenda desta empresa");
  return found;
}

// Leitura de uma ocorrencia especifica (o que o usuario clicou no calendario).
export async function getEventoDetalhado(companyId: string, id: string, userId?: string) {
  const bruto = await getEvent(companyId, id);
  const indice = id.includes("--") ? Number(id.split("--")[1]) : 0;
  const serie = datasDeOcorrencia(bruto, new Date(0), new Date(Date.now() + 366 * DIA));
  const achada = serie.find((o) => o.indice === indice) ?? serie[0];
  const data = achada?.data ?? bruto.startAt;
  const duracao = bruto.endAt ? bruto.endAt.getTime() - bruto.startAt.getTime() : 0;
  return {
    ...serialize(bruto, userId),
    id,
    startAt: data,
    endAt: duracao > 0 ? new Date(data.getTime() + duracao) : bruto.endAt,
    ocorrencia: achada?.indice ?? 0,
  };
}

// Cliente e lead precisam ser da mesma empresa (mesma regra de Vendas/Compras).
async function checaVinculos(companyId: string, clientId?: string | null, leadId?: string | null) {
  if (clientId) {
    const cliente = await prisma.client.findFirst({ where: { id: clientId, companyId } });
    if (!cliente) throw badRequest("O cliente informado não pertence a esta empresa");
  }
  if (leadId) {
    const lead = await prisma.lead.findFirst({ where: { id: leadId, companyId } });
    if (!lead) throw badRequest("O lead informado não pertence a esta empresa");
  }
}

// Sem recorrencia nao existe data-final de serie.
function arrumaRecorrencia<T extends { recorrencia?: AgendaRecurrenceValue; recorrenciaAte?: Date | null }>(dados: T) {
  if (dados.recorrencia === "NONE") dados.recorrenciaAte = null;
  return dados;
}

// Uma serie nao tem ocorrencia avulsa: mexer em uma data mexe na serie inteira.
function bloqueiaOcorrencia(id: string) {
  if (!id.includes("--")) return;
  throw badRequest("Este compromisso faz parte de uma recorrência: a alteração vale para a série inteira. Abra o compromisso original para editar.");
}

export async function createEvent(companyId: string, input: CreateEventInput, userId: string, ip: string) {
  await checaVinculos(companyId, input.clientId, input.leadId);
  const dados = arrumaRecorrencia({ ...input });
  const criado = await prisma.agendaEvent.create({ data: { companyId, userId, ...dados } });
  await audit({
    userId, companyId, action: "agenda.create", entity: "agenda-event", entityId: criado.id, ip,
    metadata: {
      title: criado.title,
      startAt: criado.startAt.toISOString(),
      type: criado.type,
      ...(criado.recorrencia !== "NONE" ? { recorrencia: criado.recorrencia } : {}),
    },
  });
  return getEventoDetalhado(companyId, criado.id, userId);
}

export async function updateEvent(companyId: string, id: string, input: UpdateEventInput, userId: string, ip: string) {
  bloqueiaOcorrencia(id);
  const atual = await getEvent(companyId, id);
  await checaVinculos(companyId, input.clientId, input.leadId);

  // Ao editar apenas um dos lados do periodo, o outro vem do registro.
  const inicio = input.startAt ?? atual.startAt;
  let fim = input.endAt ?? atual.endAt;

  // Mudou so o inicio de um compromisso com horario: a duracao original e
  // preservada (e o que se espera ao remarcar ou arrastar no calendario).
  if (input.startAt && !input.endAt && atual.endAt) {
    fim = new Date(inicio.getTime() + (atual.endAt.getTime() - atual.startAt.getTime()));
  }
  if (fim && fim.getTime() <= inicio.getTime()) {
    throw badRequest("O término precisa ser depois do início");
  }

  const recorrencia = input.recorrencia ?? atual.recorrencia;
  const recorrenciaAte = input.recorrencia === undefined ? atual.recorrenciaAte : input.recorrenciaAte ?? null;
  if (recorrenciaAte && recorrenciaAte.getTime() < inicio.getTime()) {
    throw badRequest("A recorrência precisa terminar depois do início do compromisso");
  }

  const dados = arrumaRecorrencia({ ...input, ...(fim ? { endAt: fim } : {}), recorrencia, recorrenciaAte });
  // Fase 1c da auditoria: o where das escritas abaixo carrega o companyId — o
  // id lido do evento (que já veio filtrado) ganha segunda tranca na gravação.
  await prisma.agendaEvent.update({ where: { id: atual.id, companyId }, data: dados });
  await audit({ userId, companyId, action: "agenda.update", entity: "agenda-event", entityId: atual.id, ip });
  return getEventoDetalhado(companyId, atual.id, userId);
}

// Concluir, cancelar ou reabrir (SCHEDULED reabre a serie).
export async function changeStatus(companyId: string, id: string, status: AgendaStatusValue, userId: string, ip: string) {
  bloqueiaOcorrencia(id);
  const atual = await getEvent(companyId, id);
  if (atual.status === status) throw badRequest("O compromisso já está neste estado");

  await prisma.agendaEvent.update({ where: { id: atual.id, companyId }, data: { status } });
  await audit({ userId, companyId, action: "agenda." + status.toLowerCase(), entity: "agenda-event", entityId: atual.id, ip });
  return getEventoDetalhado(companyId, atual.id, userId);
}

// Excluir apaga a serie inteira (nao existe ocorrencia avulsa no banco).
export async function deleteEvent(companyId: string, id: string, userId: string, ip: string) {
  bloqueiaOcorrencia(id);
  const atual = await getEvent(companyId, id);
  await prisma.agendaEvent.delete({ where: { id: atual.id, companyId } });
  await audit({
    userId, companyId, action: "agenda.delete", entity: "agenda-event", entityId: atual.id, ip,
    metadata: { title: atual.title, ...(atual.recorrencia !== "NONE" ? { recorrencia: atual.recorrencia } : {}) },
  });
  return { id: atual.id, deleted: true };
}

// KPIs da tela: quantidade por estado na janela visivel (series contam uma vez).
export async function agendaSummary(companyId: string, from?: Date, to?: Date) {
  const de = from ?? new Date(0);
  const ate = to ?? new Date(Date.now() + 366 * DIA);
  const rows = await prisma.agendaEvent.groupBy({
    by: ["status"],
    where: { companyId, startAt: { gte: de, lte: ate } },
    _count: { _all: true },
  });
  const de_ = (s: AgendaStatusValue) => rows.find((r) => r.status === s)?._count._all ?? 0;
  const total = rows.reduce((acc, r) => acc + r._count._all, 0);
  return { total, scheduled: de_("SCHEDULED"), done: de_("DONE"), cancelled: de_("CANCELLED") };
}
