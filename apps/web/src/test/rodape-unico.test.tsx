import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MemoryRouter } from "react-router-dom";
import { AppFooter } from "../components/layout/AppFooter";
import { MARCA, type Marca } from "../lib/brand";
import type { ResumoLegal } from "../lib/landingTypes";

// F1.2 do PROMPT MESTRE: a vitrine e o painel passam a ter um rodapé só, alimentado
// por um arquivo de marca. Este arquivo amarra exatamente o que a tela promete: o
// símbolo da marca, a linha de direitos com ano dinâmico, o crédito do autor (link
// apenas quando houver endereço configurado), os documentos legais que aparecem
// somente depois de publicados, nenhum link vazio e o indicador de serviço que só
// existe com dado real da API. Em 2026-10-13 o dono tirou do rodapé o rótulo com o
// nome do produto e o selo de versão, e a suíte passou a proibir os dois.
//
// O estado do serviço vem de GET /api/health. Aqui a ponta é um duplo: o que se
// verifica é a regra de exibição, não a rede.

const saude = vi.hoisted(() => ({ resposta: null as unknown }));

vi.mock("../lib/statusServico", () => ({
  consultarEstadoDoServico: async () => saude.resposta,
}));

const TRES_PUBLICADOS: ResumoLegal[] = [
  { kind: "TERMS", title: "Termos de uso do Nexus", published: true },
  { kind: "PRIVACY", title: "Política de privacidade do Nexus", published: true },
  { kind: "LGPD", title: "Adequação à LGPD", published: true },
];

interface Props {
  readonly legais?: ResumoLegal[];
  readonly contexto?: "vitrine" | "painel";
  readonly marca?: Marca;
}

function monte(props: Props = {}) {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <AppFooter legais={props.legais ?? []} contexto={props.contexto ?? "vitrine"} marca={props.marca} />
    </MemoryRouter>,
  );
}

function rodape(): HTMLElement {
  const el = document.querySelector<HTMLElement>("footer.nexus-footer");
  if (!el) throw new Error("o rodapé único não montou");
  return el;
}

// Le do diretório do workspace (apps/web) o texto-fonte que a regra proíbe ou exige.
function fonte(caminho: string): string {
  return readFileSync(resolve(process.cwd(), caminho), "utf8");
}

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-theme");
  saude.resposta = null;
});

