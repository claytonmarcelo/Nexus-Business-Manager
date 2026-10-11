import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import {
  centavos,
  mediaPorUnidade,
  moedaDeCentavos,
  porcentagem,
  somarCentavos,
  variacaoPercentual,
} from "../../lib/money";
import {
  calendarioDaEmpresa,
  diasAtrasNoCalendario,
  diaDeCalendario,
  diaNoFuso,
  isValidoFuso,
  meiaNoiteDoDia,
  meiaNoiteNoFuso,
  mesNoFuso,
} from "../../lib/time";

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

// Fase 3d da auditoria: dinheiro NÃO passa mais por aqui. `arredonda` ficou só
// com as MEDIDAS (estoque em DECIMAL(12,3), quantidade movimentada) e com as
// razões de contagem (conversão do funil), que não são valor. O que é dinheiro
// soma em centavo através de `lib/money.ts` e só vira número de duas casas na
// linha do `return`: painel após painel aqui acumulava doubles em `reduce` e
// confiava no round do fim para esconder a poeira — 2026 lançamentos de R$ 0,10
// chegavam a 202,5999999999927752, com a etiqueta salva pelo `arredonda` e a
// divisão (ticket, participação, curva ABC) envenenada pelo número torto.
function arredonda(v: number): number {
  return Math.round(v * 100) / 100;
}

// Fase 3c da auditoria: os recortes de tempo vivem no fuso da empresa, não no
// relógio do servidor. Antes, `mesCorrente()` era mês no UTC e `hoje()` era dia
// no UTC — para America/Sao_Paulo, depois das 21h a venda do dia corrente já
// caía fora do "mês" agregado, e o dia de "vencidas"/"próximos 7 dias" virava
// outro. As bordas abaixo são instantes UTC exatos da meia-noite local, então
// a query continua sendo BETWEEN em createdAt (índice e histórico intactos) e
// quem se move é só a fronteira do dia.

export interface RecortesDaEmpresa {
  /** IANA do cadastro; fuso quebrado vira UTC em vez de derrubar o painel. */
  fuso: string;
  atual: Periodo;
  anterior: Periodo;
  /** Meia-noite de hoje na empresa — o "dia corrente" das colunas DATETIME. */
  hojeDia: Date;
  /** Hoje da empresa como dia de calendário — a borda das colunas `@db.Date`. */
  hojeCalendario: Date;
}

export async function recortesDaEmpresa(companyId: string, base?: Date): Promise<RecortesDaEmpresa> {
  const empresa = await prisma.company.findUnique({
    where: { id: companyId },
    select: { timezone: true },
  });
  const fuso = isValidoFuso(empresa?.timezone ?? "") ? (empresa?.timezone as string) : "UTC";
  const agora = base ?? new Date();
  const hojeDia = meiaNoiteNoFuso(fuso, agora);
  const hojeCalendario = calendarioDaEmpresa(fuso, agora);
  const rotuloHoje = diaNoFuso(fuso, agora);
  // As bordas do mês saem do calendário da empresa (mês 1-based, com virada
  // natural em janeiro e dezembro) e cada uma é convertida para o instante da
  // sua própria meia-noite local: `de`/`ate` continuam BETWEEN em createdAt,
  // só que agora cortam o dia onde a empresa o corta.
  const [an, me] = [Number(rotuloHoje.slice(0, 4)), Number(rotuloHoje.slice(5, 7))];
  const primeiroDia = (meses: number) => meiaNoiteDoDia(fuso, an, me + meses, 1);
  const de = primeiroDia(0);
  const virada = primeiroDia(1);
  const anteriorDe = primeiroDia(-1);
  return {
    fuso,
    atual: { de, ate: virada },
    anterior: { de: anteriorDe, ate: de },
    hojeDia,
    hojeCalendario,
  };
}

// Meta nominal do mês, cadastrada em Configurações da empresa. Sem alvo definido
// a função devolve null: o Dashboard não inventa percentual sobre nada.
// Fase 3d: a conta do "quanto falta" e do "ritmo por dia" é em centavo — o alvo
// e a receita do mês chegam inteiros, e o número de duas casas só aparece na
// resposta. O percentual da meta é o caso mais visível: antes era a divisão de
// dois doubles que o `Math.round` do fim tinha que adivinhar; agora 88% são
// 352/400 contados em centavo.
function metaDeReceita(
  alvo: Prisma.Decimal | null | undefined,
  receitaCentavos: number,
  mes: Periodo,
  hojeDia: Date,
) {
  const alvoCentavos = centavos(alvo);
  if (alvoCentavos <= 0) return null;
  const faltandoCentavos = Math.max(0, alvoCentavos - receitaCentavos);
  const diasRestantes = Math.max(1, Math.ceil((mes.ate.getTime() - hojeDia.getTime()) / 86_400_000));
  return {
    alvo: moedaDeCentavos(alvoCentavos),
    atingido: porcentagem(receitaCentavos, alvoCentavos),
    faltando: moedaDeCentavos(faltandoCentavos),
    diasRestantes,
    ritmoDiario: faltandoCentavos === 0 ? 0 : mediaPorUnidade(faltandoCentavos, diasRestantes),
  };
}

