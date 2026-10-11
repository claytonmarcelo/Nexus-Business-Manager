import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { tokenStore } from "./tokenStore";

const baseURL = import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({ baseURL, withCredentials: false });

api.interceptors.request.use((config) => {
  if (tokenStore.access) {
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
    const isAuthRoute = original?.url?.includes("/auth/login") || original?.url?.includes("/auth/refresh");
    if (status === 401 && original && !original._retry && !isAuthRoute && tokenStore.getRefresh()) {
      original._retry = true;
      const newToken = await refreshSession();
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
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
