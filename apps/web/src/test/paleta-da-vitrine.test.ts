import { describe, expect, it } from "vitest";
import { aplicarCores, esquemaDasCores } from "../lib/landingEstilo";
import { PALETA_CLARA, PALETA_ESCURA } from "./fabrica-landing";

// O CMS guarda um esquema de cores só, sem par claro/escuro. A vitrine veste
// esse esquema no tema a que ele pertence — medido pela luminância do fundo
// cadastrado — e no outro tema devolve a página aos tokens do produto. É isso
// que faz o alternador valer também na página pública.

function caixa(): HTMLElement {
  const el = document.createElement("div");
  document.body.append(el);
  return el;
}

describe("esquemaDasCores", () => {
  it("chama de escura a paleta de fundo escuro e de clara a de fundo claro", () => {
    expect(esquemaDasCores(PALETA_ESCURA)).toBe("dark");
    expect(esquemaDasCores(PALETA_CLARA)).toBe("light");
  });
});

describe("aplicarCores respeitando o tema escolhido", () => {
  it("pinta a vitrine com a paleta cadastrada quando ela é do tema ativo", () => {
    const el = caixa();
    aplicarCores(PALETA_ESCURA, el, "dark");
    expect(el.style.getPropertyValue("--bg")).toBe(PALETA_ESCURA.fundo);
    expect(el.style.getPropertyValue("--text")).toBe(PALETA_ESCURA.texto);
    expect(el.style.getPropertyValue("--surface")).toBe(PALETA_ESCURA.painel);
  });

  it("não deixa a paleta escura por cima do tema claro", () => {
    const el = caixa();
    aplicarCores(PALETA_ESCURA, el, "light");
    expect(el.style.getPropertyValue("--bg")).toBe("");
    expect(el.style.getPropertyValue("--text")).toBe("");
    expect(el.style.getPropertyValue("--text-2")).toBe("");
  });

  it("faz o mesmo com uma paleta clara cadastrada", () => {
    const el = caixa();
    aplicarCores(PALETA_CLARA, el, "light");
    expect(el.style.getPropertyValue("--bg")).toBe(PALETA_CLARA.fundo);
    aplicarCores(PALETA_CLARA, el, "dark");
    expect(el.style.getPropertyValue("--bg")).toBe("");
  });

  it("limpa o que pintou quando o tema vira, para os tokens do tema agirem", () => {
    const el = caixa();
    aplicarCores(PALETA_ESCURA, el, "dark");
    expect(el.style.getPropertyValue("--bg")).toBe(PALETA_ESCURA.fundo);
    aplicarCores(PALETA_ESCURA, el, "light");
    expect(el.getAttribute("style") ?? "").toBe("");
  });

  it("continua pintando a marca e o destaque no tema que a vitrine usa", () => {
    const el = caixa();
    aplicarCores(PALETA_ESCURA, el, "dark");
    expect(el.style.getPropertyValue("--brand")).toBe(PALETA_ESCURA.marca);
    expect(el.style.getPropertyValue("--accent")).toBe(PALETA_ESCURA.destaque);
    expect(el.style.getPropertyValue("--border")).toBe(PALETA_ESCURA.borda);
  });

  it("não quebra com cor vazia ou fora do formato", () => {
    const el = caixa();
    aplicarCores({ ...PALETA_ESCURA, fundo: "", painel: "vermelho" }, el, "dark");
    expect(el.style.getPropertyValue("--bg")).toBe("");
    expect(el.style.getPropertyValue("--surface")).toBe("");
  });
});
