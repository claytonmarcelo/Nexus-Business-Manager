import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { api } from "../lib/api";
import { monteAdaptador, type Rota } from "./fabrica-api";
import { PlataformaAuditoria } from "../pages/PlataformaAuditoria";
import { Audit } from "../pages/Audit";
import { descricaoDaAcao } from "../lib/auditLabels";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// F2 do PROMPT MESTRE na tela: as duas trilhas de auditoria.
//
// O painel de uma empresa mostra o que aconteceu naquela empresa. A trilha da
// plataforma mostra as ações que alcançam todas — vitrine, textos legais e
// rotinas — e a empresa onde o administrador estava sentado quando agiu, como
// origem. Estes casos amarram três coisas que a API já garante e a tela precisa
// continuar garantindo:
//  1. quem tem o papel da plataforma lê a trilha dela, com a origem nomeada;
//  2. quem não tem não chega a bater na porta (nenhuma chamada sai, e a tela diz
//     por que está fechada);
//  3. a Auditoria do tenant explica a outra trilha em vez de deixar a pessoa
//     procurando um evento que nunca vai aparecer ali.
//
// A rede é o adaptador do axios, como no teste de sessão: o que se exercita é o
// componente real, com a resposta no formato que a API devolve hoje.

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

interface Linha {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  ip: string | null;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
  origemSessao?: string | null;
}

function pagina<T>(data: T[]): { data: T[]; meta: { page: number; pageSize: number; total: number; totalPages: number } } {
  return { data, meta: { page: 1, pageSize: 20, total: data.length, totalPages: 1 } };
}

// O evento como a rota /audit/plataforma devolve hoje: sem companyId no corpo da
// resposta, com a origem da sessão nomeada.
const EVENTO_DA_PLATAFORMA: Linha = {
  id: "evt-1",
  action: "cms.config.updated",
  entity: "landing_config",
  entityId: "default",
  ip: "127.0.0.1",
  createdAt: "2026-10-12T15:00:00.000Z",
  userName: "Administrador da Plataforma",
  userEmail: "administrador@plataforma.teste",
  origemSessao: "Empresa Alfa",
};

const EVENTO_DO_TENANT: Linha = {
  id: "evt-2",
  action: "sale.cancelled",
  entity: "sale",
  entityId: "venda-1",
  ip: "127.0.0.1",
  createdAt: "2026-10-12T16:30:00.000Z",
  userName: "Gerente",
  userEmail: "gerente@empresa.teste",
};

const chamadas: string[] = [];

function paredeRede(rotas: Rota[]) {
  const base = monteAdaptador(rotas);
  api.defaults.adapter = async (config) => {
    chamadas.push(config.url ?? "");
    return base(config);
  };
}

afterEach(() => {
  cleanup();
  delete api.defaults.adapter;
  chamadas.length = 0;
  SESSAO.platform = true;
});

