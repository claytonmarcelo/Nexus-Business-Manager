// Serviço das rotinas agendadas: catálogo no banco (cron_jobs) + executor com
// estado da última corrida. O agendador (cron.runner) e o botão "Executar agora"
// da tela passam ambos por executar() — uma única linha de código decide se um
// job roda, grava resultado e trava corrida dupla.
import { prisma } from "../../lib/prisma";
import { badRequest, conflict, notFound } from "../../lib/errors";
import { agendaLegivel, parseCron, proximaExecucao } from "./cron.parse";
import { JOBS, jobPorSlug } from "./cron.handlers";

// Jobs que nasceram do código (fonte da verdade do seed e da verificação de
// existência no cadastro).
export const JOBS_PADRAO = JOBS.map(({ slug, nome, descricao, agenda }) => ({ slug, nome, descricao, agenda }));

/** Cria/atualiza as rotinas-padrão preservando enabled e histórico do operador. */
export async function registrarJobsPadrao(): Promise<number> {
  for (const j of JOBS_PADRAO) {
    await prisma.cronJob.upsert({
      where: { slug: j.slug },
      update: { name: j.nome, description: j.descricao, schedule: j.agenda },
      create: { slug: j.slug, name: j.nome, description: j.descricao, schedule: j.agenda, enabled: true },
    });
  }
  return JOBS_PADRAO.length;
}

function linhaJob(job: {
  slug: string; name: string; description: string | null; schedule: string;
  enabled: boolean; lastRunAt: Date | null; lastStatus: string | null;
  lastMessage: string | null; durationMs: number | null; updatedAt: Date;
}) {
  let agendaValida = true;
  let proxima: string | null = null;
  try {
    if (job.enabled) {
      const p = proximaExecucao(parseCron(job.schedule));
      proxima = p ? p.toISOString() : null;
    }
  } catch {
    agendaValida = false;
  }
  return {
    slug: job.slug,
    nome: job.name,
    descricao: job.description,
    agenda: job.schedule,
    agendaLegivel: agendaLegivel(job.schedule),
    agendaValida,
    habilitada: job.enabled,
    proximaExecucao: proxima,
    executorConhecido: Boolean(jobPorSlug(job.slug)),
    ultimaExecucao: job.lastRunAt ? job.lastRunAt.toISOString() : null,
    ultimoStatus: job.lastStatus,
    ultimaMensagem: job.lastMessage,
    duracaoMs: job.durationMs,
    atualizadaEm: job.updatedAt.toISOString(),
  };
}

export async function listarJobs() {
  const jobs = await prisma.cronJob.findMany({ orderBy: { name: "asc" } });
  return { data: jobs.map(linhaJob) };
}

export async function obterJob(slug: string) {
  const job = await prisma.cronJob.findUnique({ where: { slug } });
  if (!job) throw notFound("Rotina não encontrada");
  return linhaJob(job);
}

/** Liga/desliga a rotina. O nome, a descrição e a agenda vêm do código. */
export async function alternarJob(slug: string, habilitada: boolean) {
  const job = await prisma.cronJob.findUnique({ where: { slug } });
  if (!job) throw notFound("Rotina não encontrada");
  if (!jobPorSlug(slug)) throw badRequest("Rotina sem executor conhecido");
  // A agenda é conferida de novo ao ligar: expressão inválida não reativa.
  if (habilitada) parseCron(job.schedule);
  const atualizado = await prisma.cronJob.update({ where: { slug }, data: { enabled: habilitada } });
  return linhaJob(atualizado);
}

// Trava de processo: a mesma rotina não pode correr duas vezes ao mesmo tempo
// (ex.: o "executar agora" durante uma corrida do agendador). É em memória por
// desenho — o Nexus roda num único processo; se um dia houver réplicas, o
// guardião muda para uma trava no banco, não para este mapa.
const emExecucao = new Set<string>();

export interface ExecucaoResultado {
  job: ReturnType<typeof linhaJob>;
  status: "ok" | "erro";
  mensagem: string;
}

export async function executar(
  slug: string,
  opts: { origem: "manual" | "agendador"; agora?: Date } = { origem: "manual" },
): Promise<ExecucaoResultado> {
  const job = await prisma.cronJob.findUnique({ where: { slug } });
  if (!job) throw notFound("Rotina não encontrada");
  const definicao = jobPorSlug(slug);
  if (!definicao) throw badRequest("Rotina sem executor conhecido");
  if (emExecucao.has(slug)) throw conflict("A rotina ainda está rodando — aguarde a próxima coluna de estado.");

  emExecucao.add(slug);
  const inicio = Date.now();
  let status: "ok" | "erro" = "ok";
  let mensagem = "";
  try {
    const r = await definicao.handler(opts.agora ?? new Date());
    mensagem = r.mensagem;
  } catch (err) {
    status = "erro";
    mensagem = (err as Error).message || "Falha desconhecida na rotina";
  } finally {
    emExecucao.delete(slug);
  }
  const duracaoMs = Date.now() - inicio;
  const atualizado = await prisma.cronJob.update({
    where: { slug },
    data: {
      lastRunAt: new Date(),
      lastStatus: status,
      lastMessage: mensagem.slice(0, 400),
      durationMs: duracaoMs,
    },
  });
  return { job: linhaJob(atualizado), status, mensagem };
}
