import { Prisma } from "@prisma/client";
import type { Role, ServiceOrderItemKind, ServiceOrderPriority, ServiceOrderStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { badRequest, conflict, forbidden, notFound } from "../../lib/errors";
import { paginate, skipTake, type PaginationInput } from "../../lib/pagination";
import { audit } from "../../lib/audit";
import { can } from "../../lib/rbac";
import { baixarEstoque, permiteEstoqueNegativo, subirEstoque } from "../../lib/stock";
import { transacaoEstoque } from "../../lib/tx";
import { centavos, decimalDeCentavos, linhaDecimal, moedaDeCentavos, somarCentavos } from "../../lib/money";
import { fusoDaEmpresa, meiaNoiteDoDia, mesNoFuso } from "../../lib/time";
import type { CreateServiceOrderInput, UpdateServiceOrderInput } from "./service-orders.schemas";

// F3.2 Parte 1 — Ordens de Serviço: a casa única das regras do atendimento.
//
// O que a empresa que conserta ou instala precisava, e o produto não tinha: um
// papel que diga quem está com o quê, desde quando, com quais peças e o que foi
// feito. Existia a nota (Vendas) e existia o caixa (Financeiro); entre os dois
// não havia nada, e o que vivia no caderno do balcão só chegava ao estoque por
// acidente.
//
// As quatro decisões que mandam no resto do arquivo:
//
//  1. O estoque baixa na CONCLUSÃO, não na abertura. OS aberta é intenção;
//     baixa de estoque é fato. Adiantar a baixa seria a peça sair do sistema
//     antes de sair da prateleira — e o estorno, ao cancelar uma concluída, é o
//     único caminho de volta, registrado como movimentação `IN`.
//  2. A numeração é POR EMPRESA e nasce de `MAX + 1` com o índice único
//     `(company_id, number)` fechando a porta: quem chega primeiro trava a
//     faixa, o resto espera. A série não recomeça nunca e não repete nunca — é
//     o número que o cliente recebe como protocolo.
//  3. O dinheiro é do servidor (lib/money.ts). A tela mostra uma prévia; o que
//     entra no banco é a linha arredondada UMA vez na base 10 e o total somado
//     em centavo, com o desconto subtraído depois da soma.
//  4. O histórico é imutável. Cada mudança de estado grava de-para, quem e o por
//     quê; nada aqui apaga ou reescreve linha do tempo.
//
// O alcance do atendente (STAFF) também mora aqui, e não na tela: ele só mexe na
// OS atribuída a ele, só no andamento e nas anotações, e nunca cancela. A
// ausência de `service_order:write` na matriz é o corte dos campos de ESTRUTURA
// (cliente, título, prioridade, responsável, agendamento, desconto, itens); a
// regra fina do quem-pode-o-quê está nas funções abaixo.
//
// Toda escrita carrega `companyId` no where (Fase 1c): um id de outra empresa
// não existe nesta, e a resposta honesta para isso é 404.

/** Um item como chegou do formulário (depois do schema, com dinheiro em texto). */
type ItemEntrada = CreateServiceOrderInput["items"][number];

interface LinhaCalculada {
  kind: ServiceOrderItemKind;
  productId: string | null;
  description: string | null;
  quantity: number;
  unitPrice: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
}

interface PecaDoCadastro {
  id: string;
  name: string;
  unit: string;
  salePrice: Prisma.Decimal;
  stockQuantity: Prisma.Decimal;
  trackStock: boolean;
}

interface ItemCarregado {
  id: string;
  kind: ServiceOrderItemKind;
  productId: string | null;
  description: string | null;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
  product: { name: string } | null;
}

interface OrdemCarregada {
  id: string;
  number: number;
  status: ServiceOrderStatus;
  priority: ServiceOrderPriority;
  title: string;
  description: string | null;
  diagnosis: string | null;
  notes: string | null;
  scheduledAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  discount: Prisma.Decimal;
  total: Prisma.Decimal;
  clientId: string;
  assignedUserId: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  client: { name: string } | null;
  assignedUser: { name: string } | null;
  creator: { name: string } | null;
  items: ItemCarregado[];
}

/** O estado que vem depois de cada estado. O que não está aqui não existe. */
const CAMINHOS: Record<ServiceOrderStatus, ServiceOrderStatus[]> = {
  OPEN: ["IN_PROGRESS", "WAITING", "CANCELLED"],
  IN_PROGRESS: ["WAITING", "COMPLETED", "CANCELLED"],
  WAITING: ["IN_PROGRESS", "CANCELLED"],
  COMPLETED: ["CANCELLED"],
  CANCELLED: [],
};

/** Estados sem saída: daqui para frente a ordem é o registro do que aconteceu. */
const TERMINAIS: ServiceOrderStatus[] = ["COMPLETED", "CANCELLED"];

/**
 * Quem pode estornar (devolver peça ao estoque) e quem pode cancelar.
 *
 * Cancelar uma OS VIVA é operação de rotina: o serviço não aconteceu, nada
 * baixou, nada estorna. Cancelar uma CONCLUÍDA é outra coisa — é dizer que o que
 * aconteceu não aconteceu, e isso mexe no saldo. Por isso o estorno fica com
 * OWNER e ADMIN: o MANAGER conclui, mas não desfaz a conclusão de ninguém, e o
 * STAFF não cancela em estado nenhum.
 */
function podeEstornar(role: Role): boolean {
  return role === "OWNER" || role === "ADMIN";
}

// A conversão para número só acontece na borda da resposta JSON (Fase 3d).
const num = (v: Prisma.Decimal) => Number(v);

const INCLUIR = {
  client: { select: { name: true } },
  assignedUser: { select: { name: true } },
  creator: { select: { name: true } },
  // `lineNumber` é a ordem que o operador digitou: sem ela o banco devolve as
  // linhas pela ordem do uuid, e o documento — impresso inclusive — sai
  // embaralhado.
  items: { orderBy: { lineNumber: "asc" }, include: { product: { select: { name: true } } } },
} satisfies Prisma.ServiceOrderInclude;

const INCLUIR_COM_HISTORICO = {
  ...INCLUIR,
  history: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
} satisfies Prisma.ServiceOrderInclude;

function serialize(o: OrdemCarregada) {
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    priority: o.priority,
    title: o.title,
    description: o.description,
    diagnosis: o.diagnosis,
    notes: o.notes,
    scheduledAt: o.scheduledAt,
    startedAt: o.startedAt,
    completedAt: o.completedAt,
    discount: num(o.discount),
    total: num(o.total),
    clientId: o.clientId,
    clientName: o.client?.name ?? null,
    assignedUserId: o.assignedUserId,
    assignedUserName: o.assignedUser?.name ?? null,
    createdByName: o.creator?.name ?? null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    items: o.items.map((i) => ({
      id: i.id,
      kind: i.kind,
      productId: i.productId,
      productName: i.product?.name ?? null,
      description: i.description,
      quantity: num(i.quantity),
      unitPrice: num(i.unitPrice),
      lineTotal: num(i.lineTotal),
    })),
  };
}

