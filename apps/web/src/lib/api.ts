import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { tokenStore } from "./tokenStore";

const baseURL = import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({ baseURL, withCredentials: false });

api.interceptors.request.use((config) => {
  // F4 (D3): um cabeçalho escrito à mão tem prioridade sobre a sessão em memória.
  // As rotas de etapa do login — `/2fa/setup`, `/2fa/activate`, `/2fa/challenge` —
  // não existem para uma sessão comum (a API recusa o token de sessão nelas), e o
  // interceptor as calcaria com o Bearer que estiver guardado na aba.
  if (tokenStore.access && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${tokenStore.access}`;
  }
  // Site em manutencao: quem recebeu o pulso nesta aba o apresenta em toda
  // chamada, e a API libera aquela pessoa sem abrir o site para os outros.
  const pulso = tokenStore.getPulso();
  if (pulso) config.headers["X-Nexus-Pulse"] = pulso;
  return config;
});

// Rotação de refresh token no servidor: o token usado e revogado na hora.
// Por isso a renovacao precisa ser UMA UNICA chamada por vez no navegador.
// Sem esse cadeado, o bootstrap do AuthProvider e o interceptor de 401
// disparavam dois refreshs com o mesmo token: o segundo recebia 401, o
// tokenStore.clear() jogava fora a sessao nova e o usuario caia no login.
let refreshing: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  let apresentado = tokenStore.getRefresh();
  if (!apresentado) return null;
  // A tela pode bootar duas vezes em sequencia (re-emulacao do navegador,
  // duas abas abertas). Cada boot rotaciona o refresh token no servidor,
  // entao o boot perdedor recebe 401: em vez de limpar a sessao, ele rele
  // o token que o vencedor gravou e continua de onde o outro parou.
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try {
      const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken: apresentado });
      tokenStore.setAccess(data.accessToken);
      tokenStore.setRefresh(data.refreshToken);
      return data.accessToken as string;
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      if (status !== 401) {
        tokenStore.clear();
        return null;
      }
      const atual = tokenStore.getRefresh();
      if (atual && atual !== apresentado) {
        apresentado = atual;
        continue;
      }
      tokenStore.clear();
      return null;
    }
  }
  tokenStore.clear();
  return null;
}

// Renovação compartilhada: quem chegar primeiro cria a promise, os demais
// esperam o mesmo resultado. Nunca sai dois POST /auth/refresh em paralelo.
export function refreshSession(): Promise<string | null> {
  if (refreshing) return refreshing;
  const promesa = doRefresh().finally(() => {
    if (refreshing === promesa) refreshing = null;
  });
  refreshing = promesa;
  return promesa;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    const url = original?.url ?? "";
    // As rotas de autenticação são julgadas por quem as chamou: um 401 no login
    // é senha errada, e um 401 no logout é a renovação que já estava morta —
    // nenhum dos dois é "sessão expirada no meio do trabalho".
    const isAuthRoute = url.includes("/auth/login") || url.includes("/auth/refresh") || url.includes("/auth/logout");
    if (status === 401 && original && !isAuthRoute) {
      // Houve sessão em curso e o refresh token continua no disco: renova uma
      // vez e repete a chamada. Sem token de renovação, não há o que tentar.
      if (!original._retry && tokenStore.getRefresh()) {
        original._retry = true;
        const newToken = await refreshSession();
        if (newToken) {
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        }
      }
      // O 401 de rota de negócio, tenha havido renovação perdida, renovação que
      // falhou ou simplesmente refresh token nenhum, significa a mesma coisa:
      // esta aba não tem mais sessão. É o AuthContext quem decide se havia uma
      // para encerrar — quem nunca entrou não pode ser tratado como expirado.
      window.dispatchEvent(new Event("nexus:session-expired"));
    }
    return Promise.reject(error);
  },
);

export function extractErrorMessage(err: unknown, fallback = "Ocorreu um erro."): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined;
    return data?.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

/**
 * Erro por campo do formulário. O 400 do Zod chega com issues[] — caminho e
 * texto escritos junto da regra que vetou o valor — e é essa frase, e não um
 * palpite nosso, que a tela mostra embaixo do campo. O "message" genérico
 * ("Dados inválidos") continua no toast: sozinho ele não diz o que corrigir.
 */
export function extractFieldErrors(err: unknown): Record<string, string> {
  const erros: Record<string, string> = {};
  if (!axios.isAxiosError(err)) return erros;
  const corpo = err.response?.data as { issues?: { path?: string; message?: string }[] } | undefined;
  if (!corpo || !Array.isArray(corpo.issues)) return erros;
  for (const issue of corpo.issues) {
    const caminho = typeof issue.path === "string" ? issue.path : "";
    const mensagem = typeof issue.message === "string" ? issue.message : "Valor inválido";
    // O primeiro erro do campo manda: mostrar os dez de um CNPJ errado seria
    // poluição, e a pessoa corrige o mesmo dígito de qualquer jeito.
    if (!(caminho in erros)) erros[caminho] = mensagem;
  }
  return erros;
}
