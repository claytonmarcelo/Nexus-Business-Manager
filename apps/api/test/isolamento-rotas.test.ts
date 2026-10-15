import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app";
import { estadoManutencao, recarregarEstado } from "../src/modules/cms/cms.service";

// F2 do PROMPT MESTRE — a matriz de rotas.
//
// Nada aqui é lista digitada a partir de memória: a tabela de rotas é lida DO
// PRÓPRIO FASTIFY. Um gancho `onRoute` coleta cada rota no instante em que ela
// nasce (método, url, carimbo de pública, preHandler e o código do handler já
// transcrito) e todas as contagens saem dessa medição. Rota nova sem gate derruba
// a regra 1; rota que se diga de plataforma fora do prefixo derruba a regra 5;
// escrita de plataforma que carimbar o tenant derruba a regra 8 — que é o N14
// fechado por teste, não por boa vontade.
//
// A varredura anônima (regra 7) é o pedaço que nenhuma lista cobria: ela bate em
// TODA rota não pública sem token. O `intrusao.test.ts` ataca 33 URLs escolhidas;
// aqui as rotas autenticadas respondem juntas.

type Linha = {
  metodo: string;
  url: string;
  publica: boolean;
  autenticada: boolean;
  // F4 (D3): as etapas do login não têm sessão para conferir — quem apresenta é um
  // token curto e com escopo, emitido pela própria rota de login. O decorador que
  // os confere é outro (`authenticateSegundoFator`), e a matriz precisa enxergar
  // essa terceira porta em vez de fingir que ela é pública.
  deEtapa: boolean;
  fonte: string;
};

const RAIZ_API = resolve(__dirname, "..");

// Módulos que respondem pela plataforma inteira. É aqui — e só aqui — que uma
// auditoria pode nascer marcada como de plataforma.
const ARQUIVOS_DE_PLATAFORMA = [
  "src/modules/cron/cron.routes.ts",
  "src/modules/cms/cms.routes.ts",
  "src/modules/cms/cms.service.ts",
  // T5.5 (N61): a confirmação administrativa de e-mail escreve na coluna de
  // identidade de uma conta de fora do tenant, então o evento é da plataforma.
  "src/modules/platform-accounts/contas.service.ts",
];

// Rotas que podem responder sem token. Lista de exceção declarada, não contagem:
// uma rota nova marcada `config.public` fora daqui derruba o teste, e é assim que
// o projeto fica sabendo que alguém abriu uma porta.
const PUBLICAS = [
  "GET /api/health",
  "GET /api/public/landing",
  "GET /api/public/legal/:kind",
  "POST /api/auth/2fa/challenge",
  "POST /api/auth/forgot-password",
  "POST /api/auth/login",
  "POST /api/auth/logout",
  "POST /api/auth/refresh",
  "POST /api/auth/register",
  "POST /api/auth/resend-verification",
  "POST /api/auth/reset-password",
  "POST /api/auth/verify-email",
  "POST /api/public/bypass",
];

// F4 (D3): as duas rotas que atravessam o gate com token de etapa. Elas não têm
// sessão (por isso não entram em DE_CONTA) e não são abertas (por isso não estão em
// PUBLICAS): o que cada uma exige é o token de quinze minutos com escopo
// `2fa-configuracao` que o login obrigatório devolveu, conferido pelo decorador
// próprio e amarrado ao escopo dentro do handler. Uma rota nova que nascer com
// esse decorador fora desta lista derruba o teste.
const DE_ETAPA = ["POST /api/auth/2fa/activate", "POST /api/auth/2fa/setup"];

// Rotas autenticadas que falam com a CONTA, não com uma empresa escolhida pelo
// contexto. Nenhuma devolve dado de tenant: duas listam os vínculos do próprio
// usuário, uma cria um tenant novo e uma devolve tabelas fixas (moeda, fuso,
// idioma) para o formulário de criação.
const DE_CONTA = [
  "GET /api/auth/2fa/status",
  "GET /api/companies",
  "GET /api/companies/settings/opcoes",
  "POST /api/auth/2fa/ativar",
  "POST /api/auth/2fa/desativar",
  "POST /api/auth/2fa/preparar",
  "POST /api/auth/switch-company",
  "POST /api/companies",
];

