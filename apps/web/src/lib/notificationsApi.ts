import { api } from "./api";

// ===== Fala do sino e da tela /app/notificacoes com o módulo de avisos =====
// Os tipos espelham apps/api/src/modules/notifications/notifications.schemas.ts
// e o serializador do serviço. Aqui só se pede página, filtro e estado de
// leitura: quem decide o conteúdo de um aviso é a API.
//
// Nada neste arquivo envia empresa ou destinatário como parâmetro. O dono do
// aviso e a empresa ativa vêm do token — se houvesse "companyId" na query,
// bastaria trocá-lo para ler os avisos de outra empresa, e o isolamento do
// projeto não permite isso.

export type TipoNotificacao = "sale" | "stock" | "lead" | "billing" | "report";
export type Prioridade = "LOW" | "MEDIUM" | "HIGH";
export type FiltroStatus = "todas" | "naolidas" | "lidas";

export interface Notificacao {
  id: string;
  kind: TipoNotificacao;
  title: string;
  body: string | null;
  link: string | null;
  priority: Prioridade;
  readAt: string | null;
  createdAt: string;
  lida: boolean;
}

export interface Pagina<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

/** O que o sino pergunta a cada batida: contagens, nunca registros. */
export interface Resumo {
  naoLidas: number;
  urgentes: number;
  porTipo: Record<TipoNotificacao, number>;
}

export interface Preferencias {
  saleAlerts: boolean;
  lowStock: boolean;
  dailyReport: boolean;
  overdueBills: boolean;
  newLead: boolean;
  emailChannel: boolean;
  inAppChannel: boolean;
}

export type ChavePreferencia =
  | "saleAlerts" | "lowStock" | "newLead" | "overdueBills" | "dailyReport";

/**
 * Estado real do canal de e-mail nesta instalação (N59), espelho do
 * `EstadoDoCanal` que a API tira do entregador do processo. A tela não decide por
 * conta própria se o e-mail funciona: ela pergunta.
 */
export interface EstadoDoCanal {
  disponivel: boolean;
  transporte: string;
  motivo: string | null;
}

export interface LeituraDePreferencias {
  preferencias: Preferencias;
  email: EstadoDoCanal;
}

// Ordem e rótulos são os do serviço (TIPOS, em notifications.service.ts), para
// sino, tela e API descreverem o mesmo aviso com as mesmas palavras. A "dica" é
// só da tela: diz o que gera aquele tipo, coisa que o banco não guarda.
export const TIPOS: {
  kind: TipoNotificacao; rotulo: string; preferencia: ChavePreferencia; dica: string;
}[] = [
  { kind: "sale", rotulo: "Vendas", preferencia: "saleAlerts", dica: "Pedido confirmado ou cancelado por outra pessoa da equipe." },
  { kind: "stock", rotulo: "Estoque", preferencia: "lowStock", dica: "Produto controlado que encosta no mínimo ou zera." },
  { kind: "lead", rotulo: "CRM", preferencia: "newLead", dica: "Lead novo entrando no funil." },
  { kind: "billing", rotulo: "Financeiro", preferencia: "overdueBills", dica: "Conta vencida encontrada pela varredura." },
  { kind: "report", rotulo: "Relatório diário", preferencia: "dailyReport", dica: "Resumo do dia, gerado pela rotina periódica." },
];

export const ROTULOS_PRIORIDADE: Record<Prioridade, string> = {
  LOW: "Baixa", MEDIUM: "Média", HIGH: "Alta",
};

export function rotuloTipo(kind: string): string {
  return TIPOS.find((t) => t.kind === kind)?.rotulo ?? kind;
}

export function dicaTipo(kind: string): string {
  return TIPOS.find((t) => t.kind === kind)?.dica ?? "";
}

export async function listarNotificacoes(opcoes: {
  page: number; pageSize: number; status: FiltroStatus; kind?: TipoNotificacao;
}): Promise<Pagina<Notificacao>> {
  const { page, pageSize, status, kind } = opcoes;
  const { data } = await api.get<Pagina<Notificacao>>("/notifications", {
    params: kind ? { page, pageSize, status, kind } : { page, pageSize, status },
  });
  return data;
}

export async function contarNotificacoes(): Promise<Resumo> {
  const { data } = await api.get<Resumo>("/notifications/count");
  return data;
}

export async function marcarLida(id: string): Promise<Notificacao> {
  const { data } = await api.patch<Notificacao>(`/notifications/${id}/read`);
  return data;
}

/** Devolve quantos avisos passaram a lidos — é o número do aviso na tela. */
export async function marcarTodasLidas(): Promise<number> {
  const { data } = await api.post<{ marcadas: number }>("/notifications/read-all");
  return data.marcadas;
}

/**
 * O canal sem estado declarado: nem a resposta chegou, nem a instalação afirmou
 * que entrega. É o valor inicial da tela e o fallback de uma API antiga — o
 * sentido seguro é desligar a caixa, nunca acender um botão que não faz nada.
 */
export const CANAL_SEM_ESTADO: EstadoDoCanal = {
  disponivel: false,
  transporte: "desconhecido",
  motivo: "a instalação não informou o estado do canal de e-mail, então nada será enviado por ele",
};

/**
 * As chaves salvas junto do estado do canal de e-mail (N59). O `email` não é uma
 * preferência: é o que o entregador deste servidor afirma sobre si mesmo, lido na
 * hora do pedido, e é ele que liga ou desliga a caixa da tela.
 */
export async function lerPreferencias(): Promise<LeituraDePreferencias> {
  const { data } = await api.get<
    Preferencias & { tipos: unknown; email?: EstadoDoCanal }
  >("/notifications/preferences");
  // O servidor manda os rótulos dos tipos junto, para quem não tem a tabela.
  // A tela já tem (TIPOS acima, na mesma ordem), então ficam só as chaves.
  const { tipos: _tipos, email: _email, ...preferencias } = data;
  return { preferencias, email: _email ?? CANAL_SEM_ESTADO };
}

export async function salvarPreferencias(preferencias: Preferencias): Promise<Preferencias> {
  const { data } = await api.put<Preferencias>("/notifications/preferences", preferencias);
  return data;
}

/**
 * Varredura de contas vencidas — o passo que a rotina agendada também chama. Rota
 * administrativa (settings:write); devolve quantos avisos nasceram e quantas
 * mensagens entraram na fila de e-mail (N59), porque um número só não diz a quem
 * opera se a cópia por e-mail saiu ou se o canal está desligado aqui.
 */
export async function varrerContasVencidas(): Promise<ResultadoDoAviso> {
  const { data } = await api.post<ResultadoDoAviso>("/notifications/scan");
  return data;
}

export interface ResultadoDoAviso {
  criadas: number;
  emails: number;
}

// Um aviso mudou de estado em algum lugar do painel: a tela avisa, o sino escuta.
// Sem isso, marcar tudo lido na tela deixava o número do sino velho até a próxima
// batida do polling.
export const EVENTO_AVISOS = "nexus:avisos";

export function anunciarMudancaNosAvisos(): void {
  window.dispatchEvent(new Event(EVENTO_AVISOS));
}
