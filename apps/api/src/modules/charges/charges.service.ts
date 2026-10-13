import { Prisma } from "@prisma/client";
import type { ChargeMethod, ChargeStatus, Role } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { badRequest, conflict, notFound } from "../../lib/errors";
import { paginate, skipTake, type PaginationInput } from "../../lib/pagination";
import { audit } from "../../lib/audit";
import { centavos, moedaDeCentavos } from "../../lib/money";
import { calendarioDaEmpresa, diaDeCalendario, fusoDaEmpresa, meiaNoiteDoDia, mesNoFuso } from "../../lib/time";
import { transacaoEstoque } from "../../lib/tx";
import { adapterDoProvedor } from "./charge-adapters";
import type { CreateChargeInput, PayChargeInput } from "./charges.schemas";

// F3.2 Parte 2 — Cobranças: a casa única da regra de "quem tem o que receber".
//
// O que a empresa precisava, e o produto não tinha: um papel escrito de que o
// cliente deve, com vencimento, com o modo de receber, e que só vira dinheiro no
// caixa quando uma pessoa diz que entrou. Existia a nota (Vendas), existia o
// caixa (Financeiro) e existia a ordem de serviço; entre eles, o "ainda não pagou"
// vivia na cabeça de quem atende. A cobrança é esse intervalo.
//
// As cinco decisões que mandam no arquivo:
//
//  1. Cobrar é diferente de receber. Criar a cobrança NÃO lança nada no
//     financeiro — se lançasse, o painel mostraria uma receita que nunca entrou.
//     O lançamento nasce no pagamento, uma única vez, dentro da mesma
//     transação que muda o estado.
//  2. Quem registra o recebimento é uma pessoa. Este projeto não tem webhook,
//     não consulta provedor nenhum, e o `provider` de toda cobrança nasce MANUAL.
//     A coluna existe para o dia em que um provedor de mercado entrar; o
//     histórico das cobranças de balcão continua dizendo a verdade sozinho.
//  3. A chave PIX é validada pelo TIPO dela (lib/pix.ts), e a régua é a mesma do
//     cadastro do gateway. Dígito trocado numa chave PIX é dinheiro enviado para
//     a conta de outra pessoa, sem botão de volta.
//  4. "Vencida" é lida no calendário DA EMPRESA (Fase 3c), nunca no relógio do
//     servidor, e só faz sentido numa cobrança pendente.
//  5. O vínculo manda no cliente: cobrança de venda ou de OS segue o cliente do
//     documento. Se a tela mandar um cliente diferente do documento, a recusa é
//     400 dito — não "o último campo preencheu o outro".
//
// O número é sequencial POR EMPRESA, com a mesma fila da ordem de serviço: X lock
// na linha da empresa, `MAX + 1`, índice único fechando a porta e retry da
// transação inteira. A série não recomeça e não repete — é o número que o
// cliente recebe como protocolo e que sai impresso no documento.
//
// Toda escrita carrega `companyId` no where (Fase 1c): id de outra empresa não
// existe nesta, e a resposta honesta para isso é 404 — nem "não encontrada", nem
// "sem permissão" com um detalhe que confirme que a linha existe do outro lado.

/** O dinheiro só vira `Number` na última linha antes do JSON (Fase 3d). */
const num = (v: Prisma.Decimal) => Number(v);

/** A categoria que nasce com o primeiro recebimento — o par de "Vendas" e "Compras". */
const CATEGORIA_COBRANCAS = "Cobranças";

/**
 * A venda não tem número sequencial — o balcão a conhece pelos oito primeiros
 * caracteres do id, a mesma assinatura do lançamento gerado e da movimentação de
 * estoque ("Venda A1B2C3D4", lib/installments.ts). O cliente que recebe o impresso
 * precisa de algo que o atendente consiga achar na tela de Vendas.
 */
const referenciaVenda = (id: string) => id.slice(0, 8).toUpperCase();

