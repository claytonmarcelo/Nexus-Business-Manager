import type { FastifyInstance } from "fastify";
import { addMemberSchema, listUsersQuery, updateRoleSchema } from "./users.schemas";
import * as service from "./users.service";
import { resolveCompanyContext } from "../../lib/company-context";
import { assertPermission } from "../../lib/rbac";
import { matrizPermissoes } from "../../lib/rbac";

export async function usersRoutes(app: FastifyInstance): Promise<void> {
  app.get("/users", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "user:read");
    const q = listUsersQuery.parse(req.query);
    return service.listMembers(ctx.companyId, { page: q.page, pageSize: q.pageSize }, q.search);
  });

  // Matriz de permissoes por papel: leitura pura do RBAC central (secao 34).
  app.get("/users/permissions", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "user:read");
    return matrizPermissoes();
  });

  app.get("/users/sessions", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "user:read");
    return service.listSessions(ctx.companyId);
  });

  app.delete("/users/sessions/:sessionId", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "user:write");
    const { sessionId } = req.params as { sessionId: string };
    return service.revokeSession(ctx.companyId, sessionId, ctx.userId, req.ip);
  });

  app.post("/users", { preHandler: [app.authenticate] }, async (req, reply) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "user:write");
    const input = addMemberSchema.parse(req.body);
    const member = await service.addMember(ctx.companyId, input, ctx.userId, req.ip, ctx.role);
    return reply.status(201).send(member);
  });

  app.patch("/users/:userId/role", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "user:write");
    const { userId } = req.params as { userId: string };
    const { role } = updateRoleSchema.parse(req.body);
    // Fase 1 da auditoria: a regra de papel mora no serviço, que conhece o papel
    // atual do alvo — o rota só entrega o papel de quem chama.
    return service.updateRole(ctx.companyId, userId, role, ctx.userId, req.ip, ctx.role);
  });
}
