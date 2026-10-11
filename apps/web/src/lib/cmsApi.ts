import { api } from "./api";
import type {
  ConfiguracaoContato,
  ConfiguracaoHero,
  ConfiguracaoSeo,
  ConfiguracaoSocial,
  ConfiguracaoWhatsapp,
  EsquemaCores,
  ItemEditorado,
} from "./landingTypes";

// ===== Fala do editor /app/cms com o módulo CMS da API =====
// Os tipos espelham apps/api/src/modules/cms/cms.schemas.ts e cms.service.ts:
// campo que o servidor não valida não existe aqui. A leitura anônima da vitrine
// fica em landingApi.ts; este arquivo é só o que exige sessão e content:read ou
// content:write.

export type KindItem = "BANNER" | "FEATURE" | "TESTIMONIAL" | "METRIC" | "FAQ";
export type KindLegal = "TERMS" | "PRIVACY" | "LGPD";

export interface ManutencaoConfig {
  ativa: boolean;
  mensagem: string;
  previsao: string;
  previsaoEm: string | null;
  tokenPulso: string;
  ipsPermitidos: string[];
}

/** O que o GET /cms/config devolve: a configuração inteira, já com os padrões. */
export interface ConfiguracaoEditor {
  headline: string;
  subheadline: string;
  cores: EsquemaCores;
  whatsapp: ConfiguracaoWhatsapp;
  seo: ConfiguracaoSeo;
  manutencao: ManutencaoConfig;
  hero: ConfiguracaoHero;
  social: ConfiguracaoSocial;
  contact: ConfiguracaoContato;
}

/**
 * O PATCH aceita só o bloco tocado, e cada bloco aceita só os campos tocados:
 * mexer na cor não apaga o WhatsApp porque o servidor faz o merge bloco a bloco.
 */
export interface MudancaConfig {
  headline?: string;
  subheadline?: string;
  cores?: Partial<EsquemaCores>;
  whatsapp?: Partial<ConfiguracaoWhatsapp>;
  seo?: Partial<ConfiguracaoSeo>;
  hero?: Partial<ConfiguracaoHero>;
  social?: Partial<ConfiguracaoSocial>;
  contact?: Partial<ConfiguracaoContato>;
  manutencao?: Partial<ManutencaoConfig>;
}

export interface ItemEnviar {
  kind: KindItem;
  title: string;
  body?: string | null;
  imageUrl?: string | null;
  link?: string | null;
  author?: string | null;
  role?: string | null;
  meta?: Record<string, unknown> | null;
  order?: number;
  active?: boolean;
}

export interface DocumentoLegal {
  id: string;
  kind: KindLegal;
  title: string;
  content: string;
  published: boolean;
  updatedAt: string;
}

export interface ChecagemSeo {
  item: string;
  peso: number;
  alcancado: boolean;
  dica: string;
}

export interface NotaSeo {
  nota: number;
  nivel: string;
  pontos: number;
  total: number;
  itens: ChecagemSeo[];
}

// Rótulos e campos extras por tipo de item. A tabela landing_items é a mesma
// para os cinco tipos; o que muda é o meta (Json livre) e quais colunas do
// formulário fazem sentido — mostrar "empresa" numa FAQ seria mentira.
export const KINDS: { kind: KindItem; rotulo: string; plural: string; hint: string }[] = [
  { kind: "BANNER", rotulo: "Banner", plural: "Banners", hint: "Faixa de destaque acima dos recursos" },
  { kind: "FEATURE", rotulo: "Capacidade", plural: "Capacidades", hint: "Cartão da grade de recursos" },
  { kind: "TESTIMONIAL", rotulo: "Depoimento", plural: "Depoimentos", hint: "Fala de cliente, com estrelas" },
  { kind: "METRIC", rotulo: "Métrica", plural: "Métricas", hint: "Número apresentado no 'Sobre'" },
  { kind: "FAQ", rotulo: "Pergunta", plural: "Perguntas frequentes", hint: "Item do acordeão de dúvidas" },
];

export function rotuloKind(kind: string): string {
  return KINDS.find((k) => k.kind === kind)?.rotulo ?? kind;
}

export async function lerConfig(): Promise<ConfiguracaoEditor> {
  const { data } = await api.get<ConfiguracaoEditor>("/cms/config");
  return data;
}

/** Grava e devolve a configuração já resolvida — é ela que vai para a tela. */
export async function salvarConfig(mudanca: MudancaConfig): Promise<ConfiguracaoEditor> {
  const { data } = await api.patch<ConfiguracaoEditor>("/cms/config", mudanca);
  return data;
}

export async function gerarPulso(): Promise<string> {
  // POST sem corpo: a rota trata isso como ação, não como formulário.
  const { data } = await api.post<{ token: string }>("/cms/maintenance/token");
  return data.token;
}

export async function lerItens(kind: KindItem): Promise<ItemEditorado[]> {
  const { data } = await api.get<{ data: ItemEditorado[] }>("/cms/items", { params: { kind } });
  return data.data;
}

export async function criarItem(item: ItemEnviar): Promise<ItemEditorado> {
  const { data } = await api.post<ItemEditorado>("/cms/items", item);
  return data;
}

export async function atualizarItem(id: string, item: Partial<ItemEnviar>): Promise<ItemEditorado> {
  const { data } = await api.patch<ItemEditorado>(`/cms/items/${id}`, item);
  return data;
}

export async function removerItem(id: string): Promise<void> {
  await api.delete(`/cms/items/${id}`);
}

export async function lerLegais(): Promise<DocumentoLegal[]> {
  const { data } = await api.get<{ data: DocumentoLegal[] }>("/cms/legal");
  return data.data;
}

export async function salvarLegal(
  kind: KindLegal,
  dados: { title?: string; content?: string; published?: boolean },
): Promise<DocumentoLegal> {
  const { data } = await api.put<DocumentoLegal>(`/cms/legal/${kind}`, dados);
  return data;
}

export async function lerNotaSeo(): Promise<NotaSeo> {
  const { data } = await api.get<NotaSeo>("/cms/seo/score");
  return data;
}
