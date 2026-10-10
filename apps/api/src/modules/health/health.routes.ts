import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => {
    let db = "up";
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      db = "down";
    }
    return { status: db === "up" ? "ok" : "degraded", db, ts: new Date().toISOString() };
  });
}
