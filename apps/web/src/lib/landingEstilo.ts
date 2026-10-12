import type { ConfiguracaoSeo, EsquemaCores } from "./landingTypes";

// As cores do CMS mandam na vitrine e não no painel: elas são aplicadas como
// variáveis locais no elemento raiz da página pública, então o tema escolhido
// pela pessoa continua valendo dentro do /app. Na vitrine elas só vestem o tema
// a que pertencem — ver aplicarCores.
const PARES: [keyof EsquemaCores, string][] = [
  ["fundo", "--bg"],
  ["painel", "--surface"],
  ["texto", "--text"],
  ["textoSuave", "--text-muted"],
  ["marca", "--brand"],
  ["destaque", "--accent"],
  ["borda", "--border"],
];

export type TemaPagina = "dark" | "light";

function corValida(valor: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(valor);
}

// Luminância relativa da WCAG 1.0 sobre o hexadecimal. É o que diz, sem
// depender de lista de cores, se o fundo cadastrado é escuro ou claro.
function luminancia(cor: string): number {
  const eixo = (canal: number): number => {
    const s = canal / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const r = Number.parseInt(cor.slice(1, 3), 16);
  const g = Number.parseInt(cor.slice(3, 5), 16);
  const b = Number.parseInt(cor.slice(5, 7), 16);
  return 0.2126 * eixo(r) + 0.7152 * eixo(g) + 0.0722 * eixo(b);
}

// O corte de 0.179 é o da própria WCAG para separar cor escura de clara.
// Fundo em branco ou fora do formato deixa a paleta sem identidade: nesse caso
// o esquema não é um dos dois, e aplicarCores trata como "vale para ambos".
export function esquemaDasCores(cores: EsquemaCores): TemaPagina {
  if (!corValida(cores.fundo)) return "dark";
  return luminancia(cores.fundo) < 0.179 ? "dark" : "light";
}

export function aplicarCores(cores: EsquemaCores, raiz: HTMLElement | null, tema: TemaPagina): void {
  if (!raiz) return;
  // O CMS guarda um esquema só, sem par claro/escuro. Ele veste apenas o tema a
  // que pertence; no outro as variáveis são retiradas para que os tokens do
  // tema ativo ajam — é isso que faz o alternador valer também na vitrine, em
  // vez de deixar a paleta escura por cima do tema claro.
  const veste = corValida(cores.fundo) ? esquemaDasCores(cores) === tema : true;
  for (const [chave, variavel] of PARES) {
    const valor = cores[chave];
    // Só pinta o que veio preenchido: valor vazio deixa o token do tema agir.
    if (veste && corValida(valor)) raiz.style.setProperty(variavel, valor);
    else raiz.style.removeProperty(variavel);
  }
  // --text-2 e --text-3 são aliases do tema; sem refazer aqui o texto suave
  // perderia o contraste no bloco pintado pelo CMS. E se a paleta não veste
  // este tema, elas saem junto: sobra só o que o token do tema manda.
  if (veste && corValida(cores.textoSuave)) {
    raiz.style.setProperty("--text-2", cores.textoSuave);
    raiz.style.setProperty("--text-3", cores.textoSuave);
  } else {
    raiz.style.removeProperty("--text-2");
    raiz.style.removeProperty("--text-3");
  }
}

type Tag = "name" | "property";

function garanteMeta(tag: Tag, chave: string, valor: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${tag}="${chave}"]`);
  if (!valor) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(tag, chave);
    document.head.append(el);
  }
  el.content = valor;
}

function garanteCanonica(url: string): void {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!url) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.append(el);
  }
  el.href = url;
}

// SEO da vitrine escrito no documento a partir do que está no banco. Campo
// vazio não gera tag vazia: robô lê ausência, não placeholder.
export function aplicarSeo(seo: ConfiguracaoSeo): void {
  if (seo.titulo) document.title = seo.titulo;
  garanteMeta("name", "description", seo.descricao);
  garanteMeta("name", "keywords", seo.palavrasChave);
  garanteMeta("name", "robots", seo.robots);
  garanteMeta("property", "og:title", seo.ogTitulo || seo.titulo);
  garanteMeta("property", "og:description", seo.ogDescricao || seo.descricao);
  garanteMeta("property", "og:image", seo.ogImagem);
  garanteMeta("property", "og:type", "website");
  garanteMeta("name", "twitter:card", seo.twitterCard);
  garanteCanonica(seo.canonica);
}
