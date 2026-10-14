import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { api } from "../lib/api";
import { monteAdaptador, type Rota } from "./fabrica-api";
import { Clients } from "../pages/Clients";
import { Products } from "../pages/Products";
import { Finance } from "../pages/Finance";
import { CRM } from "../pages/CRM";
import { Users } from "../pages/Users";

// N51 / P14 — a resposta atrasada de uma busca antiga não pinta por cima da nova.
//
// A regra nasceu na tela de Cobranças, onde a prova de navegador falhou uma vez e
// passou nas outras quatro: limpar um filtro e escolher outro no mesmo segundo
// dispara dois pedidos, a rede responde na ordem que quiser, e a tela que escreve
// `setRows` em qualquer resposta mostra o que o servidor não devolveu. O achado
// registrou que as outras cinco telas de lista estavam no mesmo risco:
// Clients, Products, Finance, CRM e Users. Esta passada é a da F5.
//
// O caso é o mesmo nas cinco telas, e é de propósito: a mesma corrida, os mesmos
// dois tempos de rede, a mesma asserção. O pedido sem filtro responde em 80 ms e o
// filtrado em 5 ms. Sem a guarda de sequência, o pedido velho — disparado antes, mas
// mais lento — chega por último e escreve a lista inteira de novo em cima do
// resultado que a pessoa acabou de pedir, e a tela mostra uma linha que o filtro
// escolhido não pediu. Vermelho medido tela por tela antes da correção.

const LENTO_MS = 80;
const RAPIDO_MS = 5;
const ESPERA_DA_REDE_MS = 300;

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
      platform: true,
    },
    can: (permissao: string) =>
      SESSAO.permissions.includes("*") || SESSAO.permissions.includes(permissao),
    logout: async () => undefined,
  }),
}));

