import Fastify, { type FastifyInstance, type FastifyError } from "fastify";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError } from "./lib/errors";
import { registerSecurity } from "./plugins/security";
import authPlugin from "./plugins/auth";
import { authRoutes } from "./modules/auth/auth.routes";
import { companiesRoutes } from "./modules/companies/companies.routes";
import { usersRoutes } from "./modules/users/users.routes";
import { auditRoutes } from "./modules/audit/audit.routes";
import { clientsRoutes } from "./modules/clients/clients.routes";
import { productsRoutes } from "./modules/products/products.routes";
import { salesRoutes } from "./modules/sales/sales.routes";
import { purchasesRoutes } from "./modules/purchases/purchases.routes";
import { financeRoutes } from "./modules/finance/finance.routes";
import { crmRoutes } from "./modules/crm/crm.routes";
import { agendaRoutes } from "./modules/agenda/agenda.routes";
import { reportsRoutes } from "./modules/reports/reports.routes";
import { healthRoutes } from "./modules/health/health.routes";
import { isProd } from "./config/env";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: isProd
      ? { level: "info" }
      : { level: "info" },
  });

  void registerSecurity(app);
  void app.register(authPlugin);

  app.setErrorHandler((error: FastifyError, req, reply) => {
    // Zod: validação de entrada (seção 47).
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: "Dados inválidos",
        issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      });
    }
    // Erros de aplicação com status controlado.
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      });
    }
    // Rate limit do @fastify/rate-limit.
    if (error.statusCode === 429) {
      return reply.status(429).send({ error: "TOO_MANY_REQUESTS", message: "Muitas requisições" });
    }
    // Prisma: chave duplicada → 409.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return reply.status(409).send({ error: "CONFLICT", message: "Registro duplicado" });
    }
    // Não vaza detalhes internos em produção (seção 47).
    req.log.error({ err: error }, "erro não tratado");
    const payload: Record<string, unknown> = { error: "INTERNAL_ERROR", message: "Erro interno do servidor" };
    if (!isProd) payload.detail = error.message;
    return reply.status(error.statusCode && error.statusCode < 500 ? error.statusCode : 500).send(payload);
  });

  app.setNotFoundHandler((req, reply) => {
    reply.status(404).send({ error: "NOT_FOUND", message: `Rota ${req.method} ${req.url} não encontrada` });
  });

  void app.register(healthRoutes, { prefix: "/api" });
  void app.register(authRoutes, { prefix: "/api/auth" });
  void app.register(companiesRoutes, { prefix: "/api" });
  void app.register(usersRoutes, { prefix: "/api" });
  void app.register(auditRoutes, { prefix: "/api" });
  void app.register(clientsRoutes, { prefix: "/api" });
  void app.register(productsRoutes, { prefix: "/api" });
  void app.register(salesRoutes, { prefix: "/api" });
  void app.register(purchasesRoutes, { prefix: "/api" });
  void app.register(financeRoutes, { prefix: "/api" });
  void app.register(crmRoutes, { prefix: "/api" });
  void app.register(agendaRoutes, { prefix: "/api" });
  void app.register(reportsRoutes, { prefix: "/api" });

  return app;
}
