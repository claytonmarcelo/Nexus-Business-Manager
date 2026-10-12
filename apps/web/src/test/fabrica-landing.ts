import type { PayloadLanding } from "../lib/landingTypes";

// O payload público que a vitrine recebe da API, com um fundo de verdade para
// os testes de tema: a paleta escura é a que o produto cadastra hoje, e a clara
// serve para conferir que o esquema cadastrado veste o tema a que ele pertence.

export const PALETA_ESCURA = {
  fundo: "#0b0d10",
  painel: "#171b22",
  texto: "#f2ece4",
  textoSuave: "#a7adba",
  marca: "#c8a870",
  destaque: "#b05050",
  borda: "#2a313c",
};

export const PALETA_CLARA = {
  fundo: "#f5f1ea",
  painel: "#fbf8f3",
  texto: "#2a2320",
  textoSuave: "#6b5f55",
  marca: "#803030",
  destaque: "#a87040",
  borda: "#e2d8c8",
};

export function payloadDaVitrine(
  cores: PayloadLanding["cores"] = PALETA_ESCURA,
): PayloadLanding {
  return {
    headline: "Gestão empresarial com precisão e elegância",
    subheadline: "Clientes, produtos, vendas e financeiro em um só lugar.",
    cores,
    whatsapp: { ativo: false, numero: "", mensagem: "", rotulo: "", posicao: "direita" },
    seo: {
      titulo: "Nexus Business Manager",
      descricao: "",
      palavrasChave: "",
      ogTitulo: "",
      ogDescricao: "",
      ogImagem: "",
      twitterCard: "",
      canonica: "",
      robots: "",
    },
    hero: {
      eyebrow: "ERP SaaS multiempresa",
      ctaPrimario: "Acessar sistema",
      rotaPrimario: "/login",
      ctaSecundario: "",
      rotaSecundario: "",
      imagemUrl: "",
      overlay: 0.55,
      desfoque: 0,
    },
    social: { redes: [] },
    contact: { email: "", telefone: "", endereco: "", horario: "" },
    manutencao: { ativa: false, mensagem: "", previsao: "", previsaoEm: null },
    banners: [],
    capacidades: [],
    depoimentos: [],
    metricas: [],
    faqs: [],
    legais: [],
  };
}
