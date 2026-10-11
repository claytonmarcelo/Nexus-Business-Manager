import { buildApp } from "./app";
import { iniciarAgendador, pararAgendador } from "./modules/cron/cron.runner";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";

async function main(): Promise<void> {
  const app = buildApp();
  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`Nexus API ouvindo em http://${env.HOST}:${env.PORT}`);
    // As rotinas agendadas só batem aqui: buildApp() (testes, ferramentas) continua
    // sem relógio nenhum, e o desligue limpo para o setInterval junto do servidor.
    await iniciarAgendador((m) => app.log.info(m));
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    app.log.info(`Recebido ${signal}, encerrando...`);
    pararAgendador();
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

void main();
