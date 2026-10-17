import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import { api } from "../lib/api";
import { monteAdaptador, USUARIO_DE_TESTE, type Rota } from "./fabrica-api";
import { PrivacidadePanel } from "../components/settings/PrivacidadePanel";
import { Settings } from "../pages/Settings";
import { notify } from "../lib/notify";
import type { DadosDoTitular } from "../lib/lgpdApi";

// T6.3 (F7, LGPD art. 18, II) — a metade da frente do direito de acesso.
//
// A rota está provada do lado do servidor em apps/api/test/export-dos-dados-do-titular.test.ts:
// o recorte pela pessoa, o que fica de fora por construção e o isolamento entre empresas.
// O que este arquivo amarra é o que só a tela pode errar:
//   1. a leitura cara e auditada não acontece em toda visita a Configurações — ela é
//      disparada por quem abre a aba, porque o `TabPanel` não monta o que está oculto;
//   2. a tela mostra o que a resposta disse, campo por campo, sem inventar conta:
//      "1 de 2" sessões e o total real da trilha vêm do corpo;
//   3. o aceite registrado ganha o rótulo institucional do documento (TERMS é "Termos
//      de uso" na tela), e uma conta aberta pela equipe não ganha lista vazia muda;
//   4. a cópia baixada é o corpo INTEIRO da resposta, não o resumo que está na tela —
//      o arquivo é conferido byte a byte contra o JSON que a API devolveu;
//   5. o que a casa guarda e não entrega está escrito, com o motivo de cada ausência;
//   6. leitura que falha não vira tela branca: diz a frase da API e oferece a nova
//      tentativa, que volta a chamar a rota.
//
// A rede é o adaptador da fábrica, no formato que `exportarDadosDoTitular` devolve hoje.

const SESSAO = {
  user: USUARIO_DE_TESTE,
  can: () => true,
  reload: async () => undefined,
  switchCompany: async () => undefined,
  login: async () => ({ estado: "sessao" as const }),
  logout: async () => undefined,
};

vi.mock("../context/AuthContext", () => ({
  useAuth: () => SESSAO,
}));

