import { z } from "zod";
import "dotenv/config";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default("0.0.0.0"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  // "0" desliga o agendador das rotinas neste processo (ambiente multi-processo:
  // um único servidor agenda, os demais só atendem requisições).
  CRON_ENABLED: z.string().default("1"),
  // Fase 2 da auditoria (item D): o código de recuperação NUNCA sai pelo HTTP
  // por causa do NODE_ENV — só quando o .env local diz explicitamente
  // AUTH_EXPOSE_RESET_TOKEN=1. Homologação ou dev exposto com o flag desligado
  // não entrega reset de senha de ninguém.
  AUTH_EXPOSE_RESET_TOKEN: z.string().default("0"),
  // Atrás de proxy reverso o IP real vem de X-Forwarded-For; ligar isso sem
  // proxy na frente permite forjar o IP de auditoria, bypass de manutenção e
  // rate-limit. Por default fica desligado (1 = confia em um proxy imediato).
  TRUST_PROXY: z.string().default("0"),
  // Limite de corpo dito em uma lugar, em vez de deixar o default do Fastify
  // decidido em outro.
  BODY_LIMIT_BYTES: z.coerce.number().int().positive().default(1048576),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");
  // Falha rápida: não subir com configuração inválida (seção 47).
  throw new Error(`Configuração de ambiente inválida — ${issues}`);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
export const corsOrigins = env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean);
