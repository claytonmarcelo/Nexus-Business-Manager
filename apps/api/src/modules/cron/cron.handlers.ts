// Os executores das rotinas (seção 37, passo de Operações). Cada job registrado
// aqui nasce de uma varredura que já existia como botão manual ("ver contas
// vencidas agora") ou como dados que só fazem sentido calculados de madrugada.
// Nada de função de fachada: todo handler escreve avisos reais pelo motor de
// notificações (seção 44), com chave antiduplicação do dia, e devolve a frase
// que vai aparecer na coluna "última execução" da tela de Rotinas.
import { NotificationPriority } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { moeda, notificar, varreduraGlobal } from "../notifications/notifications.service";

export interface ResultadoExecucao {
  /** Frase curta (<= 400 caracteres) gravada em cron_jobs.last_message. */
  mensagem: string;
  detalhes: Record<string, unknown>;
}

export interface JobDefinicao {
  slug: string;
  nome: string;
  descricao: string;
  agenda: string;
  handler: (agora: Date) => Promise<ResultadoExecucao>;
}

// "2026-10-11" no fuso do servidor — mesma base do antiduplicação das varreduras.
function chaveDia(agora: Date): string {
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
}

// ---- 1. Contas vencidas ----
// A varredura global já era a perna administrativa do sino; aqui ela ganha
// execução própria. O antiduplicação mensal (dentro de varreduraEmpresa) evita
// spam: a mesma conta vencida avisa uma vez por mês, não toda madrugada.
async function rotinaContasVencidas(agora: Date): Promise<ResultadoExecucao> {
  const r = await varreduraGlobal(agora);
  return {
    mensagem: `${r.criadas} ${r.criadas === 1 ? "aviso criado" : "avisos criados"} em ${r.empresas} ${r.empresas === 1 ? "empresa" : "empresas"}`,
    detalhes: { empresas: r.empresas, criadas: r.criadas },
  };
}

// ---- 2. Estoque no mínimo ----
// Um resumo por empresa (não um aviso por produto): 40 itens baixos virariam
// 40 notificações idênticas. Prioridade alta quando algum produto já zerou.
async function rotinaEstoqueBaixo(agora: Date): Promise<ResultadoExecucao> {
  const dia = chaveDia(agora);
  const empresas = await prisma.company.findMany({ where: { active: true }, select: { id: true } });
  let avisadas = 0;
  let criadas = 0;
  for (const c of empresas) {
    const monitoradas = await prisma.product.findMany({
      where: { companyId: c.id, active: true, trackStock: true, minStock: { gt: 0 } },
      select: { stockQuantity: true, minStock: true },
      take: 2000,
    });
    // Prisma não compara duas colunas numa where; o recorte é aqui, igual ao
    // Dashboard (crítico = zerou; alerta = acima de zero e abaixo do mínimo).
    let criticos = 0;
    let alerta = 0;
    for (const p of monitoradas) {
      const q = Number(p.stockQuantity);
      if (q <= 0) criticos += 1;
      else if (q < Number(p.minStock)) alerta += 1;
    }
    const total = criticos + alerta;
    if (total === 0) continue;
    const criados = await notificar(c.id, {
      kind: "stock",
      title: `${total} ${total === 1 ? "produto com estoque" : "produtos com estoque"} abaixo do mínimo`,
      body:
        criticos > 0
          ? `${criticos} ${criticos === 1 ? "zerado" : "zerados"} — reposição urgente. Confira em Produtos.`
          : "Confira a reposição em Produtos.",
      link: "/app/produtos",
      priority: criticos > 0 ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
      dedupeBase: `estoque-baixo:${c.id}:${dia}`,
    });
    if (criados > 0) avisadas += 1;
    criadas += criados;
  }
  return {
    mensagem: `${avisadas} ${avisadas === 1 ? "empresa avisada" : "empresas avisadas"} · ${criadas} ${criadas === 1 ? "aviso" : "avisos"}`,
    detalhes: { empresas: empresas.length, avisadas, criadas },
  };
}

// ---- 3. Relatório diário ----
// O fechamento de ontem para quem ligou "Relatório diário" nas preferências
// (o padrão é desligado — só recebe quem pediu). Sem SMTP não há e-mail: o
// relatório chega pelo sino, como o resto.
async function rotinaRelatorioDiario(agora: Date): Promise<ResultadoExecucao> {
  const hoje = new Date(agora);
  hoje.setHours(0, 0, 0, 0);
  const ontem = new Date(hoje.getTime() - 86_400_000);
  const dia = chaveDia(agora);
  const empresas = await prisma.company.findMany({ where: { active: true }, select: { id: true } });
  let criadas = 0;
  for (const c of empresas) {
    const [vendas, clientesNovos] = await Promise.all([
      prisma.sale.aggregate({
        where: { companyId: c.id, status: "CONFIRMED", createdAt: { gte: ontem, lt: hoje } },
        _count: true,
        _sum: { total: true },
      }),
      prisma.client.count({ where: { companyId: c.id, createdAt: { gte: ontem, lt: hoje } } }),
    ]);
    const totalVendas = Number(vendas._sum.total ?? 0);
    const dataBr = `${String(ontem.getDate()).padStart(2, "0")}/${String(ontem.getMonth() + 1).padStart(2, "0")}/${ontem.getFullYear()}`;
    criadas += await notificar(c.id, {
      kind: "report",
      title: `Relatório de ${dataBr}`,
      body:
        `${vendas._count} ${vendas._count === 1 ? "venda confirmada" : "vendas confirmadas"} · ${moeda(totalVendas)}` +
        ` · ${clientesNovos} ${clientesNovos === 1 ? "cliente novo" : "novos clientes"}`,
      link: "/app",
      priority: NotificationPriority.LOW,
      dedupeBase: `relatorio-diario:${c.id}:${dia}`,
    });
  }
  return {
    mensagem: `${empresas.length} ${empresas.length === 1 ? "empresa fechada" : "empresas fechadas"} · ${criadas} ${criadas === 1 ? "aviso" : "avisos"}`,
    detalhes: { empresas: empresas.length, criadas },
  };
}

export const JOBS: JobDefinicao[] = [
  {
    slug: "contas-vencidas",
    nome: "Contas vencidas",
    descricao: "Varredura de recebimentos e despesas vencidos em todas as empresas ativas. O mesmo aviso não se repete dentro do mês.",
    agenda: "0 7 * * *",
    handler: rotinaContasVencidas,
  },
  {
    slug: "estoque-baixo",
    nome: "Estoque abaixo do mínimo",
    descricao: "Um resumo por empresa dos produtos com estoque no mínimo ou zerado. Prioridade alta quando algum produto já zerou.",
    agenda: "5 7 * * *",
    handler: rotinaEstoqueBaixo,
  },
  {
    slug: "relatorio-diario",
    nome: "Relatório diário",
    descricao: "Fechamento de ontem (vendas confirmadas, total e clientes novos) para quem ligou o relatório nas preferências de notificação.",
    agenda: "0 8 * * *",
    handler: rotinaRelatorioDiario,
  },
];

export function jobPorSlug(slug: string): JobDefinicao | undefined {
  return JOBS.find((j) => j.slug === slug);
}