// ---- A conta da ordem ----

/**
 * As peças que a ordem pede, todas do cadastro DESTA empresa. A checagem é por
 * CONJUNTO (id pedido contra id achado): uma peça da empresa vizinha tem uuid
 * válido, existe no banco, e não pode entrar nesta ordem.
 */
async function carregarPecas(companyId: string, itens: ItemEntrada[]): Promise<Map<string, PecaDoCadastro>> {
  const pedidos: string[] = [];
  for (const i of itens) {
    if (i.kind === "PART" && i.productId) pedidos.push(i.productId);
  }
  const ids = [...new Set(pedidos)];
  if (ids.length === 0) return new Map<string, PecaDoCadastro>();
  const encontradas = await prisma.product.findMany({
    where: { id: { in: ids }, companyId, active: true },
    select: { id: true, name: true, unit: true, salePrice: true, stockQuantity: true, trackStock: true },
  });
  const porId = new Map(encontradas.map((p) => [p.id, p]));
  if (porId.size !== ids.length) throw badRequest("Uma das peças não pertence a esta empresa ou está inativa");
  return porId;
}

/**
 * Preço e total de cada linha. A peça sem preço informado sai pelo preço de
 * tabela do produto; a linha é `quantidade × preço` arredondada UMA vez na base
 * 10 (`linhaDecimal`), e o total da ordem é a soma dos CENTAVOS dessas linhas.
 */
