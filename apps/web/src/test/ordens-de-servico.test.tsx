import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MemoryRouter } from "react-router-dom";
import axios, { type InternalAxiosRequestConfig } from "axios";
import { api } from "../lib/api";
import { monteAdaptador, type Rota } from "./fabrica-api";
import { OrdensDeServico } from "../pages/OrdensDeServico";
import { notify } from "../lib/notify";

// F3.2 Parte 1 na tela: a casa das Ordens de Serviço.
//
// A API já respondeu (35 provas em apps/api/test/ordens-de-servico.test.ts). O
// que estes casos amarram é o que só a tela pode errar:
//  1. os indicadores do topo vêm do GET /service-orders/summary — nenhum número
//     de enfeite, nenhuma promessa de estado que a API não devolveu;
//  2. busca, filtros, paginação e ordenação são do SERVIDOR: a tela manda os
//     parâmetros que a porta aceita e mostra o meta que voltou;
//  3. os botões de ação respeitam a mesma regra de quem-pode-o-quê do serviço:
//     o atendente sem escrita não vê "Cancelar", e quem não é o responsável da
//     ordem não vê ação nenhuma;
//  4. mover o estado passa pelo diálogo de confirmação do sistema e por
//     POST /service-orders/:id/status — nunca por confirm() nativo;
//  5. o detalhe é a única fonte do histórico, e o documento tem saída em papel.
//
// A rede é o adaptador do axios com o formato que a API devolve hoje (dinheiro
// em número, datas ISO, itens já ordenados pela linha digitada).

