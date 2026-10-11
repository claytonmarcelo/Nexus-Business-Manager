import type { FastifyInstance } from "fastify";
import { resolveCompanyContext } from "../../lib/company-context";
import { assertPlatformAdmin } from "../../lib/platform";
import { audit } from "../../lib/audit";
import { notFound } from "../../lib/errors";
import {
  atualizarItem,
  criarItem,
  estadoManutencao,
  ipPermitido,
  listarItens,
  listarLegais,
  novoTokenPulso,
  obterConfig,
  obterLegal,
  payloadPublico,
  pontuarSeo,
  pulsoValido,
  removerItem,
  salvarConfig,
  salvarLegal,
  validarKind,
} from "./cms.service";
import {
  bypassSchema,
  configSchema,
  itemPatchSchema,
  itemSchema,
  itensQuerySchema,
  kindSchema,
  legalKindSchema,
  legalSchema,
} from "./cms.schemas";

// CMS da página pública. O conteúdo é global (a vitrine é uma só, não por
// empresa), então desde a Fase 1 de isolamento ele responde pela PLATAFORMA:
// só o administrador da plataforma (platformRole SUPER_ADMIN, conferido no
// banco a cada requisição) edita. A leitura pública é anônima porque a landing
// não tem sessão. O contexto da empresa ativa continua sendo lido nas rotas de
// escrita apenas para assinar a auditoria.
export async function cmsRoutes(app: FastifyInstance): Promise<void> {
  // ---- Leitura pública (sem sessão; config.public marca a abertura para o
  // gate da Fase 2, que exige a declaração explícita em toda rota aberta) ----
  app.get("/public/landing", { config: { public: true } }, async () => payloadPublico());

  app.get("/public/legal/:kind", { config: { public: true } }, async (req) => {
    const kind = legalKindSchema.parse((req.params as { kind: string }).kind);
    const doc = await obterLegal(kind);
    // Texto só aparece no site depois de publicado pela administração.
    if (!doc.published) throw notFound("Documento ainda não publicado");
    return doc;
  });

  // O visitante que tem o pulso informa o token; a resposta é só sim/não.
  app.post(
    "/public/bypass",
    { config: { public: true, rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (req) => {
      const { token } = bypassSchema.parse(req.body);
      const estado = await estadoManutencao();
      const liberado = pulsoValido(token, estado.token) || ipPermitido(req.ip, estado.ips);
      return { liberado };
    },
  );

  // ---- Escrita (administração da plataforma) ----
  app.get("/cms/config", { preHandler: [app.authenticate] }, async (req) => {
    await assertPlatformAdmin(req);
    return obterConfig();
  });

  app.patch("/cms/config", { preHandler: [app.authenticate] }, async (req) => {
    await assertPlatformAdmin(req);
    const ctx = await resolveCompanyContext(req);
    const dados = configSchema.parse(req.body);
    return salvarConfig(dados, { userId: ctx.userId, companyId: ctx.companyId, ip: req.ip });
  });

  app.get("/cms/seo/score", { preHandler: [app.authenticate] }, async (req) => {
    await assertPlatformAdmin(req);
    const config = await obterConfig();
    return pontuarSeo(config.seo, config);
  });

  // Um token novo a cada clique: o pulso atual nunca fica exposto em listagem.
  app.post("/cms/maintenance/token", { preHandler: [app.authenticate] }, async (req) => {
    await assertPlatformAdmin(req);
    const ctx = await resolveCompanyContext(req);
    const token = novoTokenPulso();
    await salvarConfig({ manutencao: { tokenPulso: token } }, {
      userId: ctx.userId, companyId: ctx.companyId, ip: req.ip,
    });
    await audit({
      userId: ctx.userId, companyId: ctx.companyId, action: "cms.maintenance.token",
      entity: "landing_config", entityId: "default", ip: req.ip,
    });
    return { token };
  });

  app.get("/cms/items", { preHandler: [app.authenticate] }, async (req) => {
    await assertPlatformAdmin(req);
    const q = itensQuerySchema.parse(req.query);
    return { data: await listarItens(validarKind(q.kind), q.ativos ?? false) };
  });

  app.post("/cms/items", { preHandler: [app.authenticate] }, async (req, reply) => {
    await assertPlatformAdmin(req);
    const ctx = await resolveCompanyContext(req);
    const dados = itemSchema.parse(req.body);
    const criado = await criarItem(dados, { userId: ctx.userId, companyId: ctx.companyId, ip: req.ip });
    return reply.status(201).send(criado);
  });

  app.patch("/cms/items/:id", { preHandler: [app.authenticate] }, async (req) => {
    await assertPlatformAdmin(req);
    const ctx = await resolveCompanyContext(req);
    const { id } = req.params as { id: string };
    return atualizarItem(id, itemPatchSchema.parse(req.body), {
      userId: ctx.userId, companyId: ctx.companyId, ip: req.ip,
    });
  });

  app.delete("/cms/items/:id", { preHandler: [app.authenticate] }, async (req) => {
    await assertPlatformAdmin(req);
    const ctx = await resolveCompanyContext(req);
    const { id } = req.params as { id: string };
    return removerItem(id, { userId: ctx.userId, companyId: ctx.companyId, ip: req.ip });
  });

  app.get("/cms/legal", { preHandler: [app.authenticate] }, async (req) => {
    await assertPlatformAdmin(req);
    return { data: await listarLegais() };
  });

  app.put("/cms/legal/:kind", { preHandler: [app.authenticate] }, async (req) => {
    await assertPlatformAdmin(req);
    const ctx = await resolveCompanyContext(req);
    const kind = legalKindSchema.parse((req.params as { kind: string }).kind);
    const dados = legalSchema.parse(req.body);
    return salvarLegal(kind, dados, { userId: ctx.userId, companyId: ctx.companyId, ip: req.ip });
  });

  // Leitura do tipo no editor (o formulário valida contra o mesmo esquema).
  app.get("/cms/kinds", { preHandler: [app.authenticate] }, async (req) => {
    await assertPlatformAdmin(req);
    return { data: kindSchema.options.map((kind) => ({ kind })) };
  });
}
