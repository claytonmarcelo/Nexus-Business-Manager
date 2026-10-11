import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { resolveCompanyContext } from "../../lib/company-context";
import { assertPermission, can } from "../../lib/rbac";
import { paginationSchema } from "../../lib/pagination";
import * as service from "./reports.service";

// Painéis de análise das telas (abas Indicadores, Análises, Relatórios,
// Movimentações e Centros de Custo). Leitura pura, sempre isolada por empresa
// e com os números calculados no servidor (seção 43 do roteiro).

const periodoSchema = z.object({
  de: z.coerce.date().optional(),
  ate: z.coerce.date().optional(),
});

const movimentosSchema = paginationSchema.extend({
  kind: z.enum(["IN", "OUT", "ADJUST"]).optional(),
  productId: z.string().uuid().optional(),
  de: z.coerce.date().optional(),
  ate: z.coerce.date().optional(),
});

const fluxoSchema = z.object({
  dias: z.coerce.number().int().min(7).max(180).default(30),
});

export async function reportsRoutes(app: FastifyInstance): Promise<void> {
  // Visão geral do Dashboard: cada bloco só aparece se o papel pode lê-lo.
  app.get("/reports/overview", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    const bruto = await service.overview(ctx.companyId);
    const permitido: Record<string, unknown> = { periodo: bruto.periodo };
    if (can(ctx.role, "sale:read")) permitido.vendas = bruto.vendas;
    // A meta se mede pela receita do mês: quem não pode ler vendas também não vê o alvo.
    if (can(ctx.role, "sale:read")) permitido.meta = bruto.meta;
    if (can(ctx.role, "client:read")) permitido.clientes = bruto.clientes;
    if (can(ctx.role, "product:read")) permitido.produtos = bruto.produtos;
    if (can(ctx.role, "finance:read")) permitido.financeiro = bruto.financeiro;
    if (can(ctx.role, "crm:read")) permitido.crm = bruto.crm;
    if (can(ctx.role, "agenda:read")) permitido.agenda = bruto.agenda;
    permitido.alertas = bruto.alertas.filter((a) => can(ctx.role, a.perm));
    return permitido;
  });

  app.get("/reports/clients", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "client:read");
    return service.clientes(ctx.companyId);
  });

  app.get("/reports/products", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "product:read");
    return service.produtos(ctx.companyId);
  });

  app.get("/reports/movements", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "product:read");
    const q = movimentosSchema.parse(req.query);
    return service.movimentos(ctx.companyId, {
      page: q.page,
      pageSize: q.pageSize,
      kind: q.kind,
      productId: q.productId,
      de: q.de,
      ate: q.ate,
    });
  });

  app.get("/reports/sales", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "sale:read");
    const q = periodoSchema.parse(req.query);
    return service.vendas(ctx.companyId, q.de, q.ate);
  });

  app.get("/reports/purchases", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "purchase:read");
    return service.compras(ctx.companyId);
  });

  app.get("/reports/finance", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "finance:read");
    const q = fluxoSchema.parse(req.query);
    return service.financeiro(ctx.companyId, q.dias);
  });

  app.get("/reports/crm", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "crm:read");
    return service.crm(ctx.companyId);
  });
}
