import type { FastifyInstance } from "fastify";
import {
  createPurchaseSchema, createSupplierSchema, listPurchasesQuery, listSuppliersQuery,
  updatePurchaseStatusSchema, updateSupplierSchema,
} from "./purchases.schemas";
import * as service from "./purchases.service";
import { resolveCompanyContext } from "../../lib/company-context";
import { assertPermission } from "../../lib/rbac";

// RBAC e isolamento por empresa sempre no backend (secoes 34/35).
export async function purchasesRoutes(app: FastifyInstance): Promise<void> {
  app.get("/suppliers", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "supplier:read");
    const q = listSuppliersQuery.parse(req.query);
    return service.listSuppliers(ctx.companyId, { page: q.page, pageSize: q.pageSize }, { search: q.search, active: q.active === undefined ? undefined : q.active === "true" });
  });

  app.post("/suppliers", { preHandler: [app.authenticate] }, async (req, reply) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "supplier:write");
    const input = createSupplierSchema.parse(req.body);
    return reply.status(201).send(await service.createSupplier(ctx.companyId, input, ctx.userId, req.ip));
  });

  app.patch("/suppliers/:id", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "supplier:write");
    const { id } = req.params as { id: string };
    const input = updateSupplierSchema.parse(req.body);
    return service.updateSupplier(ctx.companyId, id, input, ctx.userId, req.ip);
  });

  app.delete("/suppliers/:id", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "supplier:write");
    const { id } = req.params as { id: string };
    return service.deactivateSupplier(ctx.companyId, id, ctx.userId, req.ip);
  });

  app.get("/purchases", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "purchase:read");
    const q = listPurchasesQuery.parse(req.query);
    return service.listPurchases(ctx.companyId, { page: q.page, pageSize: q.pageSize }, { search: q.search, status: q.status, supplierId: q.supplierId });
  });

  app.post("/purchases", { preHandler: [app.authenticate] }, async (req, reply) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "purchase:write");
    const input = createPurchaseSchema.parse(req.body);
    return reply.status(201).send(await service.createPurchase(ctx.companyId, input, ctx.userId, req.ip));
  });

  app.get("/purchases/:id", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "purchase:read");
    const { id } = req.params as { id: string };
    return service.getPurchase(ctx.companyId, id).then((p) => p);
  });

  app.patch("/purchases/:id/status", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "purchase:write");
    const { id } = req.params as { id: string };
    const { status } = updatePurchaseStatusSchema.parse(req.body);
    return service.changeStatus(ctx.companyId, id, status, ctx.userId, req.ip);
  });
}
