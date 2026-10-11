import { NotificationPriority, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { paginate, skipTake, type PaginationInput } from "../../lib/pagination";
import { notFound } from "../../lib/errors";
import { calendarioDaEmpresa, diaDeCalendario, fusoDaEmpresa, mesNoFuso } from "../../lib/time";
import type { TipoNotificacao, PreferenciasInput } from "./notifications.schemas";

// ===== Notificações persistentes (seção 44) =====
// Aviso persistente é DIFERENTE de toast: o toast (Toastr) só confirma a ação
// que a pessoa acabou de fazer na tela; a notificação fica guardada no banco,
// tem tipo, prioridade, data, dono, empresa e histórico de leitura.
//
// Regras deste módulo:
//  - quem causa o próprio evento não recebe o próprio aviso;
//  - cada tipo tem uma preferência; desligar "estoque" não silencia "venda";
//  - sem linha de preferência salva vale o padrão do schema (avisos ligados);
//  - o canal "aplicativo" (sino + tela) decide se o aviso é gravado; o canal de
//    e-mail é apenas preferência guardada, pois disparar mensagem depende de
//    SMTP configurado no servidor (nada é simulado aqui);
//  - varreduras periódicas usam dedupe_key para não repetir o mesmo aviso;
//  - falha em gerar aviso nunca derruba a operação de negócio (mesma política
//    da auditoria).

type FlagPreferencia = "saleAlerts" | "lowStock" | "newLead" | "overdueBills" | "dailyReport";

export const TIPOS: Record<TipoNotificacao, { rotulo: string; preferencia: FlagPreferencia }> = {
  sale: { rotulo: "Vendas", preferencia: "saleAlerts" },
  stock: { rotulo: "Estoque", preferencia: "lowStock" },
  lead: { rotulo: "CRM", preferencia: "newLead" },
  billing: { rotulo: "Financeiro", preferencia: "overdueBills" },
  report: { rotulo: "Relatório diário", preferencia: "dailyReport" },
};

export const PREFERENCIAS_PADRAO: PreferenciasInput = {
  saleAlerts: true,
  lowStock: true,
  dailyReport: false,
  overdueBills: true,
  newLead: true,
  emailChannel: false,
  inAppChannel: true,
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export function moeda(valor: number): string {
  return brl.format(Number.isFinite(valor) ? valor : 0);
}

export interface EventoNotificavel {
  kind: TipoNotificacao;
  title: string;
  body?: string | null;
  link?: string | null;
  priority?: NotificationPriority;
  /** Quem provocou o evento. Fica de fora dos destinatários. */
  fromUserId?: string | null;
  /** Aviso individual (por exemplo, só para o responsável pelo registro). */
  toUserId?: string | null;
  /** Base da chave antifduplication; o id do usuário é anexado na gravação. */
  dedupeBase?: string | null;
}

function texto(v: string | null | undefined, limite: number): string {
  const t = (v ?? "").replace(/\s+/g, " ").trim();
  return t.length > limite ? t.slice(0, limite - 1) + "…" : t;
}

/**
 * Grava o aviso para quem deve recebê-lo. Devolve quantas notificações foram
 * criadas (0 quando todos desligaram o tipo ou não há destinatário).
 */
export async function notificar(companyId: string, evento: EventoNotificavel): Promise<number> {
  try {
    const regra = TIPOS[evento.kind];
    const membros = await prisma.companyUser.findMany({
      where: { companyId, user: { active: true } },
      select: { userId: true },
    });
    let destinatarios = membros.map((m) => m.userId);
    if (evento.toUserId) {
      destinatarios = destinatarios.includes(evento.toUserId) ? [evento.toUserId] : [];
    }
    if (evento.fromUserId) {
      destinatarios = destinatarios.filter((id) => id !== evento.fromUserId);
    }
    if (destinatarios.length === 0) return 0;

    const salvas = await prisma.notificationPreference.findMany({
      where: { companyId, userId: { in: destinatarios } },
    });
    const preferenciaPorUsuario = new Map(salvas.map((p) => [p.userId, p]));

    const linhas = destinatarios
      .filter((userId) => {
        const p = preferenciaPorUsuario.get(userId);
        if (!p) return PREFERENCIAS_PADRAO.inAppChannel && PREFERENCIAS_PADRAO[regra.preferencia];
        return p.inAppChannel && p[regra.preferencia];
      })
      .map((userId) => ({
        userId,
        companyId,
        kind: evento.kind,
        title: texto(evento.title, 160),
        body: texto(evento.body, 400) || null,
        link: evento.link ? texto(evento.link, 200) : null,
        priority: evento.priority ?? NotificationPriority.MEDIUM,
        dedupeKey: evento.dedupeBase ? texto(evento.dedupeBase + ":" + userId, 120) : null,
      }));

    if (linhas.length === 0) return 0;
    const { count } = await prisma.notification.createMany({ data: linhas, skipDuplicates: true });
    return count;
  } catch (err) {
    // Um aviso que não nasceu não pode estragar a venda, a compra ou o estoque.
    // eslint-disable-next-line no-console
    console.error("[notificacoes] falha ao gerar avisos", evento.kind, (err as Error).message);
    return 0;
  }
}

// ---- Avisos disparados pelas operações de negócio ----

export interface DadosVenda {
  saleId: string;
  total: number;
  clientName?: string | null;
  itens?: number;
  fromUserId?: string | null;
}

export async function avisoVenda(companyId: string, v: DadosVenda, confirmada: boolean): Promise<number> {
  const numero = v.saleId.slice(0, 8).toUpperCase();
  return notificar(companyId, {
    kind: "sale",
    title: confirmada
      ? `Venda ${numero} confirmada · ${moeda(v.total)}`
      : `Venda ${numero} cancelada · ${moeda(v.total)}`,
    body:
      (v.clientName ? `Cliente ${v.clientName}. ` : "") +
      (v.itens ? `${v.itens} ${v.itens === 1 ? "item" : "itens"}. ` : "") +
      (confirmada ? "Estoque baixado." : "Estoque devolvido ao saldo."),
    link: "/app/vendas",
    priority: confirmada ? NotificationPriority.LOW : NotificationPriority.MEDIUM,
    fromUserId: v.fromUserId,
    dedupeBase: `venda:${v.saleId}:${confirmada ? "ok" : "cancelada"}`,
  });
}

/**
 * Usado por Vendas, Compras e pela movimentação manual: sempre que um produto
 * controlado fica no mínimo ou abaixo dele, a empresa é avisada.
 */
export async function avisoEstoqueBaixo(
  companyId: string,
  produtoId: string,
  fromUserId: string | null,
): Promise<number> {
  const p = await prisma.product.findFirst({ where: { id: produtoId, companyId } });
  if (!p || !p.trackStock || Number(p.minStock) <= 0) return 0;
  const estoque = Number(p.stockQuantity);
  const minimo = Number(p.minStock);
  if (estoque > minimo) return 0;
  const zerado = estoque <= 0;
  return notificar(companyId, {
    kind: "stock",
    title: zerado ? `Estoque zerado: ${p.name}` : `Estoque baixo: ${p.name}`,
    body: zerado
      ? `Não restam ${p.unit}s e o mínimo é ${minimo} ${p.unit}.`
      : `Saldo atual de ${estoque} ${p.unit}, no ou abaixo do mínimo de ${minimo} ${p.unit}.`,
    link: "/app/produtos",
    priority: zerado ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
    fromUserId,
    dedupeBase: `estoque:${p.id}:${estoque}:${zerado ? "zero" : "minimo"}`,
  });
}

export interface DadosLead {
  leadId: string;
  name: string;
  value: number;
  source?: string | null;
  fromUserId?: string | null;
}

export async function avisoNovoLead(companyId: string, lead: DadosLead): Promise<number> {
  return notificar(companyId, {
    kind: "lead",
    title: `Lead novo no funil: ${lead.name}`,
    body:
      (lead.value > 0 ? `Valor estimado de ${moeda(lead.value)}. ` : "Sem valor informado. ") +
      (lead.source ? `Origem: ${lead.source}.` : ""),
    link: "/app/crm",
    priority: NotificationPriority.MEDIUM,
    fromUserId: lead.fromUserId,
    dedupeBase: `lead:${lead.leadId}`,
  });
}

// ---- Varreduras periódicas (as chamadas rotinas do passo de Operações) ----

function diasDeAtraso(dueDate: Date, hoje: Date): number {
  return Math.max(1, Math.floor((hoje.getTime() - dueDate.getTime()) / 86_400_000));
}

/**
 * Vencimento em dd/mm/aaaa. A coluna é DATE (`@db.Date`): o valor vem do banco
 * à meia-noite UTC, e é esse dia de calendário que a pessoa escreveu na tela —
 * traduzi-lo para o fuso da empresa é que criaria a conta vencendo um dia antes.
 */
function dataBR(d: Date): string {
  const iso = diaDeCalendario(d);
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

/**
 * Avisos que não nascem de uma ação da pessoa: contas vencidas. Retorna a
 * quantidade criada. A chave antifduplication usa o mês da varredura, então a
 * mesma conta vencida avisa uma vez por mês e não vira spam diário.
 *
 * Fase 3c: o "hoje" da varredura é o de dentro da empresa, não o do servidor.
 * Uma conta que vence hoje só é vencida quando o dia dela vira; com o relógio
 * do datacenter, em America/Sao_Paulo ela acordava avisada três horas adiantada.
 * A comparação é dia com dia porque a coluna é `@db.Date`.
 */
export async function varreduraEmpresa(
  companyId: string,
  agora = new Date(),
  fuso?: string,
): Promise<number> {
  const tz = fuso ?? (await fusoDaEmpresa(companyId));
  const hoje = calendarioDaEmpresa(tz, agora);
  const mes = mesNoFuso(tz, agora);

  const vencidas = await prisma.financeEntry.findMany({
    where: { companyId, status: "PENDING", dueDate: { lt: hoje } },
    take: 500,
    orderBy: { dueDate: "asc" },
    include: { client: { select: { name: true } }, supplier: { select: { name: true } } },
  });

  let criadas = 0;
  for (const e of vencidas) {
    const atraso = diasDeAtraso(e.dueDate, hoje);
    const despesa = e.type === "EXPENSE";
    const responsavel = despesa ? e.supplier?.name : e.client?.name;
    criadas += await notificar(companyId, {
      kind: "billing",
      title: `${despesa ? "Despesa" : "Recebimento"} vencido há ${atraso} ${atraso === 1 ? "dia" : "dias"}`,
      body:
        `${e.description} · ${moeda(Number(e.amount))}` +
        (responsavel ? ` · ${responsavel}` : "") +
        ` · venceu em ${dataBR(e.dueDate)}`,
      link: "/app/financeiro",
      priority: atraso > 7 ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
      dedupeBase: `vencida:${e.id}:${mes}`,
    });
  }
  return criadas;
}

/** Varredura de todas as empresas ativas (usada pela rotina agendada). */
export async function varreduraGlobal(agora = new Date()): Promise<{ empresas: number; criadas: number }> {
  const empresas = await prisma.company.findMany({
    where: { active: true },
    select: { id: true, timezone: true },
  });
  let criadas = 0;
  for (const c of empresas) criadas += await varreduraEmpresa(c.id, agora, c.timezone);
  return { empresas: empresas.length, criadas };
}

// ---- Leitura e estado (a pessoa só enxerga os próprios avisos) ----

export type FiltroStatus = "todas" | "naolidas" | "lidas";

function whereBase(userId: string, companyId: string, status: FiltroStatus, kind?: TipoNotificacao) {
  const where: Prisma.NotificationWhereInput = { userId, companyId };
  if (kind) where.kind = kind;
  if (status === "naolidas") where.readAt = null;
  if (status === "lidas") where.readAt = { not: null };
  return where;
}

function serializar(n: {
  id: string; kind: string; title: string; body: string | null; link: string | null;
  priority: NotificationPriority; readAt: Date | null; createdAt: Date;
}) {
  return {
    id: n.id,
    kind: n.kind,
    title: n.title,
    body: n.body,
    link: n.link,
    priority: n.priority,
    readAt: n.readAt,
    createdAt: n.createdAt,
    lida: n.readAt !== null,
  };
}

export async function listar(
  userId: string,
  companyId: string,
  p: PaginationInput,
  opts: { status: FiltroStatus; kind?: TipoNotificacao },
) {
  const where = whereBase(userId, companyId, opts.status, opts.kind);
  const [rows, total] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, ...skipTake(p) }),
    prisma.notification.count({ where }),
  ]);
  return paginate(rows.map(serializar), total, p);
}

