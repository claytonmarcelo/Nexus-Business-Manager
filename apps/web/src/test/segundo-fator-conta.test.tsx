import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import axios from "axios";
import { api } from "../lib/api";
import { monteAdaptador, type Rota } from "./fabrica-api";
import { SegundoFatorPanel } from "../components/settings/SegundoFatorPanel";
import { notify } from "../lib/notify";

// N62 / P17 (carregado da F4 para a F5): o painel de segundo fator da conta.
//
// A rota está provada do lado do servidor em apps/api/test/segundo-fator.test.ts,
// inclusive a cifração do segredo em repouso. O que este arquivo amarra é o que só
// a tela pode errar, e que a decisão D3 prometeu:
//   1. o segredo em base32 aparece uma única vez, na resposta que o gera, e não
//      volta depois de cancelar — não existe "mostrar de novo" porque não existe de
//      onde mostrar;
//   2. nada do segundo fator (segredo, códigos de recuperação) é escrito em storage;
//   3. ligar e desligar mandam o código, e nunca a senha: o payload de cada chamada
//      é conferido chave a chave;
//   4. ligado, o painel conta os códigos que restam, e trata um e vários no plural;
//   5. quando o papel obriga (D3), a tela não oferece o botão de desligar;
//   6. os dez códigos de recuperação aparecem uma vez, e o painel fecha o passo
//      quando a pessoa diz que anotou.
//
// A rede é o adaptador da fábrica, no formato que a API devolve hoje. O adaptador é
// sem memória — a rota que casar primeiro responde sempre o mesmo corpo. Por isso o
// caso de desligar confere a chamada, o campo limpo e a releitura do estado, e não um
// título que a tela teria de mudar sozinha.

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

const SEGREDO = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
const URI_OTP = "otpauth://totp/Nexus:pessoa@exemplo.test?secret=" + SEGREDO + "&issuer=Nexus";
const CODIGOS = Array.from({ length: 10 }, (_, i) => "abcde-fgh" + i + "j");

function rotaDeStatus(ligado: boolean, extras: Record<string, unknown> = {}): Rota {
  return {
    caminho: "/auth/2fa/status",
    status: 200,
    data: {
      ligado,
      pendente: Boolean(extras["pendente"]),
      obrigatorio: Boolean(extras["obrigatorio"]),
      codigosRestantes: Number(extras["codigosRestantes"] ?? 0),
    },
  };
}

/**
 * Monta o painel com as rotas do caso na frente e um status "desligado" de fundo.
 * A ordem importa: o adaptador casa a primeira rota, então o que o caso escrever
 * aqui tem prioridade sobre o padrão.
 */
function monte(rotas: Rota[]): Chamada[] {
  const chamadas = monteApp([...rotas, rotaDeStatus(false)]);
  render(<SegundoFatorPanel />);
  return chamadas;
}

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
  for (const fn of [notify.success, notify.error, notify.info]) vi.mocked(fn).mockClear();
});

afterEach(() => {
  Storage.prototype.setItem = setItemOriginal;
  cleanup();
  delete axios.defaults.adapter;
  delete api.defaults.adapter;
});

/** Tudo o que o navegador ficou sabendo desta tela: storage e escritas espiadas. */
function tudoGuardado(): string {
  const chavesDe = (storage: Storage) =>
    [...Array(storage.length).keys()]
      .map((i) => storage.key(i) + "=" + (storage.getItem(storage.key(i) ?? "") ?? ""))
      .join(" |");
  return chavesDe(localStorage) + " | " + chavesDe(sessionStorage) + " | " + escritas.join(" |");
}

