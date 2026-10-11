import type { FastifyInstance } from "fastify";
import { createCompanySchema, updateCompanySchema } from "./companies.schemas";
import * as service from "./companies.service";
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

  // A tela de Configurações lê exatamente o shape que escreve — Decimal como
  // número, sem timestamp que a tela ignora e sem campo que ela não mostra.
  app.get("/companies/current", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "company:read");
    const empresa = await service.getCompanySettings(ctx.companyId);
    return { ...empresa, role: ctx.role };
  });

  // Escrever configuração da empresa é `settings:write` (OWNER e ADMIN). MANAGER
  // e STAFF leem — precisam da moeda e do fuso da empresa para ver os próprios
  // números formatados — e não gravam.
  app.patch("/companies/current", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "settings:write");
    const input = updateCompanySchema.parse(req.body);
    return service.updateCompanySettings(ctx.companyId, input, {
      userId: ctx.userId,
      ip: req.ip,
    });
  });

  // Listas do produto (UF, moeda, idioma, fusos do Brasil), iguais para qualquer
  // empresa. A tela pede aqui em vez de manter cópia à parte da regra que o
  // servidor usa para aceitar o valor.
  app.get("/companies/settings/opcoes", { preHandler: [app.authenticate] }, async () =>
    service.opcoesDeConfiguracao(),
  );
}