// Escritas que dispensam permissão de módulo porque operam a própria caixa de
// avisos ou a própria senha. O isolamento vem do contexto assinado no token — por
// isso a regra 6 exige `resolveCompanyContext` nelas em vez do RBAC.
const ESCRITAS_DE_SESSAO = [
  "PATCH /api/auth/me",
  "POST /api/auth/change-password",
  "PATCH /api/notifications/:id/read",
  "POST /api/notifications/read-all",
  "PUT /api/notifications/preferences",
];

const METODOS_DE_ESCRITA = ["POST", "PATCH", "PUT", "DELETE"];

let app: FastifyInstance;
let linhas: Linha[] = [];

function chave(linha: Linha): string {
  return `${linha.metodo} ${linha.url}`;
}

function plataforma(linha: Linha): boolean {
  return linha.fonte.includes("assertPlatformAdmin");
}

function deEmpresa(linha: Linha): boolean {
  return !plataforma(linha) && linha.fonte.includes("resolveCompanyContext");
}

// Rota de negócio é o que alguém escreveu: fora o espelho HEAD (regra 2) e o
// preflight OPTIONS do @fastify/cors.
function negocio(): Linha[] {
  return linhas.filter((l) => l.metodo !== "HEAD" && l.metodo !== "OPTIONS");
}

// readdir recursivo devolve separador de plataforma no Windows; tudo volta a "/"
// para as comparações com as listas declaradas acima.
function arquivosTsDoSrc(): string[] {
  return readdirSync(resolve(RAIZ_API, "src"), { recursive: true })
    .map(String)
    .map((caminho) => caminho.split("\\").join("/"))
    .filter((caminho) => caminho.endsWith(".ts"))
    .map((caminho) => `src/${caminho}`);
}

function arquivosDeRota(): string[] {
  return arquivosTsDoSrc()
    .filter((caminho) => caminho.endsWith(".routes.ts"))
    .sort();
}

// Recorta cada `audit({ ... })` do arquivo acompanhando as chaves. Texto puro de
// propósito: a regra tem de valer mesmo quando nada é executado.
function blocosDeAuditoria(texto: string): string[] {
  const blocos: string[] = [];
  let cursor = 0;
  for (;;) {
    const inicio = texto.indexOf("audit({", cursor);
    if (inicio === -1) break;
    let profundidade = 0;
    let fim = inicio + "audit(".length;
    for (; fim < texto.length; fim++) {
      if (texto[fim] === "{") profundidade++;
      else if (texto[fim] === "}") {
        profundidade--;
        if (profundidade === 0) break;
      }
    }
    blocos.push(texto.slice(inicio, fim + 2));
    cursor = fim + 1;
  }
  return blocos;
}

