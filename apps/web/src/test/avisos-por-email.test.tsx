import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import { api } from "../lib/api";
import { monteAdaptador, type Rota } from "./fabrica-api";
import { Notifications } from "../pages/Notifications";
import { notify } from "../lib/notify";

// N59 (T5.4) na tela: o quadro "E-mail" das preferências deixa de ser uma frase
// escrita em pedra e passa a mostrar o estado que a API devolve.
//
// Antes desta mudança, `Notifications.tsx` tinha `disabled` fixo no input e um
// texto que afirmava "não há servidor de e-mail (SMTP) configurado nesta
// instalação" — que é verdade no desenvolvimento e mentira numa produção com SMTP
// ligado, porque nada naquele quadro dependia da instalação. A rota
// `GET /notifications/preferences` agora devolve, junto das chaves salvas, o
// `email: { disponivel, transporte, motivo }` lido do entregador real do processo
// (`estadoDoCanalDeEmail()`), e é isso que a tela usa:
//   1. sem entregador que entrega: caixa desligada, sem poder marcar, e a dica é o
//      motivo que veio do servidor;
//   2. havendo entregador: caixa editável, a dica diz por qual transporte sai, e o
//      clique grava `emailChannel` na preferência — o payload é conferido chave a
//      chave;
//   3. preferência salva com `emailChannel` verdadeiro numa instalação sem SMTP
//      fica marcada e desabilitada ao mesmo tempo: a caixa mostra a vontade da
//      pessoa, o `disabled` mostra o estado da máquina, e a dica explica por que
//      nada sai — desmarcar por dentro seria a tela perdendo uma intenção guardada.
//   4. o sino continua editável nos dois casos — desligar o e-mail não mexe no sino.
//
// A rede é o adaptador da fábrica, no formato que a API devolve hoje.

const SESSAO = vi.hoisted(() => ({ permissions: ["*"] as string[] }));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "00000000-0000-4000-8000-000000000001",
      email: "dono@empresa.teste",
      name: "Dono da Empresa",
      phone: null,
      companyId: "00000000-0000-4000-8000-000000000011",
      companyName: "Empresa de Teste",
      role: "OWNER",
      permissions: SESSAO.permissions,
      currency: "BRL",
      timezone: "America/Sao_Paulo",
      language: "pt-BR",
      platform: false,
    },
    can: (permissao: string) => SESSAO.permissions.includes("*") || SESSAO.permissions.includes(permissao),
    logout: async () => undefined,
  }),
}));