function calcularLinhas(itens: ItemEntrada[], pecas: Map<string, PecaDoCadastro>): LinhaCalculada[] {
  return itens.map((i) => {
    if (i.kind === "PART") {
      const peca = i.productId ? pecas.get(i.productId) : undefined;
      if (!peca) throw badRequest("Uma das peças não pertence a esta empresa ou está inativa");
      const preco =
        i.unitPrice === undefined
          ? new Prisma.Decimal(peca.salePrice).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
          : new Prisma.Decimal(i.unitPrice);
      return {
        kind: "PART" as const,
        productId: peca.id,
        description: i.description ?? null,
        quantity: i.quantity,
        unitPrice: preco,
        lineTotal: linhaDecimal(i.quantity, preco),
      };
    }
    const preco = new Prisma.Decimal(i.unitPrice ?? "0");
    return {
      kind: "SERVICE" as const,
      productId: null,
      description: i.description ?? null,
      quantity: i.quantity,
      unitPrice: preco,
      lineTotal: linhaDecimal(i.quantity, preco),
    };
  });
}

/** Soma das linhas em centavo, menos o desconto — que nunca passa da soma. */
function totalEmCentavos(linhas: LinhaCalculada[], discount: Prisma.Decimal | string | number): number {
  const soma = somarCentavos(linhas.map((l) => l.lineTotal));
  const desconto = centavos(discount);
  if (desconto > soma) {
    throw badRequest(
      `O desconto (${moedaDeCentavos(desconto)}) não pode superar a soma das linhas da ordem (${moedaDeCentavos(soma)})`,
    );
  }
  return soma - desconto;
}

/**
 * Quanto de cada peça a ordem consome. Linhas repetidas do mesmo produto SOMAM
 * antes de qualquer conta de saldo: é uma saída só por produto, e o que o
 * operador escreveu em duas linhas é a mesma peça contada uma vez. A soma é em
 * `Decimal` porque 0,333 + 0,333 em vírgula flutuante não é 0,666 — e o saldo do
 * produto é exatamente 0,666.
 */
function consumoPorPeca(
  linhas: { kind: string; productId: string | null; quantity: Prisma.Decimal | number | string }[],
): Map<string, Prisma.Decimal> {
  const consumo = new Map<string, Prisma.Decimal>();
  for (const l of linhas) {
    if (l.kind !== "PART" || !l.productId) continue;
    const anterior = consumo.get(l.productId) ?? new Prisma.Decimal(0);
    consumo.set(l.productId, anterior.plus(l.quantity));
  }
  return consumo;
}

// ---- Cliente e responsável: sempre desta empresa ----

async function conferirCliente(companyId: string, clientId: string): Promise<void> {
  const cliente = await prisma.client.findFirst({ where: { id: clientId, companyId, active: true }, select: { id: true } });
  if (!cliente) throw badRequest("Cliente inválido para esta empresa");
}

/**
 * O responsável precisa ser MEMBRO ATIVO desta empresa. Um uuid de usuário que
 * existe — mas é de outra empresa, ou foi desligado desta — não pode receber uma
 * OS: ela nasceria invisível para quem deveria executá-la.
 */
async function conferirResponsavel(companyId: string, userId: string | null): Promise<void> {
  if (!userId) return;
  const vinculo = await prisma.companyUser.findFirst({
    where: { userId, companyId, user: { active: true } },
    select: { userId: true },
  });
  if (!vinculo) throw badRequest("O responsável precisa ser um membro ativo desta empresa");
}

// ---- Criar ----

interface CamposIniciais {
  clientId: string;
  assignedUserId: string | null;
  priority: ServiceOrderPriority;
  title: string;
  description: string | null;
  diagnosis: string | null;
  notes: string | null;
  scheduledAt: Date | null;
  discount: Prisma.Decimal;
  total: Prisma.Decimal;
}

const TENTATIVAS_DE_NUMERO = 5;