vi.mock("../lib/notify", () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

function pagina<T>(data: T[]) {
  return { data, meta: { page: 1, pageSize: 10, total: data.length, totalPages: 1 } };
}

// Rede com a corrida armada: a rota de lista responde devagar sem `search` e rápido
// com `search`; as demais rotas vão para o adaptador normal de teste.
function armarede(caminhoDaLista: string, semBusca: unknown, comBusca: unknown, rotas: Rota[]) {
  const base = monteAdaptador(rotas);
  const adaptador = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    const url = config.url ?? "";
    const params = (config.params ?? {}) as Record<string, unknown>;
    if (url === caminhoDaLista) {
      const filtrada = Boolean(params.search);
      await new Promise((resolver) => setTimeout(resolver, filtrada ? RAPIDO_MS : LENTO_MS));
      return {
        data: filtrada ? comBusca : semBusca,
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
}

// A corrida é armada no mesmo instante em que a tela monta: o pedido da lista cheia
// sai, e antes de ele voltar a pessoa digita a busca. Os dois ficam em voo, e a rede
// devolve o filtrado em 5 ms e o da lista cheia em 80 ms — fora de ordem de propósito.
async function deixeARedeVelhaChegar() {
  await act(async () => {
    await new Promise((resolver) => setTimeout(resolver, ESPERA_DA_REDE_MS));
  });
}

function monte(elemento: ReactElement, entrada: string) {
  return render(<MemoryRouter initialEntries={[entrada]}>{elemento}</MemoryRouter>);
}

afterEach(() => {
  cleanup();
  delete api.defaults.adapter;
  delete axios.defaults.adapter;
  SESSAO.role = "OWNER";
  SESSAO.permissions = ["*"];
  vi.clearAllMocks();
});

// ===== Clients =====

const CLIENTE_FORA_DO_FILTRO = {
  id: "c-velho",
  name: "Cliente Que Nao Foi Pedido",
  email: "velho@empresa.teste",
  phone: null,
  document: null,
  active: true,
  createdAt: "2026-10-01T10:00:00.000Z",
};
const CLIENTE_PEDIDO = {
  id: "c-alfa",
  name: "Cliente Alfa",
  email: "alfa@empresa.teste",
  phone: null,
  document: null,
  active: true,
  createdAt: "2026-10-02T10:00:00.000Z",
};

// ===== Products =====

const PRODUTO_FORA_DO_FILTRO = {
  id: "p-velho",
  name: "Produto Que Nao Foi Pedido",
  sku: "VEL-001",
  unit: "UN",
  categoryName: "Geral",
  salePrice: 10,
  costPrice: 5,
  stockQuantity: 4,
  minStock: 2,
  trackStock: true,
  lowStock: false,
  active: true,
};
const PRODUTO_PEDIDO = {
  ...PRODUTO_FORA_DO_FILTRO,
  id: "p-alfa",
  name: "Produto Alfa",
  sku: "ALF-001",
};

// ===== Finance =====

const LANCAMENTO_FORA_DO_FILTRO = {
  id: "e-velho",
  type: "INCOME",
  status: "PENDING",
  description: "Lancamento Que Nao Foi Pedido",
  amount: 100,
  dueDate: "2026-10-20T00:00:00.000Z",
  paidAt: null,
  notes: null,
  categoryName: "Vendas",
  categoryId: "cat-1",
  clientName: "Cliente Alfa",
  supplierName: null,
  userName: "Dono da Empresa",
};
const LANCAMENTO_PEDIDO = {
  ...LANCAMENTO_FORA_DO_FILTRO,
  id: "e-alfa",
  description: "Lancamento Alfa",
};

const RESUMO_FINANCEIRO = {
  month: "2026-10",
  income: 1000,
  expense: 400,
  balance: 600,
  pendingIncome: 100,
  pendingExpense: 0,
  overdueCount: 0,
  overdueAmount: 0,
};
const RELATORIO_FINANCEIRO = {
  janelaDias: 30,
  fluxo: [],
  resumo: { entradas: 1000, saidas: 400, saldo: 600 },
  aReceber: [],
  aPagar: [],
  vencidas: [],
  centros: [],
};

// ===== CRM =====

const LEAD_FORA_DO_FILTRO = {
  id: "l-velho",
  name: "Lead Que Nao Foi Pedido",
  email: "velho@empresa.teste",
  phone: null,
  source: "Site",
  status: "NEW",
  value: 300,
  notes: null,
  clientName: null,
  userName: null,
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-01T10:00:00.000Z",
};
const LEAD_PEDIDO = {
  ...LEAD_FORA_DO_FILTRO,
  id: "l-alfa",
  name: "Lead Alfa",
};

const PIPELINE = [
  { status: "NEW", count: 2, value: 600 },
  { status: "CONTACTED", count: 1, value: 200 },
  { status: "PROPOSAL", count: 0, value: 0 },
  { status: "WON", count: 1, value: 900 },
  { status: "LOST", count: 0, value: 0 },
];

// ===== Users =====

const MEMBRO_FORA_DO_FILTRO = {
  id: "u-velho",
  name: "Usuario Que Nao Foi Pedido",
  email: "velho@empresa.teste",
  active: true,
  role: "STAFF",
  membershipId: "m-velho",
};
const MEMBRO_PEDIDO = {
  ...MEMBRO_FORA_DO_FILTRO,
  id: "u-alfa",
  name: "Usuario Alfa",
  email: "alfa@empresa.teste",
};

describe("N51 / P14: a resposta atrasada de uma busca antiga não pinta por cima da nova", () => {
  it("Clients: a lista inteira que chegou atrasada some diante do filtro", async () => {
    armarede(
      "/clients",
      pagina([CLIENTE_FORA_DO_FILTRO]),
      pagina([CLIENTE_PEDIDO]),
      [{ caminho: "/reports/clients", status: 200, data: {} }],
    );
    monte(<Clients />, "/app/clientes");

    fireEvent.change(screen.getByLabelText("Buscar clientes"), { target: { value: "Alfa" } });
    await screen.findByText("Cliente Alfa");

    await deixeARedeVelhaChegar();
    expect(screen.queryByText("Cliente Que Nao Foi Pedido")).toBeNull();
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });

  it("Products: a lista inteira que chegou atrasada some diante do filtro", async () => {
    armarede(
      "/products",
      pagina([PRODUTO_FORA_DO_FILTRO]),
      pagina([PRODUTO_PEDIDO]),
      [
        { caminho: "/products/stock-summary", status: 200, data: { totalProducts: 2, lowStock: 0, outOfStock: 0 } },
        { caminho: "/product-categories", status: 200, data: [] },
      ],
    );
    monte(<Products />, "/app/produtos");

    fireEvent.change(screen.getByLabelText("Buscar produtos"), { target: { value: "Alfa" } });
    await screen.findByText("Produto Alfa");

    await deixeARedeVelhaChegar();
    expect(screen.queryByText("Produto Que Nao Foi Pedido")).toBeNull();
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });

  it("Finance: a lista inteira que chegou atrasada some diante do filtro", async () => {
    armarede(
      "/finance/entries",
      pagina([LANCAMENTO_FORA_DO_FILTRO]),
      pagina([LANCAMENTO_PEDIDO]),
      [
        { caminho: "/finance/summary", status: 200, data: RESUMO_FINANCEIRO },
        { caminho: "/reports/finance", status: 200, data: RELATORIO_FINANCEIRO },
      ],
    );
    monte(<Finance />, "/app/financeiro?aba=contas");

    fireEvent.change(screen.getByLabelText("Buscar lançamentos"), { target: { value: "Alfa" } });
    await screen.findByText("Lancamento Alfa");

    await deixeARedeVelhaChegar();
    expect(screen.queryByText("Lancamento Que Nao Foi Pedido")).toBeNull();
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });

  it("CRM: a lista inteira que chegou atrasada some diante do filtro", async () => {
    armarede(
      "/leads",
      pagina([LEAD_FORA_DO_FILTRO]),
      pagina([LEAD_PEDIDO]),
      [
        { caminho: "/leads/pipeline", status: 200, data: PIPELINE },
        { caminho: "/reports/crm", status: 200, data: { total: 4, origem: [], status: [], diasMediosFechamento: null } },
      ],
    );
    monte(<CRM />, "/app/crm?aba=leads");

    fireEvent.change(screen.getByLabelText("Buscar leads"), { target: { value: "Alfa" } });
    await screen.findByText("Lead Alfa");

    await deixeARedeVelhaChegar();
    expect(screen.queryByText("Lead Que Nao Foi Pedido")).toBeNull();
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });

  it("Users: a lista inteira que chegou atrasada some diante do filtro", async () => {
    armarede(
      "/users",
      pagina([MEMBRO_FORA_DO_FILTRO]),
      pagina([MEMBRO_PEDIDO]),
      [{ caminho: "/users/rbac", status: 200, data: { papeis: [], celulas: [], recursos: [] } }],
    );
    monte(<Users />, "/app/usuarios");

    fireEvent.change(screen.getByLabelText("Buscar usuários"), { target: { value: "Alfa" } });
    await screen.findByText("Usuario Alfa");

    await deixeARedeVelhaChegar();
    expect(screen.queryByText("Usuario Que Nao Foi Pedido")).toBeNull();
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });
});
