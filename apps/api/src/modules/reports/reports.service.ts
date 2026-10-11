import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

// Camada de leitura dos painéis (abas Análises / Indicadores / Relatórios).
// Tudo é calculado no servidor sobre a empresa do token: as telas nunca
// recebem paginação truncada para "adivinhar" uma agregação no navegador.

export interface Periodo {
  de: Date;
  ate: Date;
}

function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  return Number(v);
}

function arredonda(v: number): number {
  return Math.round(v * 100) / 100;
}

export function mesCorrente(base = new Date()): Periodo {
  const de = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1));
  const ate = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 1));
  return { de, ate };
}

export function mesAnterior(base = new Date()): Periodo {
  const de = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - 1, 1));
  const ate = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1));
  return { de, ate };
}

function hoje(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Meta nominal do mês, cadastrada em Configurações da empresa. Sem alvo definido
// a função devolve null: o Dashboard não inventa percentual sobre nada.
function metaDeReceita(
  alvo: Prisma.Decimal | null | undefined,
  receita: number,
  mes: Periodo,
) {
  const alvoNumero = arredonda(num(alvo));
  if (alvoNumero <= 0) return null;
  const faltando = arredonda(Math.max(0, alvoNumero - receita));
  const diasRestantes = Math.max(1, Math.ceil((mes.ate.getTime() - hoje().getTime()) / 86_400_000));
  return {
    alvo: alvoNumero,
    atingido: arredonda((receita / alvoNumero) * 100),
    faltando,
    diasRestantes,
    ritmoDiario: faltando === 0 ? 0 : arredonda(faltando / diasRestantes),
  };
}

// ---- Visão geral + alertas (Dashboard) ----

export async function overview(companyId: string) {
  const atual = mesCorrente();
  const anterior = mesAnterior();
  const hojeDia = hoje();
  const emSeteDias = new Date(hojeDia.getTime() + 7 * 24 * 60 * 60 * 1000);
  const emTrintaDias = new Date(hojeDia.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    vendasAtual,
    vendasAnterior,
    vendasPendentes,
    vendasCanceladas,
    contagemClientes,
    clientesNovos,
    produtosBaixos,
    contagemProdutos,
    valorEstoque,
    receber,
    pagar,
    atrasadas,
    leadsAbertos,
    leadsGanhos,
    leadsPerdidos,
    valorFunil,
    agendaProxima,
    agendaAtrasada,
    semCompra,
    empresaMeta,
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: { companyId, status: { not: "CANCELLED" }, createdAt: { gte: atual.de, lt: atual.ate } },
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.sale.aggregate({
      where: { companyId, status: { not: "CANCELLED" }, createdAt: { gte: anterior.de, lt: anterior.ate } },
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.sale.count({ where: { companyId, status: "PENDING" } }),
    prisma.sale.count({ where: { companyId, status: "CANCELLED" } }),
    prisma.client.count({ where: { companyId } }),
    prisma.client.count({ where: { companyId, active: true, createdAt: { gte: atual.de, lt: atual.ate } } }),
    prisma.product.findMany({
      where: { companyId, active: true, trackStock: true, minStock: { gt: 0 } },
      orderBy: { name: "asc" },
      take: 200,
      select: { id: true, name: true, stockQuantity: true, minStock: true },
    }),
    prisma.product.count({ where: { companyId, active: true } }),
    prisma.product.aggregate({ where: { companyId, active: true }, _sum: { stockQuantity: true } }),
    prisma.financeEntry.aggregate({
      where: { companyId, type: "INCOME", status: "PENDING" },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.financeEntry.aggregate({
      where: { companyId, type: "EXPENSE", status: "PENDING" },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.financeEntry.aggregate({
      where: { companyId, status: "PENDING", dueDate: { lt: hojeDia } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.lead.count({ where: { companyId, status: { in: ["NEW", "CONTACTED", "PROPOSAL"] } } }),
    prisma.lead.count({ where: { companyId, status: "WON" } }),
    prisma.lead.count({ where: { companyId, status: "LOST" } }),
    prisma.lead.aggregate({
      where: { companyId, status: { in: ["NEW", "CONTACTED", "PROPOSAL"] } },
      _sum: { value: true },
    }),
    prisma.agendaEvent.count({
      where: { companyId, status: "SCHEDULED", startAt: { gte: hojeDia, lte: emSeteDias } },
    }),
    prisma.agendaEvent.count({
      where: { companyId, status: "SCHEDULED", startAt: { lt: hojeDia } },
    }),
    // Clientes cadastrados ha mais de 30 dias sem nenhuma venda.
    prisma.client.count({
      where: {
        companyId,
        active: true,
        createdAt: { lt: new Date(emTrintaDias.getTime()) },
        sales: { none: {} },
      },
    }),
    // O alvo do mês mora na empresa (Configurações > Empresa).
    prisma.company.findUnique({ where: { id: companyId }, select: { revenueTarget: true } }),
  ]);

  const criticos = produtosBaixos.filter((p) => num(p.stockQuantity) <= 0);
  const alerta = produtosBaixos.filter((p) => num(p.stockQuantity) > 0 && num(p.stockQuantity) < num(p.minStock));

  const receitaAtual = arredonda(num(vendasAtual._sum.total));
  const receitaAnterior = arredonda(num(vendasAnterior._sum.total));
  const variacao = receitaAnterior > 0
    ? arredonda(((receitaAtual - receitaAnterior) / receitaAnterior) * 100)
    : null;

  const meta = metaDeReceita(empresaMeta?.revenueTarget, receitaAtual, atual);

  // Cada alerta declara a permissao necessaria para ele ser exibido: a rota
  // filtra a lista e um papel sem acesso a financa nunca ve valores de conta.
  const alertas: { chave: string; titulo: string; texto: string; quantidade: number; grau: string; rota: string; perm: string }[] = [];
  if (criticos.length) {
    alertas.push({
      chave: "estoque-zero", perm: "product:read",
      titulo: "Ruptura de estoque",
      texto: criticos.length + (criticos.length === 1 ? " produto está sem estoque" : " produtos estão sem estoque"),
      quantidade: criticos.length,
      grau: "critico",
      rota: "/app/produtos?aba=movimentacoes",
    });
  }
  if (alerta.length) {
    alertas.push({
      chave: "estoque-baixo", perm: "product:read",
      titulo: "Estoque abaixo do mínimo",
      texto: alerta.length + (alerta.length === 1 ? " produto precisa de reposição" : " produtos precisam de reposição"),
      quantidade: alerta.length,
      grau: "aviso",
      rota: "/app/produtos?aba=categorias",
    });
  }
  if (atrasadas._count._all) {
    alertas.push({
      chave: "financeiro-atrasado", perm: "finance:read",
      titulo: "Lançamentos vencidos",
      texto: "Há " + arredonda(num(atrasadas._sum.amount)) + " em contas vencidas não resolvidas",
      quantidade: atrasadas._count._all,
      grau: "critico",
      rota: "/app/financeiro?aba=contas",
    });
  }
  if (vendasPendentes) {
    alertas.push({
      chave: "vendas-pendentes", perm: "sale:read",
      titulo: "Pedidos aguardando confirmação",
      texto: vendasPendentes + (vendasPendentes === 1 ? " pedido ainda não confirmado" : " pedidos ainda não confirmados"),
      quantidade: vendasPendentes,
      grau: "aviso",
      rota: "/app/vendas",
    });
  }
  if (agendaAtrasada) {
    alertas.push({
      chave: "agenda-atrasada", perm: "agenda:read",
      titulo: "Compromissos atrasados",
      texto: "Existem compromissos agendados que já passaram do horário",
      quantidade: agendaAtrasada,
      grau: "aviso",
      rota: "/app/agenda",
    });
  }
  if (semCompra) {
    alertas.push({
      chave: "clientes-inativos", perm: "client:read",
      titulo: "Clientes sem compra",
      texto: semCompra + (semCompra === 1 ? " cliente ativo nunca gerou venda" : " clientes ativos nunca geraram venda"),
      quantidade: semCompra,
      grau: "aviso",
      rota: "/app/clientes?aba=segmentos",
    });
  }

  return {
    periodo: new Date().toISOString().slice(0, 7),
    vendas: {
      receita: receitaAtual,
      pedidos: vendasAtual._count._all,
      ticket: vendasAtual._count._all ? arredonda(receitaAtual / vendasAtual._count._all) : 0,
      receitaAnterior,
      pedidosAnterior: vendasAnterior._count._all,
      variacao,
      pendentes: vendasPendentes,
      canceladas: vendasCanceladas,
    },
    clientes: {
      total: contagemClientes,
      novosNoMes: clientesNovos,
      semCompra: semCompra,
    },
    produtos: {
      total: contagemProdutos,
      estoqueTotal: arredonda(num(valorEstoque._sum.stockQuantity)),
      ruptura: criticos.length,
      abaixoDoMinimo: alerta.length,
      listaBaixa: [...criticos, ...alerta].slice(0, 8).map((p) => ({
        id: p.id,
        nome: p.name,
        atual: arredonda(num(p.stockQuantity)),
        minimo: arredonda(num(p.minStock)),
      })),
    },
    financeiro: {
      aReceber: arredonda(num(receber._sum.amount)),
      aReceberQtd: receber._count._all,
      aPagar: arredonda(num(pagar._sum.amount)),
      aPagarQtd: pagar._count._all,
      vencido: arredonda(num(atrasadas._sum.amount)),
      vencidoQtd: atrasadas._count._all,
    },
    crm: {
      abertos: leadsAbertos,
      ganhos: leadsGanhos,
      perdidos: leadsPerdidos,
      valorNoFunil: arredonda(num(valorFunil._sum.value)),
      conversao: leadsGanhos + leadsPerdidos > 0
        ? arredonda((leadsGanhos / (leadsGanhos + leadsPerdidos)) * 100)
        : null,
    },
    agenda: { proximos7dias: agendaProxima, atrasados: agendaAtrasada },
    meta,
    alertas,
  };
}

// ---- Clientes: segmentos, recência e análises ----

export async function clientes(companyId: string) {
  const mes = mesCorrente();
  const [total, ativos, novosNoMes, porCliente, cadastro] = await Promise.all([
    prisma.client.count({ where: { companyId } }),
    prisma.client.count({ where: { companyId, active: true } }),
    prisma.client.count({ where: { companyId, createdAt: { gte: mes.de, lt: mes.ate } } }),
    prisma.sale.groupBy({
      by: ["clientId"],
      where: { companyId, status: { not: "CANCELLED" }, clientId: { not: null } },
      _count: { _all: true },
      _sum: { total: true },
      _max: { createdAt: true },
    }),
    prisma.client.findMany({
      where: { companyId },
      select: { id: true, name: true, email: true, phone: true, document: true, active: true, createdAt: true },
    }),
  ]);

  const compras = new Map(porCliente.map((p) => [p.clientId as string, p]));
  const comValor = porCliente
    .map((p) => ({ id: p.clientId as string, total: arredonda(num(p._sum.total)), pedidos: p._count._all }))
    .sort((a, b) => b.total - a.total);

  const faturamentoTotal = comValor.reduce((soma, c) => soma + c.total, 0);
  let acumulado = 0;
  const curva = new Map<string, "A" | "B" | "C">();
  for (const c of comValor) {
    acumulado += c.total;
    const participacao = faturamentoTotal > 0 ? acumulado / faturamentoTotal : 1;
    curva.set(c.id, participacao <= 0.8 ? "A" : participacao <= 0.95 ? "B" : "C");
  }

  const hojeDia = hoje();
  const recenciaBuckets = [
    { rotulo: "Até 30 dias", de: 0, ate: 30 },
    { rotulo: "31 a 60 dias", de: 31, ate: 60 },
    { rotulo: "61 a 90 dias", de: 61, ate: 90 },
    { rotulo: "Há mais de 90 dias", de: 91, ate: 100000 },
  ];
  const recencia = recenciaBuckets.map((b) => ({ rotulo: b.rotulo, clientes: 0 }));
  let nuncaCompraram = 0;
  for (const c of cadastro) {
    const ultima = compras.get(c.id)?._max.createdAt;
    if (!ultima) {
      nuncaCompraram += 1;
      continue;
    }
    const dias = Math.floor((hojeDia.getTime() - ultima.getTime()) / (24 * 60 * 60 * 1000));
    const idx = recenciaBuckets.findIndex((b) => dias >= b.de && dias <= b.ate);
    const balde = idx >= 0 ? recencia[idx] : recencia[recencia.length - 1];
    if (balde) balde.clientes += 1;
  }

  const segmentos = ["A", "B", "C"].map((nivel) => {
    const ids = cadastro.filter((c) => curva.get(c.id) === nivel).map((c) => c.id);
    const clientes2 = ids.length;
    const totalNivel = ids.reduce((soma, id) => soma + arredonda(num(compras.get(id)?._sum.total ?? 0)), 0);
    return { nivel, clientes: clientes2, faturamento: arredonda(totalNivel) };
  });
  const semCompras = cadastro.filter((c) => !compras.has(c.id)).length;
  segmentos.push({ nivel: "D", clientes: semCompras, faturamento: 0 });

  const top = comValor.slice(0, 50).map((c) => {
    const cliente = cadastro.find((k) => k.id === c.id);
    return {
      id: c.id,
      nome: cliente?.name ?? "Cliente removido",
      pedidos: c.pedidos,
      faturamento: c.total,
      ultimaCompra: compras.get(c.id)?._max.createdAt ?? null,
      ativo: Boolean(cliente?.active),
    };
  });

  return {
    total,
    ativos,
    inativos: total - ativos,
    novosNoMes,
    faturamentoTotal: arredonda(faturamentoTotal),
    ticketMedio: comValor.length ? arredonda(faturamentoTotal / porCliente.reduce((s, p) => s + p._count._all, 0)) : 0,
    segmentos: segmentos.map((s) => ({
      ...s,
      rotulo:
        s.nivel === "A" ? "A · Alta receita"
          : s.nivel === "B" ? "B · Receita média"
            : s.nivel === "C" ? "C · Baixa receita"
              : "D · Sem compras",
      participacao: total ? Math.round((s.clientes / total) * 100) : 0,
    })),
    recencia,
    nuncaCompraram,
    semEmail: cadastro.filter((c) => !c.email).length,
    semTelefone: cadastro.filter((c) => !c.phone).length,
    semDocumento: cadastro.filter((c) => !c.document).length,
    top,
  };
}

// ---- Produtos: categorias e movimentações ----

export async function produtos(companyId: string) {
  const [categorias, comCategoria, semCategoria, totalAtivos] = await Promise.all([
    prisma.productCategory.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    }),
    prisma.product.groupBy({
      by: ["categoryId"],
      where: { companyId, active: true, categoryId: { not: null } },
      _count: { _all: true },
      _sum: { stockQuantity: true, salePrice: true },
    }),
    prisma.product.count({ where: { companyId, active: true, categoryId: null } }),
    prisma.product.count({ where: { companyId, active: true } }),
  ]);

  const porCategoria = new Map(comCategoria.map((c) => [c.categoryId as string, c]));
  return {
    total: totalAtivos,
    semCategoria,
    categorias: categorias.map((c) => {
      const dado = porCategoria.get(c.id);
      const quantidade = dado?._count._all ?? 0;
      return {
        id: c.id,
        nome: c.name,
        ativa: c.active,
        produtos: quantidade,
        estoque: arredonda(num(dado?._sum.stockQuantity ?? 0)),
        valorVendaMedio: quantidade ? arredonda(num(dado?._sum.salePrice ?? 0) / quantidade) : 0,
        participacao: totalAtivos ? Math.round((quantidade / totalAtivos) * 100) : 0,
      };
    }),
  };
}

export interface MovimentosFiltro {
  page: number;
  pageSize: number;
  kind?: string;
  productId?: string;
  de?: Date;
  ate?: Date;
}

export async function movimentos(companyId: string, f: MovimentosFiltro) {
  const where: Prisma.StockMovementWhereInput = { companyId };
  if (f.kind) where.kind = f.kind as never;
  if (f.productId) where.productId = f.productId;
  if (f.de || f.ate) {
    where.createdAt = { ...(f.de ? { gte: f.de } : {}), ...(f.ate ? { lte: f.ate } : {}) };
  }
  const [rows, total, entradas, saidas, ajuste] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (f.page - 1) * f.pageSize,
      take: f.pageSize,
      include: { product: { select: { name: true, unit: true } } },
    }),
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.aggregate({ where: { ...where, kind: "IN" }, _sum: { quantity: true } }),
    prisma.stockMovement.aggregate({ where: { ...where, kind: "OUT" }, _sum: { quantity: true } }),
    prisma.stockMovement.aggregate({ where: { ...where, kind: "ADJUST" }, _sum: { quantity: true } }),
  ]);
  return {
    meta: { page: f.page, pageSize: f.pageSize, total, totalPages: Math.max(1, Math.ceil(total / f.pageSize)) },
    totais: {
      entradas: arredonda(num(entradas._sum.quantity)),
      saidas: arredonda(num(saidas._sum.quantity)),
      ajustes: arredonda(num(ajuste._sum.quantity)),
    },
    data: rows.map((m) => ({
      id: m.id,
      produto: m.product.name,
      unidade: m.product.unit,
      kind: m.kind,
      quantidade: arredonda(num(m.quantity)),
      nota: m.note,
      createdAt: m.createdAt,
    })),
  };
}

// ---- Vendas: série diária, status, destaques ----

export async function vendas(companyId: string, de?: Date, ate?: Date) {
  const padrao = mesCorrente();
  const gte = de ?? padrao.de;
  const lte = ate ?? padrao.ate;
  const base: Prisma.SaleWhereInput = { companyId, createdAt: { gte, lte } };

  const [vendas, porStatus, itens, vendedores] = await Promise.all([
    prisma.sale.findMany({
      where: base,
      orderBy: { createdAt: "asc" },
      select: { id: true, total: true, status: true, createdAt: true, clientId: true, userId: true, client: { select: { name: true } } },
    }),
    prisma.sale.groupBy({ by: ["status"], where: base, _count: { _all: true }, _sum: { total: true } }),
    prisma.saleItem.findMany({
      where: { sale: base },
      select: { quantity: true, lineTotal: true, product: { select: { name: true } } },
    }),
    prisma.sale.findMany({
      where: base,
      select: { total: true, status: true, user: { select: { name: true } } },
    }),
  ]);

  const porDia = new Map<string, { dia: string; receita: number; pedidos: number }>();
  for (const v of vendas) {
    if (v.status === "CANCELLED") continue;
    const chave = v.createdAt.toISOString().slice(0, 10);
    const atual = porDia.get(chave) ?? { dia: chave, receita: 0, pedidos: 0 };
    atual.receita = arredonda(atual.receita + num(v.total));
    atual.pedidos += 1;
    porDia.set(chave, atual);
  }

  const porProduto = new Map<string, { nome: string; quantidade: number; receita: number }>();
  for (const i of itens) {
    const nome = i.product.name;
    const atual = porProduto.get(nome) ?? { nome, quantidade: 0, receita: 0 };
    atual.quantidade = arredonda(atual.quantidade + num(i.quantity));
    atual.receita = arredonda(atual.receita + num(i.lineTotal));
    porProduto.set(nome, atual);
  }

  const porCliente = new Map<string, { nome: string; pedidos: number; receita: number }>();
  for (const v of vendas) {
    if (v.status === "CANCELLED" || !v.client) continue;
    const atual = porCliente.get(v.client.name) ?? { nome: v.client.name, pedidos: 0, receita: 0 };
    atual.pedidos += 1;
    atual.receita = arredonda(atual.receita + num(v.total));
    porCliente.set(v.client.name, atual);
  }

  const porVendedor = new Map<string, { nome: string; pedidos: number; receita: number }>();
  for (const v of vendedores) {
    if (v.status === "CANCELLED") continue;
    const nome = v.user?.name ?? "Sem vínculo";
    const atual = porVendedor.get(nome) ?? { nome, pedidos: 0, receita: 0 };
    atual.pedidos += 1;
    atual.receita = arredonda(atual.receita + num(v.total));
    porVendedor.set(nome, atual);
  }

  const efetivas = vendas.filter((v) => v.status !== "CANCELLED");
  const receita = arredonda(efetivas.reduce((s, v) => s + num(v.total), 0));

  const etiquetas: Record<string, string> = { PENDING: "Pendentes", CONFIRMED: "Confirmadas", CANCELLED: "Canceladas" };

  return {
    de: gte.toISOString().slice(0, 10),
    ate: lte.toISOString().slice(0, 10),
    receita,
    pedidos: efetivas.length,
    ticket: efetivas.length ? arredonda(receita / efetivas.length) : 0,
    canceladas: vendas.filter((v) => v.status === "CANCELLED").length,
    porStatus: porStatus.map((s) => ({
      status: s.status,
      rotulo: etiquetas[s.status] ?? s.status,
      quantidade: s._count._all,
      receita: arredonda(num(s._sum.total)),
    })),
    porDia: [...porDia.values()].sort((a, b) => a.dia.localeCompare(b.dia)),
    topProdutos: [...porProduto.values()].sort((a, b) => b.receita - a.receita).slice(0, 8),
    topClientes: [...porCliente.values()].sort((a, b) => b.receita - a.receita).slice(0, 8),
    porVendedor: [...porVendedor.values()].sort((a, b) => b.receita - a.receita),
  };
}

// ---- Compras: status, fornecedores e cotações (rascunhos) ----

export async function compras(companyId: string) {
  const base: Prisma.PurchaseWhereInput = { companyId };
  const [porStatus, total, porFornecedor, rascunhos] = await Promise.all([
    prisma.purchase.groupBy({ by: ["status"], where: base, _count: { _all: true }, _sum: { total: true } }),
    prisma.purchase.aggregate({ where: { ...base, status: { not: "CANCELLED" } }, _sum: { total: true }, _count: { _all: true } }),
    prisma.purchase.groupBy({
      by: ["supplierId"],
      where: { ...base, status: { not: "CANCELLED" } },
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.purchase.findMany({
      where: { ...base, status: "DRAFT" },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { supplier: { select: { name: true } }, _count: { select: { items: true } } },
    }),
  ]);

  const nomes = new Map<string, string>();
  const fornecedores = await prisma.supplier.findMany({ where: { companyId }, select: { id: true, name: true, active: true } });
  for (const f of fornecedores) nomes.set(f.id, f.name);
  const gasto = arredonda(num(total._sum.total));

  const etiquetas: Record<string, string> = { DRAFT: "Em cotação", RECEIVED: "Recebidas", CANCELLED: "Canceladas" };

  return {
    gasto,
    pedidos: total._count._all,
    ticket: total._count._all ? arredonda(gasto / total._count._all) : 0,
    fornecedoresAtivos: fornecedores.filter((f) => f.active).length,
    fornecedoresCadastrados: fornecedores.length,
    porStatus: porStatus.map((s) => ({
      status: s.status,
      rotulo: etiquetas[s.status] ?? s.status,
      quantidade: s._count._all,
      valor: arredonda(num(s._sum.total)),
    })),
    topFornecedores: porFornecedor
      .map((f) => ({
        id: f.supplierId,
        nome: nomes.get(f.supplierId) ?? "Fornecedor removido",
        pedidos: f._count._all,
        valor: arredonda(num(f._sum.total)),
        participacao: gasto ? Math.round((num(f._sum.total) / gasto) * 100) : 0,
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8),
    cotacoes: rascunhos.map((r) => ({
      id: r.id,
      fornecedor: r.supplier.name,
      valor: arredonda(num(r.total)),
      itens: r._count.items,
      createdAt: r.createdAt,
    })),
  };
}

// ---- Financeiro: fluxo de caixa, contas e centros de custo ----

export async function financeiro(companyId: string, dias = 30) {
  const desde = new Date(hoje().getTime() - (dias - 1) * 24 * 60 * 60 * 1000);
  const [lancamentos, aReceber, aPagar, vencidas, porCategoria] = await Promise.all([
    prisma.financeEntry.findMany({
      where: { companyId, status: "PAID", dueDate: { gte: desde, lte: new Date() } },
      orderBy: { dueDate: "asc" },
      select: { dueDate: true, type: true, amount: true },
    }),
    prisma.financeEntry.findMany({
      where: { companyId, type: "INCOME", status: "PENDING" },
      orderBy: { dueDate: "asc" },
      take: 30,
      select: { id: true, description: true, amount: true, dueDate: true, client: { select: { name: true } } },
    }),
    prisma.financeEntry.findMany({
      where: { companyId, type: "EXPENSE", status: "PENDING" },
      orderBy: { dueDate: "asc" },
      take: 30,
      select: { id: true, description: true, amount: true, dueDate: true, supplier: { select: { name: true } } },
    }),
    prisma.financeEntry.groupBy({
      by: ["status", "type"],
      where: { companyId, status: "PENDING", dueDate: { lt: hoje() } },
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.financeEntry.groupBy({
      by: ["categoryId", "type"],
      where: { companyId, status: { not: "CANCELLED" } },
      _count: { _all: true },
      _sum: { amount: true },
    }),
  ]);

  const categorias = await prisma.financeCategory.findMany({ where: { companyId }, select: { id: true, name: true, type: true } });
  const nomes = new Map(categorias.map((c) => [c.id, c.name]));

  const fluxo: { dia: string; entradas: number; saidas: number; saldo: number }[] = [];
  const indice = new Map<string, number>();
  for (let i = 0; i < dias; i++) {
    const dia = new Date(desde.getTime() + i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    indice.set(dia, fluxo.length);
    fluxo.push({ dia, entradas: 0, saidas: 0, saldo: 0 });
  }
  for (const l of lancamentos) {
    const chave = l.dueDate.toISOString().slice(0, 10);
    const idx = indice.get(chave);
    const balde = idx === undefined ? undefined : fluxo[idx];
    if (!balde) continue;
    if (l.type === "INCOME") balde.entradas = arredonda(balde.entradas + num(l.amount));
    else balde.saidas = arredonda(balde.saidas + num(l.amount));
  }
  let corrido = 0;
  for (const dia of fluxo) {
    corrido = arredonda(corrido + dia.entradas - dia.saidas);
    dia.saldo = corrido;
  }

  const despesaTotal = porCategoria
    .filter((c) => c.type === "EXPENSE")
    .reduce((s, c) => s + num(c._sum.amount), 0);
  const receitaTotal = porCategoria
    .filter((c) => c.type === "INCOME")
    .reduce((s, c) => s + num(c._sum.amount), 0);

  return {
    janelaDias: dias,
    fluxo,
    resumo: {
      entradas: arredonda(fluxo.reduce((s, d) => s + d.entradas, 0)),
      saidas: arredonda(fluxo.reduce((s, d) => s + d.saidas, 0)),
      saldo: corrido,
    },
    aReceber: aReceber.map((e) => ({
      id: e.id, descricao: e.description, valor: arredonda(num(e.amount)),
      vencimento: e.dueDate, cliente: e.client?.name ?? "—", atrasada: e.dueDate < hoje(),
    })),
    aPagar: aPagar.map((e) => ({
      id: e.id, descricao: e.description, valor: arredonda(num(e.amount)),
      vencimento: e.dueDate, fornecedor: e.supplier?.name ?? "—", atrasada: e.dueDate < hoje(),
    })),
    vencidas: vencidas.map((v) => ({
      tipo: v.type, quantidade: v._count._all, valor: arredonda(num(v._sum.amount)),
    })),
    centros: porCategoria
      .map((c) => ({
        id: c.categoryId ?? "sem-categoria",
        nome: c.categoryId ? nomes.get(c.categoryId) ?? "Categoria removida" : "Sem categoria",
        tipo: c.type,
        quantidade: c._count._all,
        valor: arredonda(num(c._sum.amount)),
        participacao: c.type === "EXPENSE"
          ? (despesaTotal ? Math.round((num(c._sum.amount) / despesaTotal) * 100) : 0)
          : (receitaTotal ? Math.round((num(c._sum.amount) / receitaTotal) * 100) : 0),
      }))
      .sort((a, b) => b.valor - a.valor),
  };
}

// ---- CRM: origem dos leads e tempo de atendimento ----

export async function crm(companyId: string) {
  const [porOrigem, porStatus, fechados] = await Promise.all([
    prisma.lead.groupBy({
      by: ["source"],
      where: { companyId },
      _count: { _all: true },
      _sum: { value: true },
    }),
    prisma.lead.groupBy({ by: ["status"], where: { companyId }, _count: { _all: true }, _sum: { value: true } }),
    prisma.lead.findMany({
      where: { companyId, status: { in: ["WON", "LOST"] } },
      select: { status: true, createdAt: true, updatedAt: true },
      take: 500,
    }),
  ]);

  const diasFechamento = fechados.map((f) => (f.updatedAt.getTime() - f.createdAt.getTime()) / (24 * 60 * 60 * 1000));
  const totalLeads = porStatus.reduce((s, p) => s + p._count._all, 0);

  return {
    total: totalLeads,
    origem: porOrigem
      .map((o) => ({
        origem: o.source?.trim() ? o.source : "Não informado",
        quantidade: o._count._all,
        valor: arredonda(num(o._sum.value)),
        participacao: totalLeads ? Math.round((o._count._all / totalLeads) * 100) : 0,
      }))
      .sort((a, b) => b.quantidade - a.quantidade),
    status: porStatus.map((s) => ({
      status: s.status,
      quantidade: s._count._all,
      valor: arredonda(num(s._sum.value)),
      participacao: totalLeads ? Math.round((s._count._all / totalLeads) * 100) : 0,
    })),
    diasMediosFechamento: diasFechamento.length
      ? Math.round(diasFechamento.reduce((a, b) => a + b, 0) / diasFechamento.length)
      : null,
  };
}
