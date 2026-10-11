import { z } from "zod";

// ===== CMS da pagina publica =====
// Conteudo global da plataforma (nao por empresa): as tabelas landing_configs,
// landing_items e legal_documents nao tem company_id de proposito, porque a
// vitrine e uma so. Por isso a escrita e do dueno da plataforma (OWNER, que
// segura "*") e a leitura do editor segue o mesmo caminho.

export const HEX = /^#[0-9a-fA-F]{6}$/;

export const coresSchema = z
  .object({
    fundo: z.string().regex(HEX, "cor em hexadecimal #rrggbb"),
    painel: z.string().regex(HEX, "cor em hexadecimal #rrggbb"),
    texto: z.string().regex(HEX, "cor em hexadecimal #rrggbb"),
    textoSuave: z.string().regex(HEX, "cor em hexadecimal #rrggbb"),
    marca: z.string().regex(HEX, "cor em hexadecimal #rrggbb"),
    destaque: z.string().regex(HEX, "cor em hexadecimal #rrggbb"),
    borda: z.string().regex(HEX, "cor em hexadecimal #rrggbb"),
  })
  .partial();

export const whatsappSchema = z
  .object({
    ativo: z.boolean(),
    numero: z.string().regex(/^[0-9+\-\s()]{0,24}$/, "numero de WhatsApp invalido"),
    mensagem: z.string().max(300),
    rotulo: z.string().max(60),
    posicao: z.enum(["direita", "esquerda"]),
  })
  .partial();

export const seoSchema = z
  .object({
    titulo: z.string().max(180),
    descricao: z.string().max(400),
    palavrasChave: z.string().max(400),
    ogTitulo: z.string().max(180),
    ogDescricao: z.string().max(400),
    ogImagem: z.string().max(300),
    twitterCard: z.string().max(60),
    canonica: z.string().max(300),
    robots: z.string().max(60),
  })
  .partial();

export const manutencaoSchema = z
  .object({
    ativa: z.boolean(),
    mensagem: z.string().min(3).max(400),
    // Texto livre ("voltamos em breve") e a data-limite que alimenta o
    // relogio de contagem regressiva da tela de manutencao.
    previsao: z.string().max(120),
    previsaoEm: z.string().datetime({ offset: true }).nullish(),
    tokenPulso: z.string().max(64),
    // Lista fechada de IPs que entram mesmo com a manutencao ligada
    // (escritorio, monitoracao). Sem mascara: IPv4 literal.
    ipsPermitidos: z.array(z.string().regex(/^[0-9]{1,3}(\.[0-9]{1,3}){3}$/, "IP invalido")).max(20),
  })
  .partial();

export const heroSchema = z
  .object({
    eyebrow: z.string().max(80),
    ctaPrimario: z.string().max(60),
    rotaPrimario: z.string().max(200),
    ctaSecundario: z.string().max(60),
    rotaSecundario: z.string().max(200),
    imagemUrl: z.string().max(300),
    // Escurecimento da imagem de fundo (0 a 1) e desfoque em pixels: sem
    // overlay a texto fica ilegivel, e o editor precisa ajustar os dois.
    overlay: z.coerce.number().min(0).max(1),
    desfoque: z.coerce.number().min(0).max(20),
  })
  .partial();

const redeSchema = z.object({
  rede: z.string().min(2).max(30),
  rotulo: z.string().max(60),
  url: z.string().regex(/^https?:\/\/.+/, "link em https"),
});

export const socialSchema = z
  .object({
    redes: z.array(redeSchema).max(10),
  })
  .partial();

export const contactSchema = z
  .object({
    email: z.string().email("e-mail invalido").or(z.literal("")),
    telefone: z.string().max(32),
    endereco: z.string().max(200),
    horario: z.string().max(120),
  })
  .partial();

const blocoBase = {
  headline: z.string().min(3).max(200).optional(),
  subheadline: z.string().min(3).max(400).optional(),
};

export const configSchema = z.object({
  ...blocoBase,
  cores: coresSchema.optional(),
  whatsapp: whatsappSchema.optional(),
  seo: seoSchema.optional(),
  manutencao: manutencaoSchema.optional(),
  hero: heroSchema.optional(),
  social: socialSchema.optional(),
  contact: contactSchema.optional(),
});

export const KINDS = ["BANNER", "FEATURE", "TESTIMONIAL", "METRIC", "FAQ"] as const;
export const kindSchema = z.enum(KINDS);

// Extras por tipo, todos opcionais. Estrelas e empresa so fazem sentido no
// depoimento; valor e formato na metrica; icone e rota na capacidade.
export const itemMetaSchema = z
  .object({
    estrelas: z.coerce.number().int().min(0).max(5),
    empresa: z.string().max(120),
    valor: z.coerce.number(),
    formato: z.enum(["numero", "moeda", "porcentagem", "texto"]),
    unidade: z.string().max(24),
    icone: z.string().max(8),
    rota: z.string().max(200),
  })
  .partial()
  .nullable()
  .optional();

export const itemSchema = z.object({
  kind: kindSchema,
  title: z.string().trim().min(2).max(200),
  body: z.string().max(4000).nullable().optional(),
  imageUrl: z.string().max(255).nullable().optional(),
  link: z.string().max(200).nullable().optional(),
  author: z.string().max(120).nullable().optional(),
  role: z.string().max(120).nullable().optional(),
  meta: itemMetaSchema,
  order: z.coerce.number().int().min(0).max(999).optional(),
  active: z.boolean().optional(),
});

export const itemPatchSchema = itemSchema.partial().extend({ kind: kindSchema.optional() });

export const legalKindSchema = z.enum(["TERMS", "PRIVACY", "LGPD"]);

export const legalSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  // Texto do documento: ate 60 mil caracteres comportam os tres documentos
  // legais inteiros, e o limite existe para ninguem gravar um binario.
  content: z.string().max(60000).optional(),
  published: z.boolean().optional(),
});

export const itensQuerySchema = z.object({
  kind: kindSchema,
  ativos: z
    .enum(["1", "0", "true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "1" || v === "true")),
});

export const bypassSchema = z.object({ token: z.string().min(4).max(64) });

export type ConfiguracaoInput = z.infer<typeof configSchema>;
export type ItemInput = Omit<z.infer<typeof itemSchema>, "meta"> & { meta?: Record<string, unknown> | null };
export type LegalInput = z.infer<typeof legalSchema>;
