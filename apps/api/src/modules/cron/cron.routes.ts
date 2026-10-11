import type { FastifyInstance } from "fastify";
import { resolveCompanyContext } from "../../lib/company-context";
import { assertPlatformAdmin } from "../../lib/platform";
import { audit } from "../../lib/audit";
import { alternarJobSchema } from "./cron.schemas";
import * as service from "./cron.service";

// Rotinas agendadas (seção 37, Operações). Rotina é coisa da plataforma, não de
// uma empresa: desde a Fase 1 de isolamento só o administrador da plataforma
// (platformRole SUPER_ADMIN, conferido no banco a cada requisição) lista, liga
// e executa. A empresa ativa continua assinando a auditoria.
// A varredura global do "executar agora" alcança todas as empresas ativas — o
// mesmo escopo do sino administrativo (POST /notifications/scan usa a empresa
// ativa; aqui a decisão é do job, não do requisitante).
export async function cronRoutes(app: FastifyInstance): Promise<void> {
  app.get("/ops/jobs", { preHandler: [app.authenticate] }, async (req) => {
    await assertPlatformAdmin(req);
    return service.listarJobs();
  });

  app.patch("/ops/jobs/:slug", { preHandler: [app.authenticate] }, async (req) => {
    await assertPlatformAdmin(req);
    const ctx = await resolveCompanyContext(req);
    const { slug } = req.params as { slug: string };
    const dados = alternarJobSchema.parse(req.body);
    const job = await service.alternarJob(slug, dados.habilitada);
    await audit({
      userId: ctx.userId,
      companyId: ctx.companyId,
      action: "cron.job.updated",
      entity: "cron_job",
      entityId: slug,
      ip: req.ip,
      metadata: { habilitada: dados.habilitada },
    });
    return job;
  });

  app.post("/ops/jobs/:slug/run", { preHandler: [app.authenticate] }, async (req) => {
    await assertPlatformAdmin(req);
    const ctx = await resolveCompanyContext(req);
    const { slug } = req.params as { slug: string };
    const r = await service.executar(slug, { origem: "manual" });
    await audit({
      userId: ctx.userId,
      companyId: ctx.companyId,
      action: "cron.job.run",
      entity: "cron_job",
      entityId: slug,
      ip: req.ip,
      metadata: { status: r.status, mensagem: r.mensagem, duracaoMs: r.job.duracaoMs, origem: "manual" },
    });
    return r;
  });
}
