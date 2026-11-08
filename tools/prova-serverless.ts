// Prova do caminho serverless: o entrypoint que a Vercel executa
// (`api/[...path].ts`) respondendo de verdade, no mesmo processo em que ele roda
// na nuvem.
//
// Este arquivo é o servidor de prova. Ele:
//   1. carrega o `apps/api/.env` (onde moram a URL do banco de prova e os
//      segredos de desenvolvimento) e troca o `DATABASE_URL` pelo banco de
//      PROVA — a prova nunca escreve no banco de desenvolvimento (decisão D6);
//   2. importa o handler da Vercel de verdade, sem cópia e sem mock;
//   3. sobe um servidor HTTP que entrega cada requisição ao handler, como o
//      runtime da Vercel faz, e anuncia a porta no stdout.
//
// O verificador (`tools/verify-serverless.cjs`) é quem faz as asserções. Aqui
// não há julgamento: só a ponte.

import { createServer } from "node:http";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { config as carregarDotenv } from "dotenv";

const RAIZ = resolve(__dirname, "..");

// O `.env` da API guarda o `DATABASE_URL_TESTE` (o banco de prova) ao lado do
// `DATABASE_URL` (o banco de desenvolvimento). O dotenv não sobrescreve o que
// já existe no ambiente, então a troca abaixo chega antes de
// `src/config/env.ts` rodar.
carregarDotenv({ path: resolve(RAIZ, "apps/api/.env") });

const URL_DE_PROVA = (process.env.DATABASE_URL_TESTE ?? "").trim();
if (!URL_DE_PROVA) {
  throw new Error(
    "DATABASE_URL_TESTE não está no apps/api/.env — a prova do serverless se recusa a " +
      "rodar no banco de desenvolvimento (decisão D6).",
  );
}

// A prova mede a montagem do app, não o relógio nem o correio: o agendador fica
// desligado e a entrega de e-mail vai para a caixa de memória, como na suíte.
process.env.DATABASE_URL = URL_DE_PROVA;
process.env.NODE_ENV = "test";
process.env.MAIL_TRANSPORT = "memory";
process.env.CRON_ENABLED = "0";
process.env.RATE_LIMIT_MAX = "100000";
process.env.AUTH_EXPOSE_RESET_TOKEN = "0";

async function main(): Promise<void> {
  // Importação dinâmica: as variáveis acima precisam estar no ambiente antes de
  // o módulo do entrypoint ser carregado — é lá que `buildApp()` é chamado.
  // A URL sai de `pathToFileURL`: no Windows, um caminho absoluto cru não é
  // aceito pelo carregador de módulos, e o nome do arquivo tem colchetes.
  const mod = await import(pathToFileURL(resolve(RAIZ, "api", "[...path].ts")).href);
  const handler = mod.default as (
    req: import("node:http").IncomingMessage,
    res: import("node:http").ServerResponse,
  ) => Promise<void>;

  if (typeof handler !== "function") {
    throw new Error("api/[...path].ts não exporta um handler padrão — a Function não sobe.");
  }

  const servidor = createServer((req, res) => {
    void handler(req, res);
  });

  await new Promise<void>((resolveListen) => {
    servidor.listen(0, "127.0.0.1", () => resolveListen());
  });

  const endereco = servidor.address();
  const porta = typeof endereco === "object" && endereco ? endereco.port : 0;
  // O verificador lê esta linha para saber com quem falar.
  process.stdout.write(`PRONTA ${porta}\n`);
}

main().catch((erro: unknown) => {
  process.stderr.write(`FALHA ${erro instanceof Error ? erro.message : String(erro)}\n`);
  process.exit(1);
});
