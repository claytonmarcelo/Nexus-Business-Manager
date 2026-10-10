import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { resolveCompanyContext } from "../../lib/company-context";
import { assertPermission } from "../../lib/rbac";
import { paginationSchema, paginate, skipTake } from "../../lib/pagination";
import { sensivelWhere } from "../../lib/audit";

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

export async function auditRoutes(app: FastifyInstance): Promise<void> {
  // Somente leitura, isolada por empresa, para papéis com audit:read (seções 35/36).
  app.get("/audit", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "audit:read");
    const q = filtrosSchema.parse(req.query);

    const where: Record<string, unknown> = { companyId: ctx.companyId };
    if (q.sensivel === "true") where.AND = [sensivelWhere()];
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
}
