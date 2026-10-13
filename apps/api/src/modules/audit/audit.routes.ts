import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { resolveCompanyContext } from "../../lib/company-context";
import { assertPermission } from "../../lib/rbac";
import { assertPlatformAdmin } from "../../lib/platform";
import { ESCOPO_PLATAFORMA, sensivelWhere } from "../../lib/audit";
import { paginationSchema, paginate, skipTake } from "../../lib/pagination";

// Filtros da trilha de auditoria. A aba "Logs do Sistema" usa busca e período;
// a aba "Alterações Sensíveis" usa o filtro `sensivel=true`, calculado no
// servidor para nao quebrar a paginacao (o cliente nunca receberia pagina e
// filtraria por conta propria um recorte incompleto).
const filtrosSchema = paginationSchema.extend({
  search: z.string().trim().max(80).optional(),
  entity: z.string().trim().max(40).optional(),
  sensivel: z.enum(["true", "false"]).optional(),
  de: z.coerce.date().optional(),
  ate: z.coerce.date().optional(),
});

type Recorte = z.infer<typeof filtrosSchema>;

// Os mesmos filtros das duas leituras, montados sobre um `where` diferente.
function filtrosParaWhere(q: Recorte, base: Record<string, unknown>): Record<string, unknown> {
  const where: Record<string, unknown> = base;
  if (q.entity) where.entity = q.entity;
  if (q.search) {
    where.OR = [
      { action: { contains: q.search } },
      { entity: { contains: q.search } },
      { ip: { contains: q.search } },
      { user: { name: { contains: q.search } } },
    ];
  }
  if (q.de || q.ate) {
    const periodo: Record<string, unknown> = {};
    if (q.de) periodo.gte = q.de;
    if (q.ate) periodo.lte = new Date(q.ate.getTime() + 24 * 60 * 60 * 1000 - 1);
    where.createdAt = periodo;
  }
  return where;
}

// A empresa em que o administrador estava sentado quando agiu pela plataforma.
// Vive no metadata desde a F2: é origem, não dono do registro.
function empresaDaSessaoDe(metadata: unknown): string | null {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const valor = (metadata as { empresaDaSessao?: unknown }).empresaDaSessao;
    if (typeof valor === "string" && valor !== "") return valor;
  }
  return null;
}

export async function auditRoutes(app: FastifyInstance): Promise<void> {
  // Somente leitura, isolada por empresa, para papéis com audit:read (seções 35/36).
  app.get("/audit", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "audit:read");
    const q = filtrosSchema.parse(req.query);

    const where = filtrosParaWhere(q, { companyId: ctx.companyId });
    if (q.sensivel === "true") where.AND = [sensivelWhere()];

    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, email: true } } },
        ...skipTake(q),
      }),
      prisma.auditLog.count({ where }),
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      action: r.action,
      entity: r.entity,
      entityId: r.entityId,
      ip: r.ip,
      createdAt: r.createdAt,
      metadata: r.metadata,
      userName: r.user?.name ?? null,
      userEmail: r.user?.email ?? null,
    }));
    return paginate(data, total, q);
  });

  // F2 (G8 opção D): a trilha da plataforma, atravessando tenants.
  //
  // O administrador da plataforma é OWNER de todas as empresas (decisão do dono,
  // registrada em docs/decisoes/G8). Enquanto isso não for break-glass, a prova
  // técnica de conformidade é a trilha: tudo que ele faz pela plataforma aparece
  // aqui, em ordem, com a empresa de origem da sessão, e nada disso entra na
  // auditoria de um tenant. Quem lê é só o administrador da plataforma — a
  // conferência é no banco a cada requisição, e esta rota não pede permissão de
  // módulo porque não responde por uma empresa.
  app.get("/audit/plataforma", { preHandler: [app.authenticate] }, async (req) => {
    await assertPlatformAdmin(req);
    const q = filtrosSchema.parse(req.query);
    const where = filtrosParaWhere(q, { scope: ESCOPO_PLATAFORMA });

    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, email: true } } },
        ...skipTake(q),
      }),
      prisma.auditLog.count({ where }),
    ]);

    const origemIds = [...new Set(rows.map((r) => empresaDaSessaoDe(r.metadata)).filter((id): id is string => id !== null))];
    const origens = origemIds.length
      ? await prisma.company.findMany({ where: { id: { in: origemIds } }, select: { id: true, name: true } })
      : [];
    const nomeDaOrigem = new Map(origens.map((c) => [c.id, c.name]));

    const data = rows.map((r) => {
      const origem = empresaDaSessaoDe(r.metadata);
      return {
        id: r.id,
        action: r.action,
        entity: r.entity,
        entityId: r.entityId,
        ip: r.ip,
        createdAt: r.createdAt,
        metadata: r.metadata,
        userName: r.user?.name ?? null,
        userEmail: r.user?.email ?? null,
        origemSessao: origem ? (nomeDaOrigem.get(origem) ?? "empresa removida") : null,
      };
    });
    return paginate(data, total, q);
  });
}
