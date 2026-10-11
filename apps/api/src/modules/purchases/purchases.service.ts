import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { badRequest, conflict, notFound } from "../../lib/errors";
import { paginate, skipTake, type PaginationInput } from "../../lib/pagination";
import { audit } from "../../lib/audit";
import { baixarEstoque, permiteEstoqueNegativo, subirEstoque } from "../../lib/stock";
import { transacaoEstoque } from "../../lib/tx";
import { decimalDeCentavos, linhaDecimal, moedaDeCentavos, somarCentavos } from "../../lib/money";
import type { CreatePurchaseInput, CreateSupplierInput } from "./purchases.schemas";

const num = (v: Prisma.Decimal) => Number(v);

type PurchaseStatus = "DRAFT" | "RECEIVED" | "CANCELLED";

interface PurchaseWithRelations {
  id: string; status: PurchaseStatus; notes: string | null;
  total: Prisma.Decimal; createdAt: Date; updatedAt: Date;
  supplier: { name: string } | null;
  user: { name: string } | null;
  items: { id: string; productId: string; quantity: Prisma.Decimal; unitCost: Prisma.Decimal; lineTotal: Prisma.Decimal; product?: { name?: string } | null }[];
}

function serialize(p: PurchaseWithRelations) {
  return {
    id: p.id,
    status: p.status,
    total: num(p.total),
    notes: p.notes,
    supplierName: p.supplier?.name ?? null,
    userName: p.user?.name ?? null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    items: p.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.product?.name ?? null,
      quantity: num(i.quantity),
      unitCost: num(i.unitCost),
      lineTotal: num(i.lineTotal),
    })),
  };
}

/* Fornecedores */

// Fase 1c da auditoria: cada update/tx.update abaixo carrega o companyId no
// where — a escrita em linha de outra empresa morre em P2025 (404 no handler),
// sem depender da checagem prévia que já existia.
export async function listSuppliers(companyId: string, p: PaginationInput, opts: { search?: string; active?: boolean }) {
  const where: Prisma.SupplierWhereInput = {
    companyId,
    ...(opts.active === undefined ? {} : { active: opts.active }),
    ...(opts.search ? { name: { contains: opts.search } } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.supplier.findMany({ where, orderBy: { name: "asc" }, ...skipTake(p) }),
    prisma.supplier.count({ where }),
  ]);
  return paginate(rows, total, p);
}

export async function createSupplier(companyId: string, input: CreateSupplierInput, userId: string, ip: string) {
  const supplier = await prisma.supplier.create({ data: { companyId, ...input } }).catch((e: unknown) => {
    if ((e as { code?: string }).code === "P2002") throw conflict("Já existe um fornecedor com este nome nesta empresa");
    throw e;
  });
  await audit({ userId, companyId, action: "supplier.create", entity: "supplier", entityId: supplier.id, ip });
  return supplier;
}

export async function updateSupplier(companyId: string, id: string, input: Partial<CreateSupplierInput>, userId: string, ip: string) {
  const found = await prisma.supplier.findFirst({ where: { id, companyId } });
  if (!found) throw notFound("Fornecedor não encontrado");
  const supplier = await prisma.supplier.update({ where: { id, companyId }, data: input }).catch((e: unknown) => {
    if ((e as { code?: string }).code === "P2002") throw conflict("Já existe um fornecedor com este nome nesta empresa");
    throw e;
  });
  await audit({ userId, companyId, action: "supplier.update", entity: "supplier", entityId: id, ip });
  return supplier;
}

// Exclusao logica: compras antigas referenciam o fornecedor para sempre.
export async function deactivateSupplier(companyId: string, id: string, userId: string, ip: string) {
  const found = await prisma.supplier.findFirst({ where: { id, companyId } });
  if (!found) throw notFound("Fornecedor não encontrado");
  const supplier = await prisma.supplier.update({ where: { id, companyId }, data: { active: false } });
  await audit({ userId, companyId, action: "supplier.delete", entity: "supplier", entityId: id, ip });
  return supplier;
}

/* Compras */

export async function listPurchases(companyId: string, p: PaginationInput, opts: { search?: string; status?: PurchaseStatus; supplierId?: string }) {
  const where: Prisma.PurchaseWhereInput = {
    companyId,
    ...(opts.status ? { status: opts.status } : {}),
    ...(opts.supplierId ? { supplierId: opts.supplierId } : {}),
    ...(opts.search ? { supplier: { name: { contains: opts.search } } } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...skipTake(p),
      include: { items: { include: { product: { select: { name: true } } } }, supplier: { select: { name: true } }, user: { select: { name: true } } },
    }),
    prisma.purchase.count({ where }),
  ]);
  return paginate(rows.map(serialize), total, p);
}

export async function getPurchase(companyId: string, id: string) {
  const purchase = await prisma.purchase.findFirst({
    where: { id, companyId },
    include: { items: { include: { product: { select: { name: true } } } }, supplier: { select: { name: true } }, user: { select: { name: true } } },
  });
  if (!purchase) throw notFound("Compra não encontrada");
  return purchase;
}

