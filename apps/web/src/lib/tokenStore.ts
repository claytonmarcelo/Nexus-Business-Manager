// Armazena o access token apenas em memória (reduz superfície de XSS) e o
// refresh token em localStorage para sobreviver ao reload. Decisão documentada (seção 33).
const REFRESH_KEY = "nexus.refresh";
// O pulso da manutencao de plataforma vive so na aba: e uma chave temporaria
// de acesso, e sessionStorage morre com a aba - exatamente o comportamento que
// se quer de um bypass (fechar o navegador volta a estar na manutencao).
const PULSO_KEY = "nexus.pulso";

let accessToken: string | null = null;

export const tokenStore = {
  get access(): string | null {
    return accessToken;
  },
  setAccess(token: string | null): void {
    accessToken = token;
  },
  getRefresh(): string | null {
    try {
      return localStorage.getItem(REFRESH_KEY);
    } catch {
      return null;
    }
  },
  setRefresh(token: string | null): void {
    try {
      if (token) localStorage.setItem(REFRESH_KEY, token);
      else localStorage.removeItem(REFRESH_KEY);
    } catch {
      /* storage indisponível (modo privado): sessão apenas em memória */
    }
  },
  getPulso(): string | null {
    try {
      return sessionStorage.getItem(PULSO_KEY);
    } catch {
      return null;
    }
  },
  setPulso(token: string | null): void {
    try {
      if (token) sessionStorage.setItem(PULSO_KEY, token);
      else sessionStorage.removeItem(PULSO_KEY);
    } catch {
      /* storage indisponivel: o bypass apenas nao fica salvo nesta aba */
    }
  },
  clear(): void {
    accessToken = null;
    try {
      localStorage.removeItem(REFRESH_KEY);
      sessionStorage.removeItem(PULSO_KEY);
    } catch {
      /* noop */
    }
  },
};
