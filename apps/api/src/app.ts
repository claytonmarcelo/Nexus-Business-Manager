import Fastify, { type FastifyInstance, type FastifyError, type FastifyServerOptions } from "fastify";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError, badRequest } from "./lib/errors";
import { registerSecurity } from "./plugins/security";
import { registerMaintenance } from "./plugins/maintenance";
import { registerAuthGate } from "./plugins/gate";
import authPlugin from "./plugins/auth";
import { authRoutes } from "./modules/auth/auth.routes";
import { companiesRoutes } from "./modules/companies/companies.routes";
import { usersRoutes } from "./modules/users/users.routes";
import { auditRoutes } from "./modules/audit/audit.routes";
import { clientsRoutes } from "./modules/clients/clients.routes";
import { productsRoutes } from "./modules/products/products.routes";
import { salesRoutes } from "./modules/sales/sales.routes";
import { serviceOrdersRoutes } from "./modules/service-orders/service-orders.routes";
import { purchasesRoutes } from "./modules/purchases/purchases.routes";
import { financeRoutes } from "./modules/finance/finance.routes";
import { chargesRoutes } from "./modules/charges/charges.routes";
import { gatewaysRoutes } from "./modules/gateways/gateways.routes";
import { crmRoutes } from "./modules/crm/crm.routes";
import { agendaRoutes } from "./modules/agenda/agenda.routes";
import { reportsRoutes } from "./modules/reports/reports.routes";
import { notificationsRoutes } from "./modules/notifications/notifications.routes";
import { cmsRoutes } from "./modules/cms/cms.routes";
import { cronRoutes } from "./modules/cron/cron.routes";
import { healthRoutes } from "./modules/health/health.routes";
import { env, isProd } from "./config/env";
import { interpretarTrustProxy } from "./config/producao";

export function buildApp(): FastifyInstance {
  // A9: `trustProxy` passou a ser uma união (ligado/desligado ou número de
  // saltos). Declarar o objeto com o tipo público do Fastify mantém o servidor
  // HTTP padrão — sem a anotação, a inferência dos genéricos escapa para
  // Http2SecureServer e o tipo de `app` muda em todo o arquivo.
  const opcoes: FastifyServerOptions = {
    logger: isProd
      ? { level: "info" }
      : { level: "info" },
    // Fase 2 da auditoria: o IP real atrás de proxy só vale com TRUST_PROXY
    // explícito — sem proxy na frente, o header é forjável e rate-limit,
    // auditoria e bypass de manutenção mentiriam juntos. A9 deu número à chave:
    // 0 desliga e 1..31 confiam nos N saltos de proxy mais próximos (a função
    // que o Fastify repassa ao proxy-addr). Body limit dito por nós, não
    // herdado em silêncio do default do framework.
    trustProxy: interpretarTrustProxy(env.TRUST_PROXY),
    bodyLimit: env.BODY_LIMIT_BYTES,
  };
  const app = Fastify(opcoes);

  // POST sem corpo (deslogar, marcar tudo lido, gerar o pulso da manutenção) é
  // uma ação, não um formulário: o axios manda content-type application/json
  // com payload vazio, e o parser padrão recusaria com 400 "Body cannot be
  // empty". Aqui corpo vazio vale {} — JSON escrito errado continua 400, mas
  // com a nossa mensagem.
  app.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
    const texto = String(body).trim();
    if (texto === "") return done(null, {});
    try {
      done(null, JSON.parse(texto));
    } catch {
      done(badRequest("JSON inválido no corpo da requisição"), undefined);
    }
  });

  void registerSecurity(app);
  void app.register(authPlugin);
  // Manutencao antes das rotas: o gancho precisa estar na linha antes de
  // qualquer rota de negocio ser registrada no mesmo contexto.
  registerMaintenance(app);
  // Gate estrutural (Fase 2): registrado aqui, antes da PRIMEIRA rota — a
  // partir daqui toda rota nova sem autenticação e sem carimbo público derruba
  // a subida em vez de nascer aberta.
  registerAuthGate(app);

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
    // Prisma: update/delete que não achou a linha → 404. Desde a Fase 1c da
    // auditoria as escritas de tenant carregam o companyId no where; se o id
    // pertence a outra empresa a condição não casa e o Prisma joga P2025 —
    // aqui isso vira um 404 honesto em vez de um 500 que vazaria o motivo.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return reply.status(404).send({ error: "NOT_FOUND", message: "Recurso não encontrado" });
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
  void app.register(serviceOrdersRoutes, { prefix: "/api" });
  void app.register(purchasesRoutes, { prefix: "/api" });
  void app.register(financeRoutes, { prefix: "/api" });
  void app.register(chargesRoutes, { prefix: "/api" });
  void app.register(gatewaysRoutes, { prefix: "/api" });
  void app.register(crmRoutes, { prefix: "/api" });
  void app.register(agendaRoutes, { prefix: "/api" });
  void app.register(reportsRoutes, { prefix: "/api" });
  void app.register(notificationsRoutes, { prefix: "/api" });
  void app.register(cmsRoutes, { prefix: "/api" });
  void app.register(cronRoutes, { prefix: "/api" });

  return app;
}
