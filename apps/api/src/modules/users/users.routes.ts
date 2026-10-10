import type { FastifyInstance } from "fastify";
import { addMemberSchema, listUsersQuery, updateRoleSchema } from "./users.schemas";
import * as service from "./users.service";
import { resolveCompanyContext } from "../../lib/company-context";
import { assertPermission } from "../../lib/rbac";
import { forbidden } from "../../lib/errors";

export async function usersRoutes(app: FastifyInstance): Promise<void> {
  app.get("/users", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "user:read");
    const q = listUsersQuery.parse(req.query);
    return service.listMembers(ctx.companyId, { page: q.page, pageSize: q.pageSize }, q.search);
  });

  app.post("/users", { preHandler: [app.authenticate] }, async (req, reply) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "user:write");
    const input = addMemberSchema.parse(req.body);
    const member = await service.addMember(ctx.companyId, input, ctx.userId, req.ip);
    return reply.status(201).send(member);
  });

  app.patch("/users/:userId/role", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "user:write");
    const { userId } = req.params as { userId: string };
    // Impede um não-OWNER rebaixar/promover sem autoridade; OWNER é o único que altera OWNER.
    const { role } = updateRoleSchema.parse(req.body);
    if (role === "OWNER" && ctx.role !== "OWNER") throw forbidden("Apenas o proprietário transfere propriedade");
    return service.updateRole(ctx.companyId, userId, role, ctx.userId, req.ip);
  });
}
