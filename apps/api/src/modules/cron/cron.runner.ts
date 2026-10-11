// O bater do coração das rotinas agendadas (seção 37). Um único setInterval no
// processo da API: a cada varredura ele olha o minuto corrente do relógio e
// dispara as rotinas habilitadas cuja expressão cron casa com ele.
//
// Decisões declaradas (sem mistério para quem operar a tela):
//  - o agendador mora no processo do servidor e só é ligado em server.ts — os
//    testes e o buildApp() não veem minuto nenhum passarem;
//  - se o servidor estava desligado na hora marcada, a corrida fica para a
//    próxima janela do cron (não acumula "mês inteiro de varreduras" ao voltar);
//  - o desligue (CRON_ENABLED=0) é para ambientes com vários processos: aí um
//    único processo agenda e os demais só atendem requisições.
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { cronCombina, parseCron } from "./cron.parse";
import { executar, registrarJobsPadrao } from "./cron.service";

type Log = (msg: string) => void;

let timer: NodeJS.Timeout | null = null;
let ultimoMinutoProcessado = -1;

const VARREDURA_MS = 20_000;

async function bater(log: Log): Promise<void> {
  const agora = new Date();
  const minuto = Math.floor(agora.getTime() / 60_000);
  if (minuto === ultimoMinutoProcessado) return;
  ultimoMinutoProcessado = minuto;

  const jobs = await prisma.cronJob.findMany({ where: { enabled: true } });
  for (const job of jobs) {
    let spec;
    try {
      spec = parseCron(job.schedule);
    } catch (err) {
      log(`[cron] agenda inválida em "${job.slug}": ${(err as Error).message}`);
      continue;
    }
    if (!cronCombina(spec, agora)) continue;
    // Já rodou neste mesmo minuto (reinício do servidor no instante exato)?
    if (job.lastRunAt && Math.floor(job.lastRunAt.getTime() / 60_000) >= minuto) continue;
    try {
      const r = await executar(job.slug, { origem: "agendador" });
      log(`[cron] ${job.slug}: ${r.status} — ${r.mensagem}`);
    } catch (err) {
      // conflita/trava: outra corrida pegou o job; não é drama, é o combinado.
      log(`[cron] ${job.slug} não rodou agora: ${(err as Error).message}`);
    }
  }
}

/** Liga o agendador. Idempotente: segundo chamado não cria segundo relógio. */
export async function iniciarAgendador(log: Log = (m) => console.log(m)): Promise<void> {
  if (timer) return;
  if (env.CRON_ENABLED === "0") {
    log("[cron] desligado por CRON_ENABLED=0 — rotinas só rodam pelo botão da tela");
    return;
  }
  const n = await registrarJobsPadrao();
  log(`[cron] agendador ativo com ${n} rotinas-padrão (varredura a cada ${VARREDURA_MS / 1000}s)`);
  timer = setInterval(() => {
    void bater(log).catch((err) => log(`[cron] varredura falhou: ${(err as Error).message}`));
  }, VARREDURA_MS);
}

export function pararAgendador(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  ultimoMinutoProcessado = -1;
}
