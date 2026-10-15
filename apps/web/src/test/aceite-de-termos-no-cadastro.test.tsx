import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import axios from "axios";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { Register } from "../pages/Register";
import { api } from "../lib/api";
import { payloadDaVitrine, PALETA_ESCURA } from "./fabrica-landing";
import { monteAdaptadorQueRegistra, rotasDeSessao, type ChamadaRegistrada, type Rota } from "./fabrica-api";
import type { ResumoLegal } from "../lib/landingTypes";

// F7 (item 1, LGPD): o cadastro self-service é o único momento em que a pessoa
// declara que leu e aceita os textos, e a linha de aceite que a API grava nasce
// deste clique. A tela, por si só, tem de provar três coisas:
//
//   1. sem as duas caixas marcadas nada sai do navegador — a API também recusa
//      (provado em `apps/api/test/aceite-de-termos-no-cadastro.test.ts`), mas a
//      recusa local é o que evita um envio perdido e uma mensagem que a pessoa
//      não tem como corrigir;
//   2. aceitando as duas, o corpo enviado traz os dois aceites verdadeiros junto
//      com nome, e-mail e senha, e a tela continua sendo a de confirmação de
//      e-mail quando a verificação está ligada;
//   3. o endereço do texto só aparece publicado, que é a mesma regra do rodapé
//      (F1.2): um link para um documento que não existe levaria a um erro, e a
//      caixa continua obrigatória quando não há link — quem aceita aceita o texto
//      que a instalação tem, não um texto que a tela inventou.

const CAIXA_TERMOS = "Li e aceito os Termos de uso";
const CAIXA_PRIVACIDADE = "Li e aceito a Política de privacidade";
const ERRO_TERMOS = "Leia e aceite os Termos de uso para criar a conta";
const ERRO_PRIVACIDADE = "Leia e aceite a Política de privacidade para criar a conta";

const DADOS_VALIDOS = {
  nome: "Titular de Teste",
  email: "titular@empresa.teste",
  senha: "SenhaForte123!",
};

const TERMOS_E_PRIVACIDADE_PUBLICADOS: ResumoLegal[] = [
  { kind: "TERMS", title: "Termos de uso", published: true },
  { kind: "PRIVACY", title: "Política de privacidade", published: true },
  { kind: "LGPD", title: "Adequação à LGPD", published: false },
];

const NENHUM_PUBLICADO: ResumoLegal[] = [
  { kind: "TERMS", title: "Termos de uso", published: false },
  { kind: "PRIVACY", title: "Política de privacidade", published: false },
];

// A verificação de e-mail do cadastro (F4/D2) está ligada nesta instalação: a
// resposta 201 não traz sessão, e a tela passa a ser o "confirme o seu e-mail".
// Deixar o outro caminho de fora é o que mantém a prova sem uma sessão inventada.
const REDE_DE_CADASTRO: Rota[] = [
  { caminho: "/auth/register", status: 201, data: { verificationRequired: true } },
  ...rotasDeSessao(),
];

function monteCadastro(opts?: { legais?: ResumoLegal[]; rotas?: Rota[] }) {
  const payload = payloadDaVitrine(PALETA_ESCURA);
  payload.legais = opts?.legais ?? TERMOS_E_PRIVACIDADE_PUBLICADOS;
  const registrada = monteAdaptadorQueRegistra([
    { caminho: "/public/landing", status: 200, data: payload },
    ...(opts?.rotas ?? REDE_DE_CADASTRO),
  ]);
  axios.defaults.adapter = registrada.adaptador;
  api.defaults.adapter = registrada.adaptador;

  render(
    <ThemeProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={["/cadastro"]}>
          <Routes>
            <Route path="/cadastro" element={<Register />} />
            <Route path="/legal/:slug" element={<div>pagina do texto legal</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>,
  );
  return registrada.chamadas;
}

function caixa(rotulo: string): HTMLInputElement {
  const el = screen.getByLabelText(rotulo);
  expect(el.getAttribute("type")).toBe("checkbox");
  return el as HTMLInputElement;
}

/** Preenche os quatro campos de texto; as caixas ficam a cargo do caso. */
function digiteOsCampos() {
  fireEvent.change(screen.getByLabelText("Nome completo"), { target: { value: DADOS_VALIDOS.nome } });
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: DADOS_VALIDOS.email } });
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: DADOS_VALIDOS.senha } });
  fireEvent.change(screen.getByLabelText("Confirmar senha"), { target: { value: DADOS_VALIDOS.senha } });
}

function envie() {
  fireEvent.click(screen.getByRole("button", { name: "CRIAR CONTA" }));
}

function enviosParaCadastro(chamadas: readonly ChamadaRegistrada[]): readonly ChamadaRegistrada[] {
  return chamadas.filter((c) => c.caminho === "/auth/register");
}

