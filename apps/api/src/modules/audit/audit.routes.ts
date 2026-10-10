import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { resolveCompanyContext } from "../../lib/company-context";
import { assertPermission } from "../../lib/rbac";
import { paginationSchema, paginate, skipTake } from "../../lib/pagination";

export async function auditRoutes(app: FastifyInstance): Promise<void> {
  // Somente leitura, isolada por empresa, para papéis com audit:read (seções 35/36).
  app.get("/audit", { preHandler: [app.authenticate] }, async (req) => {
    const ctx = await resolveCompanyContext(req);
    assertPermission(ctx.role, "audit:read");
    const q = paginationSchema.parse(req.query);
    const where = { companyId: ctx.companyId };
    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, ...skipTake(q) }),
      prisma.auditLog.count({ where }),
    ]);
    return paginate(rows, total, q);
  });
}
