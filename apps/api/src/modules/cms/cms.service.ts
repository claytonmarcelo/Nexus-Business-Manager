import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import type { LandingItemKind, LegalKind } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { badRequest, notFound } from "../../lib/errors";
import { audit, ESCOPO_PLATAFORMA } from "../../lib/audit";

// ===== CMS da página pública =====
// O conteúdo mora no banco (não em código) para que a administração da
// plataforma edite cor, herói, capacidades, depoimentos, métricas, FAQs, textos
// legais, WhatsApp, SEO e manutenção sem precisar de um deploy. A leitura
// pública passa por um cache curto; toda gravação é auditada (seção 36) e
// validada pelo esquema da rota.

export const CONFIG_ID = "default";

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

export interface ConfiguracaoManutencao {
  ativa: boolean;
  mensagem: string;
  previsao: string;
  previsaoEm: string | null;
  tokenPulso: string;
  ipsPermitidos: string[];
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

export interface ConfiguracaoLanding {
  headline: string;
  subheadline: string;
  cores: EsquemaCores;
  whatsapp: ConfiguracaoWhatsapp;
  seo: ConfiguracaoSeo;
  manutencao: ConfiguracaoManutencao;
  hero: ConfiguracaoHero;
  social: ConfiguracaoSocial;
  contact: ConfiguracaoContato;
}

export interface ItemInput {
  kind: LandingItemKind;
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

// Padrões = a identidade Premium Gourmet da landing atual. Assim, a primeira
// leitura pública continua igual ao que o projeto mostrava antes do CMS.
export const CORES_PADRAO: EsquemaCores = {
  fundo: "#0b0d10",
  painel: "#171b22",
  texto: "#f2ece4",
  textoSuave: "#a7adba",
  marca: "#c8a870",
  destaque: "#b05050",
  borda: "#2a313c",
};

export const WHATSAPP_PADRAO: ConfiguracaoWhatsapp = {
  ativo: false,
  numero: "",
  mensagem: "Olá! Quero conhecer o Nexus Business Manager.",
  rotulo: "Fale no WhatsApp",
  posicao: "direita",
};

export const SEO_PADRAO: ConfiguracaoSeo = {
  titulo: "Nexus Business Manager — ERP SaaS multiempresa",
  descricao:
    "Clientes, produtos, vendas, estoque, finanças, CRM e agenda em um só lugar, com isolamento por empresa e trilha de auditoria.",
  palavrasChave: "erp, saas, multiempresa, gestão empresarial, vendas, estoque, financeiro, crm",
  ogTitulo: "Nexus Business Manager",
  ogDescricao: "Gestão empresarial com precisão e elegância.",
  ogImagem: "",
  twitterCard: "summary_large_image",
  canonica: "",
  robots: "index, follow",
};

export const MANUTENCAO_PADRAO: ConfiguracaoManutencao = {
  ativa: false,
  mensagem: "Estamos ajustando o Nexus Business Manager. Voltamos em instantes.",
  previsao: "",
  previsaoEm: null,
  tokenPulso: "",
  ipsPermitidos: [],
};

export const HERO_PADRAO: ConfiguracaoHero = {
  eyebrow: "ERP SaaS multiempresa",
  ctaPrimario: "Acessar sistema",
  rotaPrimario: "/login",
  ctaSecundario: "Criar minha empresa",
  rotaSecundario: "/cadastro",
  imagemUrl: "",
  overlay: 0.55,
  desfoque: 0,
};

export const SOCIAL_PADRAO: ConfiguracaoSocial = { redes: [] };

export const CONTATO_PADRAO: ConfiguracaoContato = {
  email: "",
  telefone: "",
  endereco: "",
  horario: "",
};

export const HEADLINE_PADRAO = "Gestão empresarial com precisão e elegância";
export const SUBHEADLINE_PADRAO =
  "Clientes, produtos, vendas, estoque, finanças, CRM e agenda em um só lugar — um ambiente seguro, responsivo e com identidade própria, do balcão à nuvem.";

function comoObjeto(valor: unknown): Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}

function texto(valor: unknown, padrao: string): string {
  return typeof valor === "string" && valor.trim() !== "" ? valor : padrao;
}

function textoPermitido(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

function booleano(valor: unknown, padrao: boolean): boolean {
  return typeof valor === "boolean" ? valor : padrao;
}

function cor(valor: unknown, padrao: string): string {
  const hex = typeof valor === "string" ? valor.trim().toLowerCase() : "";
  return /^#[0-9a-f]{6}$/.test(hex) ? hex : padrao;
}

function numero(valor: unknown, padrao: number, min: number, max: number): number {
  const n = typeof valor === "number" ? valor : Number(valor);
  if (!Number.isFinite(n)) return padrao;
  return Math.min(max, Math.max(min, n));
}

function dataIso(valor: unknown): string | null {
  if (typeof valor !== "string" || valor.trim() === "") return null;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function listaDeIps(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .filter((i): i is string => typeof i === "string")
    .map((i) => i.trim())
    .filter((i) => /^[0-9]{1,3}(\.[0-9]{1,3}){3}$/.test(i))
    .slice(0, 20);
}

// Normaliza sempre contra os padrões: uma gravação parcial nunca some da tela.
function normalizar(registro: {
  headline: string | null;
  subheadline: string | null;
  colors: unknown;
  whatsapp: unknown;
  seo: unknown;
  maintenance: unknown;
  hero: unknown;
  social: unknown;
  contact: unknown;
}): ConfiguracaoLanding {
  const c = comoObjeto(registro.colors);
  const w = comoObjeto(registro.whatsapp);
  const s = comoObjeto(registro.seo);
  const m = comoObjeto(registro.maintenance);
  const h = comoObjeto(registro.hero);
  const so = comoObjeto(registro.social);
  const k = comoObjeto(registro.contact);
  const redes = Array.isArray(so.redes)
    ? so.redes
        .map((r) => {
          const o = comoObjeto(r);
          return {
            rede: typeof o.rede === "string" ? o.rede.slice(0, 30) : "",
            rotulo: typeof o.rotulo === "string" ? o.rotulo.slice(0, 60) : "",
            url: typeof o.url === "string" && /^https?:\/\//.test(o.url) ? o.url.slice(0, 300) : "",
          };
        })
        .filter((r) => r.rede !== "" && r.url !== "")
    : [];
  return {
    headline: texto(registro.headline, HEADLINE_PADRAO),
    subheadline: texto(registro.subheadline, SUBHEADLINE_PADRAO),
    cores: {
      fundo: cor(c.fundo, CORES_PADRAO.fundo),
      painel: cor(c.painel, CORES_PADRAO.painel),
      texto: cor(c.texto, CORES_PADRAO.texto),
      textoSuave: cor(c.textoSuave, CORES_PADRAO.textoSuave),
      marca: cor(c.marca, CORES_PADRAO.marca),
      destaque: cor(c.destaque, CORES_PADRAO.destaque),
      borda: cor(c.borda, CORES_PADRAO.borda),
    },
    whatsapp: {
      ativo: booleano(w.ativo, WHATSAPP_PADRAO.ativo),
      numero: textoPermitido(w.numero),
      mensagem: texto(w.mensagem, WHATSAPP_PADRAO.mensagem),
      rotulo: texto(w.rotulo, WHATSAPP_PADRAO.rotulo),
      posicao: w.posicao === "esquerda" ? "esquerda" : "direita",
    },
    seo: {
      titulo: texto(s.titulo, SEO_PADRAO.titulo),
      descricao: texto(s.descricao, SEO_PADRAO.descricao),
      palavrasChave: textoPermitido(s.palavrasChave),
      ogTitulo: texto(s.ogTitulo, SEO_PADRAO.ogTitulo),
      ogDescricao: texto(s.ogDescricao, SEO_PADRAO.ogDescricao),
      ogImagem: textoPermitido(s.ogImagem),
      twitterCard: texto(s.twitterCard, SEO_PADRAO.twitterCard),
      canonica: textoPermitido(s.canonica),
      robots: texto(s.robots, SEO_PADRAO.robots),
    },
    manutencao: {
      ativa: booleano(m.ativa, MANUTENCAO_PADRAO.ativa),
      mensagem: texto(m.mensagem, MANUTENCAO_PADRAO.mensagem),
      previsao: textoPermitido(m.previsao),
      previsaoEm: dataIso(m.previsaoEm),
      tokenPulso: textoPermitido(m.tokenPulso),
      ipsPermitidos: listaDeIps(m.ipsPermitidos),
    },
    hero: {
      eyebrow: texto(h.eyebrow, HERO_PADRAO.eyebrow),
      ctaPrimario: texto(h.ctaPrimario, HERO_PADRAO.ctaPrimario),
      rotaPrimario: texto(h.rotaPrimario, HERO_PADRAO.rotaPrimario),
      ctaSecundario: texto(h.ctaSecundario, HERO_PADRAO.ctaSecundario),
      rotaSecundario: textoPermitido(h.rotaSecundario),
      imagemUrl: textoPermitido(h.imagemUrl),
      overlay: numero(h.overlay, HERO_PADRAO.overlay, 0, 1),
      desfoque: numero(h.desfoque, HERO_PADRAO.desfoque, 0, 20),
    },
    social: { redes },
    contact: {
      email: textoPermitido(k.email),
      telefone: textoPermitido(k.telefone),
      endereco: textoPermitido(k.endereco),
      horario: textoPermitido(k.horario),
    },
  };
}

const json = (valor: unknown): Prisma.InputJsonValue => (valor ?? {}) as Prisma.InputJsonValue;
// DbNull grava NULL de verdade na coluna Json; undefined/null nunca viram
// a string "null" no banco.
type MetaBanco = Prisma.InputJsonValue | typeof Prisma.DbNull;
const metaParaBanco = (valor: Record<string, unknown> | null | undefined): MetaBanco =>
  valor === undefined || valor === null ? Prisma.DbNull : (valor as Prisma.InputJsonValue);

// Linha única de configuração, criada sob demanda: o projeto não depende de
// seed para ter uma landing funcionando.
export async function obterConfig(): Promise<ConfiguracaoLanding> {
  const registro = await prisma.landingConfig.upsert({
    where: { id: CONFIG_ID },
    update: {},
    create: {
      id: CONFIG_ID,
      colors: json(CORES_PADRAO),
      whatsapp: json(WHATSAPP_PADRAO),
      seo: json(SEO_PADRAO),
      maintenance: json(MANUTENCAO_PADRAO),
      hero: json(HERO_PADRAO),
      social: json(SOCIAL_PADRAO),
      contact: json(CONTATO_PADRAO),
    },
  });
  return normalizar(registro);
}

type MudancaConfig = Partial<Omit<ConfiguracaoLanding, "cores" | "whatsapp" | "seo" | "manutencao" | "hero" | "social" | "contact">> & {
  cores?: Partial<EsquemaCores>;
  whatsapp?: Partial<ConfiguracaoWhatsapp>;
  seo?: Partial<ConfiguracaoSeo>;
  manutencao?: Partial<ConfiguracaoManutencao>;
  hero?: Partial<ConfiguracaoHero>;
  social?: Partial<ConfiguracaoSocial>;
  contact?: Partial<ConfiguracaoContato>;
};

type Ator = { userId: string; companyId: string | null; ip?: string | null };

export async function salvarConfig(mudanca: MudancaConfig, ator: Ator): Promise<ConfiguracaoLanding> {
  const atual = await obterConfig();
  const proxima: ConfiguracaoLanding = {
    headline: mudanca.headline !== undefined ? mudanca.headline : atual.headline,
    subheadline: mudanca.subheadline !== undefined ? mudanca.subheadline : atual.subheadline,
    cores: { ...atual.cores, ...(mudanca.cores ?? {}) },
    whatsapp: { ...atual.whatsapp, ...(mudanca.whatsapp ?? {}) },
    seo: { ...atual.seo, ...(mudanca.seo ?? {}) },
    manutencao: { ...atual.manutencao, ...(mudanca.manutencao ?? {}) },
    hero: { ...atual.hero, ...(mudanca.hero ?? {}) },
    social: { ...atual.social, ...(mudanca.social ?? {}) },
    contact: { ...atual.contact, ...(mudanca.contact ?? {}) },
  };
  await prisma.landingConfig.upsert({
    where: { id: CONFIG_ID },
    update: {
      headline: proxima.headline,
      subheadline: proxima.subheadline,
      colors: json(proxima.cores),
      whatsapp: json(proxima.whatsapp),
      seo: json(proxima.seo),
      maintenance: json(proxima.manutencao),
      hero: json(proxima.hero),
      social: json(proxima.social),
      contact: json(proxima.contact),
    },
    create: {
      id: CONFIG_ID,
      headline: proxima.headline,
      subheadline: proxima.subheadline,
      colors: json(proxima.cores),
      whatsapp: json(proxima.whatsapp),
      seo: json(proxima.seo),
      maintenance: json(proxima.manutencao),
      hero: json(proxima.hero),
      social: json(proxima.social),
      contact: json(proxima.contact),
    },
  });
  invalidarCaches();
  const blocos = Object.keys(mudanca).filter((chave) => chave !== "headline" && chave !== "subheadline");
  await audit({
    userId: ator.userId,
    companyId: ator.companyId,
    scope: ESCOPO_PLATAFORMA,
    action: "cms.config.updated",
    entity: "landing_config",
    entityId: CONFIG_ID,
    ip: ator.ip ?? null,
    metadata: { blocos: blocos.length ? blocos : ["textos"] },
  });
  return proxima;
}

export function novoTokenPulso(): string {
  return crypto.randomBytes(9).toString("hex");
}

// ---- Itens da landing (banners, capacidades, depoimentos, métricas, FAQs) ----
const KINDS: readonly string[] = ["BANNER", "FEATURE", "TESTIMONIAL", "METRIC", "FAQ"];

export function validarKind(valor: string): LandingItemKind {
  const achado = KINDS.find((k) => k === valor.toUpperCase());
  if (!achado) throw badRequest("Tipo de conteúdo inválido: " + valor);
  return achado as LandingItemKind;
}

interface LinhaItem {
  id: string;
  kind: LandingItemKind;
  title: string;
  body: string | null;
  imageUrl: string | null;
  link: string | null;
  author: string | null;
  role: string | null;
  meta: Prisma.JsonValue;
  order: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function linhas(item: LinhaItem) {
  return {
    id: item.id,
    kind: item.kind,
    title: item.title,
    body: item.body,
    imageUrl: item.imageUrl,
    link: item.link,
    author: item.author,
    role: item.role,
    meta: metaObjeto(item.meta),
    order: item.order,
    active: item.active,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function metaObjeto(valor: Prisma.JsonValue): Record<string, unknown> | null {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : null;
}

export async function listarItens(kind: LandingItemKind, somenteAtivos = false) {
  const itens = await prisma.landingItem.findMany({
    where: { kind, ...(somenteAtivos ? { active: true } : {}) },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return itens.map(linhas);
}

export async function criarItem(input: ItemInput, ator: Ator) {
  const criado = await prisma.landingItem.create({
    data: {
      kind: input.kind,
      title: input.title,
      body: input.body ?? null,
      imageUrl: input.imageUrl ?? null,
      link: input.link ?? null,
      author: input.author ?? null,
      role: input.role ?? null,
      meta: metaParaBanco(input.meta),
      order: input.order ?? 0,
      active: input.active ?? true,
    },
  });
  invalidarCaches();
  await audit({
    userId: ator.userId,
    companyId: ator.companyId,
    scope: ESCOPO_PLATAFORMA,
    action: "cms.item.created",
    entity: "landing_item",
    entityId: criado.id,
    ip: ator.ip ?? null,
    metadata: { kind: criado.kind, title: criado.title },
  });
  return linhas(criado);
}

export async function atualizarItem(id: string, input: Partial<ItemInput>, ator: Ator) {
  const existe = await prisma.landingItem.findUnique({ where: { id } });
  if (!existe) throw notFound("Conteúdo não encontrado");
  const atualizado = await prisma.landingItem.update({
    where: { id },
    data: {
      ...(input.kind !== undefined ? { kind: input.kind } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.link !== undefined ? { link: input.link } : {}),
      ...(input.author !== undefined ? { author: input.author } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.meta !== undefined ? { meta: metaParaBanco(input.meta) } : {}),
      ...(input.order !== undefined ? { order: input.order } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    },
  });
  invalidarCaches();
  await audit({
    userId: ator.userId,
    companyId: ator.companyId,
    scope: ESCOPO_PLATAFORMA,
    action: "cms.item.updated",
    entity: "landing_item",
    entityId: atualizado.id,
    ip: ator.ip ?? null,
    metadata: { title: atualizado.title },
  });
  return linhas(atualizado);
}

// Remoção física proposital: item de vitrine não tem histórico de negócio.
export async function removerItem(id: string, ator: Ator) {
  const existe = await prisma.landingItem.findUnique({ where: { id } });
  if (!existe) throw notFound("Conteúdo não encontrado");
  await prisma.landingItem.delete({ where: { id } });
  invalidarCaches();
  await audit({
    userId: ator.userId,
    companyId: ator.companyId,
    scope: ESCOPO_PLATAFORMA,
    action: "cms.item.delete",
    entity: "landing_item",
    entityId: id,
    ip: ator.ip ?? null,
    metadata: { kind: existe.kind, title: existe.title },
  });
  return { ok: true };
}

// ---- Documentos legais ----
const TITULOS_LEGAIS: Record<LegalKind, string> = {
  TERMS: "Termos de uso",
  PRIVACY: "Política de privacidade",
  LGPD: "Adequação à LGPD",
};

export async function obterLegal(kind: LegalKind) {
  const registro = await prisma.legalDocument.upsert({
    where: { kind },
    update: {},
    create: { kind, title: TITULOS_LEGAIS[kind], content: null, published: false },
  });
  return {
    id: registro.id,
    kind: registro.kind,
    title: registro.title,
    content: registro.content ?? "",
    published: registro.published,
    updatedAt: registro.updatedAt,
  };
}

export async function listarLegais() {
  return Promise.all((Object.keys(TITULOS_LEGAIS) as LegalKind[]).map(obterLegal));
}

export async function salvarLegal(
  kind: LegalKind,
  dados: { title?: string; content?: string; published?: boolean },
  ator: Ator,
) {
  await obterLegal(kind);
  const salvo = await prisma.legalDocument.update({
    where: { kind },
    data: {
      ...(dados.title !== undefined ? { title: dados.title } : {}),
      ...(dados.content !== undefined ? { content: dados.content } : {}),
      ...(dados.published !== undefined ? { published: dados.published } : {}),
    },
  });
  invalidarCaches();
  await audit({
    userId: ator.userId,
    companyId: ator.companyId,
    scope: ESCOPO_PLATAFORMA,
    action: salvo.published ? "cms.legal.published" : "cms.legal.updated",
    entity: "legal_document",
    entityId: salvo.id,
    ip: ator.ip ?? null,
    metadata: { kind: salvo.kind, publicado: salvo.published },
  });
  return {
    id: salvo.id,
    kind: salvo.kind,
    title: salvo.title,
    content: salvo.content ?? "",
    published: salvo.published,
    updatedAt: salvo.updatedAt,
  };
}

// ---- Leitura pública ----
// A landing consome tudo por um único endpoint sem sessão. O payload nunca traz
// o token de pulso da manutenção, e o estado de manutenção sempre é informado
// (o visitante precisa saber o que está acontecendo).
let cachePublico: { em: number; dados: PayloadPublico } | null = null;
let cacheManutencao: {
  em: number;
  valor: { ativa: boolean; mensagem: string; previsaoEm: string | null; token: string; ips: string[] };
} | null = null;
const TTL_PUBLICO = 10_000;
const TTL_MANUTENCAO = 5_000;

function invalidarCaches(): void {
  cachePublico = null;
  cacheManutencao = null;
}

// Força a próxima leitura a ver o estado novo (usada pelo gancho de manutenção
// e pelos testes, que gravam e leem na mesma execução).
export function recarregarEstado(): void {
  invalidarCaches();
}

export interface PayloadPublico {
  headline: string;
  subheadline: string;
  cores: EsquemaCores;
  whatsapp: ConfiguracaoWhatsapp;
  seo: ConfiguracaoSeo;
  hero: ConfiguracaoHero;
  social: ConfiguracaoSocial;
  contact: ConfiguracaoContato;
  manutencao: { ativa: boolean; mensagem: string; previsao: string; previsaoEm: string | null };
  banners: { id: string; title: string; body: string | null; imageUrl: string | null; link: string | null }[];
  capacidades: { id: string; title: string; body: string | null; imageUrl: string | null; link: string | null; meta: Record<string, unknown> | null }[];
  depoimentos: { id: string; title: string; body: string | null; author: string | null; role: string | null; meta: Record<string, unknown> | null }[];
  metricas: { id: string; title: string; body: string | null; meta: Record<string, unknown> | null }[];
  faqs: { id: string; title: string; body: string | null }[];
  legais: { kind: string; title: string; published: boolean }[];
}

export async function payloadPublico(): Promise<PayloadPublico> {
  const agora = Date.now();
  if (cachePublico && agora - cachePublico.em < TTL_PUBLICO) return cachePublico.dados;
  const config = await obterConfig();
  const [banners, capacidades, depoimentos, metricas, faqs, legais] = await Promise.all([
    listarItens("BANNER", true),
    listarItens("FEATURE", true),
    listarItens("TESTIMONIAL", true),
    listarItens("METRIC", true),
    listarItens("FAQ", true),
    listarLegais(),
  ]);
  const dados: PayloadPublico = {
    headline: config.headline,
    subheadline: config.subheadline,
    cores: config.cores,
    whatsapp: config.whatsapp,
    seo: config.seo,
    hero: config.hero,
    social: config.social,
    contact: config.contact,
    manutencao: {
      ativa: config.manutencao.ativa,
      mensagem: config.manutencao.mensagem,
      previsao: config.manutencao.previsao,
      previsaoEm: config.manutencao.previsaoEm,
    },
    banners: banners.map((b) => ({ id: b.id, title: b.title, body: b.body, imageUrl: b.imageUrl, link: b.link })),
    capacidades: capacidades.map((c) => ({
      id: c.id,
      title: c.title,
      body: c.body,
      imageUrl: c.imageUrl,
      link: c.link,
      meta: c.meta,
    })),
    depoimentos: depoimentos.map((d) => ({
      id: d.id,
      title: d.title,
      body: d.body,
      author: d.author,
      role: d.role,
      meta: d.meta,
    })),
    metricas: metricas.map((m) => ({ id: m.id, title: m.title, body: m.body, meta: m.meta })),
    faqs: faqs.map((f) => ({ id: f.id, title: f.title, body: f.body })),
    legais: legais.map((l) => ({ kind: l.kind, title: l.title, published: l.published })),
  };
  cachePublico = { em: agora, dados };
  return dados;
}

// Estado enxuto para o gancho de manutenção: ler e normalizar o JSON grande a
// cada requisição sairia mais caro que o próprio cache.
export async function estadoManutencao() {
  const agora = Date.now();
  if (cacheManutencao && agora - cacheManutencao.em < TTL_MANUTENCAO) return cacheManutencao.valor;
  const config = await obterConfig();
  const valor = {
    ativa: config.manutencao.ativa,
    mensagem: config.manutencao.mensagem,
    previsaoEm: config.manutencao.previsaoEm,
    token: config.manutencao.tokenPulso,
    ips: config.manutencao.ipsPermitidos,
  };
  cacheManutencao = { em: agora, valor };
  return valor;
}

// Comparação em tempo constante: o pulso é um segredo curto.
export function pulsoValido(apresentado: string | undefined | null, esperado: string): boolean {
  if (!esperado || !apresentado) return false;
  const a = Buffer.from(apresentado);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// O Fastify devolve "::1" ou "::ffff:127.0.0.1" conforme o stack, e a lista do
// editor guarda IPv4 literal — normalizamos antes de comparar.
export function ipPermitido(ip: string | undefined | null, permitidos: string[]): boolean {
  if (!ip || !permitidos.length) return false;
  const limpo = ip.replace(/^::ffff:/, "");
  if (permitidos.includes(limpo)) return true;
  return limpo === "::1" && permitidos.includes("127.0.0.1");
}

// ---- Pontuação de SEO (regras reais, sem inflar nota) ----
export interface ChecagemSeo {
  item: string;
  peso: number;
  alcancado: boolean;
  dica: string;
}

export function pontuarSeo(
  seo: ConfiguracaoSeo,
  config: { headline: string; subheadline: string; whatsapp: ConfiguracaoWhatsapp },
) {
  const t = seo.titulo.trim();
  const d = seo.descricao.trim();
  const chaves = seo.palavrasChave.split(",").map((x) => x.trim()).filter(Boolean);
  const urlOk = (v: string) => /^https?:\/\/.+/i.test(v.trim());

  const itens: ChecagemSeo[] = [
    { item: "Título (title)", peso: 15, alcancado: t.length >= 30 && t.length <= 60, dica: "Deixe entre 30 e 60 caracteres; hoje tem " + t.length + "." },
    { item: "Meta description", peso: 15, alcancado: d.length >= 70 && d.length <= 160, dica: "Deixe entre 70 e 160 caracteres; hoje tem " + d.length + "." },
    { item: "H1 da página", peso: 10, alcancado: config.headline.trim().length >= 10, dica: "O headline é o H1: resuma a promessa do produto." },
    { item: "Subtítulo descritivo", peso: 5, alcancado: config.subheadline.trim().length >= 40, dica: "Descreva o produto em uma frase completa." },
    { item: "Open Graph (og:title)", peso: 10, alcancado: seo.ogTitulo.trim().length >= 5, dica: "Defina o título exibido ao compartilhar no WhatsApp e nas redes." },
    { item: "Open Graph (og:description)", peso: 10, alcancado: seo.ogDescricao.trim().length >= 20, dica: "Escreva uma descrição de compartilhamento com até 200 caracteres." },
    { item: "Imagem de compartilhamento (og:image)", peso: 15, alcancado: urlOk(seo.ogImagem), dica: "Publique uma imagem 1200x630 em URL absoluta https." },
    { item: "URL canônica", peso: 5, alcancado: urlOk(seo.canonica), dica: "Informe o endereço público definitivo (https://...)." },
    { item: "Palavras-chave", peso: 5, alcancado: chaves.length >= 3 && chaves.length <= 12, dica: "Use de 3 a 12 termos separados por vírgula; hoje há " + chaves.length + "." },
    { item: "Diretiva robots", peso: 5, alcancado: /index/i.test(seo.robots), dica: "Mantenha 'index, follow' para a página ser encontrada." },
    { item: "Cartão Twitter", peso: 5, alcancado: /summary/.test(seo.twitterCard), dica: "Use summary_large_image para aparecer com imagem." },
    { item: "Contato visível", peso: 5, alcancado: config.whatsapp.ativo && config.whatsapp.numero.trim() !== "", dica: "Ligue o botão de WhatsApp ou deixe um canal de contato na página." },
  ];

  const total = itens.reduce((soma, i) => soma + i.peso, 0);
  const pontos = itens.reduce((soma, i) => soma + (i.alcancado ? i.peso : 0), 0);
  const nota = Math.round((pontos / total) * 100);
  const nivel = nota >= 85 ? "excelente" : nota >= 70 ? "bom" : nota >= 50 ? "atenção" : "crítico";
  return { nota, nivel, pontos, total, itens };
}
