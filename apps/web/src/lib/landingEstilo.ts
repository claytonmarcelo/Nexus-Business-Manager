import type { ConfiguracaoSeo, EsquemaCores } from "./landingTypes";

// As cores do CMS mandam na vitrine e não no painel: elas são aplicadas como
// variáveis locais no elemento raiz da página pública, então o tema escolhido
// pela pessoa continua valendo dentro do /app.
const PARES: [keyof EsquemaCores, string][] = [
  ["fundo", "--bg"],
  ["painel", "--surface"],
  ["texto", "--text"],
  ["textoSuave", "--text-muted"],
  ["marca", "--brand"],
  ["destaque", "--accent"],
  ["borda", "--border"],
];

export function aplicarCores(cores: EsquemaCores, raiz: HTMLElement | null): void {
  if (!raiz) return;
  for (const [chave, variavel] of PARES) {
    const valor = cores[chave];
    // Só pinta o que veio preenchido: valor vazio deixa o token do tema agir.
    if (/^#[0-9a-fA-F]{6}$/.test(valor)) raiz.style.setProperty(variavel, valor);
    else raiz.style.removeProperty(variavel);
  }
  // --text-2 e --text-3 são aliases do tema; sem refazer aqui o texto suave
  // perderia o contraste no bloco pintado pelo CMS.
  if (/^#[0-9a-fA-F]{6}$/.test(cores.textoSuave)) {
    raiz.style.setProperty("--text-2", cores.textoSuave);
    raiz.style.setProperty("--text-3", cores.textoSuave);
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
