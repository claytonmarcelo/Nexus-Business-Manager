import type { FastifyInstance } from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { corsOrigins, env, isProd } from "../config/env";

export async function registerSecurity(app: FastifyInstance): Promise<void> {
  await app.register(helmet, {
    contentSecurityPolicy: isProd ? undefined : false,
    global: true,
  });

  await app.register(cors, {
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  // O store do rate-limit é o memória do processo (padrão do @fastify/rate-limit).
  // Fase 2 da auditoria registrou como pendência o store compartilhado em Redis:
  // ele só chega com a Fase 8 (Docker/compose introduz o Redis no stack), porque
  // antes disso não há onde apontá-lo sem inventar infraestrutura (§64). Em
  // instância única — como o projeto roda hoje — o contador em memória é exato.
  await app.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
  });
}