/**
 * Cria a ordem com o próximo número da série da empresa.
 *
 * A série de uma empresa é uma fila, e a fila é a linha da empresa: o primeiro
 * `SELECT ... FOR UPDATE` pega o X lock em `companies`, e só então o próximo
 * número é lido. A segunda transação espera o commit da primeira em vez de ler
 * o mesmo último número.
 *
 * Já `MAX(number) ... FOR UPDATE` direto na tabela fechava essa janela na
 * teoria, mas travava um INTERVALO do índice `(company_id, number)`: dez
 * requisições viravam dez esperas cruzadas, e o InnoDB escolhia uma vítima de
 * deadlock por rodada — que subia como 500. O lock no pai não deixa intervalo
 * para dois escritores brigarem: uma fila por empresa, e o deadlock desaparece.
 *
 * Se ainda assim duas chegarem ao mesmo INSERT, o índice único `(company_id,
 * number)` recusa a segunda com chave duplicada — e o retry é da TRANSAÇÃO
 * INTEIRA, porque uma P2002 desfaz tudo o que ela fez (repetir só o INSERT
 * nasceria com um histórico órfão). É assim que dez criações simultâneas viram
 * 1..10, cada uma com a sua linha do tempo.
 */
async function criarComNumero(
  companyId: string,
  campos: CamposIniciais,
  linhas: LinhaCalculada[],
  userId: string,
): Promise<{ id: string; number: number }> {
  for (let tentativa = 1; ; tentativa++) {
    try {
      return await transacaoEstoque(async (tx) => {
        // A fila da numeração: o X lock na linha da empresa entra antes de
        // qualquer leitura, e é ele — não um lock de índice — que põe as
        // criações de uma mesma empresa em ordem de chegada.
        const empresa = await tx.$queryRaw<Array<{ id: string }>>(
          Prisma.sql`SELECT id FROM companies WHERE id = ${companyId} FOR UPDATE`,
        );
        if (empresa.length === 0) throw notFound("Empresa não encontrada");
        // Leitura simples, e não `FOR UPDATE`: quem garante o "um de cada vez"
        // é a trava da empresa, tomada logo acima nesta mesma transação.
        const medido = await tx.$queryRaw<Array<{ ultimo: unknown }>>(
          Prisma.sql`SELECT COALESCE(MAX(number), 0) AS ultimo FROM service_orders WHERE company_id = ${companyId}`,
        );
        const numero = Number(medido[0]?.ultimo ?? 0) + 1;
        return tx.serviceOrder.create({
          data: {
            ...campos,
            companyId,
            createdBy: userId,
            status: "OPEN",
            number: numero,
            items: {
              create: linhas.map((l, indice) => ({
                lineNumber: indice + 1,
                kind: l.kind,
                productId: l.productId,
                description: l.description,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
                lineTotal: l.lineTotal,
              })),
            },
            history: { create: [{ toStatus: "OPEN", userId }] },
          },
          select: { id: true, number: true },
        });
      });
    } catch (e) {
      const duplicado = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
      if (!duplicado || tentativa >= TENTATIVAS_DE_NUMERO) throw e;
    }
  }
}

export async function createServiceOrder(
  companyId: string,
  input: CreateServiceOrderInput,
  ator: { userId: string; role: Role },
  ip: string,
) {
  await conferirCliente(companyId, input.clientId);
  await conferirResponsavel(companyId, input.assignedUserId ?? null);

  const itens: ItemEntrada[] = input.items;
  const pecas = await carregarPecas(companyId, itens);
  const linhas = calcularLinhas(itens, pecas);
  const totalCentavos = totalEmCentavos(linhas, input.discount);

  const ordem = await criarComNumero(
    companyId,
    {
      clientId: input.clientId,
      assignedUserId: input.assignedUserId ?? null,
      priority: input.priority,
      title: input.title,
      description: input.description ?? null,
      diagnosis: input.diagnosis ?? null,
      notes: input.notes ?? null,
      scheduledAt: input.scheduledAt ?? null,
      discount: new Prisma.Decimal(input.discount),
      total: decimalDeCentavos(totalCentavos),
    },
    linhas,
    ator.userId,
  );

  await audit({
    userId: ator.userId,
    companyId,
    action: "service_order.create",
    entity: "service_order",
    entityId: ordem.id,
    ip,
    metadata: {
      number: ordem.number,
      total: moedaDeCentavos(totalCentavos),
      itens: linhas.length,
      pecas: linhas.filter((l) => l.kind === "PART").length,
    },
  });

  return getServiceOrder(companyId, ordem.id);
}

