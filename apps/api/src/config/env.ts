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

  // ---- F4 (D1, D2, D3): entrega de mensagem, verificação e segundo fator ----
  //
  // D1: o produto fala com uma porta (`lib/mail`), e o ambiente escolhe o
  // entregador. Vazio = "decida pelo ambiente" (`criarMailer`): SMTP quando host,
  // porta e remetente existem; console fora dele. `memory` é a caixa de teste.
  MAIL_TRANSPORT: z.enum(["", "smtp", "memory"]).default(""),
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.string().default(""),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  // "1" força TLS explícito, "0" força texto puro, vazio segue a porta (465 = TLS).
  SMTP_SECURE: z.enum(["", "0", "1"]).default(""),
  MAIL_FROM: z.string().default(""),
  // N58 (T5.3): a entrega passou a acontecer numa fila do processo, e estes são os
  // quatro números dela. Todos com padrão seguro de propósito — a régua de produção
  // não cobra nenhum deles, porque o comportamento padrão já é o que se quer em
  // produção: três tentativas, recuo exponencial a partir de meio segundo, teto de
  // quinze segundos por tentativa e duzentas mensagens na memória.
  //
  // `MAIL_TENTATIVAS` é o número de tentativas *totais* (1 = uma tentativa só, sem
  // retentativa). `MAIL_BACKOFF_BASE_MS` é a base do recuo exponencial (base, 2x,
  // 4x); 0 desliga a espera e é o que a suíte de testes usa onde precisa de pressa.
  // `MAIL_TIMEOUT_MS` é o teto de cada tentativa: um SMTP que aceita a conexão e
  // nunca entrega é cortado ali em vez de segurar a fila para sempre — 0 desliga o
  // teto, e aí quem manda é o padrão do nodemailer. `MAIL_FILA_MAXIMA` é o teto de
  // memória: fila é RAM do processo, e o que passa dela é recusado com auditoria,
  // não acumulado.
  MAIL_TENTATIVAS: z.coerce.number().int().min(1).max(10).default(3),
  MAIL_BACKOFF_BASE_MS: z.coerce.number().int().min(0).max(60000).default(500),
  MAIL_TIMEOUT_MS: z.coerce.number().int().min(0).max(120000).default(15000),
  MAIL_FILA_MAXIMA: z.coerce.number().int().min(1).max(10000).default(200),
  // Base do link que sai no corpo do e-mail (verificação de cadastro,
  // recuperação). Em produção é https de verdade — um link de e-mail que aponta
  // para localhost entrega a mensagem a quem abriu a caixa errado.
  WEB_BASE_URL: z.string().default("http://localhost:5173"),

  // D2: cadastro exige e-mail verificado antes de entrar no painel. Desligado em
  // dev e teste de propósito: nenhuma suíte depende de ler caixa de e-mail, e a
  // vitrine local não tem SMTP. A régua de produção cobra o "1".
  REQUIRE_EMAIL_VERIFICATION: z.enum(["0", "1"]).default("0"),

  // D3: chave de 32 bytes (64 caracteres hexadecimais) que cifra o segredo TOTP
  // em repouso (AES-256-GCM). Vazia = segundo fator indisponível; em produção a
  // subida é recusada sem ela, porque 2FA com segredo em claro não é 2FA.
  TOTP_ENCRYPTION_KEY: z.string().default(""),
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