// ---- Visão geral + alertas (Dashboard) ----

export async function overview(companyId: string) {
  const recorte = await recortesDaEmpresa(companyId);
  const { atual, anterior, fuso, hojeDia, hojeCalendario } = recorte;
  // A janela "próximos 7 dias" é a mesma de antes em dias, mas medida da meia-
  // noite da empresa até a virada depois de amanhã dela — 7 * 86.400.000 ms é
  // o que o dia tem quando não há transição; no dia do horário de verão o
  // recorte no instante da meia-noite é o que mantém a conta honesta.
  const emSeteDias = new Date(hojeDia.getTime() + 7 * 24 * 60 * 60 * 1000);
  // "Há mais de 30 dias" é medido da meia-noite de hoje para trás: um cliente
  // cadastrado ontem à noite não pode contar como inativo de 31 dias.
  const aTrintaDias = new Date(hojeDia.getTime() - 30 * 24 * 60 * 60 * 1000);

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
      // Vencida é conta cujo DIA passou: a coluna é `@db.Date`, então a borda é
      // o calendário da empresa, não a meia-noite local — com esta última uma
      // conta de hoje gravada à meia-noite UTC contaria como atrasada.
      where: { companyId, status: "PENDING", dueDate: { lt: hojeCalendario } },
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
        createdAt: { lt: aTrintaDias },
        sales: { none: {} },
      },
    }),
    // O alvo do mês mora na empresa (Configurações > Empresa); o fuso ela já
    // veio em recortesDaEmpresa, então aqui só se pede a meta.
    prisma.company.findUnique({ where: { id: companyId }, select: { revenueTarget: true } }),
  ]);

  const criticos = produtosBaixos.filter((p) => num(p.stockQuantity) <= 0);
  const alerta = produtosBaixos.filter((p) => num(p.stockQuantity) > 0 && num(p.stockQuantity) < num(p.minStock));

  // A soma do mês vem do banco (`_sum.total` em DECIMAL) e virou centavo assim
  // que chegou aqui: a partir deste ponto a conta é inteira até a resposta.
  const receitaAtual = centavos(vendasAtual._sum.total);
  const receitaAnterior = centavos(vendasAnterior._sum.total);
  const variacao = variacaoPercentual(receitaAtual, receitaAnterior);

  const meta = metaDeReceita(empresaMeta?.revenueTarget, receitaAtual, atual, hojeDia);

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
      texto: "Há " + moedaDeCentavos(centavos(atrasadas._sum.amount)) + " em contas vencidas não resolvidas",
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
    // A etiqueta do período é o mês da empresa: no UTC ele vira antes da virada
    // local, e o painel mostraria "11" com o mês de dentro ainda em "10".
    periodo: mesNoFuso(fuso),
    vendas: {
      receita: moedaDeCentavos(receitaAtual),
      pedidos: vendasAtual._count._all,
      ticket: mediaPorUnidade(receitaAtual, vendasAtual._count._all),
      receitaAnterior: moedaDeCentavos(receitaAnterior),
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
      aReceber: moedaDeCentavos(centavos(receber._sum.amount)),
      aReceberQtd: receber._count._all,
      aPagar: moedaDeCentavos(centavos(pagar._sum.amount)),
      aPagarQtd: pagar._count._all,
      vencido: moedaDeCentavos(centavos(atrasadas._sum.amount)),
      vencidoQtd: atrasadas._count._all,
    },
    crm: {
      abertos: leadsAbertos,
      ganhos: leadsGanhos,
      perdidos: leadsPerdidos,
      valorNoFunil: moedaDeCentavos(centavos(valorFunil._sum.value)),
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
  const recorte = await recortesDaEmpresa(companyId);
  const mes = recorte.atual;
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

  // Fase 3d: o faturamento por cliente chega somado pelo banco (`_sum.total`) e
  // atravessa a curva ABC em centavo inteiro. Antes a curva somava doubles
  // arredondados a cada cliente, e a fronteira entre A e B (80%) dependia de
  // quanto o arredondamento tinha empurrado para cima ou para baixo.
  const compras = new Map(porCliente.map((p) => [p.clientId as string, p]));
  const comValor = porCliente
    .map((p) => ({ id: p.clientId as string, centavos: centavos(p._sum.total), pedidos: p._count._all }))
    .sort((a, b) => b.centavos - a.centavos);

  const faturamentoCentavos = comValor.reduce((soma, c) => soma + c.centavos, 0);
  let acumulado = 0;
  const curva = new Map<string, "A" | "B" | "C">();
  for (const c of comValor) {
    acumulado += c.centavos;
    const participacao = faturamentoCentavos > 0 ? acumulado / faturamentoCentavos : 1;
    curva.set(c.id, participacao <= 0.8 ? "A" : participacao <= 0.95 ? "B" : "C");
  }

  const hojeDia = recorte.hojeDia;
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
    const centavosDoNivel = ids.reduce((soma, id) => soma + centavos(compras.get(id)?._sum.total ?? null), 0);
    return { nivel, clientes: clientes2, faturamento: moedaDeCentavos(centavosDoNivel) };
  });
  const semCompras = cadastro.filter((c) => !compras.has(c.id)).length;
  segmentos.push({ nivel: "D", clientes: semCompras, faturamento: 0 });

  const top = comValor.slice(0, 50).map((c) => {
    const cliente = cadastro.find((k) => k.id === c.id);
    return {
      id: c.id,
      nome: cliente?.name ?? "Cliente removido",
      pedidos: c.pedidos,
      faturamento: moedaDeCentavos(c.centavos),
      ultimaCompra: compras.get(c.id)?._max.createdAt ?? null,
      ativo: Boolean(cliente?.active),
    };
  });

  return {
    total,
    ativos,
    inativos: total - ativos,
    novosNoMes,
    faturamentoTotal: moedaDeCentavos(faturamentoCentavos),
    ticketMedio: mediaPorUnidade(
      faturamentoCentavos,
      porCliente.reduce((s, p) => s + p._count._all, 0),
    ),
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
        valorVendaMedio: mediaPorUnidade(centavos(dado?._sum.salePrice ?? null), quantidade),
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
  const recorte = await recortesDaEmpresa(companyId);
  const padrao = recorte.atual;
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

  // Fase 3d: cada balde acumula CENTAVOS e só vira valor de duas casas na saída.
  // Eram `+=` de double venda após venda; o `arredonda` no fim da fila quase
  // sempre consertava a etiqueta, mas quem recebia o número acumulado era a
  // divisão do ticket médio e a comparação de participação — e elas não têm round
  // próprio para se esconder.
  const porDia = new Map<string, { dia: string; receita: number; pedidos: number }>();
  for (const v of vendas) {
    if (v.status === "CANCELLED") continue;
    const chave = diaNoFuso(recorte.fuso, v.createdAt);
    const atual = porDia.get(chave) ?? { dia: chave, receita: 0, pedidos: 0 };
    atual.receita += centavos(v.total);
    atual.pedidos += 1;
    porDia.set(chave, atual);
  }

  const porProduto = new Map<string, { nome: string; quantidade: number; receita: number }>();
  for (const i of itens) {
    const nome = i.product.name;
    const atual = porProduto.get(nome) ?? { nome, quantidade: 0, receita: 0 };
    // A quantidade é medida (DECIMAL(12,3)), não dinheiro: fica em `arredonda`.
    atual.quantidade = arredonda(atual.quantidade + num(i.quantity));
    atual.receita += centavos(i.lineTotal);
    porProduto.set(nome, atual);
  }

  const porCliente = new Map<string, { nome: string; pedidos: number; receita: number }>();
  for (const v of vendas) {
    if (v.status === "CANCELLED" || !v.client) continue;
    const atual = porCliente.get(v.client.name) ?? { nome: v.client.name, pedidos: 0, receita: 0 };
    atual.pedidos += 1;
    atual.receita += centavos(v.total);
    porCliente.set(v.client.name, atual);
  }

  const porVendedor = new Map<string, { nome: string; pedidos: number; receita: number }>();
  for (const v of vendedores) {
    if (v.status === "CANCELLED") continue;
    const nome = v.user?.name ?? "Sem vínculo";
    const atual = porVendedor.get(nome) ?? { nome, pedidos: 0, receita: 0 };
    atual.pedidos += 1;
    atual.receita += centavos(v.total);
    porVendedor.set(nome, atual);
  }

  const efetivas = vendas.filter((v) => v.status !== "CANCELLED");
  const receitaCentavos = somarCentavos(efetivas.map((v) => v.total));

  const etiquetas: Record<string, string> = { PENDING: "Pendentes", CONFIRMED: "Confirmadas", CANCELLED: "Canceladas" };

  return {
    // As etiquetas dos extremos são lidas no fuso da empresa — a série de cima
    // é agrupada lá, e uma capa UTC nas pontas deixaria o primeiro e o último
    // dia da tela com nomes que nenhum balde da lista tem.
    de: diaNoFuso(recorte.fuso, gte),
    ate: diaNoFuso(recorte.fuso, new Date(lte.getTime() - 1)),
    receita: moedaDeCentavos(receitaCentavos),
    pedidos: efetivas.length,
    ticket: mediaPorUnidade(receitaCentavos, efetivas.length),
    canceladas: vendas.filter((v) => v.status === "CANCELLED").length,
    porStatus: porStatus.map((s) => ({
      status: s.status,
      rotulo: etiquetas[s.status] ?? s.status,
      quantidade: s._count._all,
      receita: moedaDeCentavos(centavos(s._sum.total)),
    })),
    porDia: [...porDia.values()]
      .sort((a, b) => a.dia.localeCompare(b.dia))
      .map((d) => ({ ...d, receita: moedaDeCentavos(d.receita) })),
    topProdutos: [...porProduto.values()]
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 8)
      .map((p) => ({ ...p, receita: moedaDeCentavos(p.receita) })),
    topClientes: [...porCliente.values()]
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 8)
      .map((c) => ({ ...c, receita: moedaDeCentavos(c.receita) })),
    porVendedor: [...porVendedor.values()]
      .sort((a, b) => b.receita - a.receita)
      .map((v) => ({ ...v, receita: moedaDeCentavos(v.receita) })),
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
  const gastoCentavos = centavos(total._sum.total);

  const etiquetas: Record<string, string> = { DRAFT: "Em cotação", RECEIVED: "Recebidas", CANCELLED: "Canceladas" };

  return {
    gasto: moedaDeCentavos(gastoCentavos),
    pedidos: total._count._all,
    ticket: mediaPorUnidade(gastoCentavos, total._count._all),
    fornecedoresAtivos: fornecedores.filter((f) => f.active).length,
    fornecedoresCadastrados: fornecedores.length,
    porStatus: porStatus.map((s) => ({
      status: s.status,
      rotulo: etiquetas[s.status] ?? s.status,
      quantidade: s._count._all,
      valor: moedaDeCentavos(centavos(s._sum.total)),
    })),
    topFornecedores: porFornecedor
      .map((f) => ({
        id: f.supplierId,
        nome: nomes.get(f.supplierId) ?? "Fornecedor removido",
        pedidos: f._count._all,
        valor: moedaDeCentavos(centavos(f._sum.total)),
        participacao: porcentagem(centavos(f._sum.total), gastoCentavos),
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8),
    cotacoes: rascunhos.map((r) => ({
      id: r.id,
      fornecedor: r.supplier.name,
      valor: moedaDeCentavos(centavos(r.total)),
      itens: r._count.items,
      createdAt: r.createdAt,
    })),
  };
}

// ---- Financeiro: fluxo de caixa, contas e centros de custo ----

export async function financeiro(companyId: string, dias = 30) {
  const recorte = await recortesDaEmpresa(companyId);
  // Fluxo de caixa é série de DIAS, e a coluna do banco é `@db.Date`: aqui
  // tudo andou no calendário da empresa — a janela abre `dias - 1` dias antes
  // do hoje dela, fecha no hoje dela, e os baldes se numeram somando dias ao
  // calendário. Nem a meia-noite local nem `diaNoFuso` entram numa conta de
  // data pura: um dos dois deslocaria a etiqueta de todo lançamento e o outro
  // duplicaria um dia nas transições de horário de verão.
  const hojeCalendario = recorte.hojeCalendario;
  const desde = diasAtrasNoCalendario(recorte.fuso, dias - 1);
  const [lancamentos, aReceber, aPagar, vencidas, porCategoria] = await Promise.all([
    prisma.financeEntry.findMany({
      where: { companyId, status: "PAID", dueDate: { gte: desde, lte: hojeCalendario } },
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
      where: { companyId, status: "PENDING", dueDate: { lt: hojeCalendario } },
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

  // Fase 3d: durante a montagem, os três campos de cada balde são CENTAVOS e o
  // saldo corrido é soma inteira. O código antigo somava doubles e passava por
  // `arredonda` em CADA adição e em CADA dia: um round a mais do que a conta
  // pedia, e com `entradas`, `saidas` e `saldo` morando na mesma estrutura —
  // quem lesse o balde depois do round não tinha como saber que ainda era
  // centavo exato, e era sobre esse número que a barra do gráfico se escalava.
  const fluxo: { dia: string; entradas: number; saidas: number; saldo: number }[] = [];
  const indice = new Map<string, number>();
  for (let i = 0; i < dias; i++) {
    // Do último dia para cá, e cada balde é numerado pelo próprio calendário:
    // somar 24h a um instante de meia-noite local repetiria um dia e pularia
    // outro no dia de transição de horário de verão, porque aquele dia tem 23
    // ou 25 horas — o calendário não tem.
    const dia = diaDeCalendario(new Date(hojeCalendario.getTime() - (dias - 1 - i) * 24 * 60 * 60 * 1000));
    indice.set(dia, fluxo.length);
    fluxo.push({ dia, entradas: 0, saidas: 0, saldo: 0 });
  }
  for (const l of lancamentos) {
    const chave = diaDeCalendario(l.dueDate);
    const idx = indice.get(chave);
    const balde = idx === undefined ? undefined : fluxo[idx];
    if (!balde) continue;
    if (l.type === "INCOME") balde.entradas += centavos(l.amount);
    else balde.saidas += centavos(l.amount);
  }
  let corrido = 0;
  for (const dia of fluxo) {
    corrido += dia.entradas - dia.saidas;
    dia.saldo = corrido;
  }

  const despesaCentavos = porCategoria
    .filter((c) => c.type === "EXPENSE")
    .reduce((s, c) => s + centavos(c._sum.amount), 0);
  const receitaCentavosDoPeriodo = porCategoria
    .filter((c) => c.type === "INCOME")
    .reduce((s, c) => s + centavos(c._sum.amount), 0);

  return {
    janelaDias: dias,
    fluxo: fluxo.map((d) => ({
      dia: d.dia,
      entradas: moedaDeCentavos(d.entradas),
      saidas: moedaDeCentavos(d.saidas),
      saldo: moedaDeCentavos(d.saldo),
    })),
    resumo: {
      entradas: moedaDeCentavos(fluxo.reduce((s, d) => s + d.entradas, 0)),
      saidas: moedaDeCentavos(fluxo.reduce((s, d) => s + d.saidas, 0)),
      saldo: moedaDeCentavos(corrido),
    },
    aReceber: aReceber.map((e) => ({
      id: e.id, descricao: e.description, valor: moedaDeCentavos(centavos(e.amount)),
      vencimento: e.dueDate, cliente: e.client?.name ?? "—", atrasada: e.dueDate < hojeCalendario,
    })),
    aPagar: aPagar.map((e) => ({
      id: e.id, descricao: e.description, valor: moedaDeCentavos(centavos(e.amount)),
      vencimento: e.dueDate, fornecedor: e.supplier?.name ?? "—", atrasada: e.dueDate < hojeCalendario,
    })),
    vencidas: vencidas.map((v) => ({
      tipo: v.type, quantidade: v._count._all, valor: moedaDeCentavos(centavos(v._sum.amount)),
    })),
    centros: porCategoria
      .map((c) => ({
        id: c.categoryId ?? "sem-categoria",
        nome: c.categoryId ? nomes.get(c.categoryId) ?? "Categoria removida" : "Sem categoria",
        tipo: c.type,
        quantidade: c._count._all,
        valor: moedaDeCentavos(centavos(c._sum.amount)),
        participacao: porcentagem(centavos(c._sum.amount), c.type === "EXPENSE" ? despesaCentavos : receitaCentavosDoPeriodo),
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
        valor: moedaDeCentavos(centavos(o._sum.value)),
        participacao: porcentagem(o._count._all, totalLeads),
      }))
      .sort((a, b) => b.quantidade - a.quantidade),
    status: porStatus.map((s) => ({
      status: s.status,
      quantidade: s._count._all,
      valor: moedaDeCentavos(centavos(s._sum.value)),
      participacao: porcentagem(s._count._all, totalLeads),
    })),
    diasMediosFechamento: diasFechamento.length
      ? Math.round(diasFechamento.reduce((a, b) => a + b, 0) / diasFechamento.length)
      : null,
  };
}
