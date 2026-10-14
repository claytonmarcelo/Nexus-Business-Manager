import { api } from "./api";

// F4 (decisão D3): as chamadas de segundo fator, do lado do navegador.
//
// Os dois caminhos são separados de propósito, e a separação é a mesma da API:
//
//   - caminho do login: quem chama ainda NÃO tem sessão. Leva o token de etapa no
//     cabeçalho Authorization, e é por isso que cada função recebe o token em vez
//     de depender do interceptor;
//   - caminho da conta: sessão comum abre `preparar`/`ativar`/`desativar`/`status`,
//     e aqui o cabeçalho é o da própria sessão.
//
// O segredo em base32 e os códigos de recuperação aparecem uma única vez, na
// resposta, e nunca são guardados: sem tela de "mostrar de novo" porque não existe
// de onde mostrar.

/** O que a rota `/2fa/challenge` devolve: a sessão que o código acabou de criar. */
export interface SessaoDeLogin {
  accessToken: string;
  refreshToken: string;
  user: Record<string, unknown>;
}

export interface StatusSegundoFator {
  ligado: boolean;
  pendente: boolean;
  obrigatorio: boolean;
  codigosRestantes: number;
}

export interface SegredoParaConfigurar {
  segredoBase32: string;
  uri: string;
  obrigatorio: boolean;
}

/** Segunda etapa do login: o código do aplicativo (ou de recuperação) abre a sessão. */
export async function confirmarDesafio(
  challengeToken: string,
  codigo: string,
): Promise<SessaoDeLogin> {
  const { data } = await api.post<SessaoDeLogin>(
    "/auth/2fa/challenge",
    { codigo },
    { headers: { Authorization: "Bearer " + challengeToken } },
  );
  return data;
}

/** Primeiro passo do caminho obrigatório: gera o segredo pendente com o token de configuração. */
export async function prepararPeloTokenDeEtapa(setupToken: string): Promise<SegredoParaConfigurar> {
  const { data } = await api.post<SegredoParaConfigurar>(
    "/auth/2fa/setup",
    {},
    { headers: { Authorization: "Bearer " + setupToken } },
  );
  return data;
}

/** Confirma o código e liga o segundo fator; no caminho do login já devolve a sessão. */
export async function ativarPeloTokenDeEtapa(
  setupToken: string,
  codigo: string,
): Promise<{ codigosDeRecuperacao: string[]; accessToken?: string; refreshToken?: string; user?: Record<string, unknown> }> {
  const { data } = await api.post("/auth/2fa/activate", { codigo }, {
    headers: { Authorization: "Bearer " + setupToken },
  });
  return data as { codigosDeRecuperacao: string[]; accessToken?: string; refreshToken?: string; user?: Record<string, unknown> };
}

// ---- caminho da conta (sessão comum) ----

export async function statusDoSegundoFator(): Promise<StatusSegundoFator> {
  const { data } = await api.get<StatusSegundoFator>("/auth/2fa/status");
  return data;
}

export async function prepararSegredo(): Promise<SegredoParaConfigurar> {
  const { data } = await api.post<SegredoParaConfigurar>("/auth/2fa/preparar", {});
  return data;
}

export async function ativarComCodigo(codigo: string): Promise<{ codigosDeRecuperacao: string[] }> {
  const { data } = await api.post<{ codigosDeRecuperacao: string[] }>("/auth/2fa/ativar", { codigo });
  return data;
}

export async function desativarComCodigo(codigo: string): Promise<{ ok: true }> {
  const { data } = await api.post<{ ok: true }>("/auth/2fa/desativar", { codigo });
  return data;
}
