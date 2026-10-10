import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { badRequest, conflict, notFound } from "../../lib/errors";
import { paginate, skipTake, type PaginationInput } from "../../lib/pagination";
import { audit } from "../../lib/audit";
import type {
  CreateMovementInput,
  CreateProductInput,
  UpdateProductInput,
} from "./products.schemas";

// Decimal do Prisma vira numero no JSON para nao quebrar o frontend.
const num = (v: Prisma.Decimal | null) => (v === null ? null : Number(v));

export function serialize(p: {
  id: string; companyId: string; name: string; sku: string | null; unit: string;
  categoryId: string | null; costPrice: Prisma.Decimal | null; salePrice: Prisma.Decimal;
  stockQuantity: Prisma.Decimal; minStock: Prisma.Decimal; trackStock: boolean;
  description: string | null; active: boolean; createdAt: Date; updatedAt: Date;
}) {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    unit: p.unit,
    categoryId: p.categoryId,
    costPrice: num(p.costPrice),
    salePrice: num(p.salePrice),
    stockQuantity: num(p.stockQuantity),
    minStock: num(p.minStock),
    trackStock: p.trackStock,
    description: p.description,
    active: p.active,
    lowStock: p.trackStock && Number(p.stockQuantity) <= Number(p.minStock),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

// ===== Categorias =====
export async function listCategories(companyId: string) {
  return prisma.productCategory.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, active: true, _count: { select: { products: true } } },
  });
}

export async function createCategory(companyId: string, name: string, userId: string, ip: string) {
  try {
    const cat = await prisma.productCategory.create({ data: { companyId, name } });
    await audit({ userId, companyId, action: "category.create", entity: "product_category", entityId: cat.id, ip });
    return cat;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw conflict("Já existe uma categoria com este nome");
    }
    throw e;
  }
}

export async function updateCategory(companyId: string, id: string, input: { name?: string; active?: boolean }, userId: string, ip: string) {
  const cat = await prisma.productCategory.findFirst({ where: { id, companyId } });
  if (!cat) throw notFound("Categoria não encontrada");
  try {
    const updated = await prisma.productCategory.update({ where: { id }, data: input });
    await audit({ userId, companyId, action: "category.update", entity: "product_category", entityId: id, ip });
    return updated;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw conflict("Já existe uma categoria com este nome");
    }
    throw e;
  }
}

