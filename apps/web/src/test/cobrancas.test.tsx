import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MemoryRouter } from "react-router-dom";
import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { api } from "../lib/api";
import { monteAdaptador, type Rota } from "./fabrica-api";
import { Cobrancas } from "../pages/Cobrancas";
import { notify } from "../lib/notify";

// F3.2 Parte 2 na tela: a casa das Cobranças.
//
// A API já respondeu (22 provas em apps/api/test/cobrancas.test.ts). O que estes
// casos amarram é o que só a tela pode errar:
//  1. os indicadores vêm do GET /charges/summary — nada de conta feita olhando a
//     página, porque a página é uma fatia do acervo;
//  2. "vencida" é filtro do SERVIDOR: a tela pergunta `overdue=true` e mostra o
//     selo que voltou; ela não compara data de hoje com data de ontem na cabeça;
//  3. pagar e cancelar são diálogos do sistema, com motivo obrigatório no
//     cancelamento, e nunca caixa nativa do navegador;
//  4. quem só lê (charge:read) não vê botão de mexer no dinheiro;
//  5. o documento da cobrança e o recibo têm saída em papel pela mesma ponte da
//     ordem de serviço: window.print;
//  6. a aba de gateways escreve só o que o MANUAL tem (chave, beneficiário,
//     instruções, vencimento padrão) — campo de credencial não existe na tela, e
//     os três provedores fora do ar dizem por que estão fora.
//
// A rede é o adaptador do axios com o formato que a API devolve hoje: dinheiro em
// número, vencimento como dia de calendário (`dueDateLabel`) e situação em código.

const SESSAO = vi.hoisted(() => ({
  role: "OWNER" as "OWNER" | "STAFF",
  permissions: ["*"] as string[],
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "00000000-0000-4000-8000-000000000001",
      email: "dono@empresa.teste",
      name: "Dono da Empresa",
      phone: null,
      companyId: "00000000-0000-4000-8000-000000000011",
      companyName: "Empresa de Teste",
      role: SESSAO.role,
      permissions: SESSAO.permissions,
      currency: "BRL",
      timezone: "America/Sao_Paulo",
      language: "pt-BR",
      platform: false,
    },
    can: (permissao: string) =>
      SESSAO.permissions.includes("*") || SESSAO.permissions.includes(permissao),
    logout: async () => undefined,
  }),
}));

