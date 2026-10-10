import type { FastifyInstance } from "fastify";
import { createLeadSchema, listLeadsQuery, updateLeadSchema, updateLeadStatusSchema } from "./crm.schemas";
import * as service from "./crm.service";
import { resolveCompanyContext } from "../../lib/company-context";
import { assertPermission } from "../../lib/rbac";

// RBAC e isolamento por empresa sempre no backend (secoes 34/35).
export async function crmRoutes(app: FastifyInstance): Promise<void> {
  app.get("/leads/pipeline", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "crm:read");
    return service.pipeline(ctx.companyId);
  });

  app.get("/leads", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "crm:read");
    const q = listLeadsQuery.parse(req.query);
    return service.listLeads(ctx.companyId, { page: q.page, pageSize: q.pageSize }, { search: q.search, status: q.status });
  });

  app.post("/leads", { preHandler: [app.authenticate] }, async (req, reply) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "crm:write");
    const input = createLeadSchema.parse(req.body);
    const lead = await service.createLead(ctx.companyId, input, ctx.userId, req.ip);
    return reply.status(201).send(lead);
  });

  app.get("/leads/:id", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "crm:read");
    const { id } = req.params as { id: string };
    return service.getLead(ctx.companyId, id).then(service.serializeLead);
  });

  app.patch("/leads/:id", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "crm:write");
    const { id } = req.params as { id: string };
    const input = updateLeadSchema.parse(req.body);
    return service.updateLead(ctx.companyId, id, input, ctx.userId, req.ip);
  });

  app.patch("/leads/:id/status", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "crm:write");
    const { id } = req.params as { id: string };
    const { status } = updateLeadStatusSchema.parse(req.body);
    return service.changeStatus(ctx.companyId, id, status, ctx.userId, req.ip);
  });
}