describe("O painel de segundo fator da conta", () => {
  it("desligado, oferece a ativação e explica a escolha", async () => {
    monte([]);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Segundo fator desligado" })).toBeTruthy(),
    );
    expect(screen.getByText(/ligar é o que fecha a porta da senha vazada/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "ATIVAR SEGUNDO FATOR" })).toBeTruthy();
  });

  it("segredo gerado e não confirmado troca o rótulo da ação", async () => {
    monte([rotaDeStatus(false, { pendente: true })]);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Segundo fator aguardando confirmação" })).toBeTruthy(),
    );
    expect(screen.getByRole("button", { name: "GERAR NOVO SEGREDO" })).toBeTruthy();
  });

  it("a chave aparece uma vez, e o cancelamento a faz sumir da tela e do navegador", async () => {
    const chamadas = monte([
      { caminho: "/auth/2fa/preparar", status: 200, data: { segredoBase32: SEGREDO, uri: URI_OTP, obrigatorio: false } },
    ]);
    await waitFor(() => expect(screen.getByRole("button", { name: "ATIVAR SEGUNDO FATOR" })).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "ATIVAR SEGUNDO FATOR" }));
    await waitFor(() => expect(screen.getByText(SEGREDO)).toBeTruthy());
    expect(chamadas.filter((c) => c.url.includes("/auth/2fa/preparar")).length).toBe(1);
    expect(screen.getByText(/depois de confirmar o código, não há como vê-la de novo/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "CONFIRMAR E LIGAR" })).toBeTruthy();
    expect(screen.getByText(URI_OTP)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByText(SEGREDO)).toBeNull());
    expect(tudoGuardado()).not.toContain(SEGREDO);
  });

  it("confirmar o código liga o fator, entrega os dez códigos e apaga a chave da tela", async () => {
    const chamadas = monte([
      { caminho: "/auth/2fa/preparar", status: 200, data: { segredoBase32: SEGREDO, uri: URI_OTP, obrigatorio: false } },
      { caminho: "/auth/2fa/ativar", status: 200, data: { codigosDeRecuperacao: CODIGOS } },
    ]);
    await waitFor(() => expect(screen.getByRole("button", { name: "ATIVAR SEGUNDO FATOR" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "ATIVAR SEGUNDO FATOR" }));
    await waitFor(() => expect(screen.getByText(SEGREDO)).toBeTruthy());

    fireEvent.change(screen.getByLabelText("Código do aplicativo"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "CONFIRMAR E LIGAR" }));

    await waitFor(() => expect(screen.getByRole("list")).toBeTruthy());
    const lista = screen.getByRole("list");
    expect(within(lista).getAllByRole("listitem").length).toBe(10);
    expect(lista.textContent).toContain(CODIGOS[0]);
    expect(lista.textContent).toContain(CODIGOS[9]);
    expect(screen.queryByText(SEGREDO)).toBeNull();
    expect(vi.mocked(notify.success).mock.calls.length).toBe(1);

    const ativar = chamadas.find((c) => c.url.includes("/auth/2fa/ativar"));
    expect(ativar?.corpo).toEqual({ codigo: "123456" });
    // A promessa de D3 na tela: senha nenhuma viaja para ligar ou desligar.
    for (const chamada of chamadas) {
      for (const chave of Object.keys(chamada.corpo ?? {})) {
        expect(["password", "senha"].includes(chave)).toBe(false);
      }
    }
    expect(tudoGuardado()).not.toContain(CODIGOS[0]);

    fireEvent.click(screen.getByRole("button", { name: "ANOTEI, PODE FECHAR" }));
    await waitFor(() => expect(screen.queryByRole("list")).toBeNull());
  });

  it("código errado não liga nada e devolve a frase da API", async () => {
    monte([
      { caminho: "/auth/2fa/preparar", status: 200, data: { segredoBase32: SEGREDO, uri: URI_OTP, obrigatorio: false } },
      { caminho: "/auth/2fa/ativar", status: 401, data: { message: "Código inválido. Confira o horário do aparelho." } },
    ]);
    await waitFor(() => expect(screen.getByRole("button", { name: "ATIVAR SEGUNDO FATOR" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "ATIVAR SEGUNDO FATOR" }));
    await waitFor(() => expect(screen.getByText(SEGREDO)).toBeTruthy());

    fireEvent.change(screen.getByLabelText("Código do aplicativo"), { target: { value: "000000" } });
    fireEvent.click(screen.getByRole("button", { name: "CONFIRMAR E LIGAR" }));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe("Código inválido. Confira o horário do aparelho."),
    );
    expect(screen.queryByRole("list")).toBeNull();
    expect(vi.mocked(notify.success).mock.calls.length).toBe(0);
    // O passo continua aberto: a pessoa pode conferir o aplicativo e tentar de novo.
    expect(screen.getByText(SEGREDO)).toBeTruthy();
  });

  it("ligado, conta os códigos que restam e pede o código para desligar", async () => {
    const chamadas = monte([
      rotaDeStatus(true, { codigosRestantes: 9 }),
      { caminho: "/auth/2fa/desativar", status: 200, data: { ok: true } },
    ]);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Segundo fator ligado" })).toBeTruthy());
    expect(screen.getByText(/Restam 9 códigos de recuperação\./)).toBeTruthy();

    const campo = screen.getByLabelText("Código para desligar") as HTMLInputElement;
    const botao = screen.getByRole("button", { name: "DESLIGAR O SEGUNDO FATOR" }) as HTMLButtonElement;
    expect(botao.disabled).toBe(true);

    fireEvent.change(campo, { target: { value: "654321" } });
    expect(botao.disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "DESLIGAR O SEGUNDO FATOR" }));

    await waitFor(() => expect(vi.mocked(notify.success).mock.calls.length).toBe(1));
    const desativar = chamadas.find((c) => c.url.includes("/auth/2fa/desativar"));
    expect(desativar?.corpo).toEqual({ codigo: "654321" });
    // Desligar limpou o campo e o painel releu o estado: o título que a pessoa passa
    // a ver vem da resposta nova, e não do que a tela lembrava.
    await waitFor(() => expect(campo.value).toBe(""));
    expect(chamadas.filter((c) => c.url.includes("/auth/2fa/status")).length).toBe(2);
  });

  it("um código restante é dito no singular", async () => {
    monte([rotaDeStatus(true, { codigosRestantes: 1 })]);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Segundo fator ligado" })).toBeTruthy());
    expect(screen.getByText(/Resta 1 código de recuperação\./)).toBeTruthy();
  });

  it("quando o papel obriga, a tela não oferece desligar", async () => {
    monte([rotaDeStatus(true, { obrigatorio: true, codigosRestantes: 10 })]);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Segundo fator ligado" })).toBeTruthy());
    expect(screen.getByText(/não pode ser desligado pela tela/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "DESLIGAR O SEGUNDO FATOR" })).toBeNull();
    expect(screen.queryByLabelText("Código para desligar")).toBeNull();
  });

  it("se a leitura do estado falhar, o painel diz isso em vez de ficar mudo", async () => {
    const chamadas = monteApp([
      { caminho: "/auth/2fa/status", status: 500, data: { message: "Não foi possível ler o estado do segundo fator." } },
    ]);
    render(<SegundoFatorPanel />);
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe("Não foi possível ler o estado do segundo fator."),
    );
    expect(chamadas.filter((c) => c.url.includes("/auth/2fa/status")).length).toBe(1);
    // Sem estado lido, nenhuma ação de escrita é oferecida.
    expect(screen.queryByRole("button", { name: "ATIVAR SEGUNDO FATOR" })).toBeNull();
  });
});
