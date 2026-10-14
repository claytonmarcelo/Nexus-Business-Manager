import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import axios from "axios";
import { api } from "../lib/api";
import { monteAdaptador, type Rota } from "./fabrica-api";
import { ThemeProvider } from "../context/ThemeContext";
import { VerificarEmail } from "../pages/VerificarEmail";
import { notify } from "../lib/notify";

// N62 / P17 (carregado da F4 para a F5): a tela do link de confirmação provada.
//
// A API já responde por este contrato em apps/api/test/verificacao-de-e-mail.test.ts.
// O que é desta casa, e só daqui dá para errar, é o comportamento da tela:
//   1. token válido vira "Conta ativada" com o botão de entrar;
//   2. a tela não distingue link velho de link usado de link inexistente — ela
//      repete a frase única que a API devolve, e por isso trocar o código HTTP da
//      recusa não muda uma vírgula do que a pessoa lê;
//   3. abrir a página sem token nenhum não dispara requisicao nenhuma: a tela não
//      inventa confirmação;
//   4. o token que vem no endereço é credencial, e não pode parar em storage nem
//      ecoado em texto de confirmação;
//   5. reenviar exige endereço válido antes de chamar a rota, e a resposta que fica
//      na tela é a frase genérica — ela não confessa se o endereço existe.
//
// A rede é o adaptador da fábrica: o componente, o axios e o extrator de mensagem
// são os reais.

