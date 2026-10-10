import type { FastifyInstance } from "fastify";
import {
  createCategorySchema,
  createMovementSchema,
  createProductSchema,
  listMovementsQuery,
  listProductsQuery,
  updateCategorySchema,
  updateProductSchema,
} from "./products.schemas";
import * as service from "./products.service";
import { resolveCompanyContext } from "../../lib/company-context";
import { assertPermission } from "../../lib/rbac";

// RBAC e isolamento por empresa sempre no backend (secoes 34/35).
export async function productsRoutes(app: FastifyInstance): Promise<void> {
  // ===== Categorias =====
  app.get("/product-categories", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "product:read");
    return service.listCategories(ctx.companyId);
  });

  app.post("/product-categories", { preHandler: [app.authenticate] }, async (req, reply) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "product:write");
    const input = createCategorySchema.parse(req.body);
    const cat = await service.createCategory(ctx.companyId, input.name, ctx.userId, req.ip);
    return reply.status(201).send(cat);
  });

  app.patch("/product-categories/:id", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "product:write");
    const { id } = req.params as { id: string };
    const input = updateCategorySchema.parse(req.body);
    return service.updateCategory(ctx.companyId, id, input, ctx.userId, req.ip);
  });

  // ===== Produtos =====
  app.get("/products", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "product:read");
    const q = listProductsQuery.parse(req.query);
    return service.listProducts(ctx.companyId, { page: q.page, pageSize: q.pageSize }, {
      search: q.search, categoryId: q.categoryId, lowStock: q.lowStock, active: q.active,
    });
  });

  app.get("/products/stock-summary", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "product:read");
    return service.stockSummary(ctx.companyId);
  });

  app.post("/products", { preHandler: [app.authenticate] }, async (req, reply) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "product:write");
    const input = createProductSchema.parse(req.body);
    const product = await service.createProduct(ctx.companyId, input, ctx.userId, req.ip);
    return reply.status(201).send(product);
  });

  app.get("/products/:id", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "product:read");
    const { id } = req.params as { id: string };
    const product = await service.getProduct(ctx.companyId, id);
    return product;
  });

  app.patch("/products/:id", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "product:write");
    const { id } = req.params as { id: string };
    const input = updateProductSchema.parse(req.body);
    return service.updateProduct(ctx.companyId, id, input, ctx.userId, req.ip);
  });

  // Exclusao logica (historico preservado).
  app.delete("/products/:id", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "product:write");
    const { id } = req.params as { id: string };
    return service.deactivateProduct(ctx.companyId, id, ctx.userId, req.ip);
  });

  // ===== Movimentacoes =====
  app.post("/products/:id/movements", { preHandler: [app.authenticate] }, async (req, reply) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "product:write");
    const { id } = req.params as { id: string };
    const input = createMovementSchema.parse(req.body);
    const result = await service.moveStock(ctx.companyId, id, input, ctx.userId, req.ip);
    return reply.status(201).send(result);
  });

  app.get("/products/:id/movements", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "product:read");
    const { id } = req.params as { id: string };
    const q = listMovementsQuery.parse(req.query);
    return service.listMovements(ctx.companyId, id, { page: q.page, pageSize: q.pageSize }, q.kind);
  });
}
