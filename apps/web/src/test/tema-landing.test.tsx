import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider, aplicaTemaSalvo } from "../context/ThemeContext";
import { Landing } from "../pages/Landing";
import { PALETA_ESCURA } from "./fabrica-landing";

// A vitrine é montada a partir do conteúdo público da API. Aqui o conteúdo vem
// de uma fixture com a paleta escura do produto, e o que se vigia é o tema.
vi.mock("../lib/landingApi", async () => {
  const { PALETA_ESCURA, payloadDaVitrine } = await import("./fabrica-landing");
  return {
    lerConteudoPublico: async () => payloadDaVitrine(PALETA_ESCURA),
    lerDocumentoPublico: async () => ({ kind: "TERMS", title: "", content: "", published: false }),
    pedirLiberacaoManutencao: async () => false,
  };
});

function monteLanding() {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={["/"]}>
        <Landing />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

async function espereAVitrine() {
  await screen.findByText("Gestão empresarial com precisão e elegância");
}

function vitrine(): HTMLElement {
  const el = document.querySelector<HTMLElement>(".landing");
  if (!el) throw new Error("a vitrine não montou");
  return el;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

// Sem globals o Testing Library não desmonta sozinho entre os casos, e as
// renderizações iam se somando até o findByText achar mais de um elemento.
afterEach(() => {
  cleanup();
});

describe("Alternador de tema na página de boas-vindas", () => {
  it("troca o atributo e o preferido salvo, nos dois sentidos", async () => {
    monteLanding();
    await espereAVitrine();
    const botao = screen.getByRole("switch", { name: "Ativar tema claro" });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("nexus.theme")).toBe("dark");

    fireEvent.click(botao);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem("nexus.theme")).toBe("light");

    fireEvent.click(screen.getByRole("switch", { name: "Ativar tema escuro" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("nexus.theme")).toBe("dark");
  });

  it("muda as cores da vitrine junto com o tema", async () => {
    monteLanding();
    await espereAVitrine();
    // No tema escuro a paleta cadastrada (escura) veste a vitrine.
    expect(vitrine().style.getPropertyValue("--bg")).toBe(PALETA_ESCURA.fundo);

    fireEvent.click(screen.getByRole("switch", { name: "Ativar tema claro" }));
    // No tema claro a paleta escura não pode continuar por cima dos tokens:
    // é ela que deixa o alternador "parado" na página pública.
    expect(vitrine().style.getPropertyValue("--bg")).toBe("");
    expect(vitrine().style.getPropertyValue("--text")).toBe("");

    fireEvent.click(screen.getByRole("switch", { name: "Ativar tema escuro" }));
    expect(vitrine().style.getPropertyValue("--bg")).toBe(PALETA_ESCURA.fundo);
  });

  it("guarda a escolha do visitante e a devolve ao remontar a página", async () => {
    const primeira = monteLanding();
    await espereAVitrine();
    fireEvent.click(screen.getByRole("switch", { name: "Ativar tema claro" }));
    primeira.unmount();

    document.documentElement.removeAttribute("data-theme");
    monteLanding();
    await espereAVitrine();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(screen.getByRole("switch", { name: "Ativar tema escuro" })).not.toBeNull();
    expect(vitrine().style.getPropertyValue("--bg")).toBe("");
  });

  it("responde ao teclado no alternador, com rótulo acessível", async () => {
    const usuario = userEvent.setup();
    monteLanding();
    await espereAVitrine();
    const botao = screen.getByRole("switch", { name: "Ativar tema claro" });
    botao.focus();
    await usuario.keyboard("{Enter}");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    await usuario.keyboard(" ");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("aplica o tema salvo antes de o React pintar", () => {
    localStorage.setItem("nexus.theme", "light");
    aplicaTemaSalvo();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});