vi.mock("../lib/notify", () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

interface Chamada {
  url: string;
  corpo: Record<string, unknown> | undefined;
}

const PREFERENCIAS = {
  saleAlerts: true,
  lowStock: true,
  dailyReport: false,
  overdueBills: true,
  newLead: true,
  emailChannel: false,
  inAppChannel: true,
};

const TIPOS = [
  { kind: "sale", rotulo: "Vendas" },
  { kind: "stock", rotulo: "Estoque" },
  { kind: "lead", rotulo: "CRM" },
  { kind: "billing", rotulo: "Financeiro" },
  { kind: "report", rotulo: "Relatório diário" },
];

const MOTIVO_SEM_SMTP =
  "não há servidor de e-mail (SMTP) configurado nesta instalação: as mensagens são escritas no log do servidor";

function rotaDePreferencias(email: Record<string, unknown>, extras: Record<string, unknown> = {}): Rota {
  return {
    caminho: "/notifications/preferences",
    status: 200,
    data: { ...PREFERENCIAS, ...extras, tipos: TIPOS, email },
  };
}

function monte(rotas: Rota[]): Chamada[] {
  const chamadas: Chamada[] = [];
  const interior = monteAdaptador([
    ...rotas,
    rotaDePreferencias({ disponivel: false, transporte: "console", motivo: MOTIVO_SEM_SMTP }),
    {
      caminho: "/notifications/count",
      status: 200,
      data: { naoLidas: 0, urgentes: 0, porTipo: { sale: 0, stock: 0, lead: 0, billing: 0, report: 0 } },
    },
  ]);
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
  render(
    <MemoryRouter initialEntries={["/app/notificacoes?aba=preferencias"]}>
      <Notifications />
    </MemoryRouter>,
  );
  return chamadas;
}

/** A linha do canal "E-mail": o input e a dica que o acompanha. */
function linhaDeEmail(): { entrada: HTMLInputElement; dica: string } {
  const linha = [...document.querySelectorAll(".nx-avisos-tipos .check-line")].find(
    (l) => (l.querySelector("strong")?.textContent ?? "").trim() === "E-mail",
  ) as Element | undefined;
  const entrada = (linha?.querySelector("input") ?? null) as HTMLInputElement | null;
  if (!entrada) throw new Error("a linha do canal E-mail não apareceu na tela");
  return { entrada, dica: (linha?.querySelector(".nx-avisos-dica")?.textContent ?? "").trim() };
}

afterEach(() => {
  cleanup();
  delete axios.defaults.adapter;
  delete api.defaults.adapter;
  for (const fn of [notify.success, notify.error]) vi.mocked(fn).mockClear();
});

describe("O canal de e-mail nas preferências de aviso", () => {
  it("sem entregador que entrega, a caixa está desligada e a dica vem do servidor", async () => {
    monte([
      rotaDePreferencias({ disponivel: false, transporte: "console", motivo: MOTIVO_SEM_SMTP }),
    ]);
    await waitFor(() => expect(screen.getByText("O que chega até você")).toBeTruthy());

    const { entrada, dica } = linhaDeEmail();
    expect(entrada.disabled).toBe(true);
    expect(entrada.checked).toBe(false);
    // A frase não é mais escrita na tela: é o motivo que o entregador do processo
    // devolve, e ele nomeia o que falta.
    expect(dica).toContain(MOTIVO_SEM_SMTP);
    expect(dica).toContain("Indisponível");
    // Marca nenhuma de "ligado" numa instalação que não entrega.
    expect(dica).not.toMatch(/agora|está enviando/);
  });

  it("havendo entregador, a caixa é editável, diz o transporte e grava a preferência", async () => {
    const chamadas = monte([
      rotaDePreferencias({ disponivel: true, transporte: "smtp", motivo: null }),
    ]);
    await waitFor(() => expect(screen.getByText("O que chega até você")).toBeTruthy());

    const { entrada, dica } = linhaDeEmail();
    expect(entrada.disabled).toBe(false);
    expect(entrada.checked).toBe(false);
    expect(dica).toContain("smtp");

    const salvar = screen.getByRole("button", { name: "Salvar preferências" }) as HTMLButtonElement;
    expect(salvar.disabled).toBe(true);

    fireEvent.click(entrada);
    expect(entrada.checked).toBe(true);
    expect(salvar.disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Salvar preferências" }));

    await waitFor(() => expect(vi.mocked(notify.success).mock.calls.length).toBe(1));
    const gravada = chamadas.find((c) => c.url.includes("/notifications/preferences") && c.corpo);
    expect(gravada?.corpo).toEqual({ ...PREFERENCIAS, emailChannel: true });
  });

  it("preferência salva com o canal indisponível continua marcada, e a dica diz que nada sai", async () => {
    monte([
      rotaDePreferencias(
        { disponivel: false, transporte: "console", motivo: MOTIVO_SEM_SMTP },
        { emailChannel: true },
      ),
    ]);
    await waitFor(() => expect(screen.getByText("O que chega até você")).toBeTruthy());

    const { entrada, dica } = linhaDeEmail();
    // A caixa mostra a preferência da pessoa (marcada), não uma invenção da tela, e
    // o `disabled` mostra o estado da instalação. As duas verdades juntas: "você
    // pediu e-mail, e esta máquina não envia".
    expect(entrada.checked).toBe(true);
    expect(entrada.disabled).toBe(true);
    expect(dica).toContain(MOTIVO_SEM_SMTP);
    // O que ficou de fora é a decisão que a tela não pode tomar sozinha: desmarcar
    // o que foi salvo. Um clique em qualquer outra chave gravaria o rascunho, e se
    // o rascunho viesse desmarcado a intenção da pessoa se perderia no banco.
    const salvar = screen.getByRole("button", { name: "Salvar preferências" }) as HTMLButtonElement;
    expect(salvar.disabled).toBe(true);
  });

  it("o sino do painel continua editável nos dois casos", async () => {
    for (const email of [
      { disponivel: false, transporte: "console", motivo: MOTIVO_SEM_SMTP },
      { disponivel: true, transporte: "smtp", motivo: null },
    ]) {
      cleanup();
      monte([rotaDePreferencias(email)]);
      await waitFor(() => expect(screen.getByText("O que chega até você")).toBeTruthy());
      const linha = [...document.querySelectorAll(".nx-avisos-tipos .check-line")].find(
        (l) => (l.querySelector("strong")?.textContent ?? "").trim() === "Sino do painel",
      ) as Element;
      const entrada = linha.querySelector("input") as HTMLInputElement;
      expect(entrada.disabled).toBe(false);
      expect(entrada.checked).toBe(true);
      fireEvent.click(entrada);
      expect(entrada.checked).toBe(false);
      // Desligar o sino é mudança sozinha: o rascunho do e-mail não acompanha.
      expect(linhaDeEmail().entrada.checked).toBe(false);
    }
  });
});
