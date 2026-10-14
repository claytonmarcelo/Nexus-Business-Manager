import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import axios from "axios";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { Landing } from "../pages/Landing";
import { api } from "../lib/api";
import { tokenStore } from "../lib/tokenStore";
import { monteAdaptador, rotasDeSessao, USUARIO_DE_TESTE, type Rota } from "./fabrica-api";

// Regra do projeto: quem sai do sistema — pelo botão, por sessão expirada ou por
// logout em outra aba — volta para a página de boas-vindas. Quem chega sem
// sessão nenhuma continua indo ao login. Estes casos exercitam o fluxo de
// verdade (interceptor do axios, AuthContext, ProtectedRoute e a vitrine), com
// a rede parada no adaptador em vez de pedaço trocado por imitação.
vi.mock("../lib/landingApi", async () => {
  const { PALETA_ESCURA, payloadDaVitrine } = await import("./fabrica-landing");
  return {
    lerConteudoPublico: async () => payloadDaVitrine(PALETA_ESCURA),
    lerDocumentoPublico: async () => ({ kind: "TERMS", title: "", content: "", published: false }),
    pedirLiberacaoManutencao: async () => false,
  };
});

const VITRINE = "Gestão empresarial com precisão e elegância";

function SondaDeRota() {
  const { pathname } = useLocation();
  return <span data-testid="rota-atual">{pathname}</span>;
}

// O botão do painel faz o que o AdminShell faz: só encerra a sessão. O destino é
// garantia do ProtectedRoute, e não de um navigate na mão de quem pediu o logout.
function PainelDeTeste() {
  const { logout } = useAuth();
  return (
    <div>
      tela de vendas
      <button type="button" onClick={() => void logout()}>sair do painel</button>
      <button type="button" onClick={() => void api.get("/sales").catch(() => undefined)}>
        chamar rota de negócio
      </button>
      <button
        type="button"
        onClick={() => void api.post("/auth/2fa/desativar", { codigo: "000000" }).catch(() => undefined)}
      >
        desligar o segundo fator com código errado
      </button>
    </div>
  );
}

function EntradaDeTeste() {
  const { state } = useLocation();
  const origem = (state as { from?: string } | null)?.from ?? "sem origem";
  return <div>tela de entrada, origem {origem}</div>;
}

function monteApp(rotas: Rota[], inicial: string) {
  const adaptador = monteAdaptador(rotas);
  axios.defaults.adapter = adaptador;
  api.defaults.adapter = adaptador;
  return render(
    <ThemeProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[inicial]}>
          <SondaDeRota />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<EntradaDeTeste />} />
            <Route
              path="/app/vendas"
              element={
                <ProtectedRoute>
                  <PainelDeTeste />
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>,
  );
}

// Sessão montada do jeito que o app monta: refresh no disco, renovação pelo
// interceptor de verdade e o usuário vindo de /auth/me.
async function entreNaEmpresa(extras: Rota[] = []) {
  tokenStore.setRefresh("r0");
  monteApp([...rotasDeSessao(), ...extras], "/app/vendas");
  await screen.findByText("tela de vendas");
}

function rotaAtual(): string {
  return screen.getByTestId("rota-atual").textContent ?? "";
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-bs-theme");
});

afterEach(() => {
  cleanup();
});