export async function resumo(userId: string, companyId: string) {
  const naoLidas = await prisma.notification.count({ where: { userId, companyId, readAt: null } });
  const agrupadas = await prisma.notification.groupBy({
    by: ["kind"],
    where: { userId, companyId, readAt: null },
    _count: { _all: true },
  });
  const porTipo: Record<string, number> = {};
  for (const tipo of Object.keys(TIPOS)) porTipo[tipo] = 0;
  for (const g of agrupadas) porTipo[g.kind] = g._count._all;
  const urgentes = await prisma.notification.count({
    where: { userId, companyId, readAt: null, priority: NotificationPriority.HIGH },
  });
  return { naoLidas, urgentes, porTipo };
}

export async function marcarLida(userId: string, companyId: string, id: string) {
  const found = await prisma.notification.findFirst({ where: { id, userId, companyId } });
  if (!found) throw notFound("Notificação não encontrada");
  if (found.readAt) return serializar(found);
  const atualizada = await prisma.notification.update({
    // Fase 1c: marca como lida só a notificação desta pessoa nesta empresa —
    // id de outro dono ou de outra empresa não altera nada (P2025 → 404).
    where: { id, userId, companyId },
    data: { readAt: new Date() },
  });
  return serializar(atualizada);
}

export async function marcarTodasLidas(userId: string, companyId: string): Promise<number> {
  const { count } = await prisma.notification.updateMany({
    where: { userId, companyId, readAt: null },
    data: { readAt: new Date() },
  });
  return count;
}

// ---- Preferências (por usuário e por empresa ativa) ----

export async function obterPreferencias(userId: string, companyId: string): Promise<PreferenciasInput> {
  const p = await prisma.notificationPreference.findUnique({
    where: { userId_companyId: { userId, companyId } },
  });
  if (!p) return { ...PREFERENCIAS_PADRAO };
  return {
    saleAlerts: p.saleAlerts,
    lowStock: p.lowStock,
    dailyReport: p.dailyReport,
    overdueBills: p.overdueBills,
    newLead: p.newLead,
    emailChannel: p.emailChannel,
    inAppChannel: p.inAppChannel,
  };
}

export async function salvarPreferencias(
  userId: string,
  companyId: string,
  input: PreferenciasInput,
): Promise<PreferenciasInput> {
  const salva = await prisma.notificationPreference.upsert({
    where: { userId_companyId: { userId, companyId } },
    create: { userId, companyId, ...input },
    update: { ...input },
  });
  return {
    saleAlerts: salva.saleAlerts,
    lowStock: salva.lowStock,
    dailyReport: salva.dailyReport,
    overdueBills: salva.overdueBills,
    newLead: salva.newLead,
    emailChannel: salva.emailChannel,
    inAppChannel: salva.inAppChannel,
  };
}
