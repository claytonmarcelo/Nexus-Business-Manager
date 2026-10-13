import { api } from "./api";

// Estado do serviço lido da ponta pública GET /api/health (resposta real:
// { status: "ok" | "degraded", db: "up" | "down", ts }). É a única fonte do
// indicador do rodapé: sem resposta válida não há dado, e sem dado o rodapé
// não mostra nada. Prometer "operacional" sem a API ter respondido seria
// exatamente o tipo de informação falsa que o projeto proíbe.

export interface EstadoDoServico {
  readonly status: "ok" | "degraded";
  readonly db: "up" | "down";
  readonly ts: string;
}

// A forma é conferida campo a campo: uma resposta de proxy, portal cativo ou
// erro HTML vira null, nunca um indicador de estado inventado.
function traduza(bruto: unknown): EstadoDoServico | null {
  if (!bruto || typeof bruto !== "object") return null;
  const dados = bruto as Record<string, unknown>;
  if (dados.status !== "ok" && dados.status !== "degraded") return null;
  if (dados.db !== "up" && dados.db !== "down") return null;
  return { status: dados.status, db: dados.db, ts: typeof dados.ts === "string" ? dados.ts : "" };
}

export async function consultarEstadoDoServico(): Promise<EstadoDoServico | null> {
  try {
    const resposta = await api.get("/health", { timeout: 4000 });
    return traduza(resposta.data);
  } catch {
    return null;
  }
}
