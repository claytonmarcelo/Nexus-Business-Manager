import { api } from "./api";

// ===== Fala da tela /app/rotinas com o módulo de rotinas agendadas =====
// Espelha apps/api/src/modules/cron/cron.service.ts. A rota não aceita empresa
// nem destinatário no corpo: a varredura é global por desenho (a rotina alcança
// todas as empresas ativas), e quem pode operar aqui é decidido pelo papel no
// token (settings:write), não por este arquivo.

export interface Rotina {
  slug: string;
  nome: string;
  descricao: string | null;
  agenda: string;
  agendaLegivel: string;
  agendaValida: boolean;
  habilitada: boolean;
  proximaExecucao: string | null;
  executorConhecido: boolean;
  ultimaExecucao: string | null;
  ultimoStatus: string | null;
  ultimaMensagem: string | null;
  duracaoMs: number | null;
  atualizadaEm: string;
}

export interface ResultadoExecucao {
  job: Rotina;
  status: "ok" | "erro";
  mensagem: string;
}

export async function listarRotinas(): Promise<Rotina[]> {
  const { data } = await api.get<{ data: Rotina[] }>("/ops/jobs");
  return data.data;
}

export async function alternarRotina(slug: string, habilitada: boolean): Promise<Rotina> {
  const { data } = await api.patch<Rotina>(`/ops/jobs/${slug}`, { habilitada });
  return data;
}

/** Roda a rotina agora, sem esperar o próximo minuto do agendador. */
export async function executarRotina(slug: string): Promise<ResultadoExecucao> {
  const { data } = await api.post<ResultadoExecucao>(`/ops/jobs/${slug}/run`);
  return data;
}
