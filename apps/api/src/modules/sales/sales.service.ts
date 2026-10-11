import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { badRequest, notFound } from "../../lib/errors";
import { paginate, skipTake, type PaginationInput } from "../../lib/pagination";
import { audit } from "../../lib/audit";
import { baixarEstoque, subirEstoque } from "../../lib/stock";
import { transacaoEstoque } from "../../lib/tx";
import type { CreateSaleInput } from "./sales.schemas";
import { avisoEstoqueBaixo, avisoVenda } from "../notifications/notifications.service";

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

  const sale = await transacaoEstoque(async (tx) => {
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
        // Fase 3 (oversell): a baixa é decremento condicional dentro da tx —
        // o saldo casa no WHERE, não na comparação de uma leitura velha.
        await baixarEstoque({
          tx, companyId, productId: prod.id, quantity: i.quantity,
          nome: prod.name, unidade: prod.unit,
          nota: "Venda " + created.id.slice(0, 8), createdBy: userId,
        });
      }
    }
    return created;
  });

  await audit({ userId, companyId, action: "sale.create", entity: "sale", entityId: sale.id, ip, metadata: { total, confirm: input.confirm, items: itens.length } });

  // Venda ja criada confirmada: o aviso de negocio e o de estoque baixo saem
  // juntos, porque o estoque baixou na mesma transacao (secoes 38 e 44).
  if (input.confirm) {
    for (const i of itens) await avisoEstoqueBaixo(companyId, i.productId, userId);
  }
  // Pedido criado como rascunho (PENDING) nao dispara aviso: o que a equipe
  // precisa saber e da venda que entrou em vigor ou foi cancelada. Anunciar um
  // pedido pendente com o texto de "cancelada" gerava aviso duplicado na lista.
  if (input.confirm) {
    await avisoVenda(
      companyId,
      { saleId: sale.id, total, itens: itens.length, fromUserId: userId },
      true,
    );
  }
  return getSale(companyId, sale.id).then(serialize);
}

// Confirmar: baixa estoque. Cancelar: devolve estoque se estava confirmada.
// Fase 3 da auditoria: o status é reivindicado DENTRO da transação com um
// update condicional no status antigo — dois "confirmar" simultâneos não
// baixam mais o estoque duas vezes, porque o segundo perde a reivindicação e
// a transação inteira dele volta. A baixa/devolução em si é o decremento/
// increment atômico de lib/stock.ts, e cada escrita continua carregando o
// companyId no where (camada da Fase 1c).
export async function changeStatus(companyId: string, id: string, status: "CONFIRMED" | "CANCELLED", userId: string, ip: string) {
  const sale = await prisma.sale.findFirst({ where: { id, companyId }, include: { items: true } });
  if (!sale) throw notFound("Venda não encontrada");
  if (sale.status === status) throw badRequest("A venda já está com este status");
  if (sale.status === "CANCELLED") throw badRequest("Venda cancelada não pode mudar de status");

  const items = sale.items;
  await transacaoEstoque(async (tx) => {
    const reivindicado = await tx.sale.updateMany({
      where: { id, companyId, status: sale.status },
      data: { status },
    });
    if (reivindicado.count === 0) {
      throw badRequest("A venda mudou de status em outra requisição — recarregue e tente de novo");
    }
    if (status === "CONFIRMED") {
      for (const i of items) {
        const prod = await tx.product.findFirst({ where: { id: i.productId, companyId } });
        if (!prod || !prod.trackStock) continue;
        await baixarEstoque({
          tx, companyId, productId: prod.id, quantity: Number(i.quantity),
          nome: prod.name, unidade: prod.unit,
          nota: "Venda " + sale.id.slice(0, 8), createdBy: userId,
        });
      }
    }
    if (status === "CANCELLED" && sale.status === "CONFIRMED") {
      for (const i of items) {
        const prod = await tx.product.findFirst({ where: { id: i.productId, companyId } });
        if (!prod || !prod.trackStock) continue;
        await subirEstoque({
          tx, companyId, productId: prod.id, quantity: Number(i.quantity),
          nota: "Estorno da venda " + sale.id.slice(0, 8), createdBy: userId,
        });
      }
    }
  });

  await audit({ userId, companyId, action: "sale." + status.toLowerCase(), entity: "sale", entityId: id, ip });

  const registrada = await getSale(companyId, id);
  await avisoVenda(
    companyId,
    {
      saleId: id,
      total: Number(registrada.total),
      clientName: registrada.client?.name ?? null,
      itens: registrada.items.length,
      fromUserId: userId,
    },
    status === "CONFIRMED",
  );
  if (status === "CONFIRMED") {
    for (const i of registrada.items) await avisoEstoqueBaixo(companyId, i.productId, userId);
  }
  return serialize(registrada);
}