interface CobrancaCarregada {
  id: string;
  number: number;
  status: ChargeStatus;
  title: string;
  amount: Prisma.Decimal;
  dueDate: Date;
  method: ChargeMethod;
  provider: string;
  pixKeyType: string | null;
  pixKey: string | null;
  instructions: string | null;
  notes: string | null;
  clientId: string | null;
  saleId: string | null;
  serviceOrderId: string | null;
  financeEntryId: string | null;
  paidAt: Date | null;
  paidMethod: ChargeMethod | null;
  paymentNote: string | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  client: { name: string } | null;
  sale: { id: string } | null;
  serviceOrder: { number: number } | null;
  creator: { name: string } | null;
  payer: { name: string } | null;
  canceller: { name: string } | null;
}

const INCLUIR = {
  client: { select: { name: true } },
  sale: { select: { id: true } },
  serviceOrder: { select: { number: true } },
  creator: { select: { name: true } },
  payer: { select: { name: true } },
  canceller: { select: { name: true } },
} satisfies Prisma.ChargeInclude;

/**
 * A cobrança como a tela e a impressora a leem.
 *
 * `dueDateLabel` existe ao lado de `dueDate` por um motivo concreto: a coluna é
 * `@db.Date` e o JSON devolve `2026-10-20T00:00:00.000Z`. Um navegador em
 * America/Sao_Paulo que formatar esse instante mostra 19/10 — o dia de ontem,
 * escrito no documento do cliente. O rótulo é o dia como ele foi cadastrado, sem
 * fuso no meio, e é dele que a tela e o recibo tratarem.
 */
