import { api } from "./api";

// T6.3 (F7, LGPD art. 18, II) — a leitura que a pessoa faz de si mesma.
// T6.4 (F7, LGPD art. 18, VI) — as duas portas de eliminação, no fim do arquivo.
//
// O contrato é o corpo que `apps/api/src/modules/lgpd/lgpd.service.ts` monta: uma
// foto, não uma página paginada. A tela mostra o resumo e oferece o arquivo, porque
// o direito de acesso se exerce levando os dados embora, não só lendo-os no balcão.

export interface AceiteDeTexto {
  tipo: string;
  versao: number;
  aceitoEm: string | null;
  ip: string | null;
}

export interface SessaoDoTitular {
  empresa: string | null;
  criadaEm: string | null;
  expiraEm: string | null;
  usadaEm: string | null;
  revogadaEm: string | null;
  ipOrigem: string | null;
}

export interface DadosDoTitular {
  geradoEm: string;
  aviso: string;
  titular: {
    id: string;
    nome: string;
    email: string;
    telefone: string | null;
    avatarUrl: string | null;
    contaAtiva: boolean;
    papelNaPlataforma: string | null;
    emailVerificadoEm: string | null;
    segundoFatorDesde: string | null;
    /** T6.4: data em que a pessoa exerceu a anonimização. Nulo = a conta ainda
     *  identifica alguém. */
    anonimizadoEm: string | null;
    criadoEm: string | null;
    atualizadoEm: string | null;
  };
  empresaAtiva: { id: string; nome: string | null; papel: string | null; desde: string | null };
  vinculos: Array<{ empresa: string; papel: string; desde: string | null }>;
  aceites: AceiteDeTexto[];
  sessoes: SessaoDoTitular[];
  notificacoes: Array<{ tipo: string; titulo: string; criadaEm: string | null }>;
  preferenciasDeAviso: Record<string, unknown> | null;
  trilhaDeAuditoria: { total: number; mostrado: number; eventos: Array<Record<string, unknown>> };
  tentativasDeLogin: Array<{ email: string; falhas: number }>;
  naoIncluidos: Array<{ campo: string; motivo: string }>;
}

export async function lerMeusDados(): Promise<DadosDoTitular> {
  const { data } = await api.get<DadosDoTitular>("/lgpd/meus-dados");
  return data;
}

/**
 * O mesmo desenho do CSV da casa (`lib/csv.ts`): blob, object URL, um link que
 * ninguém vê, clique e limpeza. O arquivo é o corpo da resposta, indentado — se a
 * pessoa levou uma cópia, tem que ser a cópia inteira, não o resumo da tela.
 */
export function baixarMeusDados(corpo: DadosDoTitular): string {
  const dia = (corpo.geradoEm || new Date().toISOString()).slice(0, 10);
  const arquivo = "meus-dados-" + dia + ".json";
  const blob = new Blob([JSON.stringify(corpo, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = arquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return arquivo;
}

// ===== T6.4 — o direito de eliminação, nos dois caminhos =====
//
// A senha vai no corpo e a conferência é do servidor: um token roubado não pode
// bastar para apagar uma pessoa. O teto é de três pedidos por minuto por endereço
// (`lgpd.routes.ts`), então a tela não re-tenta sozinha — um 429 aqui é o teto
// falando, e a resposta correta é esperar, não insistir.
//
// Depois de qualquer um dos dois, a sessão da pessoa acabou: anonimizar desativa a
// conta e fecha as sessões; excluir apaga a linha. Quem chama é obrigado a derrubar
// a própria sessão em vez de deixar o 403 aparecer na próxima leitura.

export interface ResultadoDeEliminacao {
  feito: true;
  direito: "anonimizacao" | "exclusao";
  em: string;
  identidade?: { nome: string; email: string };
  apagado: Record<string, number>;
  preservado: Record<string, number>;
  guarda: Array<{ item: string; motivo: string }>;
  aviso: string;
}

export async function anonimizarMinhaConta(senha: string): Promise<ResultadoDeEliminacao> {
  const { data } = await api.post<ResultadoDeEliminacao>("/lgpd/minha-conta/anonimizar", { senha });
  return data;
}

export async function excluirMinhaConta(senha: string): Promise<ResultadoDeEliminacao> {
  const { data } = await api.post<ResultadoDeEliminacao>("/lgpd/minha-conta/excluir", { senha });
  return data;
}
