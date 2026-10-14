import { buildApp } from "./app";
import { iniciarAgendador, pararAgendador } from "./modules/cron/cron.runner";
import { aguardarFilaDeMail } from "./lib/mail/fila";
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
    // N58: a fila de e-mail é memória do processo, e o que está nela ainda não foi
    // entregue. Desligar sem esperar seria deitar fora uma recuperação de senha que
    // a pessoa acabou de pedir. Há teto na espera de propósito: o `docker stop` dá
    // dez segundos e derruba o container depois disso, e um desligue que depende de
    // um SMTP vivo é um desligue que não acontece. O que passa do teto é dito no
    // log, com o número do que ficou, e a saída do usuário continua sendo o reenvio.
    try {
      await aguardarFilaDeMail();
    } catch (erro) {
      app.log.warn(erro, "a fila de e-mail não esvaziou antes do desligue");
    }
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

void main();
