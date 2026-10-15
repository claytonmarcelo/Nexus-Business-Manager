import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { api } from "../lib/api";
import { monteAdaptador, type Rota } from "./fabrica-api";
import { PlataformaContas } from "../pages/PlataformaContas";
import { notify } from "../lib/notify";
import { descricaoDaAcao } from "../lib/auditLabels";

// T5.5 (N61) na tela: a porta administrativa de confirmação de e-mail.
//
// A decisão D2 obrigou a verificação de e-mail em produção. Desde então existe um
// estado que não tinha saída: a entrega da mensagem falhou no meio do cadastro
// (`auth.verificacao_entrega_falhou` na trilha), a pessoa ficou sem link, sem
// confirmação e sem painel, e quem atende não tinha botão — a saída documentada era
// escrever `users.email_verified_at` no banco à mão. A API ganhou
// `GET /api/plataforma/contas/sem-confirmacao` e
// `POST /api/plataforma/contas/:userId/confirmar-email` (rota de plataforma,
// `assertPlatformAdmin`, auditoria com escopo de plataforma e endereço mascarado);
// este arquivo amarra o que a tela faz com essas duas portas:
//   1. a fila aparece com nome, endereço, quantas casas a conta serve e desde
//      quando ela espera — e nenhum identificador interno é impresso;
//   2. quem não responde pela plataforma não bate na porta: nenhuma chamada sai;
//   3. confirmar pede motivo escrito (o mesmo contrato do diálogo de cancelamento:
//      sem frase a rota não é chamada nenhuma vez) e envia exatamente `{ motivo }`;
//   4. a linha sai da fila depois da confirmação, inclusive quando a resposta diz
//      `alterado: false` — a conta já tinha sido confirmada por outra porta, e
//      continuar na lista seria a tela mentindo sobre o estado do banco;
//   5. o evento `admin.email_confirmado` tem rótulo em português, porque ele
//      aparece na trilha da plataforma (T4/F5) e um código cru ali é a auditoria
//      falando idioma de programador.
//
// A rede é o adaptador da fábrica, no formato que a API devolve hoje.

const SESSAO = vi.hoisted(() => ({ platform: true }));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "00000000-0000-4000-8000-000000000001",
      email: "administrador@plataforma.teste",
      name: "Administrador da Plataforma",
      phone: null,
      companyId: "00000000-0000-4000-8000-000000000011",
      companyName: "Empresa Alfa",
      role: "OWNER",
      permissions: ["*"],
      currency: "BRL",
      timezone: "America/Sao_Paulo",
      language: "pt-BR",
      platform: SESSAO.platform,
    },
    can: () => true,
    logout: async () => undefined,
  }),
}));

