// Armazena o access token apenas em memória (reduz superfície de XSS) e o
// refresh token em localStorage para sobreviver ao reload. Decisão documentada (seção 33).
const REFRESH_KEY = "nexus.refresh";

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
  clear(): void {
    accessToken = null;
    try {
      localStorage.removeItem(REFRESH_KEY);
    } catch {
      /* noop */
    }
  },
};
