import { z } from "zod";
import "dotenv/config";
import { exigeConfiguracaoDeProducao, FORMATO_DE_TRUST_PROXY, problemasDeProducao } from "./producao";

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
  // rate-limit. Por default fica desligado. A9: aceita 0 (desligado), 1 (um
  // proxy imediato) ou o número de saltos até 31 — qualquer outro valor derruba
  // a inicialização em vez de virar `true` por acidente.
  TRUST_PROXY: z
    .string()
    .default("0")
    .refine((v) => FORMATO_DE_TRUST_PROXY.test(v), "use 0 (desligado), 1 (um proxy) ou o número de saltos de proxy (2 a 31)"),
  // Limite de corpo dito em uma lugar, em vez de deixar o default do Fastify
  // decidido em outro.
  BODY_LIMIT_BYTES: z.coerce.number().int().positive().default(1048576),
  // A8: endereço do administrador global (regra definitiva de acesso). Vazio por
  // padrão de propósito — `passwordPolicy.ts` é quem decide o padrão de
  // desenvolvimento, para produção nunca herdar um valor escrito no código.
  SUPER_ADMIN_EMAIL: z.string().default(""),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");
  // Falha rápida: não subir com configuração inválida (seção 47).
  throw new Error(`Configuração de ambiente inválida — ${issues}`);
}

// A9: produção tem uma régua própria. O zod acima vale para qualquer ambiente
// (o dev local conecta em banco sem senha e segredo de 16 caracteres); em
// produção, segredo de tutorial, CORS de localhost e root sem senha derrubam o
// servidor antes da primeira requisição. A lista é montada pela função pura de
// `producao.ts`, que é o que os testes unitários exercitam.
if (exigeConfiguracaoDeProducao(process.env.NODE_ENV)) {
  const problemas = problemasDeProducao(process.env);
  if (problemas.length > 0) {
    throw new Error(`Configuração de produção inválida — ${problemas.join("; ")}`);
  }
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
export const corsOrigins = env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean);
