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

// F4: a chave que cifra o segredo de segundo fator são 32 bytes em hexadecimal.
// Ela é montada aqui a partir dos dois segredos de acima de propósito: são
// pedaços de texto aleatório, sem nenhuma das palavras de tutorial da régua.
const CHAVE_TOTP = SEGREDO_A + SEGREDO_B.slice(0, 24);

// O conjunto que a F4 acrescentou à régua de produção: entregador de verdade com
// servidor, porta e remetente (D1), endereço público https para o link do e-mail,
// verificação de cadastro ligada (D2) e a chave de cifraçao do segundo fator (D3).
const base: FonteDeAmbiente = {
  NODE_ENV: "production",
  JWT_ACCESS_SECRET: SEGREDO_A,
  JWT_REFRESH_SECRET: SEGREDO_B,
  CORS_ORIGIN: "https://painel.nexus.com.br",
  DATABASE_URL: "mysql://nexus_app:SenhaDoApp2026@banco.interno:3306/nexus",
  SUPER_ADMIN_EMAIL: "administrador@nexus.com.br",
  MAIL_TRANSPORT: "smtp",
  SMTP_HOST: "smtp.nexus.com.br",
  SMTP_PORT: "587",
  SMTP_USER: "painel@nexus.com.br",
  SMTP_PASS: "SenhaDoSmtp2026!",
  MAIL_FROM: "painel@nexus.com.br",
  WEB_BASE_URL: "https://painel.nexus.com.br",
  REQUIRE_EMAIL_VERIFICATION: "1",
  TOTP_ENCRYPTION_KEY: CHAVE_TOTP,
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

  it("produção sem SUPER_ADMIN_EMAIL é recusada, e com o endereço definido passa", () => {
    expect(contem(problemasDeProducao(configuracao({ SUPER_ADMIN_EMAIL: undefined })), "SUPER_ADMIN_EMAIL")).toBe(true);
    expect(contem(problemasDeProducao(configuracao({ SUPER_ADMIN_EMAIL: "   " })), "SUPER_ADMIN_EMAIL")).toBe(true);
    // O endereço é uma string qualquer de quem administra a instalação: a régua
    // cobra presença, não um valor escrito no código.
    expect(problemasDeProducao(configuracao({ SUPER_ADMIN_EMAIL: "outra@nexus.com.br" }))).toEqual([]);
  });

  // ---- F4 (D1): o entregador de e-mail ----

  it("produção com entregador que não entrega é recusada", () => {
    // `memory` é a caixa do teste e `console` é o log do processo: nenhum dos dois
    // manda mensagem, então a régua não deixa produção subir com eles.
    expect(contem(problemasDeProducao(configuracao({ MAIL_TRANSPORT: "memory" })), "MAIL_TRANSPORT=memory")).toBe(true);
    expect(contem(problemasDeProducao(configuracao({ MAIL_TRANSPORT: "console" })), "valor desconhecido")).toBe(true);
    expect(problemasDeProducao(configuracao({ MAIL_TRANSPORT: undefined }))).toEqual([]);
  });

  it("produção sem servidor, porta ou remetente de saída é recusada", () => {
    expect(contem(problemasDeProducao(configuracao({ SMTP_HOST: "" })), "SMTP_HOST")).toBe(true);
    expect(contem(problemasDeProducao(configuracao({ SMTP_PORT: undefined })), "SMTP_PORT")).toBe(true);
    expect(contem(problemasDeProducao(configuracao({ SMTP_PORT: "70000" })), "entre 1 e 65535")).toBe(true);
    expect(contem(problemasDeProducao(configuracao({ MAIL_FROM: "nao-e-endereco" })), "MAIL_FROM não é um endereço")).toBe(true);
    expect(contem(problemasDeProducao(configuracao({ MAIL_FROM: "" })), "MAIL_FROM não está definido")).toBe(true);
  });

  it("a senha do SMTP nunca aparece na lista de problemas", () => {
    const problemas = problemasDeProducao(configuracao({ SMTP_HOST: "", MAIL_FROM: "" }));
    for (const linha of problemas) expect(linha).not.toContain("SenhaDoSmtp2026!");
  });

  // ---- F4: o endereço público que vai dentro do e-mail ----

  it("WEB_BASE_URL de máquina local ou sem https é recusada", () => {
    expect(contem(problemasDeProducao(configuracao({ WEB_BASE_URL: "http://painel.nexus.com.br" })), "https://")).toBe(true);
    expect(contem(problemasDeProducao(configuracao({ WEB_BASE_URL: "http://localhost:5173" })), "https://")).toBe(true);
    expect(
      contem(problemasDeProducao(configuracao({ WEB_BASE_URL: "https://localhost:5173" })), "endereço de máquina local"),
    ).toBe(true);
    expect(contem(problemasDeProducao(configuracao({ WEB_BASE_URL: undefined })), "WEB_BASE_URL")).toBe(true);
  });

  // ---- F4 (D2): cadastro com e-mail confirmado ----

  it("produção com a verificação de cadastro desligada é recusada", () => {
    expect(contem(problemasDeProducao(configuracao({ REQUIRE_EMAIL_VERIFICATION: "0" })), "REQUIRE_EMAIL_VERIFICATION")).toBe(true);
    expect(contem(problemasDeProducao(configuracao({ REQUIRE_EMAIL_VERIFICATION: undefined })), "REQUIRE_EMAIL_VERIFICATION")).toBe(true);
    expect(problemasDeProducao(configuracao({ REQUIRE_EMAIL_VERIFICATION: "1" }))).toEqual([]);
  });

  // ---- F4 (D3): a chave que cifra o segredo do segundo fator ----

  it("TOTP_ENCRYPTION_KEY ausente, fora de formato ou de exemplo é recusada", () => {
    expect(contem(problemasDeProducao(configuracao({ TOTP_ENCRYPTION_KEY: undefined })), "TOTP_ENCRYPTION_KEY não está definida")).toBe(true);
    expect(contem(problemasDeProducao(configuracao({ TOTP_ENCRYPTION_KEY: "abc" })), "64 caracteres hexadecimal")).toBe(true);
    expect(
      contem(problemasDeProducao(configuracao({ TOTP_ENCRYPTION_KEY: "g".repeat(64) })), "64 caracteres hexadecimal"),
    ).toBe(true);
    expect(
      contem(
        problemasDeProducao(configuracao({ TOTP_ENCRYPTION_KEY: "troque" + "0".repeat(58) })),
        "é valor de exemplo",
      ),
    ).toBe(true);
    // Formato válido, valor de exemplo: 64 zeros passam no regex de hexadecimal
    // bonitinho, e é exatamente aí que a régua de variedade entra — chave
    // previsível não cifra segredo nenhum.
    expect(contem(problemasDeProducao(configuracao({ TOTP_ENCRYPTION_KEY: "0".repeat(64) })), "parece valor de exemplo")).toBe(true);
    expect(contem(problemasDeProducao(configuracao({ TOTP_ENCRYPTION_KEY: "a1b2".repeat(16) })), "parece valor de exemplo")).toBe(true);
    // Uma chave de verdade (variedade alta) passa, escrita em minúscula ou maiúscula.
    expect(problemasDeProducao(configuracao({ TOTP_ENCRYPTION_KEY: CHAVE_TOTP }))).toEqual([]);
    expect(problemasDeProducao(configuracao({ TOTP_ENCRYPTION_KEY: CHAVE_TOTP.toUpperCase() }))).toEqual([]);
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
    // As chaves da F4 são declaradas uma a uma aqui: o processo filho herda o
    // ambiente do vitest, e a suíte roda com MAIL_TRANSPORT=memory. Sem a
    // declaração explícita, a prova passaria a depender do `.env` da máquina.
    const r = rodar({
      JWT_ACCESS_SECRET: SEGREDO_A,
      JWT_REFRESH_SECRET: SEGREDO_B,
      CORS_ORIGIN: "https://painel.nexus.com.br",
      DATABASE_URL: "mysql://nexus_app:SenhaDoApp2026@banco.interno:3306/nexus",
      SUPER_ADMIN_EMAIL: "administrador@nexus.com.br",
      MAIL_TRANSPORT: "smtp",
      SMTP_HOST: "smtp.nexus.com.br",
      SMTP_PORT: "587",
      SMTP_USER: "painel@nexus.com.br",
      SMTP_PASS: "SenhaDoSmtp2026!",
      MAIL_FROM: "painel@nexus.com.br",
      WEB_BASE_URL: "https://painel.nexus.com.br",
      REQUIRE_EMAIL_VERIFICATION: "1",
      TOTP_ENCRYPTION_KEY: CHAVE_TOTP,
    });
    expect(r.stdout, r.stderr).toContain("SONDA_SUBIU");
  });

  it("produção sem a chave do segundo fator e sem SMTP não sobe", () => {
    // Vazio de propósito nos dois lados novos da régua: herdá-los do `.env` da
    // máquina faria desta prova uma rotina de desenvolvimento disfarçada.
    const r = rodar({
      JWT_ACCESS_SECRET: SEGREDO_A,
      JWT_REFRESH_SECRET: SEGREDO_B,
      CORS_ORIGIN: "https://painel.nexus.com.br",
      DATABASE_URL: "mysql://nexus_app:SenhaDoApp2026@banco.interno:3306/nexus",
      SUPER_ADMIN_EMAIL: "administrador@nexus.com.br",
      MAIL_TRANSPORT: "memory",
      SMTP_HOST: "",
      SMTP_PORT: "",
      MAIL_FROM: "",
      WEB_BASE_URL: "http://localhost:5173",
      REQUIRE_EMAIL_VERIFICATION: "0",
      TOTP_ENCRYPTION_KEY: "",
    });
    expect(r.stdout).not.toContain("SONDA_SUBIU");
    expect(r.stderr).toContain("TOTP_ENCRYPTION_KEY");
    expect(r.stderr).toContain("SMTP_HOST");
    expect(r.stderr).toContain("REQUIRE_EMAIL_VERIFICATION");
    // Nenhuma senha do ambiente aparece na mensagem de recusação.
    expect(r.stderr).not.toContain("SenhaDoSmtp2026!");
  });

  it("produção sem o endereço do administrador global não sobe", () => {
    // A string vazia é escrita de propósito: sem ela, o dotenv do apps/api/.env
    // emprestaria o endereço da máquina ao processo filho e a prova passaria
    // sem estar provando nada.
    const r = rodar({
      JWT_ACCESS_SECRET: SEGREDO_A,
      JWT_REFRESH_SECRET: SEGREDO_B,
      CORS_ORIGIN: "https://painel.nexus.com.br",
      DATABASE_URL: "mysql://nexus_app:SenhaDoApp2026@banco.interno:3306/nexus",
      SUPER_ADMIN_EMAIL: "",
    });
    expect(r.stdout).not.toContain("SONDA_SUBIU");
    expect(r.stderr).toContain("SUPER_ADMIN_EMAIL");
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
