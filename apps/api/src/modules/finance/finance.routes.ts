import type { FastifyInstance } from "fastify";
import {
  createFinanceCategorySchema, financeEntrySchema, listFinanceCategoriesQuery,
  listFinanceEntriesQuery, updateFinanceEntrySchema, updateFinanceStatusSchema,
} from "./finance.schemas";
import * as service from "./finance.service";
import { resolveCompanyContext } from "../../lib/company-context";
import { assertPermission } from "../../lib/rbac";

// RBAC e isolamento por empresa sempre no backend (secoes 34/35).
export async function financeRoutes(app: FastifyInstance): Promise<void> {
  app.get("/finance/categories", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "finance:read");
    const q = listFinanceCategoriesQuery.parse(req.query);
    return service.listCategories(ctx.companyId, q.type);
  });

  app.post("/finance/categories", { preHandler: [app.authenticate] }, async (req, reply) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "finance:write");
    const input = createFinanceCategorySchema.parse(req.body);
    return reply.status(201).send(await service.createCategory(ctx.companyId, input, ctx.userId, req.ip));
  });

  app.delete("/finance/categories/:id", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "finance:write");
    const { id } = req.params as { id: string };
    return service.deleteCategory(ctx.companyId, id, ctx.userId, req.ip);
  });

  app.get("/finance/summary", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "finance:read");
    const { month } = req.query as { month?: string };
    return service.summary(ctx.companyId, month);
  });

  app.get("/finance/entries", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "finance:read");
    const q = listFinanceEntriesQuery.parse(req.query);
    return service.listEntries(ctx.companyId, { page: q.page, pageSize: q.pageSize }, { search: q.search, type: q.type, status: q.status, month: q.month });
  });

  app.post("/finance/entries", { preHandler: [app.authenticate] }, async (req, reply) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "finance:write");
    const input = financeEntrySchema.parse(req.body);
    return reply.status(201).send(await service.createEntry(ctx.companyId, input, ctx.userId, req.ip));
  });

  app.get("/finance/entries/:id", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "finance:read");
    const { id } = req.params as { id: string };
    return service.getEntry(ctx.companyId, id).then((e) => service.serializeEntry(e));
  });

  app.patch("/finance/entries/:id", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "finance:write");
    const { id } = req.params as { id: string };
    const input = updateFinanceEntrySchema.parse(req.body);
    return service.updateEntry(ctx.companyId, id, input, ctx.userId, req.ip);
  });

  app.patch("/finance/entries/:id/status", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "finance:write");
    const { id } = req.params as { id: string };
    const { status } = updateFinanceStatusSchema.parse(req.body);
    return service.changeStatus(ctx.companyId, id, status, ctx.userId, req.ip);
  });
}
