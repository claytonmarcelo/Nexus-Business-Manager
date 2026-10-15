import { api } from "./api";

// ===== Fala da tela /app/plataforma-contas com a porta administrativa =====
// Espelha apps/api/src/modules/platform-accounts/contas.service.ts (T5.5, N61).
//
// Duas portas, e nenhuma delas aceita empresa no caminho nem no corpo: confirmar
// um endereço é afirmar identidade da conta, que é uma coisa da instalação, não
// da empresa em que o administrador está sentado. O cadeado é `assertPlatformAdmin`
// do lado de dentro; daqui o que se manda é `motivo`, e nada mais.

export interface ContaSemConfirmacao {
  userId: string;
  name: string;
  email: string;
  active: boolean;
  criadoEm: string;
  /** Quantas casas esta conta serve — é o que diz o tamanho do transtorno. */
  empresas: number;
}

export interface ResultadoDaConfirmacao {
  userId: string;
  /** `false` quando a conta já estava confirmada: nada foi escrito nem auditado. */
  alterado: boolean;
  confirmadoEm: string | null;
}

export interface Pagina<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export async function listarContasSemConfirmacao(params: {
  page: number;
  pageSize: number;
  search?: string;
}): Promise<Pagina<ContaSemConfirmacao>> {
  const { data } = await api.get<Pagina<ContaSemConfirmacao>>("/plataforma/contas/sem-confirmacao", {
    params,
  });
  return data;
}

/**
 * Confirma pelo lado de dentro, com a frase que explica a decisão. O `motivo` é
 * obrigatório aqui por contrato de tela: a rota aceita vazio (um chamado pode ser
 * encerrado sem texto), mas o diálogo da casa não pergunta "tem certeza?" sem
 * deixar a pessoa dizer o porquê.
 */
export async function confirmarEmailDaConta(
  userId: string,
  motivo: string,
): Promise<ResultadoDaConfirmacao> {
  const { data } = await api.post<ResultadoDaConfirmacao>(
    `/plataforma/contas/${userId}/confirmar-email`,
    { motivo },
  );
  return data;
}
