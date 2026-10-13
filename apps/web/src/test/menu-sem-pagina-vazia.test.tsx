import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import axios from "axios";
import { AdminShell } from "../components/layout/AdminShell";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { api } from "../lib/api";
import { tokenStore } from "../lib/tokenStore";
import { monteAdaptador, rotasDeSessao, type Rota } from "./fabrica-api";

// Decisão §0.5 do PROMPT MESTRE, executada na F3.1: a barra lateral não anuncia
// módulo que ainda não existe. Quem abre o painel vê apenas o que abre de
// verdade — nada de linha apagada, nada de etiqueta "em breve", nada de página
// vazia. Ordens de Serviço e Gateways & Cobranças saíram da barra nesta rodada; as
// Ordens de Serviço voltaram na F3.2 Parte 1, com rota, API e dados próprios, e
// Gateways & Cobranças volta na Parte 2 pelo mesmo caminho.
//
// Este arquivo é a guarda: ele não deixa nenhum item entrar no menu sem destino,
// não deixa o roteador prometer uma rota que nenhuma página atende, e não deixa
// o estado visual de "em obra" voltar ao CSS. Três níveis, do texto à tela:
// a tabela do menu, o roteador com as páginas que ele monta, e a barra renderizada
// numa sessão real do painel.
//
// A rede do sino e da sessão é o adaptador de testes: o que se verifica aqui é a
// barra, não a API.

const MENU = "src/components/layout/AdminShell.tsx";
const ROTEADOR = "src/App.tsx";
const CSS = "src/styles/components.css";

// Le do diretório do workspace (apps/web) o texto-fonte que a regra proíbe ou exige.
function fonte(caminho: string): string {
  return readFileSync(resolve(process.cwd(), caminho), "utf8");
}

// A tabela NAV_GROUPS, sem o resto do arquivo: é ali que mora um item do menu.
function blocoDoMenu(): string {
  const texto = fonte(MENU);
  const inicio = texto.indexOf("const NAV_GROUPS");
  const fim = texto.indexOf("\n];", inicio);
  if (inicio < 0 || fim < 0) throw new Error("não localizei a tabela do menu lateral");
  return texto.slice(inicio, fim);
}

// Toda linha de item tem um rótulo; as linhas de comentário da tabela não têm.
function linhasDeItem(): string[] {
  return blocoDoMenu()
    .split("\n")
    .map((linha) => linha.trim())
    .filter((linha) => linha.includes("label:"));
}

function destinosDoMenu(): string[] {
  return [...blocoDoMenu().matchAll(/to:\s*"([^"]+)"/g)].map((achado) => achado[1]);
}

// jsdom não traz matchMedia, e o AdminShell pergunta por ele para saber se a
// barra é gaveta (mobile) ou trilha fixa (desktop). Fixamos o desktop: é o
// estado em que a tabela do menu aparece inteira na tela.
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (consulta: string) => ({
      matches: consulta === "(min-width: 821px)",
      media: consulta,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
});

function monteSessao(rotasExtras: Rota[] = []) {
  const rotas: Rota[] = [
    ...rotasDeSessao(),
    {
      caminho: "/notifications/count",
      status: 200,
      data: { naoLidas: 0, urgentes: 0, porTipo: { sale: 0, stock: 0, lead: 0, billing: 0, report: 0 } },
    },
    {
      caminho: "/notifications",
      status: 200,
      data: { data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 } },
    },
    ...rotasExtras,
  ];
  const adaptador = monteAdaptador(rotas);
  axios.defaults.adapter = adaptador;
  api.defaults.adapter = adaptador;
  tokenStore.setRefresh("r1");
  return render(
    <ThemeProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={["/app"]}>
          <Routes>
            <Route path="/app" element={<AdminShell />}>
              <Route index element={<div>tela inicial do painel</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>,
  );
}

afterEach(() => {
  cleanup();
  tokenStore.clear();
  vi.restoreAllMocks();
});

