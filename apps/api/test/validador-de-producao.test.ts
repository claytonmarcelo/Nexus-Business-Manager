import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  FORMATO_DE_TRUST_PROXY,
  exigeConfiguracaoDeProducao,
  interpretarTrustProxy,
  problemasDeProducao,
  type FonteDeAmbiente,
} from "../src/config/producao";

// A9 do prompt de mercado: em produção, configuração de exemplo derruba o
// servidor antes da primeira requisição. O validador é uma função pura que
// recebe um mapa de variáveis e devolve a lista de problemas — nada aqui depende
// do `process.env` real do teste, e nenhuma regra precisa de `process.exit`.
// Os dois últimos casos saem do unitar e vão para um processo filho: provam que
// `config/env.ts` realmente chama o validador quando o ambiente é produção.

// Dois segredos de 40 caracteres, sem nenhuma das palavras de tutorial.
const SEGREDO_A = "0f4c9ba7e2d1488f96b3c5a0de71924f8b0c31ad";
const SEGREDO_B = "7d21ce984bbf03a5e1d97c640f2a8bd15e3c9746";

const base: FonteDeAmbiente = {
  NODE_ENV: "production",
  JWT_ACCESS_SECRET: SEGREDO_A,
  JWT_REFRESH_SECRET: SEGREDO_B,
  CORS_ORIGIN: "https://painel.nexus.com.br",
  DATABASE_URL: "mysql://nexus_app:SenhaDoApp2026@banco.interno:3306/nexus",
};

function configuracao(trocas: FonteDeAmbiente): FonteDeAmbiente {
  return { ...base, ...trocas };
}

function contem(problemas: string[], trecho: string): boolean {
  return problemas.some((p) => p.includes(trecho));
}

// O valor que vai para o Fastify é `false` ou a função de confiança; este
// chamador só responde "este salto é confiável?" para o número de saltos dado.
function confiaEm(valor: string, hop: number): boolean {
  const traduzido = interpretarTrustProxy(valor);
  if (typeof traduzido === "boolean") return traduzido;
  return traduzido("::ffff:10.0.0.1", hop);
}

describe("Validador de configuração de produção (A9)", () => {
  it("produção bem configurada não tem nenhum problema", () => {
    expect(problemasDeProducao(base)).toEqual([]);
  });

  it("segredo abaixo de 32 caracteres é recusado", () => {
    const problemas = problemasDeProducao(configuracao({ JWT_ACCESS_SECRET: "a".repeat(31) }));
    expect(problemas).toHaveLength(1);
    expect(contem(problemas, "JWT_ACCESS_SECRET")).toBe(true);
    expect(contem(problemas, "32")).toBe(true);
  });

  it("segredo ausente é recusado", () => {
    const problemas = problemasDeProducao(configuracao({ JWT_REFRESH_SECRET: undefined }));
    expect(contem(problemas, "JWT_REFRESH_SECRET não está definido")).toBe(true);
  });

  it.each(["troque", "change", "secret", "exemplo"])("segredo de exemplo com a palavra \"%s\" é recusado", (marca) => {
    const valor = (marca + "-por-um-valor-aleatorio-4f8c2be71da9").toLowerCase();
    expect(valor.length).toBeGreaterThanOrEqual(32);
    const problemas = problemasDeProducao(configuracao({ JWT_ACCESS_SECRET: valor }));
    expect(contem(problemas, "JWT_ACCESS_SECRET")).toBe(true);
    expect(contem(problemas, marca)).toBe(true);
  });

  it("os dois segredos iguais são recusados", () => {
    const problemas = problemasDeProducao(configuracao({ JWT_REFRESH_SECRET: SEGREDO_A }));
    expect(contem(problemas, "iguais")).toBe(true);
  });

  it("CORS de localhost, de IP local ou com * são recusados", () => {
    expect(contem(problemasDeProducao(configuracao({ CORS_ORIGIN: "http://localhost:5173" })), "CORS_ORIGIN")).toBe(true);
    expect(contem(problemasDeProducao(configuracao({ CORS_ORIGIN: "http://127.0.0.1:3000" })), "CORS_ORIGIN")).toBe(true);
    expect(contem(problemasDeProducao(configuracao({ CORS_ORIGIN: "*" })), "*")).toBe(true);
    expect(contem(problemasDeProducao(configuracao({ CORS_ORIGIN: "https://a.com.br, http://localhost:3000" })), "CORS_ORIGIN")).toBe(true);
  });

  it("CORS em produção pode ser uma lista fechada de origens reais", () => {
    const problemas = problemasDeProducao(configuracao({ CORS_ORIGIN: "https://painel.nexus.com.br, https://www.nexus.com.br" }));
    expect(problemas).toEqual([]);
  });

  it("CORS vazio ou ausente é recusado", () => {
    expect(contem(problemasDeProducao(configuracao({ CORS_ORIGIN: "" })), "CORS_ORIGIN")).toBe(true);
    expect(contem(problemasDeProducao(configuracao({ CORS_ORIGIN: undefined })), "CORS_ORIGIN")).toBe(true);
  });

  it("DATABASE_URL como root sem senha é recusado", () => {
    const problemas = problemasDeProducao(configuracao({ DATABASE_URL: "mysql://root@localhost:3306/nexus" }));
    expect(contem(problemas, "root")).toBe(true);
  });

  it("DATABASE_URL com conta própria e senha passa, e ausência ou URL quebrada não", () => {
    expect(problemasDeProducao(configuracao({ DATABASE_URL: "mysql://root:SenhaForta2026@banco:3306/nexus" }))).toEqual([]);
    expect(contem(problemasDeProducao(configuracao({ DATABASE_URL: undefined })), "DATABASE_URL")).toBe(true);
    expect(contem(problemasDeProducao(configuracao({ DATABASE_URL: "nada-parece-uma-url" })), "DATABASE_URL")).toBe(true);
  });

  it("AUTH_EXPOSE_RESET_TOKEN=1 não sobe em produção", () => {
    expect(contem(problemasDeProducao(configuracao({ AUTH_EXPOSE_RESET_TOKEN: "1" })), "AUTH_EXPOSE_RESET_TOKEN")).toBe(true);
    expect(problemasDeProducao(configuracao({ AUTH_EXPOSE_RESET_TOKEN: "0" }))).toEqual([]);
  });

  it("a régua só vale para produção", () => {
    expect(exigeConfiguracaoDeProducao("production")).toBe(true);
    expect(exigeConfiguracaoDeProducao("development")).toBe(false);
    expect(exigeConfiguracaoDeProducao("test")).toBe(false);
    expect(exigeConfiguracaoDeProducao(undefined)).toBe(false);
  });

  it("TRUST_PROXY aceita 0, 1 e o número de saltos; o resto fica desligado", () => {
    // "0" e qualquer valor fora do formato desligam por inteiro.
    expect(interpretarTrustProxy("0")).toBe(false);
    expect(interpretarTrustProxy("")).toBe(false);
    expect(interpretarTrustProxy("abc")).toBe(false);
    expect(interpretarTrustProxy("-1")).toBe(false);
    expect(interpretarTrustProxy("32")).toBe(false);
    // 1..31 viram a função de confiança do Fastify: os N saltos mais próximos.
    expect(confiaEm("1", 0)).toBe(true);
    expect(confiaEm("1", 1)).toBe(false);
    expect(confiaEm("3", 0)).toBe(true);
    expect(confiaEm("3", 2)).toBe(true);
    expect(confiaEm("3", 3)).toBe(false);
    expect(confiaEm("31", 30)).toBe(true);
    expect(confiaEm("31", 31)).toBe(false);
    expect(FORMATO_DE_TRUST_PROXY.test("1")).toBe(true);
    expect(FORMATO_DE_TRUST_PROXY.test("40")).toBe(false);
    expect(FORMATO_DE_TRUST_PROXY.test("sim")).toBe(false);
  });
});