vi.mock("../lib/notify", () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

const SUMARIO = {
  total: 14,
  pendingCount: 5,
  pendingAmount: 1850.4,
  overdueCount: 2,
  overdueAmount: 700,
  paidCount: 8,
  paidAmountThisMonth: 2310.75,
  cancelledCount: 1,
};

const PENDENTE = {
  id: "cb-1",
  number: 12,
  status: "PENDING",
  title: "Nota 4412 — troca de correia",
  amount: 350,
  // A forma real da resposta: `dueDate` é o instante da meia-noite do dia no
  // fuso da empresa, e `dueDateLabel` é o dia nu, em AAAA-MM-DD. Quem escreve
  // "20/10/2026" é a tela — o servidor não escolhe formato nem fuso por conta.
  dueDate: "2026-10-20T00:00:00.000Z",
  dueDateLabel: "2026-10-20",
  overdue: false,
  method: "PIX",
  provider: "MANUAL",
  pixKeyType: "CNPJ",
  pixKey: "11.222.333/0001-81",
  instructions: null,
  notes: null,
  clientId: "c-1",
  clientName: "Cliente Alfa",
  saleId: null,
  saleReference: null,
  serviceOrderId: "os-1",
  serviceOrderNumber: 1042,
  financeEntryId: null,
  paidAt: null,
  paidMethod: null,
  paidByName: null,
  paymentNote: null,
  cancelledAt: null,
  cancelReason: null,
  cancelledByName: null,
  createdByName: "Dono da Empresa",
  createdAt: "2026-10-10T10:00:00.000Z",
  updatedAt: "2026-10-10T10:00:00.000Z",
};

const VENCIDA = {
  ...PENDENTE,
  id: "cb-2",
  number: 11,
  status: "PENDING",
  title: "Venda de balcão",
  amount: 120.5,
  dueDate: "2026-09-30T00:00:00.000Z",
  dueDateLabel: "2026-09-30",
  overdue: true,
  method: "BOLETO",
  pixKeyType: null,
  pixKey: null,
  instructions: "Pagar no banco conveniado",
  serviceOrderId: null,
  serviceOrderNumber: null,
  saleId: "v-9",
  saleReference: "A1B2C3D4",
};

const PAGA = {
  ...PENDENTE,
  id: "cb-3",
  number: 10,
  status: "PAID",
  title: "Revisão anual",
  amount: 180,
  dueDate: "2026-09-05T00:00:00.000Z",
  dueDateLabel: "2026-09-05",
  overdue: false,
  method: "PIX",
  financeEntryId: "fe-1",
  paidAt: "2026-09-05T14:30:00.000Z",
  paidMethod: "DINHEIRO",
  paidByName: "Caixa Beta",
  paymentNote: "Retirada do caixa na hora",
  clientName: "Cliente Gama",
};

const GATEWAYS = {
  data: [
    {
      provider: "MANUAL", slug: "manual", rotulo: "Manual", available: true, configured: true,
      motivoIndisponivel: null, environment: "PRODUCTION", active: true,
      displayName: "PIX da loja", pixKeyType: "CNPJ", pixKey: "11.222.333/0001-81",
      beneficiaryName: "Empresa de Teste", instructions: "Pagamento na hora",
      defaultDueDays: 7, updatedAt: "2026-10-10T10:00:00.000Z",
    },
    {
      provider: "MERCADO_PAGO", slug: "mercado-pago", rotulo: "Mercado Pago", available: false,
      configured: false, motivoIndisponivel: "Integração ainda não disponível: aguardando definição do provedor.",
      environment: null, active: false, displayName: null, pixKeyType: null, pixKey: null,
      beneficiaryName: null, instructions: null, defaultDueDays: null, updatedAt: null,
    },
    {
      provider: "EFI", slug: "efi", rotulo: "EFI / Gerencianet", available: false,
      configured: false, motivoIndisponivel: "Integração ainda não disponível: aguardando definição do provedor.",
      environment: null, active: false, displayName: null, pixKeyType: null, pixKey: null,
      beneficiaryName: null, instructions: null, defaultDueDays: null, updatedAt: null,
    },
    {
      provider: "STRIPE", slug: "stripe", rotulo: "Stripe", available: false,
      configured: false, motivoIndisponivel: "Integração ainda não disponível: aguardando definição do provedor.",
      environment: null, active: false, displayName: null, pixKeyType: null, pixKey: null,
      beneficiaryName: null, instructions: null, defaultDueDays: null, updatedAt: null,
    },
  ],
};

function pagina<T>(data: T[]) {
  return { data, meta: { page: 1, pageSize: 10, total: data.length, totalPages: 2 } };
}

interface Chamada {
  url: string;
  metodo: string;
  corpo: Record<string, unknown> | null;
}

const chamadas: Chamada[] = [];

function paredeRede(rotas: Rota[]) {
  const base = monteAdaptador(rotas);
  const adaptador = async (config: InternalAxiosRequestConfig) => {
    const consulta = new URLSearchParams();
    for (const [chave, valor] of Object.entries(config.params ?? {})) {
      if (valor !== undefined && valor !== null) consulta.set(chave, String(valor));
    }
    const corpo = typeof config.data === "string" ? JSON.parse(config.data) : config.data ?? null;
    chamadas.push({
      url: (config.url ?? "") + (consulta.toString() ? "?" + consulta.toString() : ""),
      metodo: String(config.method ?? "get").toUpperCase(),
      corpo,
    });
    return base(config);
  };
  axios.defaults.adapter = adaptador;
  api.defaults.adapter = adaptador;
}

function rotasPadrao(extra: Rota[] = []): Rota[] {
  // Ordem importa: o adaptador casa a primeira rota cujo caminho esteja na URL.
  // `/charges` sozinho engoliria o resumo, o detalhe e o pagamento.
  return [
    { caminho: "/charges/summary", status: 200, data: SUMARIO },
    // A resposta real de /pay traz tambem quando o dinheiro entrou, por quem e por
    // qual forma: e dela que a linha do carnê muda a coluna de recebimento.
    { caminho: "/charges/cb-1/pay", status: 200, data: { ...PENDENTE, status: "PAID", financeEntryId: "fe-9", paidAt: "2026-10-10T14:30:00.000Z", paidMethod: "DINHEIRO", paidByName: "Caixa Beta" } },
    { caminho: "/charges/cb-1/cancel", status: 200, data: { ...PENDENTE, status: "CANCELLED", cancelReason: "Cliente desistiu" } },
    { caminho: "/charges/cb-1", status: 200, data: PENDENTE },
    { caminho: "/charges/cb-2", status: 200, data: VENCIDA },
    { caminho: "/charges/cb-3", status: 200, data: PAGA },
    ...extra,
    { caminho: "/gateways/manual", status: 200, data: GATEWAYS.data[0] },
    { caminho: "/gateways", status: 200, data: GATEWAYS },
    { caminho: "/charges", status: 200, data: pagina([PENDENTE, VENCIDA, PAGA]) },
    { caminho: "/clients", status: 200, data: pagina([{ id: "c-1", name: "Cliente Alfa" }]) },
    { caminho: "/sales/v-9", status: 200, data: { id: "v-9", status: "CONFIRMED", total: 500, clientName: "Cliente Alfa", installments: 1, notes: null, items: [], userName: "Dono da Empresa", createdAt: "2026-10-08T10:00:00.000Z" } },
    { caminho: "/sales", status: 200, data: pagina([{ id: "v-9", status: "CONFIRMED", total: 500, clientName: "Cliente Alfa", installments: 1, items: [], userName: "Dono da Empresa", createdAt: "2026-10-08T10:00:00.000Z" }]) },
    { caminho: "/service-orders/os-1", status: 200, data: { ...PAGA, id: "os-1", number: 1042, title: "Troca de correia", total: 350, clientName: "Cliente Alfa", items: [], history: [] } },
    { caminho: "/service-orders", status: 200, data: pagina([{ id: "os-1", number: 1042, status: "IN_PROGRESS", priority: "NORMAL", title: "Troca de correia", total: 350, clientName: "Cliente Alfa" }]) },
  ];
}

function kpi(rotulo: string): HTMLElement | undefined {
  return screen.getAllByText(rotulo).map((el) => el.closest(".kpi")).find(Boolean) as HTMLElement | undefined;
}

// Entre o "R$" e o número o Intl coloca um espaço indivisível. Na tela é o mesmo
// "R$ 700,00" que a pessoa lê; no textContent cru é outro caractere. O valor
// continua conferido por inteiro — só o respiro vira espaço comum.
function textoLegivel(no: Element | null | undefined): string {
  return (no?.textContent ?? "").replace(/[\u00a0\u202f]/g, " ");
}

/** O "hoje" da empresa no fuso dela — a mesma régua que a tela usa para o padrão do campo. */
function diaDaEmpresa(timeZone: string, base = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(base);
  const campo = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((p) => p.type === tipo)?.value ?? "01";
  return `${campo("year")}-${campo("month")}-${campo("day")}`;
}

function monte(entrada = "/app/cobrancas") {
  return render(
    <MemoryRouter initialEntries={[entrada]}>
      <Cobrancas />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  document.querySelector("[data-nx-confirm-root]")?.replaceChildren();
  document.querySelectorAll(".nx-modal-overlay").forEach((no) => no.remove());
  delete api.defaults.adapter;
  delete axios.defaults.adapter;
  chamadas.length = 0;
  SESSAO.role = "OWNER";
  SESSAO.permissions = ["*"];
  vi.clearAllMocks();
});

describe("Cobranças na tela (F3.2 Parte 2)", () => {
  it("monta os indicadores com os números do resumo, e não com conta de cabeça", async () => {
    paredeRede(rotasPadrao());
    monte();

    await waitFor(() => expect(screen.getByText("R$ 1.850,40")).toBeTruthy());
    expect(chamadas.some((c) => c.url.startsWith("/charges/summary"))).toBe(true);

    for (const rotulo of ["Pendentes", "Em aberto", "Vencidas", "Vencido em aberto", "Pagas", "Recebido no mês", "Canceladas", "Cobranças no total"]) {
      expect(kpi(rotulo), rotulo).toBeTruthy();
    }
    expect(kpi("Pendentes")?.textContent).toContain("5");
    expect(kpi("Vencidas")?.textContent).toContain("2");
    expect(textoLegivel(kpi("Vencido em aberto"))).toContain("R$ 700,00");
    expect(textoLegivel(kpi("Recebido no mês"))).toContain("R$ 2.310,75");
  });

  it("lista número, cliente, situação em português e o dia do vencimento", async () => {
    paredeRede(rotasPadrao());
    monte();

    expect(await screen.findByText("#12")).toBeTruthy();
    const linha = screen.getByText("Nota 4412 — troca de correia").closest("tr");
    expect(linha?.textContent).toContain("Cliente Alfa");
    expect(linha?.textContent).toContain("Pendente");
    expect(linha?.textContent).toContain("350,00");
    // O vencimento é lido do rótulo de calendário: o instante UTC (20/10 às
    // 00:00Z) viraria 19/10 no fuso da empresa, e o documento mentiria um dia.
    expect(linha?.textContent).toContain("20/10/2026");
    expect(document.body.textContent).not.toContain("PENDING");
    // A coluna "Recebimento" mostra o método pedido enquanto o dinheiro não
    // entra, e a forma informada no recebimento depois que entrou: esta pendente
    // é PIX, e a paga nasceu PIX e foi recebida em dinheiro.
    expect(linha?.querySelector('[data-rotulo="Recebimento"]')?.textContent).toBe("PIX");
    const linhaPaga = screen.getByText("Revisão anual").closest("tr");
    expect(linhaPaga?.querySelector('[data-rotulo="Recebimento"]')?.textContent).toBe("Dinheiro");
    // A OS vinculada aparece pelo número, para quem confere no balcão.
    expect(linha?.textContent).toContain("OS 1042");

    const vencida = screen.getByText("Venda de balcão").closest("tr");
    expect(vencida?.textContent).toContain("Vencida");
    expect(vencida?.textContent).toContain("A1B2C3D4");
  });

  it("busca, situação, método, vencida e ordenação vão para o servidor", async () => {
    paredeRede(rotasPadrao());
    monte();
    await screen.findByText("#12");

    fireEvent.change(screen.getByLabelText("Buscar cobranças"), { target: { value: "Alfa" } });
    await waitFor(() => expect(chamadas.some((c) => c.url.includes("search=Alfa"))).toBe(true));

    fireEvent.change(screen.getByLabelText("Filtrar por situação"), { target: { value: "PAID" } });
    await waitFor(() => {
      const ultima = chamadas[chamadas.length - 1];
      expect(ultima.url).toContain("status=PAID");
      expect(ultima.url).toContain("page=1");
    });

    fireEvent.change(screen.getByLabelText("Filtrar por vencimento"), { target: { value: "true" } });
    await waitFor(() => expect(chamadas[chamadas.length - 1].url).toContain("overdue=true"));

    fireEvent.change(screen.getByLabelText("Filtrar por método"), { target: { value: "BOLETO" } });
    await waitFor(() => expect(chamadas[chamadas.length - 1].url).toContain("method=BOLETO"));

    fireEvent.change(screen.getByLabelText("Ordenar por"), { target: { value: "dueDate" } });
    await waitFor(() => expect(chamadas[chamadas.length - 1].url).toContain("sort=dueDate"));

    expect(screen.getByText("página 1 de 2")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Próxima página"));
    await waitFor(() => expect(chamadas[chamadas.length - 1].url).toContain("page=2"));
  });

  it("a resposta atrasada de um filtro antigo não pinta por cima da tela", async () => {
    // O balcão limpa o vencimento e escolhe a situação no mesmo segundo: saem dois
    // pedidos, e a rede não devolve na ordem em que eles saíram. Sem guarda de
    // resposta, o primeiro — o da lista cheia — chega por último e escreve as três
    // linhas de novo em cima do filtro que a pessoa acabou de escolher. A tela
    // mostraria contas que o servidor não devolveu, e é assim que um carnê perde a
    // confiança de quem olha.
    const base = monteAdaptador(rotasPadrao());
    const adaptador = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
      const url = config.url ?? "";
      const params = (config.params ?? {}) as Record<string, unknown>;
      if (url.includes("/charges") && !url.includes("/charges/summary")) {
        // Filtrada responde em 5 ms; a lista cheia, em 90 ms.
        await new Promise((r) => setTimeout(r, params.status ? 5 : 90));
        return {
          data: params.status ? pagina([PAGA]) : pagina([PENDENTE, PAGA, VENCIDA]),
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      }
      return base(config);
    };
    api.defaults.adapter = adaptador;
    axios.defaults.adapter = adaptador;

    monte();
    // O filtro sai enquanto a lista cheia ainda está em voo.
    fireEvent.change(screen.getByLabelText("Filtrar por situação"), { target: { value: "PAID" } });

    await screen.findByText("#10");
    expect(screen.getByText("Revisão anual")).toBeTruthy();
    // Agora a resposta lenta chega. Ela é de um filtro que já não existe.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 250));
    });
    expect(screen.queryByText("#12")).toBeNull();
    expect(screen.queryByText("Venda de balcão")).toBeNull();
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });

  it("quem só lê cobrança não vê botão de mexer no dinheiro", async () => {
    SESSAO.role = "STAFF";
    SESSAO.permissions = ["company:read", "client:read", "charge:read"];
    paredeRede(rotasPadrao());
    monte();
    await screen.findByText("#12");

    const linha = screen.getByText("Nota 4412 — troca de correia").closest("tr") as HTMLElement;
    expect(within(linha).queryByText("Pagar")).toBeNull();
    expect(within(linha).queryByText("Cancelar")).toBeNull();
    // Sem charge:write não existe aba de criação; sem settings:read não existe
    // aba de gateway — e a porta /gateways nem é batida.
    expect(screen.queryByText("Nova cobrança")).toBeNull();
    expect(screen.queryByText("Gateways")).toBeNull();
    expect(chamadas.filter((c) => c.url.startsWith("/gateways"))).toEqual([]);
    // Clientes, vendas e ordens só entram no formulário; sem escrita, não são pedidos.
    expect(chamadas.filter((c) => c.url.startsWith("/clients"))).toEqual([]);
  });

  it("registrar o recebimento passa pelo diálogo e manda a forma informada", async () => {
    paredeRede(rotasPadrao());
    monte();
    await screen.findByText("#12");

    const linha = screen.getByText("Nota 4412 — troca de correia").closest("tr") as HTMLElement;
    fireEvent.click(within(linha).getByText("Pagar"));

    const dialogo = await screen.findByRole("dialog", { name: "Registrar pagamento" });
    expect(textoLegivel(dialogo)).toContain("R$ 350,00");
    // O recebimento tem data dita por quem recebeu: o balcao atende sexta e digita
    // segunda. O campo nasce com o dia da empresa (America/Sao_Paulo no mock) e com
    // esse mesmo dia como teto — retroagir e permitido, adiantar nao — e e o valor
    // dele que viaja no corpo, nao o relogio do servidor.
    const campoData = within(dialogo).getByLabelText("Data do recebimento") as HTMLInputElement;
    const hojeDaEmpresa = diaDaEmpresa("America/Sao_Paulo");
    expect(campoData.type).toBe("date");
    expect(campoData.value).toBe(hojeDaEmpresa);
    expect(campoData.max).toBe(hojeDaEmpresa);
    fireEvent.change(campoData, { target: { value: "2026-10-05" } });
    fireEvent.change(within(dialogo).getByLabelText("Forma de recebimento"), { target: { value: "DINHEIRO" } });
    fireEvent.change(within(dialogo).getByLabelText("Anotação do recebimento"), { target: { value: "Retirada do caixa" } });
    await act(async () => {
      fireEvent.click(within(dialogo).getByRole("button", { name: "Confirmar recebimento" }));
    });

    await waitFor(() => {
      const POST = chamadas.find((c) => c.metodo === "POST" && c.url === "/charges/cb-1/pay");
      expect(POST).toBeTruthy();
      expect(POST?.corpo).toEqual({ paidMethod: "DINHEIRO", paidAt: "2026-10-05", paymentNote: "Retirada do caixa" });
    });
    expect(vi.mocked(notify.success)).toHaveBeenCalledWith("Recebimento registrado.");
    expect(document.querySelectorAll("dialog")).toHaveLength(0);
  });

  it("cancelar exige motivo escrito, e sem motivo nada sai", async () => {
    paredeRede(rotasPadrao());
    monte();
    await screen.findByText("#12");

    const linha = screen.getByText("Nota 4412 — troca de correia").closest("tr") as HTMLElement;
    fireEvent.click(within(linha).getByText("Cancelar"));

    const dialogo = await screen.findByRole("dialog", { name: "Cancelar cobrança" });
    await act(async () => {
      fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar cobrança" }));
    });
    expect(chamadas.some((c) => c.url === "/charges/cb-1/cancel")).toBe(false);
    expect(vi.mocked(notify.error).mock.calls.length).toBeGreaterThan(0);

    fireEvent.change(within(dialogo).getByLabelText("Motivo do cancelamento"), { target: { value: "Cliente desistiu" } });
    await act(async () => {
      fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar cobrança" }));
    });
    await waitFor(() => {
      const POST = chamadas.find((c) => c.metodo === "POST" && c.url === "/charges/cb-1/cancel");
      expect(POST?.corpo).toEqual({ reason: "Cliente desistiu" });
    });
  });

  it("o detalhe é o documento: chave PIX, recibo quando paga, e saída em papel", async () => {
    paredeRede(rotasPadrao());
    monte();
    await screen.findByText("#12");

    fireEvent.click(screen.getByRole("button", { name: "Ver cobrança 12" }));
    const dialogo = await screen.findByRole("dialog");
    expect(chamadas.some((c) => c.url === "/charges/cb-1")).toBe(true);

    const documento = dialogo.querySelector(".nx-cb-doc") as HTMLElement;
    expect(documento.textContent).toContain("11.222.333/0001-81");
    expect(documento.textContent).toContain("Cliente Alfa");
    expect(documento.textContent).toContain("20/10/2026");
    // Cobrança pendente não tem recibo: o papel de "recebi" só existe quando o
    // dinheiro entrou, e a tela não antecipa o que o caixa ainda não viu.
    expect(documento.textContent).not.toContain("Recibo");

    const paraOPapel = vi.fn();
    window.print = paraOPapel;
    fireEvent.click(within(dialogo).getByRole("button", { name: "Imprimir" }));
    expect(paraOPapel).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Ver cobrança 10" }));
    const recibo = await screen.findByRole("dialog", { name: "Detalhe da cobrança 10" });
    const documentoPago = recibo.querySelector(".nx-cb-doc") as HTMLElement;
    expect(documentoPago.textContent).toContain("Recibo");
    expect(documentoPago.textContent).toContain("Caixa Beta");
    expect(documentoPago.textContent).toContain("Retirada do caixa na hora");
    // Quem recebeu e quando é do servidor; a tela repete, não inventa.
    expect(documentoPago.textContent).toContain("Dinheiro");
  });

  it("registrar uma cobrança manda o que o schema espera", async () => {
    paredeRede(rotasPadrao());
    monte();
    await screen.findByText("#12");

    fireEvent.click(screen.getByRole("button", { name: "Nova cobrança" }));
    // O título da aba também se chama "Nova cobrança": a prova é do cabeçalho do
    // formulário, não de qualquer palavra na tela.
    await screen.findByRole("heading", { name: "Nova cobrança" });

    fireEvent.change(screen.getByLabelText("Vínculo da cobrança"), { target: { value: "CLIENTE" } });
    fireEvent.change(screen.getByLabelText("Cliente"), { target: { value: "c-1" } });
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Orçamento 88" } });
    fireEvent.change(screen.getByLabelText("Valor"), { target: { value: "120,90" } });
    fireEvent.change(screen.getByLabelText("Vencimento"), { target: { value: "2026-11-02" } });
    fireEvent.change(screen.getByLabelText("Método"), { target: { value: "PIX" } });
    fireEvent.change(screen.getByLabelText("Tipo da chave PIX"), { target: { value: "CPF" } });
    fireEvent.change(screen.getByLabelText("Chave PIX"), { target: { value: "123.456.789-09" } });

    fireEvent.click(screen.getByRole("button", { name: "Registrar cobrança" }));

    await waitFor(() => {
      const POST = chamadas.find((c) => c.metodo === "POST" && c.url === "/charges");
      expect(POST).toBeTruthy();
      expect(POST?.corpo).toMatchObject({
        clientId: "c-1",
        title: "Orçamento 88",
        amount: 120.9,
        dueDate: "2026-11-02",
        method: "PIX",
        pixKeyType: "CPF",
        pixKey: "123.456.789-09",
      });
    });
    expect(vi.mocked(notify.success).mock.calls.length).toBeGreaterThan(0);
  });

  it("vinda de uma venda, a tela abre o formulário com a venda e o valor dela", async () => {
    paredeRede(rotasPadrao());
    monte("/app/cobrancas?venda=v-9");

    await screen.findByRole("heading", { name: "Nova cobrança" });
    expect((screen.getByLabelText("Vínculo da cobrança") as HTMLSelectElement).value).toBe("VENDA");
    expect((screen.getByLabelText("Venda") as HTMLSelectElement).value).toBe("v-9");
    expect((screen.getByLabelText("Valor") as HTMLInputElement).value).toBe("500");
    expect(screen.getByText(/Cliente Alfa/)).toBeTruthy();
  });

  it("a aba de gateway configura só o MANUAL, e os outros quatro dizem por que estão fora", async () => {
    paredeRede(rotasPadrao());
    monte();
    await screen.findByText("#12");

    fireEvent.click(screen.getByRole("tab", { name: "Gateways" }));
    await screen.findByText("Como a empresa recebe dinheiro");

    // As quatro linhas do catálogo, na ordem da API.
    const cartoes = document.querySelectorAll(".nx-gw-card");
    expect(cartoes.length).toBe(4);
    expect(screen.getByText("Manual")).toBeTruthy();
    expect(screen.getByText("Mercado Pago")).toBeTruthy();
    expect(screen.getByText("EFI / Gerencianet")).toBeTruthy();
    expect(screen.getByText("Stripe")).toBeTruthy();

    // O que está fora do ar explica o motivo, e não tem formulário nenhum.
    const indisponiveis = Array.from(cartoes).filter((c) => c.classList.contains("nx-gw-card--off"));
    expect(indisponiveis.length).toBe(3);
    for (const cartao of indisponiveis) {
      expect(cartao.textContent).toContain("Integração ainda não disponível");
      expect(cartao.querySelector("input, textarea, select")).toBeNull();
    }

    // O MANUAL traz a chave que está gravada hoje, sem campo de credencial.
    const form = within(screen.getByText("Manual").closest(".nx-gw-card") as HTMLElement);
    expect((form.getByLabelText("Tipo da chave PIX") as HTMLSelectElement).value).toBe("CNPJ");
    expect((form.getByLabelText("Chave PIX") as HTMLInputElement).value).toBe("11.222.333/0001-81");
    expect((form.getByLabelText("Vencimento padrão (dias)") as HTMLInputElement).value).toBe("7");
    expect(form.getByLabelText("Nome do beneficiário")).toBeTruthy();
    expect(form.getByLabelText("Instruções de pagamento")).toBeTruthy();

    fireEvent.change(form.getByLabelText("Chave PIX"), { target: { value: "nao@exemplo.test" } });
    fireEvent.change(form.getByLabelText("Tipo da chave PIX"), { target: { value: "EMAIL" } });
    await act(async () => {
      fireEvent.click(form.getByRole("button", { name: "Salvar configuração" }));
    });
    await waitFor(() => {
      const PUT = chamadas.find((c) => c.metodo === "PUT" && c.url === "/gateways/manual");
      expect(PUT?.corpo).toMatchObject({ pixKeyType: "EMAIL", pixKey: "nao@exemplo.test", defaultDueDays: 7 });
    });

    // Nenhum canto da tela pede material de acesso de terceiro.
    const corpo = document.body.innerHTML.toLowerCase();
    for (const palavra of ["token", "secret", "client_secret", "public_key", "api key"]) {
      expect(corpo, palavra).not.toContain(palavra);
    }
  });

  it("sem cobrança no recorte a tela diz isso, em vez de inventar preenchimento", async () => {
    paredeRede(rotasPadrao([{ caminho: "/charges", status: 200, data: pagina([]) }]));
    monte();
    await waitFor(() => expect(screen.getByText("Nenhuma cobrança cadastrada")).toBeTruthy());
    expect(document.body.textContent).not.toMatch(/em breve|ainda em constru/i);
  });
});

