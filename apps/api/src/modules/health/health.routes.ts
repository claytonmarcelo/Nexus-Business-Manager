import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  // Monitoração responde sem sessão (gate da Fase 2: aberta de propósito).
  app.get("/health", { config: { public: true } }, async () => {
    let db = "up";
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      db = "down";
    }
    return { status: db === "up" ? "ok" : "degraded", db, ts: new Date().toISOString() };
  });
}