describe("Auditoria da plataforma na tela (F2)", () => {
  it("mostra a ação da plataforma com a empresa de origem, e não com uma dona", async () => {
    paredeRede([{ caminho: "/audit/plataforma", status: 200, data: pagina([EVENTO_DA_PLATAFORMA]) }]);
    render(
      <MemoryRouter initialEntries={["/app/auditoria-plataforma"]}>
        <PlataformaAuditoria />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Configuração da vitrine publicada")).toBeTruthy();
    // A origem aparece com rótulo de negócio, não com o código interno da tabela: o
    // seletor e a linha dizem a mesma coisa, e o nome de coluna do banco não vaza.
    expect(screen.getAllByText("Configuração da vitrine").length).toBeGreaterThanOrEqual(2);
    expect(document.body.textContent).not.toContain("landing_config");
    expect(screen.getByText("Empresa Alfa")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Origem da sessão" })).toBeTruthy();

    // A trilha é somente leitura e não finge posse: a página não tem botão de
    // editar nem coluna de empresa dona, e o identificador da empresa não é
    // impresso para o navegador.
    expect(document.body.textContent).not.toContain("00000000-0000-4000-8000-000000000011");
    expect(screen.queryByText("Salvar")).toBeNull();
  });

  it("quem não é administrador da plataforma não bate na porta", async () => {
    SESSAO.platform = false;
    paredeRede([{ caminho: "/audit/plataforma", status: 403, data: { message: "reservado" } }]);
    render(
      <MemoryRouter initialEntries={["/app/auditoria-plataforma"]}>
        <PlataformaAuditoria />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Área reservada da plataforma")).toBeTruthy();
    expect(chamadas.filter((u) => u.includes("/audit/plataforma"))).toEqual([]);
  });

  it("as ações da plataforma têm rótulo em português, como as do tenant", () => {
    const acoes = [
      ["cms.config.updated", "landing_config"],
      ["cms.item.created", "landing_item"],
      ["cms.item.updated", "landing_item"],
      ["cms.item.delete", "landing_item"],
      ["cms.legal.published", "legal_document"],
      ["cms.legal.updated", "legal_document"],
      ["cms.maintenance.token", "landing_config"],
      ["cron.job.updated", "cron_job"],
      ["cron.job.run", "cron_job"],
    ] as const;
    for (const [acao, entidade] of acoes) {
      const rotulo = descricaoDaAcao(acao, entidade);
      expect(rotulo === acao, acao).toBe(false);
      // cai no rotulo generico ("cms: ..." / "cron: ...") quando ninguém tradziu.
      expect(/^(cms|cron):/.test(rotulo), acao + " -> " + rotulo).toBe(false);
      expect(rotulo.length).toBeGreaterThan(3);
    }
  });
});

describe("Aviso permanente na Auditoria do tenant (F2)", () => {
  it("explica a outra trilha para quem só tem a empresa", async () => {
    SESSAO.platform = false;
    paredeRede([{ caminho: "/audit", status: 200, data: pagina([EVENTO_DO_TENANT]) }]);
    render(
      <MemoryRouter initialEntries={["/app/auditoria"]}>
        <Audit />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Venda cancelada")).toBeTruthy();
    expect(document.body.textContent).toContain("trilha própria, reservada ao administrador da plataforma");
    // Sem o papel da plataforma não existe atalho para uma área que devolveria 403.
    expect(screen.queryByText("Abrir a trilha da plataforma")).toBeNull();
  });

  it("dá o atalho para quem também responde pela plataforma", async () => {
    paredeRede([{ caminho: "/audit", status: 200, data: pagina([EVENTO_DO_TENANT]) }]);
    render(
      <MemoryRouter initialEntries={["/app/auditoria"]}>
        <Audit />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("Venda cancelada")).toBeTruthy());
    expect(screen.getByText("Abrir a trilha da plataforma")).toBeTruthy();
  });
});

describe("A tela está ligada no menu e no roteador (F2)", () => {
  function fonte(caminho: string): string {
    return readFileSync(resolve(process.cwd(), caminho), "utf8");
  }

  it("a rota existe e o item do menu é marcado como área da plataforma", () => {
    const app = fonte("src/App.tsx");
    const menu = fonte("src/components/layout/AdminShell.tsx");
    expect(app).toContain('<Route path="auditoria-plataforma" element={<PlataformaAuditoria />} />');
    expect(app).toContain('import { PlataformaAuditoria } from "./pages/PlataformaAuditoria";');
    expect(menu).toContain('to: "/app/auditoria-plataforma"');
    // Item de plataforma: some da barra de quem não responde pela plataforma, e a
    // API ainda confere no banco a cada request.
    const linha = menu.split("\n").find((l) => l.includes('to: "/app/auditoria-plataforma"')) ?? "";
    expect(linha).toContain("plataforma: true");
    expect(linha).not.toContain("permission:");
    expect(linha).not.toContain("emBreve");
  });

  it("o rótulo do menu e o título da tela dizem a mesma coisa", () => {
    const menu = fonte("src/components/layout/AdminShell.tsx");
    const tela = fonte("src/pages/PlataformaAuditoria.tsx");
    expect(menu).toContain('label: "Auditoria da plataforma"');
    expect(tela).toContain("<h1 className=\"page-title\">Auditoria da plataforma</h1>");
  });
});