vi.mock("../lib/notify", () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

interface Chamada {
  url: string;
  corpo: Record<string, unknown> | undefined;
}

function monteApp(rotas: Rota[]): Chamada[] {
  const chamadas: Chamada[] = [];
  const interior = monteAdaptador(rotas);
  const adaptador = async (config: Parameters<typeof interior>[0]) => {
    let corpo: Record<string, unknown> | undefined;
    try {
      corpo = typeof config.data === "string" ? JSON.parse(config.data) : undefined;
    } catch {
      corpo = undefined;
    }
    chamadas.push({ url: config.url ?? "", corpo });
    return interior(config);
  };
  axios.defaults.adapter = adaptador;
  api.defaults.adapter = adaptador;
  return chamadas;
}

function monte(rota: string, rotas: Rota[], stricto = false): Chamada[] {
  const chamadas = monteApp(rotas);
  const arvore = (
    <ThemeProvider>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="/verificar-e-mail" element={<VerificarEmail />} />
          <Route path="/login" element={<p>tela de entrada</p>} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
  render(stricto ? <StrictMode>{arvore}</StrictMode> : arvore);
  return chamadas;
}

const ENDERCO = "pessoa@exemplo.test";
const TOKEN = "um-token-de-prova-que-nao-pode-ser-guardado";

// Espionagem do storage: a mesma técnica do teste de privacidade do login. Toda
// escrita em localStorage/sessionStorage passa por aqui, e o caso confere que
// nenhum valor gravado carrega o token.
let escritas: string[];
let setItemOriginal: (chave: string, valor: string) => void;

beforeEach(() => {
  escritas = [];
  setItemOriginal = Storage.prototype.setItem;
  Storage.prototype.setItem = function (chave: string, valor: string) {
    escritas.push(chave + "=" + valor);
    return setItemOriginal.call(this, chave, valor);
  };
  localStorage.clear();
  sessionStorage.clear();
  vi.mocked(notify.info).mockClear();
  vi.mocked(notify.error).mockClear();
});

afterEach(() => {
  Storage.prototype.setItem = setItemOriginal;
  cleanup();
  delete axios.defaults.adapter;
  delete api.defaults.adapter;
});

describe("A tela do link de confirmação", () => {
  it("um token válido ativa a conta e oferece a entrada", async () => {
    monte(
      "/verificar-e-mail?token=" + TOKEN,
      [{ caminho: "/auth/verify-email", status: 200, data: { ok: true, email: ENDERCO } }],
    );

    // Antes da resposta a tela diz que está conferindo, e não deixa um buraco.
    expect(screen.getByRole("heading", { name: "Confirmando o seu e-mail…" })).toBeTruthy();

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Conta ativada" })).toBeTruthy(),
    );
    expect(screen.getByText("O e-mail " + ENDERCO + " foi confirmado.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "ENTRAR" }).getAttribute("href")).toBe("/login");

    expect(escritas.join(" |")).not.toContain(TOKEN);
  });

  it("a recusa é a mesma frase seja qual for o código HTTP", async () => {
    const primeira = monte(
      "/verificar-e-mail?token=velho",
      [{ caminho: "/auth/verify-email", status: 400, data: { message: "Este link não é mais válido." } }],
    );
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    const textoPrimeira = screen.getByRole("alert").textContent;
    const cabecalhoPrimeira = screen.getByRole("heading", { level: 1 }).textContent;
    // A comparação de frases abaixo só vale alguma coisa se a primeira tela de fato
    // falou com a rota: uma conferência, com o token que estava no endereço.
    const conferenciasDaPrimeira = primeira.filter((c) => c.url.includes("/auth/verify-email"));
    expect(conferenciasDaPrimeira.length).toBe(1);
    expect(conferenciasDaPrimeira[0].corpo).toEqual({ token: "velho" });
    cleanup();

    // Link usado (410) e link que nunca existiu (404) chegam com a mesma frase por
    // construção na API. Se a tela ramificasse por código, ela viraria canal de
    // informação sobre a lista de contas.
    monte(
      "/verificar-e-mail?token=inexistente",
      [{ caminho: "/auth/verify-email", status: 404, data: { message: "Este link não é mais válido." } }],
    );
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.getByRole("alert").textContent).toBe(textoPrimeira);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(cabecalhoPrimeira);
    expect(screen.getByText(/O link que você abriu não vale mais/)).toBeTruthy();
  });

  it("abrir a tela sem token não dispara nenhuma conferência", async () => {
    const chamadas = monte("/verificar-e-mail", []);
    // A chamada nasceria numa microtask do axios. Sem dar tempo de ela acontecer,
    // a asserção de baixo passaria até com a guarda do token arrancada do
    // componente — foi o que a mutação desta rodada mostrou.
    await new Promise((r) => setTimeout(r, 50));
    expect(chamadas.filter((c) => c.url.includes("/auth/verify-email"))).toEqual([]);
    expect(screen.getByRole("heading", { name: "Confirme o seu e-mail" })).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("o token do endereço não é guardado em lugar nenhum do navegador", async () => {
    monte(
      "/verificar-e-mail?token=" + TOKEN,
      [{ caminho: "/auth/verify-email", status: 400, data: { message: "Este link não é mais válido." } }],
    );
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());

    const tudo = escritas.join(" |");
    expect(tudo).not.toContain(TOKEN);
    const guardado = Object.keys(localStorage).map((k) => k + "=" + (localStorage.getItem(k) ?? "")).join(" |");
    expect(guardado).not.toContain(TOKEN);
    const sessao = Object.keys(sessionStorage).map((k) => k + "=" + (sessionStorage.getItem(k) ?? "")).join(" |");
    expect(sessao).not.toContain(TOKEN);
  });

  it("montada duas vezes, a tela confere o token uma única vez", async () => {
    // N63 / P19, achado da prova de navegador: o StrictMode do desenvolvimento
    // monta, desmonta e monta de novo cada tela, e a tela do link saía disparando
    // duas conferências. Como o token é de uso único, a segunda chamada volta 400
    // e a pessoa lia "este link não vale mais" numa conta que acabava de ser
    // ativada — e a prova de navegador ficava dependendo de qual das duas
    // respostas chegasse primeiro.
    const chamadas = monte(
      "/verificar-e-mail?token=" + TOKEN,
      [{ caminho: "/auth/verify-email", status: 200, data: { ok: true, email: ENDERCO } }],
      true,
    );
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Conta ativada" })).toBeTruthy(),
    );
    const conferencias = chamadas.filter((c) => c.url.includes("/auth/verify-email"));
    expect(conferencias.length).toBe(1);
    expect(conferencias[0].corpo).toEqual({ token: TOKEN });
  });

  it("reenviar sem endereço válido avisa e não chama a rota", () => {
    const chamadas = monte("/verificar-e-mail", []);
    const campo = screen.getByPlaceholderText("seu@email.com");
    fireEvent.change(campo, { target: { value: "nao-e-da-turma" } });
    fireEvent.click(screen.getByRole("button", { name: "REENVIAR A MENSAGEM" }));

    expect(vi.mocked(notify.info).mock.calls.length).toBe(1);
    expect(chamadas.filter((c) => c.url.includes("/auth/resend-verification"))).toEqual([]);
  });

  it("reenviar devolve a frase genérica, e ela não confessa a conta", async () => {
    const chamadas = monte(
      "/verificar-e-mail",
      [{ caminho: "/auth/resend-verification", status: 200, data: { ok: true, message: "Se houver uma conta esperando confirmação, a mensagem foi enviada." } }],
    );
    fireEvent.change(screen.getByPlaceholderText("seu@email.com"), { target: { value: " " + ENDERCO + " " } });
    fireEvent.click(screen.getByRole("button", { name: "REENVIAR A MENSAGEM" }));

    await waitFor(() => expect(screen.getByText(/caixa de spam/)).toBeTruthy());
    const ida = chamadas.find((c) => c.url.includes("/auth/resend-verification"));
    expect(ida?.corpo).toEqual({ email: ENDERCO });
    // A confirmação na tela fala em "se houver uma conta", e não repete o endereço:
    // quem estiver sondando a lista de clientes não ganha resposta sim/não daqui.
    expect(screen.getByText(/caixa de spam/).textContent).not.toContain(ENDERCO);
    expect(screen.getByRole("button", { name: "REENVIAR A MENSAGEM" })).toBeTruthy();
  });

  it("quando a rota de reenvio falha, a falha vai para o aviso", async () => {
    monte(
      "/verificar-e-mail",
      [{ caminho: "/auth/resend-verification", status: 503, data: { message: "Não foi possível enviar agora." } }],
    );
    fireEvent.change(screen.getByPlaceholderText("seu@email.com"), { target: { value: ENDERCO } });
    fireEvent.click(screen.getByRole("button", { name: "REENVIAR A MENSAGEM" }));

    await waitFor(() => expect(vi.mocked(notify.error).mock.calls.length).toBe(1));
    expect(vi.mocked(notify.error).mock.calls[0][0]).toBe("Não foi possível enviar agora.");
    // O botão volta a estar disponível: a pessoa pode tentar de novo sem recarregar.
    expect((screen.getByRole("button", { name: "REENVIAR A MENSAGEM" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
