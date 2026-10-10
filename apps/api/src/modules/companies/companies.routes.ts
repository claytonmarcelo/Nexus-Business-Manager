import type { FastifyInstance } from "fastify";
import { createCompanySchema } from "./companies.schemas";
import * as service from "./companies.service";
import { prisma } from "../../lib/prisma";
import { resolveCompanyContext } from "../../lib/company-context";
import { assertPermission } from "../../lib/rbac";
import { authPayload } from "../../lib/auth";

export async function companiesRoutes(app: FastifyInstance): Promise<void> {
  // Criar empresa não exige empresa ativa no token (bootstrap de novo tenant).
  app.post("/companies", { preHandler: [app.authenticate] }, async (req, reply) => {
    const input = createCompanySchema.parse(req.body);
    const company = await service.createCompany(input, authPayload(req).sub, req.ip);
    return reply.status(201).send(company);
  });

  app.get("/companies", { preHandler: [app.authenticate] }, async (req) => {
    return service.listCompaniesForUser(authPayload(req).sub);
  });

  app.get("/companies/current", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "company:read");
    const company = await prisma.company.findUnique({ where: { id: ctx.companyId } });
    return { ...company, role: ctx.role };
  });
}