const SESSAO = vi.hoisted(() => ({
  role: "OWNER" as "OWNER" | "STAFF",
  permissions: ["*"] as string[],
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: TECNICO,
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

// O usuário da sessão mock é o técnico a quem a ordem 1042 está atribuída: assim
// o mesmo fixture serve para o dono (tudo) e para o atendente (só a ordem dele).
const TECNICO = "00000000-0000-4000-8000-000000000033";

const SUMARIO = {
  total: 41,
  open: 7,
  inProgress: 3,
  waiting: 2,
  completed: 29,
  cancelled: 5,
  urgent: 4,
  completedThisMonth: 12,
  completedValueThisMonth: 1234.5,
};

interface Item {
  id: string;
  kind: "SERVICE" | "PART";
  productId: string | null;
  productName: string | null;
  description: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

const ITEM_PECA: Item = {
  id: "it-1",
  kind: "PART",
  productId: "p-1",
  productName: "Correia dentada",
  description: null,
  quantity: 2,
  unitPrice: 100,
  lineTotal: 200,
};

const ITEM_SERVICO: Item = {
  id: "it-2",
  kind: "SERVICE",
  productId: null,
  productName: null,
  description: "Mão de obra da troca",
  quantity: 1,
  unitPrice: 150,
  lineTotal: 150,
};

const EM_ANDAMENTO = {
  id: "os-1",
  number: 1042,
  status: "IN_PROGRESS",
  priority: "URGENT",
  title: "Troca de correia",
  description: "Cliente relatou barulho na partida.",
  diagnosis: "Correia com dente gasto.",
  notes: null,
  scheduledAt: null,
  startedAt: "2026-10-05T14:00:00.000Z",
  completedAt: null,
  discount: 0,
  total: 350,
  clientId: "c-1",
  clientName: "Cliente Alfa",
  assignedUserId: TECNICO,
  assignedUserName: "Técnico Beta",
  createdByName: "Dono da Empresa",
  createdAt: "2026-10-05T10:00:00.000Z",
  updatedAt: "2026-10-05T14:05:00.000Z",
  items: [ITEM_PECA, ITEM_SERVICO],
};

const ABERTA = { ...EM_ANDAMENTO, id: "os-2", number: 1043, status: "OPEN", priority: "NORMAL", title: "Instalação no balcão", assignedUserId: null, assignedUserName: null, total: 120 };

const HISTORICO = [
  { id: "h-1", fromStatus: null, toStatus: "OPEN", note: null, userName: "Dono da Empresa", createdAt: "2026-10-05T10:00:00.000Z" },
  { id: "h-2", fromStatus: "OPEN", toStatus: "IN_PROGRESS", note: "Peça separada no depósito", userName: "Técnico Beta", createdAt: "2026-10-05T14:00:00.000Z" },
];

function pagina<T>(data: T[]) {
  return { data, meta: { page: 1, pageSize: 10, total: data.length, totalPages: 3 } };
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
  // Ordem importa: o adaptador casa a primeira rota cujo caminho esteja na URL,
  // e "/service-orders" sozinho engoliria o resumo e o detalhe. O resumo fica
  // antes dos extras, e as rotas largas ficam depois.
  return [
    { caminho: "/service-orders/summary", status: 200, data: SUMARIO },
    ...extra,
    { caminho: "/service-orders/os-1", status: 200, data: { ...EM_ANDAMENTO, history: HISTORICO } },
    { caminho: "/service-orders", status: 200, data: pagina([EM_ANDAMENTO, ABERTA]) },
    { caminho: "/clients", status: 200, data: pagina([{ id: "c-1", name: "Cliente Alfa" }]) },
    { caminho: "/products", status: 200, data: pagina([{ id: "p-1", name: "Correia dentada", unit: "un", salePrice: 100, stockQuantity: 8, trackStock: true, active: true }]) },
    { caminho: "/users", status: 200, data: pagina([{ id: TECNICO, name: "Técnico Beta", email: "tecnico@empresa.teste", role: "STAFF", active: true }]) },
  ];
}

// O rótulo do cartão e o texto do pill podem ser a mesma palavra ("Em
// andamento"), então o KPI é sempre procurado dentro do próprio cartão.
function kpi(rotulo: string): HTMLElement | undefined {
  return screen.getAllByText(rotulo).map((el) => el.closest(".kpi")).find(Boolean) as HTMLElement | undefined;
}

function monte() {
  return render(
    <MemoryRouter initialEntries={["/app/ordens-de-servico"]}>
      <OrdensDeServico />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  // O diálogo de confirmação é montado por comando numa raiz React própria, com
  // portal no body: o cleanup() da Testing Library não o alcança. Se um caso
  // falha no meio do diálogo, a caixa ficaria aberta para o próximo.
  document.querySelector("[data-nx-confirm-root]")?.replaceChildren();
  document.querySelectorAll(".nx-modal-overlay").forEach((no) => no.remove());
  delete api.defaults.adapter;
  delete axios.defaults.adapter;
  chamadas.length = 0;
  SESSAO.role = "OWNER";
  SESSAO.permissions = ["*"];
  vi.clearAllMocks();
});

describe("Ordens de serviço na tela (F3.2 Parte 1)", () => {
  it("monta os indicadores com os números do resumo, e não com conta de cabeça", async () => {
    paredeRede(rotasPadrao());
    monte();

    await waitFor(() => expect(screen.getByText("R$ 1.234,50")).toBeTruthy());
    expect(chamadas.some((c) => c.url.startsWith("/service-orders/summary"))).toBe(true);

    const rotulos = ["Abertas", "Em andamento", "Aguardando peça", "Concluídas", "Canceladas", "Urgentes", "Concluídas no mês", "Valor concluído no mês"];
    for (const rotulo of rotulos) {
      expect(kpi(rotulo), rotulo).toBeTruthy();
    }
    // Cada cartão carrega o valor que a porta devolveu para ele.
    expect(kpi("Em andamento")?.textContent).toContain("3");
    expect(kpi("Aguardando peça")?.textContent).toContain("2");
    expect(kpi("Urgentes")?.textContent).toContain("4");
    expect(kpi("Concluídas no mês")?.textContent).toContain("12");
  });

  it("lista número, cliente, situação em português e o total da resposta", async () => {
    paredeRede(rotasPadrao());
    monte();

    expect(await screen.findByText("#1042")).toBeTruthy();
    const linha = screen.getByText("Troca de correia").closest("tr");
    expect(linha?.textContent).toContain("Cliente Alfa");
    // O pill diz "Em andamento" e a coluna de prioridade diz "Urgente": nenhum
    // código interno (IN_PROGRESS / URGENT) aparece para quem está no balcão.
    expect(linha?.textContent).toContain("Urgente");
    // Decimal em vírgula e milhar em ponto: é a moeda da empresa, não o número
    // cru que String(350) mostraria.
    expect(linha?.textContent).toContain("350,00");
    expect(document.body.textContent).not.toContain("IN_PROGRESS");
    expect(document.body.textContent).not.toContain("URGENT");
  });

  it("busca, filtro, ordenação e paginação vão para o servidor", async () => {
    paredeRede(rotasPadrao());
    monte();
    await screen.findByText("#1042");

    const busca = screen.getByLabelText("Buscar ordens de serviço");
    fireEvent.change(busca, { target: { value: "Alfa" } });
    await waitFor(() =>
      expect(chamadas.some((c) => c.url.includes("search=Alfa"))).toBe(true),
    );

    const status = screen.getByLabelText("Filtrar por status");
    fireEvent.change(status, { target: { value: "WAITING" } });
    await waitFor(() => {
      const ultima = chamadas[chamadas.length - 1];
      expect(ultima.url).toContain("status=WAITING");
      expect(ultima.url).toContain("page=1");
    });

    const ordem = screen.getByLabelText("Ordenar por");
    fireEvent.change(ordem, { target: { value: "total" } });
    await waitFor(() => expect(chamadas[chamadas.length - 1].url).toContain("sort=total"));

    // O resumo do rodapé vem do meta do servidor (três páginas no recorte), não
    // da quantidade de linhas desta página.
    expect(screen.getByText("página 1 de 3")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Próxima página"));
    await waitFor(() => expect(chamadas[chamadas.length - 1].url).toContain("page=2"));
  });

  it("o atendente sem escrita não vê o botão de cancelar, e o não responsável não vê ação", async () => {
    SESSAO.role = "STAFF";
    SESSAO.permissions = ["company:read", "client:read", "product:read", "service_order:read"];
    // A ordem em andamento está atribuída ao usuário desta sessão.
    paredeRede(rotasPadrao());
    monte();
    await screen.findByText("#1042");

    const minha = screen.getByText("Troca de correia").closest("tr");
    expect(within(minha as HTMLElement).getByText("Concluir")).toBeTruthy();
    expect(within(minha as HTMLElement).queryByText("Cancelar")).toBeNull();

    const outra = screen.getByText("Instalação no balcão").closest("tr");
    expect(within(outra as HTMLElement).queryByText("Iniciar")).toBeNull();
    expect(within(outra as HTMLElement).queryByText("Concluir")).toBeNull();

    // Sem user:read a tela não bate na porta da equipe.
    expect(chamadas.filter((c) => c.url.includes("/users"))).toEqual([]);
    // Sem service_order:write não existe aba de criação.
    expect(screen.queryByText("Nova ordem")).toBeNull();
  });

  it("concluir passa pelo diálogo de confirmação e chama a rota de status", async () => {
    const concluida = { ...EM_ANDAMENTO, status: "COMPLETED", completedAt: "2026-10-05T18:00:00.000Z" };
    paredeRede(rotasPadrao([{ caminho: "/service-orders/os-1/status", status: 200, data: concluida }]));
    monte();
    await screen.findByText("#1042");

    const linha = screen.getByText("Troca de correia").closest("tr") as HTMLElement;
    // O diálogo de confirmação tem raiz React própria, montada por comando fora
    // da árvore do teste: é o act() que dá a ela a mesma chance de commits dos
    // componentes montados pelo render().
    await act(async () => {
      fireEvent.click(within(linha).getByText("Concluir"));
    });
    // O diálogo de confirmação tem raiz React própria e portal no fim do body:
    // ele nasce fora da árvore que o render() montou, então é o waitFor, em tempo
    // real, quem dá a prova do commit. O nome acessível é o título da seção 29.
    const dialogo = await screen.findByRole("dialog", { name: "Concluir ordem de serviço" });
    expect(dialogo.textContent).toContain("Deseja realmente concluir");
    // O aviso explica o efeito real: as peças baixam do estoque agora.
    expect(dialogo.textContent).toContain("estoque");
    await act(async () => {
      fireEvent.click(within(dialogo).getByRole("button", { name: "Concluir ordem" }));
    });

    await waitFor(() => {
      const POST = chamadas.find((c) => c.metodo === "POST" && c.url === "/service-orders/os-1/status");
      expect(POST?.corpo).toEqual({ status: "COMPLETED" });
    });
    expect(vi.mocked(notify.success)).toHaveBeenCalledWith("Ordem concluída.");
    // Nenhuma caixa nativa foi usada em lugar do diálogo do sistema.
    expect(document.querySelectorAll("dialog")).toHaveLength(0);
  });

  it("o detalhe busca a ordem com histórico e dá saída em papel", async () => {
    paredeRede(rotasPadrao());
    monte();
    await screen.findByText("#1042");

    fireEvent.click(screen.getByRole("button", { name: "Ver ordem 1042" }));
    const dialogo = await screen.findByRole("dialog");
    expect(chamadas.some((c) => c.url === "/service-orders/os-1")).toBe(true);

    // A linha do tempo é a do servidor, com quem fez e o porquê.
    expect(dialogo.textContent).toContain("Peça separada no depósito");
    expect(dialogo.textContent).toContain("Técnico Beta");
    expect(dialogo.textContent).toContain("Aberta");
    expect(dialogo.textContent).toContain("Em andamento");
    // As linhas do documento saem na ordem digitada, não pela ordem do banco.
    const documento = dialogo.querySelector(".nx-os-doc") as HTMLElement;
    expect(documento.textContent).toContain("Correia dentada");
    expect(documento.textContent).toContain("Mão de obra da troca");
    expect(documento.querySelector(".nx-os-linha-1")).toBeTruthy();
    // jsdom não tem papel: a única ponte com a impressora é window.print, e é
    // ela que o botão do documento tem de chamar.
    const paraOPapel = vi.fn();
    window.print = paraOPapel;
    fireEvent.click(within(dialogo).getByRole("button", { name: "Imprimir" }));
    expect(paraOPapel).toHaveBeenCalledTimes(1);
  });

  it("registrar uma ordem manda o que o schema espera", async () => {
    paredeRede(rotasPadrao());
    monte();
    await screen.findByText("#1042");

    fireEvent.click(screen.getByRole("button", { name: "Nova ordem" }));
    await screen.findByText("Nova ordem de serviço");

    fireEvent.change(screen.getByLabelText("Cliente"), { target: { value: "c-1" } });
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Revisão anual" } });
    fireEvent.change(screen.getByLabelText("Tipo da linha 1"), { target: { value: "SERVICE" } });
    fireEvent.change(screen.getByLabelText("Descrição do serviço 1"), { target: { value: "Revisão completa" } });
    fireEvent.change(screen.getByLabelText("Quantidade 1"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Preço unitário 1"), { target: { value: "180,90" } });

    fireEvent.click(screen.getByRole("button", { name: "Registrar ordem" }));

    await waitFor(() => {
      const POST = chamadas.find((c) => c.metodo === "POST" && c.url === "/service-orders");
      expect(POST).toBeTruthy();
      const corpo = POST?.corpo as { clientId: string; title: string; priority: string; items: unknown[] };
      expect(corpo.clientId).toBe("c-1");
      expect(corpo.title).toBe("Revisão anual");
      expect(corpo.priority).toBe("NORMAL");
      expect(corpo.items).toEqual([{ kind: "SERVICE", description: "Revisão completa", quantity: 1, unitPrice: 180.9 }]);
    });
    expect(vi.mocked(notify.success).mock.calls.length).toBeGreaterThan(0);
  });

  it("sem ordem no recorte a tela diz isso, em vez de inventar preenchimento", async () => {
    paredeRede(rotasPadrao([{ caminho: "/service-orders", status: 200, data: pagina([]) }]));
    monte();
    await waitFor(() => expect(screen.getByText("Nenhuma ordem de serviço")).toBeTruthy());
    expect(document.body.textContent).not.toMatch(/em breve|ainda em constru/i);
  });
});

describe("A tela está ligada no menu e no roteador (F3.2)", () => {
  function fonte(caminho: string): string {
    return readFileSync(resolve(process.cwd(), caminho), "utf8");
  }

  it("a rota existe, o item do menu tem permissão e a página existe", () => {
    const app = fonte("src/App.tsx");
    const menu = fonte("src/components/layout/AdminShell.tsx");
    expect(app).toContain('import { OrdensDeServico } from "./pages/OrdensDeServico";');
    expect(app).toContain('<Route path="ordens-de-servico" element={<OrdensDeServico />} />');
    const linha = menu.split("\n").find((atual) => atual.includes('to: "/app/ordens-de-servico"')) ?? "";
    expect(linha).not.toBe("");
    expect(linha).toContain('permission: "service_order:read"');
    expect(linha).not.toContain("emBreve");
    expect(fonte("src/pages/OrdensDeServico.tsx")).toContain('<h1 className="page-title">Ordens de Serviço</h1>');
  });

  it("o documento da ordem tem regra de impressão", () => {
    const css = fonte("src/styles/components.css");
    expect(css).toMatch(/@media print/);
    expect(css).toContain(".nx-os-doc");
  });
});
