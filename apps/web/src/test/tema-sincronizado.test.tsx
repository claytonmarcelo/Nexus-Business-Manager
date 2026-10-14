import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider, aplicaTemaSalvo, useTheme } from "../context/ThemeContext";

// F5, item 2 (achado N7): o painel tem de trocar de tema inteiro, e não pela
// metade.
//
// O AdminLTE 4 veste os componentes dele pela convenção do Bootstrap 5.3 —
// `[data-bs-theme=dark]` —, enquanto os tokens desta casa e todas as telas
// próprias vivem em `[data-theme]`. Enquanto o provedor escreveu só o segundo,
// 21 regras do AdminLTE ficaram fora do jogo: a seta do `select`, o fundo do
// interruptor, as variáveis da barra lateral, os filtros do botão de fechar e o
// `color-scheme` nativo. A tela inteira escurece, menos o pedaço que o
// framework ainda achou que era claro.
//
// Estes casos são a régua do par: os dois atributos, sempre o mesmo valor,
// persistidos no navegador, e vivos depois de um logout.

const CHAVE = "nexus.theme";

function Sonda() {
  const { theme, toggle, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="tema">{theme}</span>
      <button type="button" onClick={toggle}>alternar tema</button>
      <button type="button" onClick={() => setTheme("light")}>tema claro</button>
    </div>
  );
}

function atributos() {
  const raiz = document.documentElement;
  return {
    tema: raiz.getAttribute("data-theme"),
    bsTema: raiz.getAttribute("data-bs-theme"),
    salvo: localStorage.getItem(CHAVE),
  };
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-bs-theme");
});

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-bs-theme");
});

describe("Os dois atributos de tema andam juntos", () => {
  it("o boot escreve os dois antes do primeiro render", () => {
    localStorage.setItem(CHAVE, "light");
    expect(aplicaTemaSalvo()).toBe("light");
    expect(atributos()).toEqual({ tema: "light", bsTema: "light", salvo: "light" });
  });

  it("o boot no escuro também escreve os dois", () => {
    localStorage.setItem(CHAVE, "dark");
    aplicaTemaSalvo();
    expect(atributos().tema).toBe("dark");
    expect(atributos().bsTema).toBe("dark");
  });

  it("alternar troca os dois atributos pelo mesmo valor", () => {
    render(
      <ThemeProvider>
        <Sonda />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("tema").textContent).toBe("dark");
    expect(atributos().bsTema).toBe("dark");

    fireEvent.click(screen.getByRole("button", { name: "alternar tema" }));
    expect(screen.getByTestId("tema").textContent).toBe("light");
    expect(atributos()).toEqual({ tema: "light", bsTema: "light", salvo: "light" });

    fireEvent.click(screen.getByRole("button", { name: "alternar tema" }));
    expect(atributos().tema).toBe("dark");
    expect(atributos().bsTema).toBe("dark");
  });

  it("escolher o tema claro a mão escreve os dois", () => {
    render(
      <ThemeProvider>
        <Sonda />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "tema claro" }));
    expect(atributos().bsTema).toBe("light");
  });

  it("a preferência sobrevive ao desmontar e ao remontar a árvore", () => {
    const primeira = render(
      <ThemeProvider>
        <Sonda />
      </ThemeProvider>,
    );
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "tema claro" }));
    });
    primeira.unmount();

    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-bs-theme");
    expect(aplicaTemaSalvo()).toBe("light");
    render(
      <ThemeProvider>
        <Sonda />
      </ThemeProvider>,
    );
    expect(atributos()).toEqual({ tema: "light", bsTema: "light", salvo: "light" });
  });

  it("nenhum dos dois atributos fica de fora quando o storage está vazio", () => {
    render(
      <ThemeProvider>
        <Sonda />
      </ThemeProvider>,
    );
    const { tema, bsTema } = atributos();
    expect(tema).toBe(bsTema);
    expect(["dark", "light"]).toContain(tema);
  });
});
