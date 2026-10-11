// Tipos do conteúdo público do CMS. Espelham o que a API devolve hoje
// (apps/api/src/modules/cms/cms.service.ts: PayloadPublico e as Configuração*):
// campo que não existe no servidor não existe aqui.

export interface EsquemaCores {
  fundo: string;
  painel: string;
  texto: string;
  textoSuave: string;
  marca: string;
  destaque: string;
  borda: string;
}

export interface ConfiguracaoWhatsapp {
  ativo: boolean;
  numero: string;
  mensagem: string;
  rotulo: string;
  posicao: "direita" | "esquerda";
}

export interface ConfiguracaoSeo {
  titulo: string;
  descricao: string;
  palavrasChave: string;
  ogTitulo: string;
  ogDescricao: string;
  ogImagem: string;
  twitterCard: string;
  canonica: string;
  robots: string;
}

export interface ConfiguracaoHero {
  eyebrow: string;
  ctaPrimario: string;
  rotaPrimario: string;
  ctaSecundario: string;
  rotaSecundario: string;
  imagemUrl: string;
  overlay: number;
  desfoque: number;
}

export interface ConfiguracaoSocial {
  redes: { rede: string; rotulo: string; url: string }[];
}

export interface ConfiguracaoContato {
  email: string;
  telefone: string;
  endereco: string;
  horario: string;
}

export interface EstadoManutencao {
  ativa: boolean;
  mensagem: string;
  previsao: string;
  previsaoEm: string | null;
}

export interface ItemBanner {
  id: string;
  title: string;
  body: string | null;
  imageUrl: string | null;
  link: string | null;
}

export interface ItemCapacidade extends ItemBanner {
  meta: Record<string, unknown> | null;
}

export interface ItemDepoimento {
  id: string;
  title: string;
  body: string | null;
  author: string | null;
  role: string | null;
  meta: Record<string, unknown> | null;
}

export interface ItemMetrica {
  id: string;
  title: string;
  body: string | null;
  meta: Record<string, unknown> | null;
}

export interface ItemFaq {
  id: string;
  title: string;
  body: string | null;
}

export interface ResumoLegal {
  kind: string;
  title: string;
  published: boolean;
}

export interface PayloadLanding {
  headline: string;
  subheadline: string;
  cores: EsquemaCores;
  whatsapp: ConfiguracaoWhatsapp;
  seo: ConfiguracaoSeo;
  hero: ConfiguracaoHero;
  social: ConfiguracaoSocial;
  contact: ConfiguracaoContato;
  manutencao: EstadoManutencao;
  banners: ItemBanner[];
  capacidades: ItemCapacidade[];
  depoimentos: ItemDepoimento[];
  metricas: ItemMetrica[];
  faqs: ItemFaq[];
  legais: ResumoLegal[];
}

export interface DocumentoLegal {
  id: string;
  kind: string;
  title: string;
  content: string;
  published: boolean;
  updatedAt: string;
}

// Linha do editor (/app/cms): o /cms/items devolve tudo que a tabela guarda.
export interface ItemEditorado extends ItemBanner {
  kind: string;
  author: string | null;
  role: string | null;
  meta: Record<string, unknown> | null;
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// O `meta` é Json livre por tipo (estrelas do depoimento, valor da métrica,
// ícone da capacidade). Estas duas leituras tolerantes são as únicas formas
// de tocar nesse objeto: nada de supor campo que o servidor não valida.
export function textoMeta(meta: Record<string, unknown> | null, chave: string): string {
  const valor = meta?.[chave];
  return typeof valor === "string" ? valor : "";
}

export function numeroMeta(meta: Record<string, unknown> | null, chave: string): number | null {
  const valor = meta?.[chave];
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

// URL amigável dos textos legais. A API conhece exatamente estes três kinds
// (LegalKind), então o mapa é fechado: endereço fora da lista cai na página de
// erro em vez de virar busca no banco.
export const SLUGS_LEGAIS: Record<string, string> = {
  TERMS: "termos",
  PRIVACY: "privacidade",
  LGPD: "lgpd",
};

export function kindPeloSlug(slug: string | undefined): string | null {
  const achado = Object.entries(SLUGS_LEGAIS).find(([, valor]) => valor === slug?.toLowerCase());
  return achado ? achado[0] : null;
}

export function slugPeloKind(kind: string): string {
  return SLUGS_LEGAIS[kind.toUpperCase()] ?? kind.toLowerCase();
}