describe("Rodapé único da vitrine e do painel (F1.2)", () => {
  it("as três telas montam o AppFooter e o rodapé antigo da vitrine deixou de existir", () => {
    for (const caminho of ["src/pages/Landing.tsx", "src/pages/Legal.tsx", "src/components/layout/AdminShell.tsx"]) {
      const texto = fonte(caminho);
      expect(texto, caminho).toContain("AppFooter");
      expect(texto, caminho).not.toContain("LandingFooter");
      expect(texto, caminho).not.toContain('className="admin-footer"');
    }
    expect(() => fonte("src/components/landing/LandingFooter.tsx")).toThrow();
    const css = fonte("src/styles/components.css");
    expect(css).not.toMatch(/\.landing-footer\b/);
    expect(css).not.toMatch(/\.admin-footer\b/);
    expect(fonte("src/styles/landing.css")).not.toMatch(/\.landing-footer-legais\b/);
  });

  it("o rodapé não repete o nome do produto ao lado do símbolo nem mostra selo de versão", () => {
    // Decisão do dono em 2026-10-13: saem do rodapé o rótulo com o nome do produto
    // e o selo de versão. Ficam a marca gráfica, a linha de direitos autorais — que é
    // onde o nome do produto continua sendo dito —, os links legais, o estado do
    // serviço e o crédito de quem constrói o sistema.
    monte({ legais: TRES_PUBLICADOS });
    const el = rodape();
    const texto = el.textContent ?? "";
    expect(el.querySelector(".nexus-footer-nome")).toBeNull();
    expect(el.querySelector(".nexus-footer-versao")).toBeNull();
    expect(el.querySelector(".nexus-footer-marca svg, .nexus-footer-marca img")).not.toBeNull();
    expect(texto).not.toMatch(/\d+\.\d+\.\d+/);
    expect(texto).toContain(MARCA.nome);
    expect(texto).toContain(String(new Date().getFullYear()));

    // A injeção de versão no build só existia para alimentar aquele selo. Sem selo,
    // ela deixa de existir: nada no pacote carrega um dado que nenhuma tela mostra.
    for (const caminho of ["vite.config.ts", "vitest.config.ts", "src/vite-env.d.ts", "src/lib/brand.ts"]) {
      expect(fonte(caminho), caminho).not.toContain("__APP_VERSION__");
    }
    expect(fonte("src/lib/brand.ts"), "brand.ts").not.toMatch(/versao/i);
    const css = fonte("src/styles/components.css");
    expect(css).not.toContain(".nexus-footer-nome");
    expect(css).not.toContain(".nexus-footer-versao");
  });

  it("mantém o crédito como texto enquanto não houver página do autor", () => {
    expect(MARCA.urlDoAutor).toBe("");
    monte();
    expect(rodape().textContent).toContain("Desenvolvido por Clayton Marcelo");
    expect(rodape().querySelectorAll("a")).toHaveLength(0);
  });

  it("abre a página do autor em nova aba, sem expor a origem ao destino", () => {
    monte({ marca: { ...MARCA, urlDoAutor: "https://exemplo.test/autor" } });
    const link = rodape().querySelector<HTMLAnchorElement>("a.nexus-footer-autor");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBe("https://exemplo.test/autor");
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toContain("noopener");
    expect(link?.getAttribute("rel")).toContain("noreferrer");
  });

  it("esconde o documento que não foi publicado", () => {
    monte({ legais: [{ kind: "LGPD", title: "Adequação à LGPD", published: false }] });
    expect(rodape().querySelector(".nexus-footer-legais")).toBeNull();
    expect(rodape().querySelector("a[href='/legal/lgpd']")).toBeNull();
  });

  it("lista os publicados nos três endereços legais do produto", () => {
    monte({ legais: TRES_PUBLICADOS });
    const links = Array.from(rodape().querySelectorAll<HTMLAnchorElement>(".nexus-footer-legais a"));
    expect(links.map((a) => a.getAttribute("href")).sort()).toEqual([
      "/legal/lgpd",
      "/legal/privacidade",
      "/legal/termos",
    ]);
    expect(links.map((a) => a.textContent).join(" |")).toContain("Termos de uso do Nexus");
  });

  it("recorre ao rótulo institucional quando o documento publicado veio sem título", () => {
    monte({ legais: [{ kind: "TERMS", title: "   ", published: true }] });
    expect(rodape().querySelector("a[href='/legal/termos']")?.textContent).toBe("Termos de uso");
  });

  it("nenhum link do rodapé sai vazio ou com âncora falsa", () => {
    monte({
      legais: TRES_PUBLICADOS,
      contexto: "painel",
      marca: { ...MARCA, urlDoAutor: "https://exemplo.test/autor" },
    });
    const links = Array.from(rodape().querySelectorAll<HTMLAnchorElement>("a"));
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      const href = link.getAttribute("href") ?? "";
      expect(href, link.textContent ?? "link sem rótulo").not.toBe("");
      expect(href, link.textContent ?? "link sem rótulo").not.toBe("#");
    }
  });

  it("some com o indicador de serviço enquanto a saúde não devolve dado real", () => {
    saude.resposta = null;
    monte();
    expect(rodape().querySelector(".nexus-footer-status")).toBeNull();
  });

  it("diz que o serviço está operacional quando a API responde ok", async () => {
    saude.resposta = { status: "ok", db: "up", ts: "2026-10-12T00:00:00.000Z" };
    monte();
    await waitFor(() => expect(rodape().querySelector(".nexus-footer-status")).not.toBeNull());
    const el = rodape().querySelector<HTMLElement>(".nexus-footer-status");
    expect(el?.textContent).toBe("Serviço operacional");
    expect(el?.getAttribute("data-estado")).toBe("operacional");
  });

  it("avisa a instabilidade quando o banco não responde, sem pintar texto em cor que perde contraste", async () => {
    saude.resposta = { status: "degraded", db: "down", ts: "2026-10-12T00:00:00.000Z" };
    monte();
    await waitFor(() => expect(rodape().querySelector(".nexus-footer-status")).not.toBeNull());
    const el = rodape().querySelector<HTMLElement>(".nexus-footer-status");
    expect(el?.textContent).toBe("Serviço com instabilidade");
    expect(el?.getAttribute("data-estado")).toBe("instavel");
    // O ponto colorido é enfeite: quem lê a tela (ou um leitor de tela) recebe o texto.
    expect(el?.querySelector("[aria-hidden='true']")).not.toBeNull();
  });

  it("veste os dois temas só com tokens, sem cor escrita no componente", () => {
    const css = fonte("src/styles/components.css");
    const bloco = css.slice(css.indexOf(".nexus-footer {"), css.indexOf("/* Login */"));
    expect(bloco.length).toBeGreaterThan(0);
    expect(bloco).toContain("var(--text-2)");
    expect(bloco).not.toContain("var(--text-3)");
    expect(bloco).not.toMatch(/#[0-9a-fA-F]{3,6}/);

    for (const tema of ["dark", "light"] as const) {
      document.documentElement.setAttribute("data-theme", tema);
      monte({ legais: TRES_PUBLICADOS, contexto: tema === "dark" ? "vitrine" : "painel" });
      const el = rodape();
      expect(el.getAttribute("style")).toBeNull();
      expect(el.className).toContain(tema === "dark" ? "nexus-footer--vitrine" : "nexus-footer--painel");
      cleanup();
    }
  });
});