// Criar compra: fornecedor e produtos validados na empresa; receber ja da entrada no estoque.
export async function createPurchase(companyId: string, input: CreatePurchaseInput, userId: string, ip: string) {
  const supplier = await prisma.supplier.findFirst({ where: { id: input.supplierId, companyId, active: true } });
  if (!supplier) throw badRequest("Fornecedor inválido para esta empresa");

  const productIds = input.items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, companyId, active: true } });
  const byId = new Map(products.map((x) => [x.id, x]));
  if (byId.size !== new Set(productIds).size) throw badRequest("Um dos produtos não pertence a esta empresa ou está inativo");

  // Fase 3d: linha em Decimal com uma única rodada na base 10 e total somado em
  // centavo — o mesmo critério da venda, porque compra e venda são a mesma
  // aritmética com sinais opostos.
  const itens = input.items.map((i) => {
    const prod = byId.get(i.productId)!;
    return {
      productId: prod.id,
      quantity: i.quantity,
      unitCost: i.unitCost,
      lineTotal: linhaDecimal(i.quantity, i.unitCost),
    };
  });
  const totalCentavos = somarCentavos(itens.map((i) => i.lineTotal));
  const total = decimalDeCentavos(totalCentavos);

  const purchase = await transacaoEstoque(async (tx) => {
    const created = await tx.purchase.create({
      data: {
        companyId,
        supplierId: supplier.id,
        userId,
        status: input.receive ? "RECEIVED" : "DRAFT",
        total,
        notes: input.notes,
        items: { create: itens },
      },
    });
    if (input.receive) {
      for (const i of itens) {
        const prod = byId.get(i.productId)!;
        if (!prod.trackStock) continue;
        // Fase 3: entrada com increment atômico e custo corrente na MESMA
        // unidade atômica — nada de absoluto derivado de leitura de fora.
        await subirEstoque({
          tx, companyId, productId: prod.id, quantity: i.quantity,
          custo: i.unitCost,
          nota: "Compra " + created.id.slice(0, 8), createdBy: userId,
        });
      }
    }
    return created;
  });

  await audit({ userId, companyId, action: "purchase.create", entity: "purchase", entityId: purchase.id, ip, metadata: { total: moedaDeCentavos(totalCentavos), receive: input.receive, items: itens.length } });
  return getPurchase(companyId, purchase.id).then(serialize);
}

// Receber: entrada de estoque + custo atualizado. Cancelar recebida: estorno com saida vigiada.
// Fase 3 da auditoria: o status é reivindicado dentro da transação (dois
// "receber" simultâneos não dão entrada duas vezes) e o saldo se move pelos
// decremento/increment atômicos de lib/stock.ts — o custo corrente acompanha
// o increment na mesma UPDATE, que é a semântica de "última compra define o
// custo", agora escrita na unidade atômica em vez de um update absoluto.
export async function changeStatus(companyId: string, id: string, status: PurchaseStatus, userId: string, ip: string) {
  const purchase = await prisma.purchase.findFirst({ where: { id, companyId }, include: { items: true } });
  if (!purchase) throw notFound("Compra não encontrada");
  if (purchase.status === status) throw badRequest("A compra já está com este status");
  if (purchase.status === "CANCELLED") throw badRequest("Compra cancelada não pode mudar de status");

  // Fase 3b: estornar uma compra recebida RETIRA estoque — se aquele tanto já
  // foi vendido, a política da empresa decide se o saldo pode ficar devendo.
  const permiteNegativo = await permiteEstoqueNegativo(companyId);
  await transacaoEstoque(async (tx) => {
    const reivindicado = await tx.purchase.updateMany({
      where: { id, companyId, status: purchase.status },
      data: { status },
    });
    if (reivindicado.count === 0) {
      throw badRequest("A compra mudou de status em outra requisição — recarregue e tente de novo");
    }
    if (status === "RECEIVED") {
      for (const i of purchase.items) {
        const prod = await tx.product.findFirst({ where: { id: i.productId, companyId } });
        if (!prod || !prod.trackStock) continue;
        await subirEstoque({
          tx, companyId, productId: prod.id, quantity: Number(i.quantity),
          custo: i.unitCost,
          nota: "Compra " + purchase.id.slice(0, 8), createdBy: userId,
        });
      }
    }
    if (status === "CANCELLED" && purchase.status === "RECEIVED") {
      for (const i of purchase.items) {
        const prod = await tx.product.findFirst({ where: { id: i.productId, companyId } });
        if (!prod || !prod.trackStock) continue;
        await baixarEstoque({
          tx, companyId, productId: prod.id, quantity: Number(i.quantity),
          nome: prod.name, unidade: prod.unit, permitirNegativo: permiteNegativo,
          nota: "Estorno da compra " + purchase.id.slice(0, 8), createdBy: userId,
        });
      }
    }
  });

  await audit({ userId, companyId, action: "purchase." + status.toLowerCase(), entity: "purchase", entityId: id, ip });
  return getPurchase(companyId, id).then(serialize);
}
