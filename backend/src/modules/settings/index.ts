import { FastifyInstance } from "fastify";

export async function settingsModule(app: FastifyInstance) {
  app.get("/api/settings", async () => {
    return { message: "Settings module" };
  });
}
