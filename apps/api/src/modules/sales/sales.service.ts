import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { badRequest, notFound } from "../../lib/errors";
import { paginate, skipTake, type PaginationInput } from "../../lib/pagination";
import { audit } from "../../lib/audit";
import type { CreateSaleInput } from "./sales.schemas";

const num = (v: Prisma.Decimal) => Number(v);

interface SaleWithRelations {
  id: string; status: "PENDING" | "CONFIRMED" | "CANCELLED"; notes: string | null;
  total: Prisma.Decimal; createdAt: Date; updatedAt: Date;
  client: { name: string } | null;
  user: { name: string } | null;
  items: { id: string; productId: string; quantity: Prisma.Decimal; unitPrice: Prisma.Decimal; lineTotal: Prisma.Decimal }[];
}

function serialize(sale: SaleWithRelations) {
  return {
    id: sale.id,
    status: sale.status,
    total: num(sale.total),
    notes: sale.notes,
    clientName: sale.client?.name ?? null,
    userName: sale.user?.name ?? null,
    createdAt: sale.createdAt,
    updatedAt: sale.updatedAt,
    items: sale.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: (i as unknown as { product?: { name?: string } }).product?.name ?? null,
      quantity: num(i.quantity),
      unitPrice: num(i.unitPrice),
      lineTotal: num(i.lineTotal),
    })),
  };
}

export async function listSales(companyId: string, p: PaginationInput, opts: { search?: string; status?: "PENDING" | "CONFIRMED" | "CANCELLED" }) {
  const where: Prisma.SaleWhereInput = {
    companyId,
    ...(opts.status ? { status: opts.status } : {}),
    ...(opts.search ? { client: { name: { contains: opts.search } } } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...skipTake(p),
      include: { items: { include: { product: { select: { name: true } } } }, client: { select: { name: true } }, user: { select: { name: true } } },
    }),
    prisma.sale.count({ where }),
  ]);
  return paginate(rows.map(serialize), total, p);
}

export async function getSale(companyId: string, id: string) {
  const sale = await prisma.sale.findFirst({
    where: { id, companyId },
    include: { items: { include: { product: { select: { name: true } } } }, client: { select: { name: true } }, user: { select: { name: true } } },
  });
  if (!sale) throw notFound("Venda não encontrada");
  return sale;
}

// Criar venda: valida produtos da empresa, calcula totais no servidor e,
// quando confirmada, baixa o estoque com movimentacoes OUT auditaveis.
export async function createSale(companyId: string, input: CreateSaleInput, userId: string, ip: string) {
  if (input.clientId) {
    const client = await prisma.client.findFirst({ where: { id: input.clientId, companyId, active: true } });
    if (!client) throw badRequest("Cliente inválido para esta empresa");
  }
  const productIds = input.items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, companyId, active: true } });
  const byId = new Map(products.map((x) => [x.id, x]));
  if (byId.size !== new Set(productIds).size) throw badRequest("Um dos produtos não pertence a esta empresa ou está inativo");

  let total = 0;
  const itens = input.items.map((i) => {
    const prod = byId.get(i.productId)!;
    const lineTotal = Math.round(i.quantity * i.unitPrice * 100) / 100;
    total = Math.round((total + lineTotal) * 100) / 100;
    return { productId: prod.id, quantity: i.quantity, unitPrice: i.unitPrice, lineTotal };
  });

  if (input.confirm) {
    for (const i of itens) {
      const prod = byId.get(i.productId)!;
      if (prod.trackStock && i.quantity > Number(prod.stockQuantity)) {
        throw badRequest(`Estoque insuficiente para "${prod.name}": disponível ${Number(prod.stockQuantity)} ${prod.unit}, solicitado ${i.quantity}`);
      }
    }
  }

  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        companyId,
        clientId: input.clientId,
        userId,
        status: input.confirm ? "CONFIRMED" : "PENDING",
        total,
        notes: input.notes,
        items: { create: itens },
      },
    });
    if (input.confirm) {
      for (const i of itens) {
        const prod = byId.get(i.productId)!;
        if (!prod.trackStock) continue;
        await tx.stockMovement.create({
          data: { companyId, productId: prod.id, kind: "OUT", quantity: i.quantity, note: "Venda " + created.id.slice(0, 8), createdBy: userId },
        });
        await tx.product.update({ where: { id: prod.id }, data: { stockQuantity: Number(prod.stockQuantity) - i.quantity } });
      }
    }
    return created;
  });

  await audit({ userId, companyId, action: "sale.create", entity: "sale", entityId: sale.id, ip, metadata: { total, confirm: input.confirm, items: itens.length } });
  return getSale(companyId, sale.id).then(serialize);
}

// Confirmar: baixa estoque. Cancelar: devolve estoque se estava confirmada.
export async function changeStatus(companyId: string, id: string, status: "CONFIRMED" | "CANCELLED", userId: string, ip: string) {
  const sale = await prisma.sale.findFirst({ where: { id, companyId }, include: { items: true } });
  if (!sale) throw notFound("Venda não encontrada");
  if (sale.status === status) throw badRequest("A venda já está com este status");
  if (sale.status === "CANCELLED") throw badRequest("Venda cancelada não pode mudar de status");

  const items = sale.items;
  await prisma.$transaction(async (tx) => {
    if (status === "CONFIRMED") {
      for (const i of items) {
        const prod = await tx.product.findFirst({ where: { id: i.productId, companyId } });
        if (!prod || !prod.trackStock) continue;
        if (Number(i.quantity) > Number(prod.stockQuantity)) {
          throw badRequest(`Estoque insuficiente para "${prod.name}": disponível ${Number(prod.stockQuantity)} ${prod.unit}`);
        }
        await tx.stockMovement.create({
          data: { companyId, productId: prod.id, kind: "OUT", quantity: i.quantity, note: "Venda " + sale.id.slice(0, 8), createdBy: userId },
        });
        await tx.product.update({ where: { id: prod.id }, data: { stockQuantity: Number(prod.stockQuantity) - Number(i.quantity) } });
      }
    }
    if (status === "CANCELLED" && sale.status === "CONFIRMED") {
      for (const i of items) {
        const prod = await tx.product.findFirst({ where: { id: i.productId, companyId } });
        if (!prod || !prod.trackStock) continue;
        await tx.stockMovement.create({
          data: { companyId, productId: prod.id, kind: "IN", quantity: i.quantity, note: "Estorno da venda " + sale.id.slice(0, 8), createdBy: userId },
        });
        await tx.product.update({ where: { id: prod.id }, data: { stockQuantity: Number(prod.stockQuantity) + Number(i.quantity) } });
      }
    }
    await tx.sale.update({ where: { id }, data: { status } });
  });

  await audit({ userId, companyId, action: "sale." + status.toLowerCase(), entity: "sale", entityId: id, ip });
  return getSale(companyId, id).then(serialize);
}
