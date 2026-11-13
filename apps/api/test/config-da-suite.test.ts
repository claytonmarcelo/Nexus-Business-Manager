import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

// N97 — a configuração da suíte falava com uma opção que o Vitest 4 removeu.
//
// A casa escreveu `poolOptions: { forks: { singleFork: true } }` achando que a
// suíte rodava num processo só. A chave deixou de existir no Vitest 4: o
// próprio runner avisa "test.poolOptions was removed in Vitest 4" e segue
// ignorando o que estava ali. O efeito medido foi o oposto do pretendido — a
// suíte abria um processo novo por arquivo (44 PIDs numa rodada que passou),
// e uma rodada de cobertura chegou a perder 39 workers na criação
// (0xC0000142, STATUS_DLL_INIT_FAILED) depois de 20 arquivos.
//
// Este arquivo é o portão: ele prende as três coisas que precisam ser verdade
// ao mesmo tempo para a suíte rodar como a casa escreveu que ela roda.
//
//   1. A configuração não usa a chave removida e pede as opções de topo.
//   2. A configuração resolvida diz o que vai acontecer de fato: um worker só,
//      em série, sem isolamento entre arquivos — e resolver não emite aviso.
//   3. Nenhum arquivo de teste fecha o app compartilhado — porque, sem
//      isolamento, o app é um só e fechá-lo derrubaria a suíte inteira.
//
// O item 3 tem prova de que não é teoria: com `--no-isolate` e os arquivos
// ainda fechando o app, 27 casos de 34 caíram com "Fastify has already been
// closed and cannot be reopened".

const RAIZ = resolve(__dirname, "..", "..", ".."); // apps/api/test -> raiz do monorepo
const PASTA_DA_API = resolve(RAIZ, "apps", "api");
const PASTA_DE_TESTE = resolve(PASTA_DA_API, "test");


// O processo que resolve a configuração precisa ser outro: dentro do worker o
// `DATABASE_URL` já é o banco de prova, e a guarda de `vitest.config.ts`
// (D6) recusa carregar a configuração quando as duas pontas apontam para o
// mesmo banco. No filho o `DATABASE_URL` sai do caminho e o `DATABASE_URL_TESTE`
// fica — que é a combinação que a guarda espera.
const SONDAGEM = [
  'const { resolveConfig } = require("vitest/node");',
  'resolveConfig({ root: process.cwd() }).then((c) => {',
  "  const t = c.test;",
  '  process.stdout.write("CONFIG=" + JSON.stringify({',
  "    maxWorkers: t.maxWorkers,",
  "    isolate: t.isolate,",
  "    pool: t.pool,",
  "    fileParallelism: t.fileParallelism,",
  "    isolatePedido: t.providedOptions.isolate === true,",
  '  }) + "\\n");',
  '}).catch((erro) => { process.stdout.write("ERRO=" + String(erro && erro.message) + "\\n"); });',
].join("\n");

function resolverConfigForaDoWorker(): { config?: Record<string, unknown>; erro?: string; stderr: string } {
  const ambiente = { ...process.env } as Record<string, string | undefined>;
  delete ambiente.DATABASE_URL;
  const resultado = spawnSync(process.execPath, ["-e", SONDAGEM], {
    cwd: PASTA_DA_API,
    encoding: "utf8",
    env: ambiente,
  });
  const saida = resultado.stdout ?? "";
  const linha = saida.split("\n").find((l) => l.startsWith("CONFIG="));
  if (linha) return { config: JSON.parse(linha.slice("CONFIG=".length)), stderr: resultado.stderr ?? "" };
  const erro = saida.split("\n").find((l) => l.startsWith("ERRO="));
  return { erro: erro ? erro.slice("ERRO=".length) : saida.trim(), stderr: resultado.stderr ?? "" };
}

describe("A configuração da suíte usa as opções vigentes do Vitest (N97)", () => {
  it("a configuração não usa a chave poolOptions, removida no Vitest 4", () => {
    const texto = readFileSync(resolve(PASTA_DA_API, "vitest.config.ts"), "utf8");
    // O comentário do arquivo conta a história da chave removida — é o código
    // que não pode mais citá-la.
    const codigo = texto
      .split("\n")
      .filter((linha) => !linha.trim().startsWith("//"))
      .join("\n");
    expect(codigo, "a chave poolOptions não vale mais nada no Vitest 4").not.toMatch(/poolOptions/);
    expect(codigo, "singleFork foi junto com poolOptions").not.toMatch(/singleFork/);
    // E as duas opções de topo que a casa pediu explicitamente: sem elas o
    // padrão do Vitest (um worker por arquivo) volta sem aviso.
    expect(codigo, "maxWorkers de topo").toMatch(/maxWorkers:\s*1\b/);
    expect(codigo, "isolate de topo").toMatch(/isolate:\s*false\b/);
  });

  it("a configuração resolvida roda em um worker só, em série e sem isolamento", () => {
    const { config, erro, stderr } = resolverConfigForaDoWorker();
    expect(erro, erro).toBeUndefined();
    expect(config?.maxWorkers, "maxWorkers").toBe(1);
    expect(config?.isolate, "isolate").toBe(false);
    expect(config?.pool, "pool").toBe("forks");
    // E o efeito colateral de segurança: sem paralelismo de arquivos, o banco
    // de prova não tem duas suítes disputando a mesma linha ao mesmo tempo.
    expect(config?.fileParallelism, "fileParallelism").toBe(false);
    // O isolamento desligado não pode ser herança do padrão: tem de ter sido
    // pedido no arquivo.
    expect(config?.isolatePedido, "isolate pedido no arquivo").toBe(true);
    // Resolver a configuração não pode mais gritar depreciação: era o aviso que
    // denunciava que a chave do projeto já não valia nada.
    expect(stderr, stderr).not.toMatch(/poolOptions/);
  });

  it("nenhum arquivo de teste fecha o app compartilhado", () => {
    const arquivos = readdirSync(PASTA_DE_TESTE).filter((nome) => nome.endsWith(".test.ts"));
    expect(arquivos.length).toBeGreaterThan(50);
    const fechadores: string[] = [];
    for (const arquivo of arquivos) {
      const texto = readFileSync(resolve(PASTA_DE_TESTE, arquivo), "utf8");
      const usaAppCompartilhado = /from\s+"\.\/helpers"/.test(texto);
      if (usaAppCompartilhado && /app\.close\(\)/.test(texto)) fechadores.push(arquivo);
    }
    expect(
      fechadores,
      "sem isolamento o app é um só: fechar ele no fim de um arquivo derruba os arquivos seguintes",
    ).toEqual([]);
  });
});
