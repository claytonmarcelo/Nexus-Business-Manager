import { api } from "./api";
import { tokenStore } from "./tokenStore";
import type { DocumentoLegal, PayloadLanding } from "./landingTypes";

// Leituras do CMS usadas pela página pública. Nenhuma delas manda Authorization:
// o conteúdo da vitrine é anônimo por construção (/api/public/*).
export async function lerConteudoPublico(): Promise<PayloadLanding> {
  const { data } = await api.get<PayloadLanding>("/public/landing");
  return data;
}

export async function lerDocumentoPublico(kind: string): Promise<DocumentoLegal> {
  const { data } = await api.get<DocumentoLegal>(`/public/legal/${kind}`);
  return data;
}

// O visitante com o pulso avisa o token uma vez; a resposta é só sim/não, e o
// token fica na sessão do navegador (aba) para as próximas requisições.
export async function pedirLiberacaoManutencao(token: string): Promise<boolean> {
  const { data } = await api.post<{ liberado: boolean }>("/public/bypass", { token });
  if (data.liberado) tokenStore.setPulso(token);
  return data.liberado;
}
