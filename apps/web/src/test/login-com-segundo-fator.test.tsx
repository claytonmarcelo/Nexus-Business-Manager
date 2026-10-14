import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import axios from "axios";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { Login } from "../pages/Login";
import { api } from "../lib/api";
import { tokenStore } from "../lib/tokenStore";
import { monteAdaptador, USUARIO_DE_TESTE, type Rota } from "./fabrica-api";

// T3.5 (F4, decisão D3 do dono): as duas etapas do login na tela.
//
// A API já prova os dois lados do contrato (apps/api/test/segundo-fator.test.ts).
// Este arquivo prova o que é do navegador:
//   1. senha certa de quem tem segundo fator NÃO abre sessão — abre a etapa de
//      código, e a sessão só existe depois do código;
//   2. o token de etapa viaja no cabeçalho da rota de etapa, e não vira sessão
//      guardada: o access token fica em memória, e o refresh salvo é o da resposta
//      do código — nunca o do desafio;
//   3. quem é obrigado a ligar o segundo fator vê a chave uma vez, ativa, e só
//      então recebe os dez códigos de recuperação — também uma vez;
//   4. "voltar para a senha" descarta a etapa: a tela volta ao começo sem deixar
//      nada pendurado;
//   5. depois das duas etapas o painel abre para um caminho desta casa, mesmo
//      quando a origem pedida é um endereço de fora.
//
// A rede para no adaptador em vez de deixar um pedaço do fluxo de fora: o
// interceptor do axios, o AuthContext e a tela são os reais.

const SESSAO_DO_CODIGO = {
  accessToken: "access-apos-codigo",
  refreshToken: "refresh-apos-codigo",
  user: USUARIO_DE_TESTE,
};

const CODIGOS_DE_RECUPERACAO = Array.from({ length: 10 }, (_, i) => `abcde-fgh${i}j`);

const SEGREDO_DE_PROVA = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";

interface Chamada {
  url: string;
  autorizacao: string | undefined;
}

/**
 * O adaptador da fábrica de testes, com um caderno: registra cada URL chamada e o
 * cabeçalho de autorização que ela levou. É assim que este arquivo consegue provar
 * que o token de etapa viajou no cabeçalho da rota de etapa — e não em lugar nenhum
 * que sobreviva à aba.
 */
function monteAppComRegistro(rotas: Rota[]): Chamada[] {
  const chamadas: Chamada[] = [];
  const interior = monteAdaptador(rotas);
  const adaptador = async (config: Parameters<typeof interior>[0]) => {
    const cabecalho = (config.headers ?? {}) as Record<string, unknown>;
    const autorizacao =
      typeof cabecalho.Authorization === "string"
        ? cabecalho.Authorization
        : typeof cabecalho.authorization === "string"
          ? cabecalho.authorization
          : undefined;
    chamadas.push({ url: config.url ?? "", autorizacao });
    return interior(config);
  };
  axios.defaults.adapter = adaptador;
  api.defaults.adapter = adaptador;
  return chamadas;
}

function SondaDeRota() {
  const { pathname } = useLocation();
  return <span data-testid="rota-atual">{pathname}</span>;
}

function monteLogin(rotas: Rota[], estadoDeRota?: unknown): Chamada[] {
  const chamadas = monteAppComRegistro(rotas);
  render(
    <ThemeProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[{ pathname: "/login", state: estadoDeRota }]}>
          <SondaDeRota />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/app" element={<div>tela do painel</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>,
  );
  return chamadas;
}

function preenchaERode(email: string, senha: string) {
  fireEvent.change(screen.getByPlaceholderText("seu@email.com"), { target: { value: email } });
  // O `PasswordInput` escreve o rótulo como `<span>`, não como `<label htmlFor>`:
  // quem procura pelo texto não acha o campo. A régua aqui é o tipo do próprio input.
  const campo = document.querySelector('input[type="password"]');
  if (!campo) throw new Error("a tela de entrada não tem campo de senha");
  fireEvent.change(campo, { target: { value: senha } });
  fireEvent.click(screen.getByRole("button", { name: "ENTRAR" }));
}

function digiteCodigoETenteEntrar(codigo: string) {
  fireEvent.change(screen.getByPlaceholderText("123456"), { target: { value: codigo } });
  fireEvent.click(screen.getByRole("button", { name: "ENTRAR" }));
}

/** O painel abre depois da pausa de sucesso de 900 ms que a própria tela faz. */
async function abraOPainel() {
  await waitFor(() => expect(screen.queryByText("tela do painel")).not.toBeNull(), { timeout: 4000 });
}

beforeEach(() => {
  tokenStore.clear();
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  tokenStore.clear();
  localStorage.clear();
});