// O processo filho é a única maneira honesta de provar que `config/env.ts` chama
// o validador: ele lê `process.env` na importação, e o `NODE_ENV` do vitest é
// "test" para a suíte inteira. A sonda é escrita no diretório temporário do
// sistema — nada de arquivo de teste dentro do repositório.
describe("config/env.ts recusa a subida em produção mal configurada (A9)", () => {
  const pastaDaSonda = mkdtempSync(join(tmpdir(), "nexus-sonda-"));
  const caminhoDaSonda = join(pastaDaSonda, "env.ts");
  const moduloAlvo = pathToFileURL(resolve(process.cwd(), "src/config/env.ts")).href;
  const loaderTsx = pathToFileURL(
    resolve(process.cwd(), "..", "..", "node_modules", "tsx", "dist", "loader.mjs"),
  ).href;

  beforeAll(() => {
    writeFileSync(caminhoDaSonda, `import ${JSON.stringify(moduloAlvo)};\nconsole.log("SONDA_SUBIU");\n`, "utf8");
  });

  afterAll(() => {
    rmSync(pastaDaSonda, { recursive: true, force: true });
  });

  function rodar(variaveis: FonteDeAmbiente) {
    return spawnSync(process.execPath, ["--import", loaderTsx, caminhoDaSonda], {
      encoding: "utf8",
      env: { ...process.env, NODE_ENV: "production", ...variaveis },
      timeout: 60000,
    });
  }

  it("segredo de exemplo, CORS de localhost e root sem senha derrubam o processo", () => {
    const r = rodar({
      JWT_ACCESS_SECRET: "troque-por-um-segredo-forte-de-32-mais-bytes",
      JWT_REFRESH_SECRET: "troque-por-um-segredo-forte-de-32-mais-bytes",
      CORS_ORIGIN: "http://localhost:5173",
      DATABASE_URL: "mysql://root@localhost:3306/nexusbusinessmanager",
    });
    expect(r.stdout).not.toContain("SONDA_SUBIU");
    expect(r.stderr).toContain("Configuração de produção inválida");
    // nenhum valor de segredo aparece na mensagem de erro
    expect(r.stderr).not.toContain("troque-por-um-segredo-forte-de-32-mais-bytes");
  });

  it("produção bem configurada sobe", () => {
    const r = rodar({
      JWT_ACCESS_SECRET: SEGREDO_A,
      JWT_REFRESH_SECRET: SEGREDO_B,
      CORS_ORIGIN: "https://painel.nexus.com.br",
      DATABASE_URL: "mysql://nexus_app:SenhaDoApp2026@banco.interno:3306/nexus",
    });
    expect(r.stdout, r.stderr).toContain("SONDA_SUBIU");
  });

  it("fora de produção a régua nova não se aplica", () => {
    const r = rodar({
      NODE_ENV: "development",
      JWT_ACCESS_SECRET: "troque-por-um-segredo-forte-de-32-mais-bytes",
      JWT_REFRESH_SECRET: "troque-por-um-segredo-forte-de-32-mais-bytes",
      CORS_ORIGIN: "http://localhost:5173",
      DATABASE_URL: "mysql://root@localhost:3306/nexusbusinessmanager",
    });
    expect(r.stdout, r.stderr).toContain("SONDA_SUBIU");
  });
});