// ---- Ler ----

export interface FiltroOrdens {
  search?: string;
  status?: ServiceOrderStatus;
  priority?: ServiceOrderPriority;
  assignedUserId?: string;
  from?: string;
  to?: string;
  sort?: "number" | "createdAt" | "priority" | "total";
}

/** AAAA-MM-DD do formulário convertido na borda de instante do fuso da empresa. */
function bordaDoDia(timeZone: string, rotulo: string, virarOProssimo: boolean): Date {
  const partes = rotulo.split("-").map(Number);
  const ano = partes[0] ?? 1970;
  const mes = partes[1] ?? 1;
  const dia = partes[2] ?? 1;
  // `dia + 1` é o começo do dia seguinte: a janela `[from, to]` fecha o dia `to`
  // por completo, horas inclusive, sem depender de `lte` com 23:59:59,999.
  return meiaNoiteDoDia(timeZone, ano, mes, virarOProssimo ? dia + 1 : dia);
}

/**
 * Lista com busca, filtros e a janela de dias DA EMPRESA.
 *
 * `from`/`to` são datas de calendário, e a borda que as converte em instante é a
 * meia-noite do fuso cadastrado (lib/time.ts) — nunca o `new Date(texto)` do
 * processo, que deslocaria a janela três horas e deixaria a última noite do dia
 * de fora. A busca por texto casa número, cliente e título: quem está no balcão
 * tem o protocolo na mão OU o nome do cliente, quase nunca os dois.
 */
export async function listServiceOrders(companyId: string, p: PaginationInput, f: FiltroOrdens) {
  const where: Prisma.ServiceOrderWhereInput = {
    companyId,
    ...(f.status ? { status: f.status } : {}),
    ...(f.priority ? { priority: f.priority } : {}),
    ...(f.assignedUserId ? { assignedUserId: f.assignedUserId } : {}),
  };

  if (f.search) {
    const numero = /^\d+$/.test(f.search) ? Number(f.search) : null;
    where.OR = [
      { client: { name: { contains: f.search } } },
      { title: { contains: f.search } },
      ...(numero === null ? [] : [{ number: numero }]),
    ];
  }

  if (f.from || f.to) {
    const fuso = await fusoDaEmpresa(companyId);
    where.createdAt = {
      ...(f.from ? { gte: bordaDoDia(fuso, f.from, false) } : {}),
      ...(f.to ? { lt: bordaDoDia(fuso, f.to, true) } : {}),
    };
  }

  const orderBy: Prisma.ServiceOrderOrderByWithRelationInput =
    f.sort === "number"
      ? { number: "asc" }
      : f.sort === "priority"
        ? { priority: "desc" }
        : f.sort === "total"
          ? { total: "desc" }
          : { createdAt: "desc" };

  const [rows, total] = await Promise.all([
    prisma.serviceOrder.findMany({ where, orderBy, ...skipTake(p), include: INCLUIR }),
    prisma.serviceOrder.count({ where }),
  ]);
  return paginate(rows.map(serialize), total, p);
}

export async function getServiceOrder(companyId: string, id: string) {
  const ordem = await prisma.serviceOrder.findFirst({
    where: { id, companyId },
    include: INCLUIR_COM_HISTORICO,
  });
  if (!ordem) throw notFound("Ordem de serviço não encontrada");
  return {
    ...serialize(ordem),
    history: ordem.history.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      note: h.note,
      userName: h.user?.name ?? null,
      createdAt: h.createdAt,
    })),
  };
}

/**
 * O resumo das cores do painel. As contagens são do ACERVO (quantas ordens
 * existem em cada estado), e a janela do mês é a da EMPRESA: `completedAt` é
 * coluna DATETIME, então a borda é a meia-noite local do primeiro dia do mês
 * dela, não o `AAAA-MM-01T00:00:00Z` do servidor (Fase 3c).
 */