vi.mock("../lib/notify", () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

interface Linha {
  userId: string;
  name: string;
  email: string;
  active: boolean;
  criadoEm: string;
  empresas: number;
}

const ID_DA_CONTA = "11111111-1111-4111-8111-111111111111";
const ID_DE_OUTRA = "22222222-2222-4222-8222-222222222222";

const PRIMEIRA: Linha = {
  userId: ID_DA_CONTA,
  name: "Fulana Silva",
  email: "fulana.silva@cliente.teste",
  active: true,
  criadoEm: "2026-10-10T14:05:00.000Z",
  empresas: 2,
};
const SEGUNDA: Linha = {
  userId: ID_DE_OUTRA,
  name: "Fulano Souza",
  email: "fulano.souza@cliente.teste",
  active: false,
  criadoEm: "2026-10-11T09:00:00.000Z",
  empresas: 1,
};

function pagina<T>(data: T[]): {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
} {
  return { data, meta: { page: 1, pageSize: 20, total: data.length, totalPages: 1 } };
}

const FILA = { caminho: "/plataforma/contas/sem-confirmacao", status: 200, data: pagina([PRIMEIRA, SEGUNDA]) };
const PORTA = { caminho: "/confirmar-email", status: 200, data: { userId: ID_DA_CONTA, alterado: true, confirmadoEm: "2026-10-14T10:00:00.000Z" } };

interface Chamada {
  url: string;
  metodo: string;
  corpo: Record<string, unknown> | undefined;
  params: Record<string, unknown> | undefined;
}

const chamadas: Chamada[] = [];

function paredeRede(rotas: Rota[]) {
  const interior = monteAdaptador(rotas);
  const adaptador = async (config: Parameters<typeof interior>[0]) => {
    let corpo: Record<string, unknown> | undefined;
    try {
      corpo = typeof config.data === "string" ? JSON.parse(config.data) : undefined;
    } catch {
      corpo = undefined;
    }
    chamadas.push({
      url: config.url ?? "",
      metodo: (config.method ?? "get").toLowerCase(),
      corpo,
      // O axios monta a busca em `config.params`, não na string de endereço: é
      // daqui que se conferem os filtros, porque a URL sozinha não os mostra.
      params: config.params as Record<string, unknown> | undefined,
    });
    return interior(config);
  };
  axios.defaults.adapter = adaptador;
  api.defaults.adapter = adaptador;
}

function monte(rotas: Rota[]) {
  paredeRede(rotas);
  return render(
    <MemoryRouter initialEntries={["/app/plataforma-contas"]}>
      <PlataformaContas />
    </MemoryRouter>,
  );
}

function chamadasDeConfirmacao(): Chamada[] {
  return chamadas.filter((c) => c.url.includes("/confirmar-email"));
}

afterEach(() => {
  cleanup();
  delete axios.defaults.adapter;
  delete api.defaults.adapter;
  chamadas.length = 0;
  SESSAO.platform = true;
  for (const fn of [notify.success, notify.error, notify.info]) vi.mocked(fn).mockClear();
});

describe("A fila de contas sem confirmação (N61)", () => {
  it("mostra quem espera, com o endereço e o tamanho do transtorno", async () => {
    monte([FILA]);

    expect(await screen.findByText("Fulana Silva")).toBeTruthy();
    expect(screen.getByText("fulana.silva@cliente.teste")).toBeTruthy();
    expect(screen.getByText("Fulano Souza")).toBeTruthy();
    // A conta desativada continua na fila: desativar não apaga a pessoa, e quem
    // atende precisa ver do que se trata.
    expect(screen.getByText("desativada")).toBeTruthy();
    // Quantas casas a conta serve é o que diz o tamanho do problema.
    expect(screen.getByText("2 empresas")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Empresas" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Desde" })).toBeTruthy();
    expect(chamadas.filter((c) => c.url.includes("/plataforma/contas/sem-confirmacao")).length).toBe(1);
  });

  it("não imprime identificador interno no navegador", async () => {
    monte([FILA]);
    await screen.findByText("Fulana Silva");
    expect(document.body.textContent).not.toContain(ID_DA_CONTA);
    expect(document.body.textContent).not.toContain("00000000-0000-4000-8000-000000000011");
  });

  it("a busca vai para a fila, não para o navegador", async () => {
    monte([FILA]);
    await screen.findByText("Fulana Silva");
    chamadas.length = 0;

    const campo = screen.getByRole("searchbox", { name: "Buscar conta" });
    fireEvent.change(campo, { target: { value: "fulano" } });
    // Digitar não bate na porta: o filtro é aplicado por botão ou Enter, como nas
    // outras listas da casa, para não disparar uma leitura a cada tecla.
    expect(chamadas).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    await waitFor(() => expect(chamadas.length).toBeGreaterThan(0));
    const leitura = chamadas.find((c) => c.url.includes("/plataforma/contas/sem-confirmacao"));
    expect(leitura?.params?.search).toBe("fulano");
    expect(leitura?.params?.page).toBe(1);
  });

  it("quem não responde pela plataforma não bate na porta", async () => {
    SESSAO.platform = false;
    monte([{ ...FILA, status: 403, data: { message: "reservado" } }]);

    expect(await screen.findByText("Área reservada da plataforma")).toBeTruthy();
    expect(chamadas.filter((c) => c.url.includes("/plataforma/contas"))).toEqual([]);
  });
});