// Nome da ação dentro do bloco, para a falha dizer qual escrita está sem escopo —
// nunca o conteúdo do metadata, que pode carregar dado de cliente.
function acaoDo(bloco: string): string {
  const achado = bloco.match(/action:\s*([^,\n]+)/)?.[1] ?? bloco;
  return achado.replace(/["`]/g, "").replace(/\s+/g, " ").trim().slice(0, 60);
}

beforeAll(async () => {
  const coletadas: Linha[] = [];
  app = buildApp();
  app.addHook("onRoute", (rota) => {
    const lista = Array.isArray(rota.preHandler) ? rota.preHandler : rota.preHandler ? [rota.preHandler] : [];
    coletadas.push({
      metodo: Array.isArray(rota.method) ? rota.method.join(",") : String(rota.method),
      url: rota.url,
      publica: rota.config?.public === true,
      autenticada: lista.includes(app.authenticate),
      deEtapa: lista.includes(app.authenticateSegundoFator),
      fonte: String(rota.handler),
    });
  });
  await app.ready();
  linhas = coletadas;
  // O gancho de manutenção devolve 503 antes de qualquer rota fora da lista de
  // livres. A varredura anônima mede o gate de sessão, então a plataforma precisa
  // estar aberta: se a última rodada a deixou fechada, a falha aparece com essa
  // cara, e não como um 401 que supostamente faltou.
  recarregarEstado();
  const estado = await estadoManutencao();
  expect(estado.ativa, "modo manutenção ativo: a varredura anônima não mediria o gate de sessão").toBe(false);
});

afterAll(async () => {
  await app.close();
});

describe("Matriz de rotas lida do próprio Fastify (F2)", () => {
  it("nenhuma rota nasce sem app.authenticate e sem carimbo de pública", () => {
    // A rota de etapa conta como autenticada: o decorador é outro, mas ela pede
    // alguma coisa antes de chegar ao handler — que é o que o gate vigia.
    const semGate = linhas.filter((l) => l.metodo !== "OPTIONS" && !l.autenticada && !l.deEtapa && !l.publica);
    expect(semGate.map(chave)).toEqual([]);
  });

  it("o espelho HEAD e o preflight OPTIONS são só o que o gate isenta", () => {
    const cabecas = linhas.filter((l) => l.metodo === "HEAD");
    const gets = linhas.filter((l) => l.metodo === "GET");
    // Fastify 5 liga `exposeHeadRoutes` por padrão: todo GET tem um HEAD, e o
    // espelho herda o preHandler e o carimbo do GET — conferido na regra 1.
    expect(cabecas.length).toBe(gets.length);
    expect(linhas.filter((l) => l.metodo === "OPTIONS").map((l) => l.url)).toEqual(["*"]);
  });

  it("as públicas são exatamente a lista declarada, nem uma a mais", () => {
    const medidas = negocio().filter((l) => l.publica).map(chave).sort();
    expect(medidas).toEqual([...PUBLICAS].sort());
  });

  it("a contagem medida bate com a contagem declarada nos arquivos de rota", () => {
    const declaradas = arquivosDeRota().reduce((total, caminho) => {
      const texto = readFileSync(resolve(RAIZ_API, caminho), "utf8");
      return total + (texto.match(/\bapp\.(get|post|put|patch|delete)\(/g) ?? []).length;
    }, 0);
    expect(negocio().length).toBe(declaradas);
  });

  it("cada rota é plataforma, empresa ou conta, e as de conta são as declaradas", () => {
    // Só entra na partição quem tem sessão: as públicas já foram julgadas na
    // regra 3, e misturar as duas listas faria uma rota pública sem contexto
    // parecer uma rota de conta nova. As de etapa ficam de fora por outro motivo:
    // elas têm um token, mas não é sessão — é o token de escopo do login.
    const deConta = negocio()
      .filter((l) => !l.publica && !l.deEtapa && !plataforma(l) && !deEmpresa(l))
      .map(chave)
      .sort();
    expect(deConta).toEqual([...DE_CONTA].sort());

    // E a porta de etapa é exatamente a declarada — nem uma a mais, porque rota de
    // etapa que ninguém declarou é uma porta que abre sessão sem segundo fator.
    const deEtapa = negocio().filter((l) => l.deEtapa).map(chave).sort();
    expect(deEtapa).toEqual([...DE_ETAPA].sort());
    // Dupla conferência: quem é de etapa não é autenticado pela sessão comum.
    for (const linha of negocio().filter((l) => l.deEtapa)) {
      expect(linha.autenticada, chave(linha)).toBe(false);
      expect(linha.publica, chave(linha)).toBe(false);
    }

    // Área de plataforma mora em prefixos conhecidos. Uma rota nova que se diga
    // de plataforma fora deles é achado a ser julgado, não exceção silenciosa.
    const foraDoPrefixo = negocio()
      .filter(plataforma)
      .map(chave)
      .filter((linha) => {
        const caminho = linha.split(" ")[1] ?? "";
        return !(
          caminho.startsWith("/api/cms") ||
          caminho.startsWith("/api/ops") ||
          // T5.5 (N61): a área de plataforma das contas sem confirmação nasceu
          // aqui, declarada — porta nova fora deste lista é achado a julgar.
          caminho.startsWith("/api/plataforma") ||
          caminho === "/api/audit/plataforma"
        );
      });
    expect(foraDoPrefixo).toEqual([]);

    // RBAC de empresa nunca é o cadeado da plataforma, e a plataforma não entra
    // na matriz de permissões de um tenant.
    expect(negocio().filter((l) => plataforma(l) && l.fonte.includes("assertPermission")).map(chave)).toEqual([]);
    expect(negocio().filter((l) => !plataforma(l) && l.fonte.includes("assertPlatformAdmin")).map(chave)).toEqual([]);
  });

  it("toda escrita de tenant pede permissão ou é escrita da própria sessão", () => {
    const semPermissao = negocio()
      .filter((l) => METODOS_DE_ESCRITA.includes(l.metodo))
      .filter(deEmpresa)
      .filter((l) => !l.fonte.includes("assertPermission") && !l.fonte.includes("can("))
      .map(chave)
      .sort();
    expect(semPermissao).toEqual([...ESCRITAS_DE_SESSAO].sort());

    // Quem dispensa RBAC não dispensa o contexto: a empresa vem do token
    // assinado, nunca do corpo da requisição.
    for (const linha of negocio().filter((l) => ESCRITAS_DE_SESSAO.includes(chave(l)))) {
      expect(linha.fonte, chave(linha)).toContain("resolveCompanyContext");
    }
  });

  it("toda rota autenticada recusa quem não tem token", async () => {
    const alvos = negocio().filter((l) => !l.publica);
    // Piso de grandeza: se a coleta encolher, a varredura passou a não provar nada
    // e o teste precisa gritar antes de virar enfeite.
    expect(alvos.length).toBeGreaterThan(90);
    const recusadas: string[] = [];
    for (const linha of alvos) {
      const url = linha.url.replace(/:[A-Za-z0-9_]+/g, "rota-inexistente");
      const res = await app.inject({ method: linha.metodo as "GET", url });
      if (res.statusCode !== 401) recusadas.push(`${chave(linha)} -> ${res.statusCode}`);
    }
    expect(recusadas).toEqual([]);
  });

  it("nenhuma auditoria de plataforma carimba a empresa da sessão (N14)", () => {
    const blocos = ARQUIVOS_DE_PLATAFORMA.flatMap((caminho) =>
      blocosDeAuditoria(readFileSync(resolve(RAIZ_API, caminho), "utf8")).map((bloco) => ({ caminho, bloco })),
    );
    // O scanner precisa enxergar as 8 escritas que o achado contou. Um guarda que
    // não acha nada passa em branco, e passar em branco não é provar.
    expect(blocos.length).toBeGreaterThanOrEqual(8);
    const semEscopo = [
      ...new Set(
        blocos
          .filter((l) => !l.bloco.includes("scope: ESCOPO_PLATAFORMA"))
          .map((l) => `${l.caminho} :: ${acaoDo(l.bloco)}`),
      ),
    ].sort();
    expect(semEscopo).toEqual([]);
  });

  it("só módulo de plataforma carimba evento de plataforma, e quem lê não escreve", () => {
    const carimbam = new Set<string>();
    for (const caminho of arquivosTsDoSrc()) {
      const texto = readFileSync(resolve(RAIZ_API, caminho), "utf8");
      for (const bloco of blocosDeAuditoria(texto)) {
        if (bloco.includes("scope: ESCOPO_PLATAFORMA")) carimbam.add(caminho);
      }
    }
    expect([...carimbam].sort()).toEqual([...ARQUIVOS_DE_PLATAFORMA].sort());
    // A trilha de plataforma é somente leitura: ela filtra pela coluna, não cria
    // evento nenhum — se criasse, estaria escrevendo na trilha de fora.
    const leituras = readFileSync(resolve(RAIZ_API, "src/modules/audit/audit.routes.ts"), "utf8");
    expect(blocosDeAuditoria(leituras)).toEqual([]);
  });
});