export async function summary(companyId: string) {
  const fuso = await fusoDaEmpresa(companyId);
  const [ano, mes] = mesNoFuso(fuso).split("-").map(Number);
  const inicioDoMes = meiaNoiteDoDia(fuso, ano ?? 1970, mes ?? 1, 1);
  const base: Prisma.ServiceOrderWhereInput = { companyId };
  const noMes: Prisma.ServiceOrderWhereInput = { ...base, status: "COMPLETED", completedAt: { gte: inicioDoMes } };
  const [total, open, inProgress, waiting, completed, cancelled, urgent, completedThisMonth, valorMes] =
    await Promise.all([
      prisma.serviceOrder.count({ where: base }),
      prisma.serviceOrder.count({ where: { ...base, status: "OPEN" } }),
      prisma.serviceOrder.count({ where: { ...base, status: "IN_PROGRESS" } }),
      prisma.serviceOrder.count({ where: { ...base, status: "WAITING" } }),
      prisma.serviceOrder.count({ where: { ...base, status: "COMPLETED" } }),
      prisma.serviceOrder.count({ where: { ...base, status: "CANCELLED" } }),
      prisma.serviceOrder.count({ where: { ...base, priority: "URGENT" } }),
      prisma.serviceOrder.count({ where: noMes }),
      prisma.serviceOrder.aggregate({ where: noMes, _sum: { total: true } }),
    ]);
  return {
    total,
    open,
    inProgress,
    waiting,
    completed,
    cancelled,
    urgent,
    completedThisMonth,
    completedValueThisMonth: moedaDeCentavos(centavos(valorMes._sum.total)),
  };
}

// ---- Editar ----

/**
 * O que é ESTRUTURA e o que é EXECUÇÃO.
 *
 * Estrutura (cliente, título, prioridade, responsável, agendamento, desconto,
 * descrição e as linhas) define o combinado com o cliente: mexer nela é decisão
 * de quem tem a escrita do módulo, e só acontece enquanto a ordem está viva.
 * Execução (diagnóstico e anotações) é o que o técnico vê no equipamento: quem
 * está com a OS na mão escreve nela até depois de concluída — é o histórico do
 * serviço, não uma mudança de conta.
 */
const CAMPOS_DE_ESTRUTURA: (keyof UpdateServiceOrderInput)[] = [
  "clientId",
  "title",
  "priority",
  "assignedUserId",
  "scheduledAt",
  "discount",
  "items",
  "description",
];

function tocouEstrutura(input: UpdateServiceOrderInput): boolean {
  return CAMPOS_DE_ESTRUTURA.some((campo) => input[campo] !== undefined);
}

