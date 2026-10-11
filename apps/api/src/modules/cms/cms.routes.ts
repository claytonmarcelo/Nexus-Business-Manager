import type { FastifyInstance } from "fastify";
import { resolveCompanyContext } from "../../lib/company-context";
import { assertPermission } from "../../lib/rbac";
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
// empresa), então quem edita é quem responde pela plataforma: as permissões
// content:read/content:write ficam com OWNER, que segura "*". A leitura pública
// é anônima porque a landing não tem sessão.
export async function cmsRoutes(app: FastifyInstance): Promise<void> {
  // ---- Leitura pública (sem sessão) ----
  app.get("/public/landing", async () => payloadPublico());

  app.get("/public/legal/:kind", async (req) => {
    const kind = legalKindSchema.parse((req.params as { kind: string }).kind);
    const doc = await obterLegal(kind);
    // Texto só aparece no site depois de publicado pela administração.
    if (!doc.published) throw notFound("Documento ainda não publicado");
    return doc;
  });

  // O visitante que tem o pulso informa o token; a resposta é só sim/não.
  app.post(
    "/public/bypass",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (req) => {
      const { token } = bypassSchema.parse(req.body);
      const estado = await estadoManutencao();
      const liberado = pulsoValido(token, estado.token) || ipPermitido(req.ip, estado.ips);
      return { liberado };
    },
  );

  // ---- Escrita (administração da plataforma) ----
  app.get("/cms/config", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "content:read");
    return obterConfig();
  });

  app.patch("/cms/config", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "content:write");
    const dados = configSchema.parse(req.body);
    return salvarConfig(dados, { userId: ctx.userId, companyId: ctx.companyId, ip: req.ip });
  });

  app.get("/cms/seo/score", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "content:read");
    const config = await obterConfig();
    return pontuarSeo(config.seo, config);
  });

  // Um token novo a cada clique: o pulso atual nunca fica exposto em listagem.
  app.post("/cms/maintenance/token", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "content:write");
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
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "content:read");
    const q = itensQuerySchema.parse(req.query);
    return { data: await listarItens(validarKind(q.kind), q.ativos ?? false) };
  });

  app.post("/cms/items", { preHandler: [app.authenticate] }, async (req, reply) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "content:write");
    const dados = itemSchema.parse(req.body);
    const criado = await criarItem(dados, { userId: ctx.userId, companyId: ctx.companyId, ip: req.ip });
    return reply.status(201).send(criado);
  });

  app.patch("/cms/items/:id", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "content:write");
    const { id } = req.params as { id: string };
    return atualizarItem(id, itemPatchSchema.parse(req.body), {
      userId: ctx.userId, companyId: ctx.companyId, ip: req.ip,
    });
  });

  app.delete("/cms/items/:id", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "content:write");
    const { id } = req.params as { id: string };
    return removerItem(id, { userId: ctx.userId, companyId: ctx.companyId, ip: req.ip });
  });

  app.get("/cms/legal", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "content:read");
    return { data: await listarLegais() };
  });

  app.put("/cms/legal/:kind", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "content:write");
    const kind = legalKindSchema.parse((req.params as { kind: string }).kind);
    const dados = legalSchema.parse(req.body);
    return salvarLegal(kind, dados, { userId: ctx.userId, companyId: ctx.companyId, ip: req.ip });
  });

  // Leitura do tipo no editor (o formulário valida contra o mesmo esquema).
  app.get("/cms/kinds", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "content:read");
    return { data: kindSchema.options.map((kind) => ({ kind })) };
  });
}