describe("Menu lateral sem página vazia e sem 'em breve' (F3.1)", () => {
  it("todo item da tabela do menu tem rota", () => {
    const itens = linhasDeItem();
    expect(itens.length).toBeGreaterThanOrEqual(16);
    for (const item of itens) {
      expect(item, item).toContain("to:");
    }
    // Nada de sobra: cada destino declarado pertence a uma linha de item.
    expect(destinosDoMenu()).toHaveLength(itens.length);
  });

  it("o menu não conhece a palavra 'em breve', o estado em obra nem a dica que o justifica", () => {
    const texto = fonte(MENU);
    expect(texto).not.toContain("emBreve");
    expect(texto).not.toMatch(/em breve/i);
    expect(texto).not.toMatch(/ainda em constru/i);
    expect(texto).not.toContain("is-soon");
    expect(texto).not.toContain("admin-nav-soon");
  });

  it("cada rota do menu tem Route no roteador e a Route monta uma página que existe", () => {
    const roteador = fonte(ROTEADOR);
    const destinos = destinosDoMenu();
    expect(destinos.length).toBeGreaterThan(0);

    for (const destino of destinos) {
      if (destino === "/app") {
        expect(roteador).toContain('path="/app"');
        // O painel abre no Dashboard: sem essa linha, a rota /app seria um casulo vazio.
        expect(roteador).toContain("<Route index element={<Dashboard />} />");
        expect(existsSync(resolve(process.cwd(), "src/pages/Dashboard.tsx"))).toBe(true);
        continue;
      }

      const sufixo = destino.slice("/app/".length);
      const linha =
        roteador.split("\n").find((atual) => atual.includes(`<Route path="${sufixo}"`)) ?? "";
      expect(linha, `${destino} não tem Route no roteador`).not.toBe("");

      const componente = linha.match(/element={<(\w+)\s*\/>}/)?.[1];
      expect(componente, `${destino} tem Route sem componente`).toBeTruthy();

      const caminho = `src/pages/${componente}.tsx`;
      expect(existsSync(resolve(process.cwd(), caminho)), `${destino} aponta para ${caminho}, que não existe`).toBe(true);
      const pagina = fonte(caminho);
      // Página real: título de tela e sem texto de obra.
      expect(pagina, caminho).toContain("page-title");
      expect(pagina, caminho).not.toMatch(/em breve|ainda em constru|página vazia|nao esta pronta|não está pronta/i);
    }
  });

  it("o CSS do item em obra saiu junto com o item", () => {
    const css = fonte(CSS);
    expect(css).not.toMatch(/\.admin-nav-item\.is-soon/);
    expect(css).not.toMatch(/\.admin-nav-soon\b/);
    expect(css).not.toMatch(/\.is-collapsed\.is-peek \.admin-nav-soon/);
  });

  it("na barra montada toda linha é link com destino e nenhuma diz 'em breve'", async () => {
    monteSessao();
    await waitFor(() => expect(document.querySelectorAll(".admin-nav-item").length).toBeGreaterThan(0));

    const itens = Array.from(document.querySelectorAll<HTMLElement>(".admin-nav-item"));
    expect(itens.length).toBeGreaterThanOrEqual(16);
    for (const item of itens) {
      const rotulo = item.textContent ?? "";
      expect(item.tagName, rotulo).toBe("A");
      const href = (item as HTMLAnchorElement).getAttribute("href") ?? "";
      expect(href, rotulo).not.toBe("");
      expect(href, rotulo).not.toBe("#");
      expect(item.className, rotulo).not.toContain("is-soon");
      expect(rotulo).not.toMatch(/em breve/i);
      expect(item.getAttribute("aria-disabled")).toBeNull();
    }
    expect(document.body.textContent).not.toMatch(/em breve/i);
    expect(document.querySelector(".admin-nav-soon")).toBeNull();
  });

  it("nenhuma camada do menu fica sem item depois do filtro de permissão", () => {
    // Título de camada sem nada embaixo é a mesma tela vazia com outro nome.
    const texto = fonte(MENU);
    expect(texto).toContain(".filter((grupo) => grupo.items.length > 0)");
    const itens = linhasDeItem();
    const camadas = blocoDoMenu()
      .split("\n")
      .filter((linha) => linha.trim().startsWith("title:"));
    expect(camadas.length).toBeGreaterThan(0);
    expect(itens.length).toBeGreaterThanOrEqual(camadas.length);
  });
});