function corpoDoCadastro(chamadas: readonly ChamadaRegistrada[]): Record<string, unknown> | null {
  return enviosParaCadastro(chamadas)[0]?.corpo ?? null;
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("As duas caixas de aceite na tela de cadastro", () => {
  it("a tela monta com as duas caixas desmarcadas e com rótulo associado", () => {
    monteCadastro();
    expect(caixa(CAIXA_TERMOS).checked).toBe(false);
    expect(caixa(CAIXA_PRIVACIDADE).checked).toBe(false);
    // Cada caixa tem um id e um rótulo que apontam para ela: leitor de tela ouve a
    // frase inteira, e o clique no texto marca a caixa correspondente.
    const termos = caixa(CAIXA_TERMOS);
    const privacidade = caixa(CAIXA_PRIVACIDADE);
    expect(termos.id).not.toBe("");
    expect(privacidade.id).not.toBe("");
    expect(termos.id).not.toBe(privacidade.id);
  });

  it("sem marcar nenhuma, o envio é barrado na tela e a API não é chamada", () => {
    const chamadas = monteCadastro();
    digiteOsCampos();
    envie();

    expect(screen.getByText(ERRO_TERMOS)).not.toBeNull();
    expect(screen.getByText(ERRO_PRIVACIDADE)).not.toBeNull();
    expect(enviosParaCadastro(chamadas)).toHaveLength(0);
  });

  it("aceitar só um texto não libera o envio: a caixa que falta continua barrando", async () => {
    const chamadas = monteCadastro();
    digiteOsCampos();
    fireEvent.click(caixa(CAIXA_TERMOS));
    envie();

    expect(screen.queryByText(ERRO_TERMOS)).toBeNull();
    expect(screen.getByText(ERRO_PRIVACIDADE)).not.toBeNull();
    expect(enviosParaCadastro(chamadas)).toHaveLength(0);

    // Marcando a que faltava, o erro sai do pé da caixa e o envio acontece.
    fireEvent.click(caixa(CAIXA_PRIVACIDADE));
    envie();
    await waitFor(() => expect(enviosParaCadastro(chamadas)).toHaveLength(1));
    expect(screen.queryByText(ERRO_PRIVACIDADE)).toBeNull();
  });

  it("aceitando os dois, o corpo que sai do navegador leva os dois aceites", async () => {
    const chamadas = monteCadastro();
    digiteOsCampos();
    fireEvent.click(caixa(CAIXA_TERMOS));
    fireEvent.click(caixa(CAIXA_PRIVACIDADE));
    envie();

    await waitFor(() => expect(enviosParaCadastro(chamadas)).toHaveLength(1));
    expect(corpoDoCadastro(chamadas)).toMatchObject({
      name: DADOS_VALIDOS.nome,
      email: DADOS_VALIDOS.email,
      password: DADOS_VALIDOS.senha,
      aceitaTermos: true,
      aceitaPrivacidade: true,
    });
    // D2: a conta existe, mas não entrou — a tela é a de confirmação de e-mail.
    await screen.findByText("Confirme o seu e-mail");
  });

  it("a recusa do servidor não desmarca o aceite já dado", async () => {
    const chamadas = monteCadastro({
      rotas: [
        { caminho: "/auth/register", status: 500, data: { message: "O servidor não respondeu." } },
        ...rotasDeSessao(),
      ],
    });
    digiteOsCampos();
    fireEvent.click(caixa(CAIXA_TERMOS));
    fireEvent.click(caixa(CAIXA_PRIVACIDADE));
    envie();

    // A pessoa corrige o que estiver errado; não repete uma declaração já dada.
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("O servidor não respondeu."));
    expect(caixa(CAIXA_TERMOS).checked).toBe(true);
    expect(caixa(CAIXA_PRIVACIDADE).checked).toBe(true);
    expect(enviosParaCadastro(chamadas)).toHaveLength(1);
  });
});

describe("O endereço do texto segue a publicação (mesma regra do rodapé)", () => {
  it("publicados os dois, a tela oferece os dois endereços", async () => {
    monteCadastro();
    await screen.findByText(/Leia antes de aceitar/);
    expect(document.querySelector("a[href='/legal/termos']")?.textContent).toBe("Termos de uso");
    expect(document.querySelector("a[href='/legal/privacidade']")?.textContent).toBe("Política de privacidade");
    // O LGPD continua rascunho: a tela de cadastro não fala com ele.
    expect(document.querySelector("a[href='/legal/lgpd']")).toBeNull();
  });

  it("sem documento publicado não há link, e a caixa continua obrigatória", async () => {
    const chamadas = monteCadastro({ legais: NENHUM_PUBLICADO });
    expect(caixa(CAIXA_TERMOS).checked).toBe(false);

    // A espera é a fronteira de macrotarefa que garante que a resposta da leitura
    // pública chegou e foi aplicada: sem ela, "nenhum link" poderia significar só
    // "a leitura ainda não voltou", e o caso passaria por motivo errado.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(enviosParaCadastro(chamadas)).toHaveLength(0);
    expect(document.querySelector("a[href^='/legal/']")).toBeNull();
    expect(document.body.textContent).not.toContain("Leia antes de aceitar");

    // Sem link, a obrigação não some: a caixa continua barrando o envio.
    digiteOsCampos();
    envie();
    expect(screen.getByText(ERRO_TERMOS)).not.toBeNull();
    expect(enviosParaCadastro(chamadas)).toHaveLength(0);
  });
});