vi.mock("../lib/notify", () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

interface Chamada {
  url: string;
}

function monteApp(rotas: Rota[]): Chamada[] {
  const chamadas: Chamada[] = [];
  const interior = monteAdaptador(rotas);
  const adaptador = async (config: Parameters<typeof interior>[0]) => {
    chamadas.push({ url: config.url ?? "" });
    return interior(config);
  };
  axios.defaults.adapter = adaptador;
  api.defaults.adapter = adaptador;
  return chamadas;
}

function rotaDeDados(corpo: DadosDoTitular): Rota {
  return { caminho: "/lgpd/meus-dados", status: 200, data: corpo };
}

/** O corpo que a API devolve hoje, com três ausências declaradas e duas empresas. */
function dados(complemento: Partial<DadosDoTitular> = {}): DadosDoTitular {
  return {
    geradoEm: "2026-03-05T14:30:00.000Z",
    aviso: "Estes são os dados que a casa guarda sobre você nesta empresa.",
    titular: {
      id: "00000000-0000-4000-8000-000000000001",
      nome: "Dono da Empresa",
      email: "dono@empresa.teste",
      telefone: "(11) 98888-7777",
      avatarUrl: null,
      contaAtiva: true,
      papelNaPlataforma: null,
      emailVerificadoEm: "2026-01-10T12:00:00.000Z",
      segundoFatorDesde: null,
      criadoEm: "2026-01-02T09:00:00.000Z",
      atualizadoEm: "2026-02-20T09:00:00.000Z",
    },
    empresaAtiva: {
      id: "00000000-0000-4000-8000-000000000011",
      nome: "Empresa de Teste",
      papel: "OWNER",
      desde: "2026-01-02T09:00:00.000Z",
    },
    vinculos: [
      {
        empresa: "Empresa de Teste",
        papel: "OWNER",
        desde: "2026-01-02T09:00:00.000Z",
      },
      { empresa: "Empresa Irmã", papel: "STAFF", desde: null },
    ],
    aceites: [
      { tipo: "TERMS", versao: 3, aceitoEm: "2026-01-02T09:05:00.000Z", ip: "10.0.0.5" },
      { tipo: "LGPD", versao: 1, aceitoEm: "2026-01-02T09:05:00.000Z", ip: "10.0.0.5" },
    ],
    sessoes: [
      {
        empresa: "00000000-0000-4000-8000-000000000011",
        criadaEm: "2026-03-01T08:00:00.000Z",
        expiraEm: "2026-03-31T08:00:00.000Z",
        usadaEm: null,
        revogadaEm: null,
        ipOrigem: "10.0.0.5",
      },
      {
        empresa: "00000000-0000-4000-8000-000000000011",
        criadaEm: "2026-02-11T08:00:00.000Z",
        expiraEm: "2026-03-13T08:00:00.000Z",
        usadaEm: "2026-02-12T08:00:00.000Z",
        revogadaEm: null,
        ipOrigem: "10.0.0.9",
      },
    ],
    notificacoes: [{ tipo: "sale", titulo: "Venda registrada", criadaEm: "2026-03-04T15:00:00.000Z" }],
    preferenciasDeAviso: null,
    trilhaDeAuditoria: { total: 812, mostrado: 500, eventos: [] },
    tentativasDeLogin: [],
    naoIncluidos: [
      {
        campo: "senha e segundo fator",
        motivo: "Guardados como hash e segredo cifrado. Exportar entregaria a chave de acesso da conta.",
      },
      {
        campo: "registros de negócio da empresa",
        motivo: "Cliente, fornecedor, venda e lançamento pertencem à empresa e aos titulares deles.",
      },
    ],
    ...complemento,
  };
}

/** O painel isolado: a rede do caso na frente e a leitura padrão por baixo. */
function monte(rotas: Rota[]): Chamada[] {
  const chamadas = monteApp(rotas);
  render(<PrivacidadePanel />);
  return chamadas;
}

function bloco(titulo: string): HTMLElement {
  const cabecalho = screen.getByRole("heading", { name: titulo });
  const painel = cabecalho.closest("section");
  if (!painel) throw new Error("Bloco sem section: " + titulo);
  return painel as HTMLElement;
}

// A descida do arquivo: o mesmo link oculto que `lib/csv.ts` usa. O clique da âncora
// em jsdom dispara "navigation not implemented", então ele é trocado por um espião —
// o que importa é o nome do arquivo, o href apontando para o blob e o corpo gravado.
let blobs: Blob[];
let clickSpy: ReturnType<typeof vi.spyOn>;
let blobSpy: ReturnType<typeof vi.spyOn>;
let criarUrlOriginal: (blob: Blob) => string;
let revogarUrlOriginal: (url: string) => void;

beforeEach(() => {
  blobs = [];
  criarUrlOriginal = URL.createObjectURL;
  revogarUrlOriginal = URL.revokeObjectURL;
  URL.createObjectURL = (blob: Blob) => {
    blobs.push(blob);
    return "blob:meus-dados-de-teste";
  };
  URL.revokeObjectURL = () => undefined;
  clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
  // O jsdom não dá leitura no Blob, então o conteúdo é conferido na origem: a
  // primeira parte passada ao construtor é exatamente o texto do arquivo.
  blobSpy = vi.spyOn(globalThis, "Blob");
  localStorage.clear();
  sessionStorage.clear();
  for (const fn of [notify.success, notify.error, notify.info]) vi.mocked(fn).mockClear();
});

afterEach(() => {
  URL.createObjectURL = criarUrlOriginal;
  URL.revokeObjectURL = revogarUrlOriginal;
  vi.restoreAllMocks();
  cleanup();
  delete axios.defaults.adapter;
  delete api.defaults.adapter;
});

describe("A tela de dados do titular", () => {
  it("abre com a foto lida na empresa ativa, sem conta feita na cabeça", async () => {
    monte([rotaDeDados(dados())]);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Seus dados" })).toBeTruthy());

    const seusDados = bloco("Seus dados");
    expect(within(seusDados).getByText("Dono da Empresa").textContent).toBe("Dono da Empresa");
    expect(within(seusDados).getByText("dono@empresa.teste")).toBeTruthy();
    expect(within(seusDados).getByText("(11) 98888-7777")).toBeTruthy();
    expect(within(seusDados).getByText("OWNER")).toBeTruthy();
    expect(within(seusDados).getByText("desligado")).toBeTruthy();
    // Duas sessões voltaram, uma ainda aberta: a contagem é do corpo, não da tela.
    expect(within(seusDados).getByText("1 de 2")).toBeTruthy();
    expect(within(seusDados).getByText("1")).toBeTruthy();
    expect(
      within(seusDados).getByText("812 (os 500 mais recentes estão no arquivo)"),
    ).toBeTruthy();
    expect(within(seusDados).getByText(/Estes são os dados que a casa guarda/)).toBeTruthy();
    expect(seusDados.textContent).not.toContain("passwordHash");
  });

  it("quando a trilha cabe inteira no arquivo, a tela não fala de recorte", async () => {
    monte([rotaDeDados(dados({ trilhaDeAuditoria: { total: 12, mostrado: 12, eventos: [] } }))]);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Seus dados" })).toBeTruthy());
    expect(within(bloco("Seus dados")).getByText("12")).toBeTruthy();
    expect(screen.queryByText(/mais recentes estão no arquivo/)).toBeNull();
  });

  it("o telefone que não foi informado é dito, não escondido", async () => {
    const corpo = dados();
    corpo.titular.telefone = null;
    monte([rotaDeDados(corpo)]);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Seus dados" })).toBeTruthy());
    expect(within(bloco("Seus dados")).getByText("não informado")).toBeTruthy();
  });

  it("cada aceite traz o nome do documento, a versão e de onde foi marcado", async () => {
    monte([rotaDeDados(dados())]);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "O que você aceitou" })).toBeTruthy(),
    );
    const lista = within(bloco("O que você aceitou")).getByRole("list");
    const itens = within(lista).getAllByRole("listitem");
    expect(itens.length).toBe(2);
    // TERMS é o código do banco; na tela é o documento que a pessoa aceitou.
    expect(itens[0].textContent).toContain("Termos de uso");
    expect(itens[0].textContent).toContain("versão 3");
    expect(itens[0].textContent).toContain("10.0.0.5");
    expect(itens[1].textContent).toContain("Adequação à LGPD");
  });

  it("aceite que não existe é explicado, porque a conta pode ter sido aberta pela equipe", async () => {
    monte([rotaDeDados(dados({ aceites: [] }))]);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "O que você aceitou" })).toBeTruthy(),
    );
    expect(within(bloco("O que você aceitou")).getByText(/Nenhuma caixa marcada registrada/)).toBeTruthy();
    expect(within(bloco("O que você aceitou")).queryByRole("list")).toBeNull();
  });

  it("as outras empresas da conta aparecem com o papel de cada uma", async () => {
    monte([rotaDeDados(dados())]);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Onde mais você está" })).toBeTruthy(),
    );
    const painel = bloco("Onde mais você está");
    expect(within(painel).getByText("Empresa Irmã").parentElement?.textContent).toContain("STAFF");
    expect(within(painel).getAllByRole("listitem").length).toBe(2);
    // A frase diz que noutra casa o pedido é lá: sem ela, a pessoa acharia que este
    // arquivo já contém tudo de todas as empresas.
    expect(within(painel).getByText(/pedido feito logado nelas/)).toBeTruthy();
  });

  it("o que fica de fora é declarado com o motivo de cada ausência", async () => {
    monte([rotaDeDados(dados())]);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "O que a casa guarda e não entrega" })).toBeTruthy(),
    );
    const painel = bloco("O que a casa guarda e não entrega");
    const itens = within(painel).getAllByRole("listitem");
    expect(itens.length).toBe(2);
    expect(itens[0].textContent).toContain("senha e segundo fator");
    expect(itens[0].textContent).toContain("hash e segredo cifrado");
    expect(itens[1].textContent).toContain("registros de negócio da empresa");
  });

  it("baixar a cópia escreve o corpo inteiro da resposta, não o resumo da tela", async () => {
    const corpo = dados();
    monte([rotaDeDados(corpo)]);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Baixar cópia em JSON" })).toBeTruthy(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Baixar cópia em JSON" }));

    expect(blobs.length).toBe(1);
    expect(clickSpy.mock.calls.length).toBe(1);
    const ancora = clickSpy.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(ancora.getAttribute("href")).toBe("blob:meus-dados-de-teste");
    expect(ancora.download).toBe("meus-dados-2026-03-05.json");
    // O link some depois do clique: dado pessoal não fica pendurado no documento.
    expect(document.body.contains(ancora)).toBe(false);
    await waitFor(() => expect(document.querySelectorAll("a[download]").length).toBe(0));

    const partes = blobSpy.mock.calls[0] as unknown as [BlobPart[]];
    const texto = String(partes[0][0]);
    expect(JSON.parse(texto)).toEqual(corpo);
    // Campos que a tela não mostra também estão no arquivo: é a cópia, não a prévia.
    expect(texto).toContain("preferenciasDeAviso");
    expect(texto).toContain("tentativasDeLogin");
    expect(vi.mocked(notify.success).mock.calls.length).toBe(1);
  });

  it("falha na leitura diz a frase da API e a nova tentativa volta a chamar a rota", async () => {
    const chamadas = monte([
      {
        caminho: "/lgpd/meus-dados",
        status: 500,
        data: { message: "Não foi possível ler os seus dados." },
      },
    ]);
    await waitFor(() =>
      expect(screen.getByText("Não foi possível ler os seus dados.")).toBeTruthy(),
    );
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Seus dados" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() =>
      expect(chamadas.filter((c) => c.url.includes("/lgpd/meus-dados")).length).toBe(2),
    );
  });

  it("entrar em Configurações não lê nada: a leitura é da aba, não da página", async () => {
    const chamadas = monteApp([rotaDeDados(dados())]);
    render(
      <MemoryRouter initialEntries={["/app/configuracoes"]}>
        <Settings />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Seus dados" })).toBeTruthy(),
    );

    expect(chamadas.filter((c) => c.url.includes("/lgpd/meus-dados")).length).toBe(0);

    fireEvent.click(screen.getByRole("tab", { name: "Seus dados" }));
    await waitFor(() =>
      expect(chamadas.filter((c) => c.url.includes("/lgpd/meus-dados")).length).toBe(1),
    );
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "O que a casa guarda e não entrega" })).toBeTruthy(),
    );
  });
});