describe("Login com segundo fator (F4 / D3)", () => {
  it("a senha certa de quem tem segundo fator abre a etapa de codigo, nao o painel", async () => {
    const chamadas = monteLogin([
      { caminho: "/auth/login", status: 200, data: { twoFactorRequired: true, challengeToken: "desafio-1" } },
      { caminho: "/auth/2fa/challenge", status: 200, data: SESSAO_DO_CODIGO },
      { caminho: "/auth/logout", status: 200, data: {} },
    ]);

    preenchaERode("dono@empresa.teste", "SenhaForte123!");

    await screen.findByText("Segundo fator");
    // (1) Nenhuma sessão ainda: a resposta do login não trouxe par de tokens, e a
    // tela não guarda refresh nenhum antes do código.
    expect(localStorage.getItem("nexus.refresh")).toBeNull();
    expect(tokenStore.access).toBeNull();
    expect(screen.queryByText("tela do painel")).toBeNull();

    digiteCodigoETenteEntrar("123456");
    await abraOPainel();

    // (2) o cabeçalho da rota de etapa é o token do desafio — nem uma sessão, nem o
    // token que veio no corpo da resposta.
    const etapa = chamadas.find((c) => c.url.includes("/auth/2fa/challenge"));
    expect(etapa?.autorizacao).toBe("Bearer desafio-1");
    // A sessão guardada é a que o código devolveu.
    expect(localStorage.getItem("nexus.refresh")).toBe("refresh-apos-codigo");
    expect(tokenStore.access).toBe("access-apos-codigo");
  });

  it("depois das duas etapas o painel abre para um caminho desta casa", async () => {
    // O `from` é texto que chegou por navegação. Um endereço de fora viraria a porta
    // de saída do painel logo depois do login; a régua está em lib/destino.ts e aqui
    // ela é exercitada na tela real, no caminho de duas etapas.
    const chamadas = monteLogin(
      [
        { caminho: "/auth/login", status: 200, data: { twoFactorRequired: true, challengeToken: "desafio-2" } },
        { caminho: "/auth/2fa/challenge", status: 200, data: SESSAO_DO_CODIGO },
        { caminho: "/auth/logout", status: 200, data: {} },
      ],
      { from: "//dominio.com/painel" },
    );

    preenchaERode("dono@empresa.teste", "SenhaForte123!");
    await screen.findByText("Segundo fator");
    digiteCodigoETenteEntrar("654321");

    await abraOPainel();
    expect(screen.getByTestId("rota-atual").textContent).toBe("/app");
    // Nada saiu para fora: nenhuma chamada levou o endereço de outro domínio.
    expect(chamadas.every((c) => !c.url.includes("dominio.com"))).toBe(true);
  });

  it("quem e obrigado a ligar ve a chave uma vez, ativa, e so ai ve os dez codigos", async () => {
    const chamadas = monteLogin([
      {
        caminho: "/auth/login",
        status: 200,
        data: {
          twoFactorSetupRequired: true,
          setupToken: "config-1",
          mensagem: "Ligue o segundo fator para entrar.",
        },
      },
      {
        caminho: "/auth/2fa/setup",
        status: 200,
        data: {
          segredoBase32: SEGREDO_DE_PROVA,
          uri: "otpauth://totp/Nexus:conta?secret=" + SEGREDO_DE_PROVA,
          obrigatorio: true,
        },
      },
      {
        caminho: "/auth/2fa/activate",
        status: 200,
        data: { codigosDeRecuperacao: CODIGOS_DE_RECUPERACAO, ...SESSAO_DO_CODIGO },
      },
      { caminho: "/auth/logout", status: 200, data: {} },
    ]);

    preenchaERode("dono@empresa.teste", "SenhaForte123!");

    await screen.findByText("Ativar o segundo fator");
    expect(screen.getByText("Ligue o segundo fator para entrar.")).not.toBeNull();
    // A chave aparece para a pessoa digitar no aplicativo — uma única vez.
    expect(screen.getByText(SEGREDO_DE_PROVA)).not.toBeNull();

    const setup = chamadas.find((c) => c.url.includes("/auth/2fa/setup"));
    expect(setup?.autorizacao).toBe("Bearer config-1");

    fireEvent.change(screen.getByPlaceholderText("123456"), { target: { value: "246810" } });
    fireEvent.click(screen.getByRole("button", { name: "ATIVAR E ENTRAR" }));

    await screen.findByText("Guarde os seus códigos");
    const itens = screen.getAllByRole("listitem");
    expect(itens).toHaveLength(10);
    expect(itens[0]?.textContent).toContain("abcde-fgh0j");

    // A sessão já foi instalada pelo contexto; a tela ainda mostra os códigos, e é o
    // botão dela que leva ao painel.
    expect(localStorage.getItem("nexus.refresh")).toBe("refresh-apos-codigo");
    fireEvent.click(screen.getByRole("button", { name: "ENTRAR NO PAINEL" }));
    await abraOPainel();
  });

  it("voltar para a senha descarta a etapa e nao deixa nada pendurado", async () => {
    monteLogin([
      { caminho: "/auth/login", status: 200, data: { twoFactorRequired: true, challengeToken: "desafio-3" } },
      { caminho: "/auth/logout", status: 200, data: {} },
    ]);

    preenchaERode("dono@empresa.teste", "SenhaForte123!");
    await screen.findByText("Segundo fator");

    fireEvent.click(screen.getByRole("button", { name: "Voltar para a senha" }));

    await screen.findByText("Seja bem-vindo");
    expect(screen.queryByPlaceholderText("123456")).toBeNull();
    // Quem desistiu no meio não deixou token nenhum no navegador.
    expect(localStorage.getItem("nexus.refresh")).toBeNull();
    expect(tokenStore.access).toBeNull();
  });
});