export async function updateServiceOrder(
  companyId: string,
  id: string,
  input: UpdateServiceOrderInput,
  ator: { userId: string; role: Role },
  ip: string,
) {
  const atual = await prisma.serviceOrder.findFirst({
    where: { id, companyId },
    include: { items: { orderBy: { lineNumber: "asc" } } },
  });
  if (!atual) throw notFound("Ordem de serviço não encontrada");

  const estrutura = tocouEstrutura(input);
  const temEscrita = can(ator.role, "service_order:write");

  if (estrutura && !temEscrita) {
    throw forbidden("Estes campos mudam o combinado da ordem: cliente, título, prioridade, responsável, agendamento, desconto ou itens.");
  }
  if (!temEscrita && atual.assignedUserId !== ator.userId) {
    throw forbidden("Esta ordem não está atribuída a você.");
  }
  if (atual.status === "CANCELLED") {
    throw conflict("Ordem cancelada não se edita: ela é o registro do que aconteceu.");
  }
  if (atual.status === "COMPLETED" && estrutura) {
    throw conflict("Ordem concluída não muda itens, valores nem responsável — cancele a concluída para desfazer o que foi feito.");
  }

  const data: Prisma.ServiceOrderUpdateInput = {};
  if (input.clientId !== undefined) {
    if (input.clientId === null) throw badRequest("A ordem precisa de um cliente");
    await conferirCliente(companyId, input.clientId);
    data.client = { connect: { id: input.clientId } };
  }
  if (input.assignedUserId !== undefined) {
    await conferirResponsavel(companyId, input.assignedUserId);
    data.assignedUser = input.assignedUserId ? { connect: { id: input.assignedUserId } } : { disconnect: true };
  }
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.scheduledAt !== undefined) data.scheduledAt = input.scheduledAt;
  if (input.title !== undefined) data.title = input.title;
  if (input.diagnosis !== undefined) data.diagnosis = input.diagnosis;
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.description !== undefined) data.description = input.description;

  // O total é recalculado quando as linhas mudam OU quando só o desconto muda —
  // nas duas horas sobre a mesma base de centavo. Uma linha que já foi para o
  // banco entra na soma pelo `lineTotal` gravado, não por uma conta nova em cima
  // do preço: o que o cliente pagou não muda porque o servidor refaz a conta.
  const linhas = input.items !== undefined ? input.items : null;
  if (linhas || input.discount !== undefined) {
    const pecas = linhas ? await carregarPecas(companyId, linhas) : new Map<string, PecaDoCadastro>();
    const calculadas = linhas ? calcularLinhas(linhas, pecas) : null;
    const base: LinhaCalculada[] =
      calculadas ??
      atual.items.map((i) => ({
        kind: i.kind,
        productId: i.productId,
        description: i.description,
        quantity: num(i.quantity),
        unitPrice: i.unitPrice,
        lineTotal: i.lineTotal,
      }));
    const desconto = input.discount !== undefined ? new Prisma.Decimal(input.discount) : atual.discount;
    if (calculadas) {
      data.items = {
        deleteMany: {},
        create: calculadas.map((l, indice) => ({
          lineNumber: indice + 1,
          kind: l.kind,
          productId: l.productId,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          lineTotal: l.lineTotal,
        })),
      };
    }
    data.discount = desconto;
    data.total = decimalDeCentavos(totalEmCentavos(base, desconto));
  }

  await transacaoEstoque(async (tx) => {
    // A edição lê fora e escreve dentro: a travessa `FOR UPDATE` segura a linha
    // até o commit, e o status lido aqui é o MESMO que a requisição julgou lá
    // em cima. Se outra movimenta a OS no intervalo, isto é 409 antes de
    // qualquer escrita — editar uma ordem que acabou de ser cancelada não
    // acontece nem por corrida de clique duplo.
    const travada = await tx.$queryRaw<Array<{ status: string }>>(
      Prisma.sql`SELECT status FROM service_orders WHERE id = ${id} AND company_id = ${companyId} FOR UPDATE`,
    );
    const statusNaLinha = travada[0]?.status;
    if (!statusNaLinha) throw notFound("Ordem de serviço não encontrada");
    if (statusNaLinha !== atual.status) {
      throw conflict("A ordem mudou de status em outra requisição — recarregue e tente de novo");
    }
    await tx.serviceOrder.update({ where: { id, companyId }, data });
  });

  await audit({
    userId: ator.userId,
    companyId,
    action: "service_order.update",
    entity: "service_order",
    entityId: id,
    ip,
    metadata: { estrutura, itens: linhas ? linhas.length : atual.items.length },
  });

  return getServiceOrder(companyId, id);
}

// ---- Status ----

