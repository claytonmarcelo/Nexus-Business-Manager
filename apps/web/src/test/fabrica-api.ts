import { AxiosError, type AxiosAdapter, type AxiosResponse } from "axios";
import type { SessionUser } from "../context/AuthContext";

// Rede de mentira para os testes de sessão: o adaptador do axios resolve antes
// de qualquer XHR, então o que se exercita é o interceptor de 401, o refresh
// compartilhado e o AuthContext — exatamente as peças do fluxo de fim de sessão.
export interface Rota {
  caminho: string;
  status: number;
  data: unknown;
}

export function monteAdaptador(rotas: Rota[]): AxiosAdapter {
  return async (config) => {
    const url = config.url ?? "";
    const achada = rotas.find((rota) => url.includes(rota.caminho));
    const status = achada?.status ?? 200;
    const resposta: AxiosResponse = {
      data: achada?.data ?? {},
      status,
      statusText: status >= 200 && status < 300 ? "OK" : "Erro",
      headers: {},
      config,
    };
    if (status >= 200 && status < 300) return resposta;
    throw new AxiosError(
      "HTTP " + status,
      status === 401 ? "ERR_BAD_REQUEST" : "ERR_BAD_RESPONSE",
      config,
      {},
      resposta,
    );
  };
}

export const USUARIO_DE_TESTE: SessionUser = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "dono@empresa.teste",
  name: "Dono da Empresa",
  phone: null,
  companyId: "00000000-0000-4000-8000-000000000011",
  companyName: "Empresa de Teste",
  role: "OWNER",
  permissions: ["*"],
  currency: "BRL",
  timezone: "America/Sao_Paulo",
  language: "pt-BR",
  platform: true,
};

// As chamadas que montam uma sessão de verdade: renova o refresh, devolve o
// usuário e atende o logout. `/auth/me` responde o usuário direto, sem envelope,
// do jeito que o AuthContext lê. Uma rota de negócio com 401 é acrescentada à
// mão pelo caso que precisa dela.
export function rotasDeSessao(): Rota[] {
  return [
    { caminho: "/auth/refresh", status: 200, data: { accessToken: "a1", refreshToken: "r1" } },
    { caminho: "/auth/me", status: 200, data: USUARIO_DE_TESTE },
    { caminho: "/auth/logout", status: 200, data: {} },
  ];
}
