import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { badRequest, notFound } from "../../lib/errors";
import { paginate, skipTake, type PaginationInput } from "../../lib/pagination";
import { audit } from "../../lib/audit";
import { centavos, moedaDeCentavos } from "../../lib/money";
import { avisoNovoLead } from "../notifications/notifications.service";
import { LEAD_STATUSES, type CreateLeadInput, type LeadStatusValue } from "./crm.schemas";

const num = (v: Prisma.Decimal) => Number(v);

interface LeadWithRelations {
  id: string; name: string; email: string | null; phone: string | null; source: string | null;
  status: LeadStatusValue; value: Prisma.Decimal; notes: string | null;
  createdAt: Date; updatedAt: Date;
  client: { name: string } | null;
  user: { name: string } | null;
}

export const serializeLead = serialize;

function serialize(l: LeadWithRelations) {
  return {
    id: l.id,
    name: l.name,
    email: l.email,
    phone: l.phone,
    source: l.source,
    status: l.status,
    value: num(l.value),
    notes: l.notes,
    clientName: l.client?.name ?? null,
    userName: l.user?.name ?? null,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  };
}

const fullInclude = {
  client: { select: { name: true } },
  user: { select: { name: true } },
} satisfies Prisma.LeadInclude;

export async function listLeads(companyId: string, p: PaginationInput, opts: { search?: string; status?: LeadStatusValue }) {
  const where: Prisma.LeadWhereInput = {
    companyId,
    ...(opts.status ? { status: opts.status } : {}),
    ...(opts.search ? { OR: [{ name: { contains: opts.search } }, { email: { contains: opts.search } }] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.lead.findMany({ where, orderBy: { createdAt: "desc" }, ...skipTake(p), include: fullInclude }),
    prisma.lead.count({ where }),
  ]);
  return paginate(rows.map(serialize), total, p);
}

// Pipeline: contagem e soma de valor por estagio.
export async function pipeline(companyId: string) {
  const grouped = await prisma.lead.groupBy({
    by: ["status"],
    where: { companyId },
    _count: { _all: true },
    _sum: { value: true },
  });
  const byStatus = new Map(grouped.map((g) => [g.status, g]));
  return LEAD_STATUSES.map((status) => ({
    status,
    count: byStatus.get(status)?._count._all ?? 0,
    value: num(byStatus.get(status)?._sum.value ?? new Prisma.Decimal(0)),
  }));
}

export async function getLead(companyId: string, id: string) {
  const lead = await prisma.lead.findFirst({ where: { id, companyId }, include: fullInclude });
  if (!lead) throw notFound("Lead não encontrado");
  return lead;
}

// Campos editaveis do lead e como explica-los na trilha de auditoria.
const CAMPOS_DO_LEAD = {
  name: "nome",
  email: "contato por e-mail",
  phone: "contato por telefone",
  source: "origem",
  notes: "observações",
} as const;

// Resumo da edição: a aba Atividades mostra o que mudou em linguagem humana,
// em vez de um código técnico ou de um UUID de lead.
function mudancasDoLead(
  antes: { name: string; email: string | null; phone: string | null; source: string | null; notes: string | null; value: Prisma.Decimal },
  input: Partial<CreateLeadInput>,
) {
  const alteracoes: string[] = [];
  for (const campo of Object.keys(CAMPOS_DO_LEAD) as (keyof typeof CAMPOS_DO_LEAD)[]) {
    const novo = input[campo];
    if (novo !== undefined && novo !== antes[campo]) alteracoes.push(CAMPOS_DO_LEAD[campo]);
  }
  // Fase 3d: a comparação do "mudou o valor?" é em centavo, não em double — dois
  // valores que a tela mostra iguais não podem gerar registro de alteração falsa.
  const valorAntes = centavos(antes.value);
  const valorDepois = input.value === undefined ? valorAntes : centavos(input.value);
  if (valorAntes !== valorDepois) {
    alteracoes.push("valor");
    return {
      alteracoes,
      valor: { de: moedaDeCentavos(valorAntes), para: moedaDeCentavos(valorDepois) },
    };
  }
  return { alteracoes, valor: null };
}

export async function createLead(companyId: string, input: CreateLeadInput, userId: string, ip: string) {
  const lead = await prisma.lead.create({ data: { companyId, userId, ...input } });
  await audit({ userId, companyId, action: "lead.create", entity: "lead", entityId: lead.id, ip, metadata: { leadName: lead.name, value: input.value } });
  await avisoNovoLead(companyId, {
    leadId: lead.id,
    name: lead.name,
    value: moedaDeCentavos(centavos(input.value)),
    source: input.source ?? null,
    fromUserId: userId,
  });
  return getLead(companyId, lead.id).then(serialize);
}

// Fase 1c da auditoria: as escritas de lead abaixo carregam o companyId no
// where — id de outra empresa não atualiza nada (P2025 vira 404 no handler).
export async function updateLead(companyId: string, id: string, input: Partial<CreateLeadInput>, userId: string, ip: string) {
  const found = await prisma.lead.findFirst({ where: { id, companyId } });
  if (!found) throw notFound("Lead não encontrado");
  await prisma.lead.update({ where: { id, companyId }, data: input });
  const mudancas = mudancasDoLead(found, input);
  await audit({
    userId,
    companyId,
    action: "lead.update",
    entity: "lead",
    entityId: id,
    ip,
    metadata: { leadName: found.name, ...mudancas },
  });
  return getLead(companyId, id).then(serialize);
}

// Ganhou: vira cliente automaticamente (sem duplicar se ja convertido).
export async function changeStatus(companyId: string, id: string, status: LeadStatusValue, userId: string, ip: string) {
  const found = await prisma.lead.findFirst({ where: { id, companyId } });
  if (!found) throw notFound("Lead não encontrado");
  if (found.status === status) throw badRequest("O lead já está neste estágio");

  // Fase 3a da auditoria: cliente criado e lead marcado como convertido vivem
  // na MESMA transação. Antes, um crash entre os dois writes deixava cliente
  // órfão no banco com o lead ainda no estágio antigo — e um segundo clique em
  // "ganhou" criava outro cliente duplicado.
  let clientId = found.clientId;
  if (status === "WON" && !clientId) {
    clientId = await prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: { companyId, name: found.name, email: found.email, phone: found.phone, notes: "Convertido do lead " + found.name },
      });
      await tx.lead.update({ where: { id, companyId }, data: { status, clientId: client.id } });
      return client.id;
    });
    await audit({ userId, companyId, action: "client.create", entity: "client", entityId: clientId, ip, metadata: { origem: "lead " + id } });
  } else {
    await prisma.lead.update({ where: { id, companyId }, data: { status, clientId } });
  }
  await audit({
    userId,
    companyId,
    action: "lead." + status.toLowerCase(),
    entity: "lead",
    entityId: id,
    ip,
    metadata: { leadName: found.name, de: found.status, para: status },
  });
  return getLead(companyId, id).then(serialize);
}