export async function changeStatus(
  companyId: string,
  id: string,
  alvo: ServiceOrderStatus,
  note: string | undefined,
  ator: { userId: string; role: Role },
  ip: string,
) {
  const atual = await prisma.serviceOrder.findFirst({ where: { id, companyId }, include: { items: true } });
  if (!atual) throw notFound("Ordem de serviço não encontrada");

  const temEscrita = can(ator.role, "service_order:write");
  if (alvo === "CANCELLED") {
    if (!temEscrita) throw forbidden("Cancelar uma ordem de serviço não faz parte do escopo do atendente.");
    if (atual.status === "COMPLETED" && !podeEstornar(ator.role)) {
      throw forbidden("Estornar uma ordem concluída é decisão do administrador ou do proprietário.");
    }
  }
  if (!temEscrita && atual.assignedUserId !== ator.userId) {
    throw forbidden("Esta ordem não está atribuída a você.");
  }

  // Repetir o status que a OS já tem tem duas respostas, e a diferença é de
  // negócio. Num estado VIVO (OPEN, IN_PROGRESS, WAITING) nada aconteceu: o
  // clique repetido é erro de uso, 400. Num estado TERMINAL (COMPLETED,
  // CANCELLED) não existe transição a partir dele, e a recusa é a mesma 409 das
  // outras portas que não existem.
  if (atual.status === alvo && TERMINAIS.includes(alvo)) {
    throw conflict(`A mudança de ${atual.status} para ${alvo} não é permitida.`);
  }
  if (atual.status === alvo) throw badRequest("A ordem já está com este status");
  if (!CAMINHOS[atual.status].includes(alvo)) {
    throw conflict(`A mudança de ${atual.status} para ${alvo} não é permitida.`);
  }

  const consumo = consumoPorPeca(atual.items);
  const vaiBaixar = alvo === "COMPLETED" && consumo.size > 0;
  const vaiEstornar = alvo === "CANCELLED" && atual.status === "COMPLETED" && consumo.size > 0;
  const mexeNoEstoque = vaiBaixar || vaiEstornar;
  const permiteNegativo = mexeNoEstoque ? await permiteEstoqueNegativo(companyId) : false;

  // A pré-checada amigável só existe onde a política da empresa NÃO deixa o
  // saldo passar para negativo (Fase 3b): ligada, quem decide é o banco dentro
  // da transação. Ler antes não é a guarda — é a mensagem bonita.
  if (vaiBaixar && !permiteNegativo) {
    const pecas = await prisma.product.findMany({
      where: { id: { in: [...consumo.keys()] }, companyId },
      select: { id: true, name: true, unit: true, stockQuantity: true, trackStock: true },
    });
    for (const p of pecas) {
      const precisa = consumo.get(p.id);
      if (!precisa || !p.trackStock) continue;
      if (precisa.gt(p.stockQuantity)) {
        throw badRequest(
          `Estoque insuficiente para "${p.name}": disponível ${num(p.stockQuantity)} ${p.unit}, solicitado ${precisa.toNumber()}`,
        );
      }
    }
  }

  await transacaoEstoque(async (tx) => {
    const agora = new Date();
    // Reivindicação condicional no status lido: dois "concluir" simultâneos não
    // baixam a peça duas vezes, porque o segundo perde a reivindicação e a
    // transação inteira dele volta — estoque, movimentação e histórico.
    const movido = await tx.serviceOrder.updateMany({
      where: { id, companyId, status: atual.status },
      data: {
        status: alvo,
        ...(alvo === "IN_PROGRESS" && !atual.startedAt ? { startedAt: agora } : {}),
        ...(alvo === "COMPLETED" ? { completedAt: agora } : {}),
      },
    });
    if (movido.count === 0) {
      throw conflict("A ordem mudou de status em outra requisição — recarregue e tente de novo");
    }

    if (mexeNoEstoque) {
      for (const [productId, quantidade] of consumo) {
        const peca = await tx.product.findFirst({ where: { id: productId, companyId } });
        // Produto que parou de ser rastreado no meio do caminho não recebe
        // saldo que nunca baixou — a saída e a entrada seguem o mesmo criterio.
        if (!peca || !peca.trackStock) continue;
        const args = {
          tx,
          companyId,
          productId,
          quantity: quantidade.toNumber(),
          nome: peca.name,
          unidade: peca.unit,
          permitirNegativo: permiteNegativo,
          createdBy: ator.userId,
        };
        if (vaiBaixar) await baixarEstoque({ ...args, nota: `OS ${atual.number} — peças aplicadas` });
        else await subirEstoque({ ...args, nota: `Estorno da OS ${atual.number}` });
      }
    }

    await tx.serviceOrderHistory.create({
      data: { serviceOrderId: id, fromStatus: atual.status, toStatus: alvo, userId: ator.userId, note: note ?? null },
    });
  });

  await audit({
    userId: ator.userId,
    companyId,
    action: `service_order.${alvo.toLowerCase()}`,
    entity: "service_order",
    entityId: id,
    ip,
    metadata: {
      de: atual.status,
      para: alvo,
      ...(vaiBaixar ? { pecas: consumo.size } : {}),
      ...(vaiEstornar ? { estorno: consumo.size } : {}),
    },
  });

  return getServiceOrder(companyId, id);
}
