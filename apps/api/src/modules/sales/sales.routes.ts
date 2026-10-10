import type { FastifyInstance } from "fastify";
import { createSaleSchema, listSalesQuery, updateSaleStatusSchema } from "./sales.schemas";
import * as service from "./sales.service";
import { resolveCompanyContext } from "../../lib/company-context";
import { assertPermission } from "../../lib/rbac";

// RBAC e isolamento por empresa sempre no backend (secoes 34/35).
export async function salesRoutes(app: FastifyInstance): Promise<void> {
  app.get("/sales", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "sale:read");
    const q = listSalesQuery.parse(req.query);
    return service.listSales(ctx.companyId, { page: q.page, pageSize: q.pageSize }, { search: q.search, status: q.status });
  });

  app.post("/sales", { preHandler: [app.authenticate] }, async (req, reply) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "sale:write");
    const input = createSaleSchema.parse(req.body);
    const sale = await service.createSale(ctx.companyId, input, ctx.userId, req.ip);
    return reply.status(201).send(sale);
  });

  app.get("/sales/:id", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "sale:read");
    const { id } = req.params as { id: string };
    return service.getSale(ctx.companyId, id);
  });

  app.patch("/sales/:id/status", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "sale:write");
    const { id } = req.params as { id: string };
    const { status } = updateSaleStatusSchema.parse(req.body);
    return service.changeStatus(ctx.companyId, id, status, ctx.userId, req.ip);
  });
}
