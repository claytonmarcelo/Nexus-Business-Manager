import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { badRequest, conflict, notFound } from "../../lib/errors";
import { paginate, skipTake, type PaginationInput } from "../../lib/pagination";
import { audit } from "../../lib/audit";
import { calendarioDaEmpresa, fusoDaEmpresa, mesNoFuso } from "../../lib/time";
import { centavos, moedaDeCentavos } from "../../lib/money";
import type { FinanceCategoryInput, FinanceEntryInput } from "./finance.schemas";

const num = (v: Prisma.Decimal) => Number(v);

type EntryType = "INCOME" | "EXPENSE";
type EntryStatus = "PENDING" | "PAID" | "CANCELLED";

interface EntryWithRelations {
  id: string; type: EntryType; status: EntryStatus; description: string; notes: string | null;
  amount: Prisma.Decimal; dueDate: Date; paidAt: Date | null; createdAt: Date; updatedAt: Date;
  category: { name: string } | null;
  client: { name: string } | null;
  supplier: { name: string } | null;
  user: { name: string } | null;
}

function serialize(e: EntryWithRelations) {
  return {
    id: e.id,
    type: e.type,
    status: e.status,
    description: e.description,
    amount: num(e.amount),
    dueDate: e.dueDate,
    paidAt: e.paidAt,
    notes: e.notes,
    categoryName: e.category?.name ?? null,
    categoryId: (e as unknown as { categoryId?: string | null }).categoryId ?? null,
    clientName: e.client?.name ?? null,
    supplierName: e.supplier?.name ?? null,
    userName: e.user?.name ?? null,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

export const serializeEntry = serialize;

const fullInclude = {
  category: { select: { name: true } },
  client: { select: { name: true } },
  supplier: { select: { name: true } },
  user: { select: { name: true } },
} satisfies Prisma.FinanceEntryInclude;

/* Categorias */

export async function listCategories(companyId: string, type?: EntryType) {
  return prisma.financeCategory.findMany({
    where: { companyId, ...(type ? { type } : {}) },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

export async function createCategory(companyId: string, input: FinanceCategoryInput, userId: string, ip: string) {
  const cat = await prisma.financeCategory.create({ data: { companyId, ...input } }).catch((e: unknown) => {
    if ((e as { code?: string }).code === "P2002") throw conflict("Já existe categoria com este nome para este tipo");
    throw e;
  });
  await audit({ userId, companyId, action: "finance-category.create", entity: "finance-category", entityId: cat.id, ip });
  return cat;
}

// Fase 1c da auditoria: as escritas abaixo carregam o companyId no where — a
// linha de outra empresa não é nem apagada nem alterada (P2025 vira 404).
export async function deleteCategory(companyId: string, id: string, userId: string, ip: string) {
  const found = await prisma.financeCategory.findFirst({ where: { id, companyId } });
  if (!found) throw notFound("Categoria não encontrada");
  await prisma.financeCategory.delete({ where: { id, companyId } });
  await audit({ userId, companyId, action: "finance-category.delete", entity: "finance-category", entityId: id, ip });
  return { ok: true };
}

/* Lançamentos */

function monthRange(month?: string): { dueDate?: { gte: Date; lt: Date } } {
  if (!month) return {};
  const parts = month.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return {};
  const gte = new Date(Date.UTC(y, m - 1, 1));
  const lt = new Date(Date.UTC(y, m, 1));
  return { dueDate: { gte, lt } };
}

export async function listEntries(companyId: string, p: PaginationInput, opts: { search?: string; type?: EntryType; status?: EntryStatus; month?: string }) {
  const where: Prisma.FinanceEntryWhereInput = {
    companyId,
    ...(opts.type ? { type: opts.type } : {}),
    ...(opts.status ? { status: opts.status } : {}),
    ...(opts.search ? { description: { contains: opts.search } } : {}),
    ...monthRange(opts.month),
  };
  const [rows, total] = await Promise.all([
    prisma.financeEntry.findMany({ where, orderBy: { dueDate: "desc" }, ...skipTake(p), include: fullInclude }),
    prisma.financeEntry.count({ where }),
  ]);
  return paginate(rows.map(serialize), total, p);
}

export async function getEntry(companyId: string, id: string) {
  const entry = await prisma.financeEntry.findFirst({ where: { id, companyId }, include: fullInclude });
  if (!entry) throw notFound("Lançamento não encontrado");
  return entry;
}

async function assertLinks(companyId: string, input: { categoryId?: string; clientId?: string; supplierId?: string; type: EntryType }) {
  if (input.categoryId) {
    const cat = await prisma.financeCategory.findFirst({ where: { id: input.categoryId, companyId } });
    if (!cat) throw badRequest("Categoria inválida para esta empresa");
    if (cat.type !== input.type) throw badRequest("A categoria é do tipo " + (cat.type === "INCOME" ? "receita" : "despesa") + ", não combina com este lançamento");
  }
  if (input.clientId) {
    const cli = await prisma.client.findFirst({ where: { id: input.clientId, companyId } });
    if (!cli) throw badRequest("Cliente inválido para esta empresa");
  }
  if (input.supplierId) {
    const sup = await prisma.supplier.findFirst({ where: { id: input.supplierId, companyId } });
    if (!sup) throw badRequest("Fornecedor inválido para esta empresa");
  }
}

export async function createEntry(companyId: string, input: FinanceEntryInput, userId: string, ip: string) {
  await assertLinks(companyId, input);
  const entry = await prisma.financeEntry.create({
    data: {
      companyId,
      userId,
      type: input.type,
      description: input.description,
      amount: input.amount,
      dueDate: input.dueDate,
      categoryId: input.categoryId,
      clientId: input.clientId,
      supplierId: input.supplierId,
      notes: input.notes,
      status: input.paid ? "PAID" : "PENDING",
      paidAt: input.paid ? new Date() : null,
    },
  });
  await audit({ userId, companyId, action: "finance.create", entity: "finance-entry", entityId: entry.id, ip, metadata: { type: input.type, amount: input.amount } });
  return getEntry(companyId, entry.id).then(serialize);
}

export async function updateEntry(companyId: string, id: string, input: Partial<FinanceEntryInput>, userId: string, ip: string) {
  const found = await prisma.financeEntry.findFirst({ where: { id, companyId } });
  if (!found) throw notFound("Lançamento não encontrado");
  await assertLinks(companyId, {
    categoryId: input.categoryId,
    clientId: input.clientId,
    supplierId: input.supplierId,
    type: input.type ?? found.type,
  });
  const data: Prisma.FinanceEntryUpdateInput = {};
  if (input.type !== undefined) data.type = input.type;
  if (input.description !== undefined) data.description = input.description;
  if (input.amount !== undefined) data.amount = input.amount;
  if (input.dueDate !== undefined) data.dueDate = input.dueDate;
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.categoryId !== undefined) data.category = input.categoryId ? { connect: { id: input.categoryId } } : { disconnect: true };
  if (input.clientId !== undefined) data.client = input.clientId ? { connect: { id: input.clientId } } : { disconnect: true };
  if (input.supplierId !== undefined) data.supplier = input.supplierId ? { connect: { id: input.supplierId } } : { disconnect: true };
  const entry = await prisma.financeEntry.update({ where: { id, companyId }, data });
  await audit({ userId, companyId, action: "finance.update", entity: "finance-entry", entityId: id, ip });
  return getEntry(companyId, entry.id).then(serialize);
}

export async function changeStatus(companyId: string, id: string, status: EntryStatus, userId: string, ip: string) {
  const found = await prisma.financeEntry.findFirst({ where: { id, companyId } });
  if (!found) throw notFound("Lançamento não encontrado");
  if (found.status === status) throw badRequest("O lançamento já está com este status");
  const entry = await prisma.financeEntry.update({
    where: { id, companyId },
    data: { status, paidAt: status === "PAID" ? new Date() : null },
  });
  await audit({ userId, companyId, action: "finance." + status.toLowerCase(), entity: "finance-entry", entityId: id, ip });
  return getEntry(companyId, entry.id).then(serialize);
}

// Resumo do mes: o que entrou, o que saiu, saldo e pendencias (com atraso).
export async function summary(companyId: string, month?: string) {
  const range = monthRange(month);
  // Fase 3c: "vencida" é a conta cujo dia da empresa já passou. Com o dia lido
  // no UTC do servidor, em America/Sao_Paulo toda conta do dia acordava vencida
  // às 21h, e o resumo mostrava o mês novo antes da virada da empresa.
  const fuso = await fusoDaEmpresa(companyId);
  // A borda é o calendário da empresa, não a meia-noite local dela: `dueDate` é
  // coluna `@db.Date` e guarda o dia que a pessoa escreveu, ancorado à meia-
  // noite UTC. Compará-lo com a meia-noite de Brasília deslocaria a fronteira
  // três horas e toda conta do dia nasceria vencida.
  const hoje = calendarioDaEmpresa(fuso);
  const base: Prisma.FinanceEntryWhereInput = { companyId, ...range };
  const [income, expense, pendingIncome, pendingExpense, overdue] = await Promise.all([
    prisma.financeEntry.aggregate({ where: { ...base, type: "INCOME", status: "PAID" }, _sum: { amount: true } }),
    prisma.financeEntry.aggregate({ where: { ...base, type: "EXPENSE", status: "PAID" }, _sum: { amount: true } }),
    prisma.financeEntry.aggregate({ where: { ...base, type: "INCOME", status: "PENDING" }, _sum: { amount: true } }),
    prisma.financeEntry.aggregate({ where: { ...base, type: "EXPENSE", status: "PENDING" }, _sum: { amount: true } }),
    prisma.financeEntry.aggregate({ where: { companyId, status: "PENDING", dueDate: { lt: hoje } }, _sum: { amount: true }, _count: { _all: true } }),
  ]);
  // Fase 3d: o `_sum` chega do banco em DECIMAL e virava double logo aqui; a
  // subtração `entradas - saídas` era feita em vírgula flutuante e depois
  // "consertada" com `Math.round(...*100)/100`. Em centavo a diferença é
  // inteira, e o round deixa de ser chamado — ele era a cola, não a conta.
  const entradas = centavos(income._sum.amount);
  const saidas = centavos(expense._sum.amount);
  return {
    month: month ?? mesNoFuso(fuso),
    income: moedaDeCentavos(entradas),
    expense: moedaDeCentavos(saidas),
    balance: moedaDeCentavos(entradas - saidas),
    pendingIncome: moedaDeCentavos(centavos(pendingIncome._sum.amount)),
    pendingExpense: moedaDeCentavos(centavos(pendingExpense._sum.amount)),
    overdueCount: overdue._count._all,
    overdueAmount: moedaDeCentavos(centavos(overdue._sum.amount)),
  };
}
