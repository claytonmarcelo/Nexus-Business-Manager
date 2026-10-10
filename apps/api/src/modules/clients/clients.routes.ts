import type { FastifyInstance } from "fastify";
import { createClientSchema, listClientsQuery, updateClientSchema } from "./clients.schemas";
import * as service from "./clients.service";
import { resolveCompanyContext } from "../../lib/company-context";
import { assertPermission } from "../../lib/rbac";

// RBAC e isolamento sempre no backend (seções 34/35). company_id nunca vem do cliente.
export async function clientsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/clients", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "client:read");
    const q = listClientsQuery.parse(req.query);
    return service.listClients(ctx.companyId, { page: q.page, pageSize: q.pageSize }, q.search);
  });

  app.post("/clients", { preHandler: [app.authenticate] }, async (req, reply) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "client:write");
    const input = createClientSchema.parse(req.body);
    const client = await service.createClient(ctx.companyId, input, ctx.userId, req.ip);
    return reply.status(201).send(client);
  });

  app.get("/clients/:id", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "client:read");
    const { id } = req.params as { id: string };
    return service.getClient(ctx.companyId, id);
  });

  app.patch("/clients/:id", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "client:write");
    const { id } = req.params as { id: string };
    const input = updateClientSchema.parse(req.body);
    return service.updateClient(ctx.companyId, id, input, ctx.userId, req.ip);
  });

  // Exclusão lógica (histórico preservado).
  app.delete("/clients/:id", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "client:write");
    const { id } = req.params as { id: string };
    return service.deactivateClient(ctx.companyId, id, ctx.userId, req.ip);
  });
}
