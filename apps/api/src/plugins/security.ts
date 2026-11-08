import type { FastifyInstance } from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { corsOrigins, env, isProd } from "../config/env";

export function registerSecurity(app: FastifyInstance): void {
  // Os três escudos entram na fila sem `await` no meio, e isso é regra, não estilo:
  // `await app.register(helmet)` espera a instância (a instância Fastify é thenable),
  // a função suspende, e cors e — principalmente — o limitador de taxa seriam
  // empurrados para depois da subida. Medido antes da correção: doze pedidos ao login
  // do mesmo endereço devolviam 401 em série, nenhum 429 e nenhum header
  // `x-ratelimit-limit`, porque o gancho `onRoute` do plugin chega tarde para rota já
  // registrada. Sem o `await`, a ordem de inscrição é a ordem de carga: o limitador
  // está armado antes da primeira rota de negócio.
  app.register(helmet, {
    contentSecurityPolicy: isProd ? undefined : false,
    global: true,
  });

  app.register(cors, {
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  // O store do rate-limit é o memória do processo (padrão do @fastify/rate-limit).
  // Fase 2 da auditoria registrou como pendência o store compartilhado em Redis:
  // ele só chega com a Fase 8 (Docker/compose introduz o Redis no stack), porque
  // antes disso não há onde apontá-lo sem inventar infraestrutura (§64). Em
  // instância única — como o projeto roda hoje — o contador em memória é exato.
  app.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
  });
}