describe("Toda sessão encerrada volta para a página de boas-vindas", () => {
  it("logout manual leva à vitrine, e não ao login", async () => {
    await entreNaEmpresa();
    fireEvent.click(screen.getByRole("button", { name: "sair do painel" }));
    await waitFor(() => expect(rotaAtual()).toBe("/"));
    expect(screen.queryByText(/tela de entrada/)).toBeNull();
    expect(await screen.findByText(VITRINE)).not.toBeNull();
  });

  it("sessão expirada no meio do trabalho cai na vitrine com o aviso", async () => {
    await entreNaEmpresa();
    act(() => {
      window.dispatchEvent(new Event("nexus:session-expired"));
    });
    await waitFor(() => expect(rotaAtual()).toBe("/"));
    expect(screen.queryByText(/tela de entrada/)).toBeNull();
    await screen.findByText(VITRINE);
    await waitFor(() =>
      expect(document.body.textContent).toContain("Sua sessão expirou. Entre novamente para continuar."),
    );
  });

  it("quem abre o painel sem sessão vai ao login, com a rota de origem guardada", async () => {
    monteApp(rotasDeSessao(), "/app/vendas");
    await screen.findByText(/tela de entrada/);
    expect(rotaAtual()).toBe("/login");
    expect(screen.getByText("tela de entrada, origem /app/vendas")).not.toBeNull();
  });

  it("logout feito em outra aba encerra esta sessão e devolve a vitrine", async () => {
    await entreNaEmpresa();
    act(() => {
      // A outra aba removeu a chave; esta aba só vê o evento de storage.
      localStorage.removeItem("nexus.refresh");
      window.dispatchEvent(
        new StorageEvent("storage", { key: "nexus.refresh", newValue: null, storageArea: localStorage }),
      );
    });
    await waitFor(() => expect(rotaAtual()).toBe("/"));
    expect(await screen.findByText(VITRINE)).not.toBeNull();
  });

  // N7: a preferência é uma só, mas são dois atributos no documento — o nosso
  // data-theme e o data-bs-theme que o AdminLTE lê. O fim de sessão não pode
  // apagar nenhum dos dois, e nenhum deles pode ficar para trás do outro.
  it("sair do sistema não apaga a preferência de tema deste navegador", async () => {
    localStorage.setItem("nexus.theme", "light");
    tokenStore.setRefresh("r0");
    monteApp(rotasDeSessao(), "/app/vendas");
    await screen.findByText("tela de vendas");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(document.documentElement.getAttribute("data-bs-theme")).toBe("light");

    fireEvent.click(screen.getByRole("button", { name: "sair do painel" }));
    await waitFor(() => expect(rotaAtual()).toBe("/"));
    expect(localStorage.getItem("nexus.theme")).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(document.documentElement.getAttribute("data-bs-theme")).toBe("light");
  });

  it("401 sem refresh token salvo é tratado como sessão expirada", async () => {
    await entreNaEmpresa([{ caminho: "/sales", status: 401, data: { error: "UNAUTHORIZED" } }]);
    // O refresh token desapareceu do disco: não há o que renovar.
    localStorage.removeItem("nexus.refresh");
    fireEvent.click(screen.getByRole("button", { name: "chamar rota de negócio" }));
    await waitFor(() => expect(rotaAtual()).toBe("/"));
    expect(screen.queryByText(/tela de entrada/)).toBeNull();
    await waitFor(() =>
      expect(document.body.textContent).toContain("Sua sessão expirou. Entre novamente para continuar."),
    );
  });

  // A quinta porta é a mais silenciosa: a pessoa fecha o navegador, o refresh
  // token vence ou é revogado no servidor, e ela volta semanas depois. Havia
  // sessão em curso — o disco dizia isso — então o destino é a vitrine com o
  // aviso, e não a porta de entrada de quem nunca entrou.
  it("renovação que não passa mais é sessão expirada, e não porta de entrada", async () => {
    tokenStore.setRefresh("r0");
    monteApp(
      [
        { caminho: "/auth/refresh", status: 401, data: { error: "UNAUTHORIZED" } },
        { caminho: "/auth/me", status: 200, data: USUARIO_DE_TESTE },
      ],
      "/app/vendas",
    );
    await waitFor(() => expect(rotaAtual()).toBe("/"));
    await screen.findByText(VITRINE);
    await waitFor(() =>
      expect(document.body.textContent).toContain("Sua sessão expirou. Entre novamente para continuar."),
    );
    expect(localStorage.getItem("nexus.refresh")).toBeNull();
  });

  // N64 (P19), achado da prova de navegador das telas da F4: na tela do segundo
  // fator o 401 é resposta para o que a pessoa digitou, não notícia de sessão
  // morta. Sem esta distinção, errar os seis dígitos ao desligar o segundo fator
  // derrubava a sessão inteira — a prova abriu a tela, errou o código de propósito
  // e acordou na vitrine.
  it("401 de código errado no segundo fator não encerra a sessão nem gasta o refresh", async () => {
    await entreNaEmpresa([
      { caminho: "/auth/2fa/desativar", status: 401, data: { message: "Código inválido. Confira o horário do aparelho e tente de novo." } },
    ]);
    // O boot da sessão já renovou uma vez e trouxe o token que está no disco; é
    // a partir daqui que a contagem vale.
    const refreshAntes = localStorage.getItem("nexus.refresh");
    expect(refreshAntes).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "desligar o segundo fator com código errado" }));
    await new Promise((r) => setTimeout(r, 150));
    expect(rotaAtual()).toBe("/app/vendas");
    expect(document.body.textContent).toContain("tela de vendas");
    // Um erro de digitação não pode rotacionar o refresh token da sessão.
    expect(localStorage.getItem("nexus.refresh")).toBe(refreshAntes);
  });
});