describe("O botão de confirmar (N61)", () => {
  it("sem motivo escrito a rota não é chamada nenhuma vez", async () => {
    monte([FILA, PORTA]);
    await screen.findByText("Fulana Silva");

    fireEvent.click(screen.getByRole("button", { name: "Confirmar e-mail de Fulana Silva" }));
    expect(await screen.findByText("Motivo da confirmação")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(await screen.findByText("Diga o motivo da confirmação.")).toBeTruthy();
    expect(chamadasDeConfirmacao()).toEqual([]);
  });

  it("com motivo envia exatamente { motivo } e a linha sai da fila", async () => {
    monte([FILA, PORTA]);
    await screen.findByText("Fulana Silva");

    fireEvent.click(screen.getByRole("button", { name: "Confirmar e-mail de Fulana Silva" }));
    const motivo = await screen.findByRole("textbox", { name: "Motivo da confirmação" });
    fireEvent.change(motivo, { target: { value: "cliente sem acesso ao e-mail; identidade conferida por telefone" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(chamadasDeConfirmacao().length).toBe(1));
    const chamada = chamadasDeConfirmacao()[0];
    expect(chamada.metodo).toBe("post");
    expect(chamada.url).toContain("/plataforma/contas/" + ID_DA_CONTA + "/confirmar-email");
    expect(Object.keys(chamada.corpo ?? {}).sort()).toEqual(["motivo"]);
    expect(String(chamada.corpo?.motivo)).toContain("identidade conferida por telefone");

    await waitFor(() => expect(screen.queryByText("Fulana Silva")).toBeNull());
    expect(screen.getByText("Fulano Souza")).toBeTruthy();
    expect(vi.mocked(notify.success).mock.calls.flat().join(" ")).toContain("confirmou");
  });

  it("quando a conta já estava confirmada a linha também sai, e a tela diz por quê", async () => {
    monte([
      FILA,
      {
        caminho: "/confirmar-email",
        status: 200,
        data: { userId: ID_DA_CONTA, alterado: false, confirmadoEm: "2026-10-13T08:00:00.000Z" },
      },
    ]);
    await screen.findByText("Fulana Silva");

    fireEvent.click(screen.getByRole("button", { name: "Confirmar e-mail de Fulana Silva" }));
    const motivo = await screen.findByRole("textbox", { name: "Motivo da confirmação" });
    fireEvent.change(motivo, { target: { value: "link chegou depois do chamado" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(chamadasDeConfirmacao().length).toBe(1));
    await waitFor(() => expect(screen.queryByText("Fulana Silva")).toBeNull());
    expect(vi.mocked(notify.info).mock.calls.flat().join(" ")).toContain("já estava confirmada");
  });

  // A falha não vira toast que some em três segundos: o diálogo do sistema segura
  // a pessoa no lugar, mostra a frase do servidor dentro dele e devolve o botão
  // para tentar de novo. É o contrato de `confirmActionComMotivo`, e a tela da
  // plataforma não tem autoridade para inventar outro.
  it("se a porta falhar a linha fica na fila com a mensagem do servidor dentro do diálogo", async () => {
    monte([
      FILA,
      { caminho: "/confirmar-email", status: 500, data: { message: "banco indisponível" } },
    ]);
    await screen.findByText("Fulana Silva");

    fireEvent.click(screen.getByRole("button", { name: "Confirmar e-mail de Fulana Silva" }));
    const motivo = await screen.findByRole("textbox", { name: "Motivo da confirmação" });
    fireEvent.change(motivo, { target: { value: "suporte do chamado 118" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(chamadasDeConfirmacao().length).toBe(1));
    const aviso = await screen.findByRole("alert");
    expect((aviso.textContent ?? "").trim()).toContain("banco indisponível");
    // A linha continua na fila: o nome aparece duas vezes agora (a tabela e o
    // próprio diálogo), e é o botão da linha que prova o assento ocupado.
    expect(screen.getByRole("button", { name: "Confirmar e-mail de Fulana Silva" })).toBeTruthy();
    expect(vi.mocked(notify.success).mock.calls).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
  });
});

describe("A porta está ligada no resto da casa (N61)", () => {
  function fonte(caminho: string): string {
    return readFileSync(resolve(process.cwd(), caminho), "utf8");
  }

  it("o evento da porta tem rótulo em português na trilha da plataforma", () => {
    const rotulo = descricaoDaAcao("admin.email_confirmado", "user");
    expect(rotulo === "admin.email_confirmado").toBe(false);
    // Cai no genérico ("user: email confirmado") quando ninguém tradziu.
    expect(/^(admin|user):/.test(rotulo), rotulo).toBe(false);
    expect(rotulo).toContain("confirma");
  });

  it("a rota existe, é montada sob demanda e o item do menu é área da plataforma", () => {
    const app = fonte("src/App.tsx");
    const menu = fonte("src/components/layout/AdminShell.tsx");
    expect(app).toContain('<Route path="plataforma-contas" element={<PlataformaContas />} />');
    expect(app).toMatch(
      /const PlataformaContas = lazy\(\(\) =>[\s\S]{0,90}import\("\.\/pages\/PlataformaContas"\)/,
    );
    expect(menu).toContain('to: "/app/plataforma-contas"');
    const linha = menu.split("\n").find((l) => l.includes('to: "/app/plataforma-contas"')) ?? "";
    expect(linha).toContain("plataforma: true");
    expect(linha).not.toContain("permission:");
    expect(linha).not.toContain("emBreve");
  });

  it("o rótulo do menu e o título da tela dizem a mesma coisa", () => {
    const menu = fonte("src/components/layout/AdminShell.tsx");
    const tela = fonte("src/pages/PlataformaContas.tsx");
    const rotulo = menu.split("\n").find((l) => l.includes('to: "/app/plataforma-contas"')) ?? "";
    const titulo = tela.match(/<h1 className="page-title">([^<]+)<\/h1>/)?.[1] ?? "";
    expect(titulo.length).toBeGreaterThan(3);
    expect(rotulo).toContain('label: "' + titulo + '"');
  });

  it("o cliente de API fala com as duas portas da plataforma, sem empresa no caminho", () => {
    const cliente = fonte("src/lib/contasPlataformaApi.ts");
    expect(cliente).toContain('"/plataforma/contas/sem-confirmacao"');
    expect(cliente).toContain("/plataforma/contas/${userId}/confirmar-email");
    expect(cliente).not.toContain("companyId");
  });
});