// ===== Produtos =====
export async function listProducts(
  companyId: string,
  p: PaginationInput,
  opts: { search?: string; categoryId?: string; lowStock?: boolean; active?: boolean },
) {
  const where: Prisma.ProductWhereInput = {
    companyId,
    ...(opts.active !== undefined ? { active: opts.active } : {}),
    ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
    ...(opts.search
      ? {
          OR: [
            { name: { contains: opts.search } },
            { sku: { contains: opts.search } },
            { description: { contains: opts.search } },
          ],
        }
      : {}),
  };
  // Estoque baixo: Prisma nao compara duas colunas; buscamos os ids via SQL bruto.
  if (opts.lowStock) {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM products
      WHERE company_id = ${companyId} AND track_stock = 1
        AND stock_quantity <= min_stock
      LIMIT 500`;
    where.id = { in: rows.map((r) => r.id) };
  }

  const [data, total] = await Promise.all([
    prisma.product.findMany({ where, orderBy: { createdAt: "desc" }, ...skipTake(p) }),
    prisma.product.count({ where }),
  ]);
  const cats = await prisma.productCategory.findMany({
    where: { companyId },
    select: { id: true, name: true },
  });
  const catName = new Map(cats.map((c) => [c.id, c.name]));
  return paginate(
    data.map((x) => ({ ...serialize(x), categoryName: x.categoryId ? catName.get(x.categoryId) ?? null : null })),
    total,
    p,
  );
}

export async function createProduct(companyId: string, input: CreateProductInput, userId: string, ip: string) {
  await assertCategory(companyId, input.categoryId);
  try {
    const product = await prisma.product.create({ data: { ...input, companyId } });
    if (Number(input.stockQuantity) > 0) {
      await prisma.stockMovement.create({
        data: { companyId, productId: product.id, kind: "IN", quantity: input.stockQuantity, note: "Estoque inicial", createdBy: userId },
      });
    }
    await audit({ userId, companyId, action: "product.create", entity: "product", entityId: product.id, ip });
    return serialize(product);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw conflict("Já existe um produto com este SKU");
    }
    throw e;
  }
}

export async function getProduct(companyId: string, id: string) {
  const product = await prisma.product.findFirst({ where: { id, companyId } });
  if (!product) throw notFound("Produto não encontrado");
  return product;
}

export async function updateProduct(companyId: string, id: string, input: UpdateProductInput, userId: string, ip: string) {
  await getProduct(companyId, id);
  if (input.categoryId !== undefined) await assertCategory(companyId, input.categoryId);
  try {
    const product = await prisma.product.update({ where: { id }, data: input });
    await audit({ userId, companyId, action: "product.update", entity: "product", entityId: id, ip });
    return serialize(product);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw conflict("Já existe um produto com este SKU");
    }
    throw e;
  }
}

// Exclusão lógica: preserva movimentacoes e futuros itens de venda.
export async function deactivateProduct(companyId: string, id: string, userId: string, ip: string) {
  await getProduct(companyId, id);
  await prisma.product.update({ where: { id }, data: { active: false } });
  await audit({ userId, companyId, action: "product.delete", entity: "product", entityId: id, ip });
  return { ok: true };
}

// ===== Movimentacoes de estoque =====
export async function moveStock(companyId: string, productId: string, input: CreateMovementInput, userId: string, ip: string) {
  const product = await getProduct(companyId, productId);
  const current = Number(product.stockQuantity);

  let newStock = current;
  if (input.kind === "IN") newStock = current + input.quantity;
  if (input.kind === "OUT") {
    if (input.quantity > current) {
      throw badRequest(`Estoque insuficiente: disponível ${current} ${product.unit}, solicitado ${input.quantity} ${product.unit}`);
    }
    newStock = current - input.quantity;
  }
  if (input.kind === "ADJUST") newStock = input.quantity;

  const [movement] = await prisma.$transaction([
    prisma.stockMovement.create({
      data: { companyId, productId, kind: input.kind, quantity: input.quantity, note: input.note, createdBy: userId },
    }),
    prisma.product.update({ where: { id: productId }, data: { stockQuantity: newStock } }),
  ]);
  await audit({
    userId, companyId, action: "stock.move", entity: "stock_movement", entityId: movement.id, ip,
    metadata: { productId, kind: input.kind, quantity: input.quantity, from: current, to: newStock },
  });
  return { stockQuantity: newStock, movementId: movement.id };
}

export async function listMovements(companyId: string, productId: string, p: PaginationInput, kind?: "IN" | "OUT" | "ADJUST") {
  await getProduct(companyId, productId);
  const where = { companyId, productId, ...(kind ? { kind } : {}) };
  const [rows, total] = await Promise.all([
    prisma.stockMovement.findMany({ where, orderBy: { createdAt: "desc" }, ...skipTake(p) }),
    prisma.stockMovement.count({ where }),
  ]);
  return paginate(
    rows.map((m) => ({ ...m, quantity: Number(m.quantity) })),
    total,
    p,
  );
}

// Resumo do estoque para o topo da pagina de produtos.
export async function stockSummary(companyId: string) {
  const [total, lowRows, out] = await Promise.all([
    prisma.product.count({ where: { companyId, active: true } }),
    prisma.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(*) AS n FROM products
      WHERE company_id = ${companyId} AND active = 1 AND track_stock = 1
        AND stock_quantity <= min_stock`,
    prisma.product.count({ where: { companyId, active: true, trackStock: true, stockQuantity: { lte: 0 } } }),
  ]);
  return { totalProducts: total, lowStock: Number(lowRows[0]?.n ?? 0), outOfStock: out };
}

async function assertCategory(companyId: string, categoryId?: string) {
  if (!categoryId) return;
  const cat = await prisma.productCategory.findFirst({ where: { id: categoryId, companyId } });
  if (!cat) throw badRequest("Categoria inválida para esta empresa");
}