describe("A tela está ligada no menu, no roteador e no papel (F3.2 Parte 2)", () => {
  function fonte(caminho: string): string {
    return readFileSync(resolve(process.cwd(), caminho), "utf8");
  }

  it("a rota existe, o item do menu tem permissão e a página existe", () => {
    const app = fonte("src/App.tsx");
    const menu = fonte("src/components/layout/AdminShell.tsx");
    expect(app).toContain('import { Cobrancas } from "./pages/Cobrancas";');
    expect(app).toContain('<Route path="cobrancas" element={<Cobrancas />} />');
    const linha = menu.split("\n").find((atual) => atual.includes('to: "/app/cobrancas"')) ?? "";
    expect(linha).not.toBe("");
    expect(linha).toContain('permission: "charge:read"');
    expect(linha).not.toContain("emBreve");
    expect(fonte("src/pages/Cobrancas.tsx")).toContain('<h1 className="page-title">Cobranças</h1>');
  });

  it("o documento da cobrança e o recibo têm regra de impressão", () => {
    const css = fonte("src/styles/components.css");
    expect(css).toMatch(/@media print/);
    expect(css).toContain(".nx-cb-doc");
    expect(css).toMatch(/\.nx-cb-doc[^{]*\{[^}]*visibility: visible/);
  });

  it("vendas e ordens de serviço apontam para a cobrança do documento", () => {
    expect(fonte("src/pages/Sales.tsx")).toContain('/app/cobrancas?venda=');
    expect(fonte("src/pages/OrdensDeServico.tsx")).toContain("/app/cobrancas?os=");
  });
});