function serialize(c: CobrancaCarregada, hoje: Date) {
  return {
    id: c.id,
    number: c.number,
    status: c.status,
    title: c.title,
    amount: num(c.amount),
    dueDate: c.dueDate,
    dueDateLabel: diaDeCalendario(c.dueDate),
    overdue: c.status === "PENDING" && c.dueDate.getTime() < hoje.getTime(),
    method: c.method,
    provider: c.provider,
    pixKeyType: c.pixKeyType,
    pixKey: c.pixKey,
    instructions: c.instructions,
    notes: c.notes,
    clientId: c.clientId,
    clientName: c.client?.name ?? null,
    saleId: c.saleId,
    saleReference: c.sale ? referenciaVenda(c.sale.id) : null,
    serviceOrderId: c.serviceOrderId,
    serviceOrderNumber: c.serviceOrder?.number ?? null,
    financeEntryId: c.financeEntryId,
    paidAt: c.paidAt,
    paidMethod: c.paidMethod,
    paidByName: c.payer?.name ?? null,
    paymentNote: c.paymentNote,
    cancelledAt: c.cancelledAt,
    cancelReason: c.cancelReason,
    cancelledByName: c.canceller?.name ?? null,
    createdByName: c.creator?.name ?? null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

/** O dia de calendário da empresa — a única régua de "vencida" que existe aqui. */
async function hojeDaEmpresa(companyId: string): Promise<Date> {
  return calendarioDaEmpresa(await fusoDaEmpresa(companyId));
}

// ---- Vínculos: cliente, venda e ordem de serviço ----

interface Vinculos {
  clientId: string;
  saleId: string | null;
  serviceOrderId: string | null;
}

/**
 * resolve os três vínculos e devolve o cliente que vale.
 *
 * O `companyId` que pergunta é o do token assinado, nunca o do corpo: uma venda
 * da empresa vizinha tem uuid perfeitamente formado, existe no banco, e não pode
 * gerar cobrança aqui. A resposta para isso é 400 (o id é um dado inválido para
 * esta empresa), e não 404 — quem errou o vínculo está escrevendo um formulário,
 * e um formulário precisa saber qual campo.
 */
async function resolverVinculos(companyId: string, input: CreateChargeInput): Promise<Vinculos> {
  let clientId = input.clientId ?? null;

  if (input.saleId) {
    const venda = await prisma.sale.findFirst({
      where: { id: input.saleId, companyId },
      select: { id: true, clientId: true },
    });
    if (!venda) throw badRequest("A venda informada não pertence a esta empresa");
    if (clientId && clientId !== venda.clientId) {
      throw badRequest("O cliente informado não é o cliente desta venda");
    }
    clientId = venda.clientId;
  }

  if (input.serviceOrderId) {
    const ordem = await prisma.serviceOrder.findFirst({
      where: { id: input.serviceOrderId, companyId },
      select: { id: true, clientId: true },
    });
    if (!ordem) throw badRequest("A ordem de serviço informada não pertence a esta empresa");
    if (clientId && clientId !== ordem.clientId) {
      throw badRequest("O cliente informado não é o cliente desta ordem de serviço");
    }
    clientId = ordem.clientId;
  }

  // `sale.clientId` é opcional no cadastro da venda: uma venda sem cliente não tem
  // a quem cobrar. A recusa é dita, não consertada em silêncio.
  if (!clientId) {
    throw badRequest("A cobrança precisa de um cliente, de uma venda ou de uma ordem de serviço");
  }

  const cliente = await prisma.client.findFirst({
    where: { id: clientId, companyId, active: true },
    select: { id: true },
  });
  if (!cliente) throw badRequest("Cliente inválido para esta empresa");

  return { clientId, saleId: input.saleId ?? null, serviceOrderId: input.serviceOrderId ?? null };
}

/**
 * Uma cobrança pendente por documento.
 *
 * A trava é sobre a PENDDente, não sobre o documento: pagar ou cancelar libera a
 * linha seguinte, e é assim que o balcão corrige um valor digitado errado sem
 * apagar o histórico da primeira cobrança. Sem esta regra, a mesma venda apareceria
 * duas vezes no carnê do cliente — e cobrar duas vezes a mesma conta é a forma
 * mais rápida de perder um cliente.
 */
async function conferirPendenciaUnica(
  companyId: string,
  vinculos: Vinculos,
): Promise<void> {
  for (const campo of ["saleId", "serviceOrderId"] as const) {
    const valor = vinculos[campo];
    if (!valor) continue;
    const existente = await prisma.charge.findFirst({
      where: { companyId, [campo]: valor, status: "PENDING" },
      select: { number: true },
    });
    if (existente) {
      const documento = campo === "saleId" ? "venda" : "ordem de serviço";
      throw conflict(`A cobrança ${existente.number} já está pendente para esta ${documento}. Pague ou cancele a que existe.`);
    }
  }
}

// ---- Criar ----

const TENTATIVAS_DE_NUMERO = 5;

interface CamposIniciais {
  clientId: string;
  saleId: string | null;
  serviceOrderId: string | null;
  title: string;
  amount: Prisma.Decimal;
  dueDate: Date;
  method: ChargeMethod;
  pixKeyType: string | null;
  pixKey: string | null;
  instructions: string | null;
  notes: string | null;
  createdBy: string;
}

/**
 * Cria a cobrança com o próximo número da série da empresa.
 *
 * Mesmo desenho da ordem de serviço, e pelo mesmo motivo medido: `MAX(number)`
 * lido sem trava devolve o mesmo número para duas requisições que chegam juntas,
 * e o índice único devolve P2002. O X lock na linha da empresa põe a fila em
 * ordem de chegada sem travar intervalo de índice — oito criações simultâneas
 * viram 1..8, e não cinco 200 e três 500.
 */
async function criarComNumero(
  companyId: string,
  campos: CamposIniciais,
): Promise<{ id: string; number: number }> {
  for (let tentativa = 1; ; tentativa++) {
    try {
      return await transacaoEstoque(async (tx) => {
        const empresa = await tx.$queryRaw<Array<{ id: string }>>(
          Prisma.sql`SELECT id FROM companies WHERE id = ${companyId} FOR UPDATE`,
        );
        if (empresa.length === 0) throw notFound("Empresa não encontrada");
        const medido = await tx.$queryRaw<Array<{ ultimo: unknown }>>(
          Prisma.sql`SELECT COALESCE(MAX(number), 0) AS ultimo FROM charges WHERE company_id = ${companyId}`,
        );
        const numero = Number(medido[0]?.ultimo ?? 0) + 1;
        return tx.charge.create({
          data: { ...campos, companyId, number: numero, status: "PENDING", provider: "MANUAL" },
          select: { id: true, number: true },
        });
      });
    } catch (e) {
      const duplicado = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
      if (!duplicado || tentativa >= TENTATIVAS_DE_NUMERO) throw e;
    }
  }
}

export async function createCharge(
  companyId: string,
  input: CreateChargeInput,
  ator: { userId: string; role: Role },
  ip: string,
) {
  const vinculos = await resolverVinculos(companyId, input);
  await conferirPendenciaUnica(companyId, vinculos);

  // O adaptador é a única casa da régua do provedor. Hoje é um só, e ele decide
  // a chave PIX; no dia em que um provedor de mercado entrar, é a implementação
  // dele que responde — o serviço abaixo não muda.
  const adapter = adapterDoProvedor("MANUAL");
  const chave = adapter.prepararCobranca({
    method: input.method,
    pixKeyType: input.pixKeyType,
    pixKey: input.pixKey,
  });

  // O dia escrito na tela vira instante ancorado à meia-noite UTC, que é como a
  // coluna `@db.Date` o guarda. Comparar depois com `calendarioDaEmpresa` é
  // aritmética de calendário, sem fuso no meio (lib/time.ts).
  const vencimento = new Date(`${input.dueDate}T00:00:00.000Z`);

  const cobranca = await criarComNumero(companyId, {
    ...vinculos,
    title: input.title,
    amount: new Prisma.Decimal(input.amount),
    dueDate: vencimento,
    method: input.method,
    pixKeyType: chave.pixKeyType,
    pixKey: chave.pixKey,
    instructions: input.instructions ?? null,
    notes: input.notes ?? null,
    createdBy: ator.userId,
  });

  // Auditoria sem dado de cliente no metadata: número, valor e método bastam para
  // reconstruir o que aconteceu, e a linha em si já aponta para a cobrança.
  await audit({
    userId: ator.userId,
    companyId,
    action: "charge.create",
    entity: "charge",
    entityId: cobranca.id,
    ip,
    metadata: {
      number: cobranca.number,
      amount: num(new Prisma.Decimal(input.amount)),
      method: input.method,
      dueDate: input.dueDate,
    },
  });

  return getCharge(companyId, cobranca.id);
}

// ---- Ler ----

export interface FiltroCobrancas {
  search?: string;
  status?: ChargeStatus;
  method?: ChargeMethod;
  clientId?: string;
  saleId?: string;
  serviceOrderId?: string;
  overdue?: boolean;
  sort?: "number" | "dueDate" | "createdAt" | "amount";
}

/**
 * Lista com busca, filtros e a régua de vencida lida no fuso da empresa.
 *
 * `overdue=true` é o único valor que filtra: "não vencida" não é uma pergunta de
 * balcão (ela incluiria paga e cancelada, que são outros filtros), então `false`
 * vale "não filtrar por vencimento". A busca por texto casa número, cliente e
 * título — quem está no telefone tem o protocolo OU o nome, quase nunca os dois.
 */
export async function listCharges(companyId: string, p: PaginationInput, f: FiltroCobrancas) {
  const hoje = await hojeDaEmpresa(companyId);
  const where: Prisma.ChargeWhereInput = {
    companyId,
    ...(f.status ? { status: f.status } : {}),
    ...(f.method ? { method: f.method } : {}),
    ...(f.clientId ? { clientId: f.clientId } : {}),
    ...(f.saleId ? { saleId: f.saleId } : {}),
    ...(f.serviceOrderId ? { serviceOrderId: f.serviceOrderId } : {}),
  };
  if (f.overdue === true) {
    where.status = "PENDING";
    where.dueDate = { lt: hoje };
  }
  if (f.search) {
    const numero = /^\d+$/.test(f.search) ? Number(f.search) : null;
    where.OR = [
      { title: { contains: f.search } },
      { client: { name: { contains: f.search } } },
      ...(numero === null ? [] : [{ number: numero }]),
    ];
  }

  const orderBy: Prisma.ChargeOrderByWithRelationInput =
    f.sort === "number"
      ? { number: "asc" }
      : f.sort === "dueDate"
        ? { dueDate: "asc" }
        : f.sort === "amount"
          ? { amount: "desc" }
          : { createdAt: "desc" };

  const [rows, total] = await Promise.all([
    prisma.charge.findMany({ where, orderBy, ...skipTake(p), include: INCLUIR }),
    prisma.charge.count({ where }),
  ]);
  return paginate(rows.map((c) => serialize(c, hoje)), total, p);
}

export async function getCharge(companyId: string, id: string) {
  const [hoje, cobranca] = await Promise.all([
    hojeDaEmpresa(companyId),
    prisma.charge.findFirst({ where: { id, companyId }, include: INCLUIR }),
  ]);
  if (!cobranca) throw notFound("Cobrança não encontrada");
  return serialize(cobranca, hoje);
}

/**
 * Os indicadores da tela. `pendingAmount` e `overdueAmount` somam em centavo e só
 * viram moeda na última linha (Fase 3d); o mês do que entrou é o mês DA EMPRESA,
 * com a borda na meia-noite local dela (`paidAt` é coluna DATETIME).
 */
export async function summary(companyId: string) {
  const fuso = await fusoDaEmpresa(companyId);
  const hoje = calendarioDaEmpresa(fuso);
  const [ano, mes] = mesNoFuso(fuso).split("-").map(Number);
  const inicioDoMes = meiaNoiteDoDia(fuso, ano ?? 1970, mes ?? 1, 1);

  const base: Prisma.ChargeWhereInput = { companyId };
  const [total, pendingCount, pendingSum, overdueCount, overdueSum, paidCount, cancelledCount, paidMonth] =
    await Promise.all([
      prisma.charge.count({ where: base }),
      prisma.charge.count({ where: { ...base, status: "PENDING" } }),
      prisma.charge.aggregate({ where: { ...base, status: "PENDING" }, _sum: { amount: true } }),
      prisma.charge.count({ where: { ...base, status: "PENDING", dueDate: { lt: hoje } } }),
      prisma.charge.aggregate({ where: { ...base, status: "PENDING", dueDate: { lt: hoje } }, _sum: { amount: true } }),
      prisma.charge.count({ where: { ...base, status: "PAID" } }),
      prisma.charge.count({ where: { ...base, status: "CANCELLED" } }),
      prisma.charge.aggregate({ where: { ...base, status: "PAID", paidAt: { gte: inicioDoMes } }, _sum: { amount: true } }),
    ]);

  return {
    total,
    pendingCount,
    pendingAmount: moedaDeCentavos(centavos(pendingSum._sum.amount)),
    overdueCount,
    overdueAmount: moedaDeCentavos(centavos(overdueSum._sum.amount)),
    paidCount,
    paidAmountThisMonth: moedaDeCentavos(centavos(paidMonth._sum.amount)),
    cancelledCount,
  };
}

// ---- Pagar ----

/**
 * Registra o recebimento e escritura a receita — as duas coisas na mesma
 * transação, uma única vez.
 *
 * A corrida é o caso que importa: dois cliques, duas abas, o mesmo pagamento. A
 * guarda é a reivindicação condicional (`updateMany` com o status lido no where),
 * que trava a linha e faz o segundo perdedor ver `count = 0` depois do commit do
 * primeiro. Sem ela, dois lançamentos de receita entrariam no caixa e o saldo do
 * mês estaria errado para quem olha o painel — o pior tipo de erro, porque é
 * silencioso. Com ela, o segundo recebe 409 e a empresa tem exatamente um
 * lançamento, o que o teste mede direto no banco.
 *
 * O lançamento nasce dentro da mesma transação e a coluna `finance_entry_id` é
 * UNIQUE: mesmo que alguém escreva outro caminho de pagamento amanhã, uma
 * cobrança não consegue apontar para duas receitas.
 */
export async function payCharge(
  companyId: string,
  id: string,
  input: PayChargeInput,
  ator: { userId: string; role: Role },
  ip: string,
) {
  const atual = await prisma.charge.findFirst({ where: { id, companyId } });
  if (!atual) throw notFound("Cobrança não encontrada");
  if (atual.status === "PAID") throw conflict("Esta cobrança já está paga.");
  if (atual.status === "CANCELLED") throw conflict("Cobrança cancelada não se paga: reabra uma nova.");

  const recebidoEm = new Date();
  const metodo = input.paidMethod ?? atual.method;
  // O mesmo formato do lançamento gerado por venda/compra (lib/installments.ts):
  // rótulo curto, travessão, e o que o operador lê no financeiro já diz de onde
  // o dinheiro veio sem precisar abrir a cobrança.
  const descricao = `Cobrança ${atual.number} — ${atual.title}`.slice(0, 190);

  await transacaoEstoque(async (tx) => {
    const reivindicada = await tx.charge.updateMany({
      where: { id, companyId, status: "PENDING" },
      data: {
        status: "PAID",
        paidAt: recebidoEm,
        paidBy: ator.userId,
        paidMethod: metodo,
        paymentNote: input.paymentNote ?? null,
      },
    });
    if (reivindicada.count === 0) {
      throw conflict("A cobrança mudou de estado em outra requisição — recarregue e tente de novo");
    }

    // A categoria nasce com o primeiro recebimento, como "Vendas" e "Compras"
    // nascem com a primeira parcela (lib/installments.ts): o dono filtra o caixa
    // por ela sem cadastrar nada, e o upsert é o que impede a segunda cobrança
    // paga do mês de criar a segunda categoria igual.
    const categoria = await tx.financeCategory.upsert({
      where: {
        companyId_name_type: { companyId, name: CATEGORIA_COBRANCAS, type: "INCOME" },
      },
      update: {},
      create: { companyId, name: CATEGORIA_COBRANCAS, type: "INCOME" },
      select: { id: true },
    });

    const lancamento = await tx.financeEntry.create({
      data: {
        companyId,
        categoryId: categoria.id,
        userId: ator.userId,
        type: "INCOME",
        status: "PAID",
        description: descricao,
        amount: atual.amount,
        // A receita entra no dia em que venceu, não no dia em que alguém lembrou
        // de marcar: é o que o fluxo de caixa do financeiro mostra, e é o que o
        // cliente combinou. O instante do registro fica em `paidAt`.
        dueDate: atual.dueDate,
        paidAt: recebidoEm,
        clientId: atual.clientId,
      },
      select: { id: true },
    });
    await tx.charge.update({ where: { id }, data: { financeEntryId: lancamento.id } });
  });

  await audit({
    userId: ator.userId,
    companyId,
    action: "charge.paid",
    entity: "charge",
    entityId: id,
    ip,
    metadata: { number: atual.number, amount: num(atual.amount), method: metodo },
  });

  return getCharge(companyId, id);
}

// ---- Cancelar ----

/**
 * Cancelar é fechar a conta sem receber, dizendo por quê.
 *
 * O motivo é obrigatório porque o cancelamento apaga uma expectativa de receita:
 * seis meses depois, quem lê o carnê precisa saber se foi desistência, erro de
 * valor ou acordo. Nada aqui apaga a linha — cancelada continua na lista, com
 * data, autor e motivo — e nada aqui toca no financeiro: se a cobrança nunca foi
 * paga, não há lançamento a desfazer, e pago não se cancela (é o 409 logo abaixo,
 * e a ausência de estorno é limitação declarada na documentação do produto).
 */
export async function cancelCharge(
  companyId: string,
  id: string,
  reason: string,
  ator: { userId: string; role: Role },
  ip: string,
) {
  const atual = await prisma.charge.findFirst({ where: { id, companyId } });
  if (!atual) throw notFound("Cobrança não encontrada");
  if (atual.status === "PAID") {
    throw conflict("Cobrança paga não se cancela — o estorno no caixa ainda não existe neste produto.");
  }
  if (atual.status === "CANCELLED") throw conflict("Esta cobrança já está cancelada.");

  const movida = await prisma.charge.updateMany({
    where: { id, companyId, status: "PENDING" },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelledBy: ator.userId,
      cancelReason: reason,
    },
  });
  if (movida.count === 0) {
    throw conflict("A cobrança mudou de estado em outra requisição — recarregue e tente de novo");
  }

  await audit({
    userId: ator.userId,
    companyId,
    action: "charge.cancelled",
    entity: "charge",
    entityId: id,
    ip,
    metadata: { number: atual.number, amount: num(atual.amount), motivo: reason },
  });

  return getCharge(companyId, id);
}
