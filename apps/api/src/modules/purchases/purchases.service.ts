import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { badRequest, conflict, notFound } from "../../lib/errors";
import { paginate, skipTake, type PaginationInput } from "../../lib/pagination";
import { audit } from "../../lib/audit";
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

  let total = 0;
  const itens = input.items.map((i) => {
    const prod = byId.get(i.productId)!;
    const lineTotal = Math.round(i.quantity * i.unitCost * 100) / 100;
    total = Math.round((total + lineTotal) * 100) / 100;
    return { productId: prod.id, quantity: i.quantity, unitCost: i.unitCost, lineTotal };
  });

  const purchase = await prisma.$transaction(async (tx) => {
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
        await tx.stockMovement.create({
          data: { companyId, productId: prod.id, kind: "IN", quantity: i.quantity, note: "Compra " + created.id.slice(0, 8), createdBy: userId },
        });
        await tx.product.update({
          where: { id: prod.id, companyId },
          data: { stockQuantity: Number(prod.stockQuantity) + i.quantity, costPrice: i.unitCost },
        });
      }
    }
    return created;
  });

  await audit({ userId, companyId, action: "purchase.create", entity: "purchase", entityId: purchase.id, ip, metadata: { total, receive: input.receive, items: itens.length } });
  return getPurchase(companyId, purchase.id).then(serialize);
}

// Receber: entrada de estoque + custo atualizado. Cancelar recebida: estorno com saida vigiada.
export async function changeStatus(companyId: string, id: string, status: PurchaseStatus, userId: string, ip: string) {
  const purchase = await prisma.purchase.findFirst({ where: { id, companyId }, include: { items: true } });
  if (!purchase) throw notFound("Compra não encontrada");
  if (purchase.status === status) throw badRequest("A compra já está com este status");
  if (purchase.status === "CANCELLED") throw badRequest("Compra cancelada não pode mudar de status");

  await prisma.$transaction(async (tx) => {
    if (status === "RECEIVED") {
      for (const i of purchase.items) {
        const prod = await tx.product.findFirst({ where: { id: i.productId, companyId } });
        if (!prod || !prod.trackStock) continue;
        await tx.stockMovement.create({
          data: { companyId, productId: prod.id, kind: "IN", quantity: i.quantity, note: "Compra " + purchase.id.slice(0, 8), createdBy: userId },
        });
        await tx.product.update({
          where: { id: prod.id, companyId },
          data: { stockQuantity: Number(prod.stockQuantity) + Number(i.quantity), costPrice: Number(i.unitCost) },
        });
      }
    }
    if (status === "CANCELLED" && purchase.status === "RECEIVED") {
      for (const i of purchase.items) {
        const prod = await tx.product.findFirst({ where: { id: i.productId, companyId } });
        if (!prod || !prod.trackStock) continue;
        if (Number(i.quantity) > Number(prod.stockQuantity)) {
          throw badRequest("Não é possível estornar: estoque insuficiente para \"" + prod.name + "\" (disponível " + Number(prod.stockQuantity) + " " + prod.unit + ")");
        }
        await tx.stockMovement.create({
          data: { companyId, productId: prod.id, kind: "OUT", quantity: i.quantity, note: "Estorno da compra " + purchase.id.slice(0, 8), createdBy: userId },
        });
        await tx.product.update({ where: { id: prod.id, companyId }, data: { stockQuantity: Number(prod.stockQuantity) - Number(i.quantity) } });
      }
    }
    await tx.purchase.update({ where: { id, companyId }, data: { status } });
  });

  await audit({ userId, companyId, action: "purchase." + status.toLowerCase(), entity: "purchase", entityId: id, ip });
  return getPurchase(companyId, id).then(serialize);
}
