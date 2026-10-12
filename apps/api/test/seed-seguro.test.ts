import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { prisma } from "../src/lib/prisma";
import {
  criaContaDev,
  emailDoAdministradorGlobal,
  errosDoSeed,
  semear,
  type FonteDeSemente,
} from "../prisma/seed";

// A8 do prompt de mercado: o seed parou de decidir sozinho. Ele passou a ser uma
// função exportável (`semear`) que lê um mapa de variáveis, recusa produção sem
// `ALLOW_DEV_SEED` antes da primeira consulta, pega a senha da conta de
// desenvolvimento do ambiente (não do código) e não imprime senha nenhuma no
// resumo final.

// R2: a senha da conta de desenvolvimento é sorteada a cada corrida. O que isso
// prova é que o seed não tem senha própria — qualquer valor que ele escrevesse
// por conta nunca seria este.
const SEGREDO = `senha-de-teste-${randomBytes(9).toString("hex")}`;
const EMAIL_ADMINISTRADOR = "administrador@exemplo.test";

function ambiente(com: FonteDeSemente): FonteDeSemente {
  return {
    NODE_ENV: "test",
    SEED_ADMIN_PASSWORD: SEGREDO,
    SEED_DEV_PASSWORD: SEGREDO,
    SUPER_ADMIN_EMAIL: EMAIL_ADMINISTRADOR,
    ...com,
  };
}

describe("Seed seguro (A8)", () => {
  it("em produção sem ALLOW_DEV_SEED o seed lança e não escreve usuário nenhum", async () => {
    const antes = await prisma.user.count();
    await expect(semear(ambiente({ NODE_ENV: "production", SUPER_ADMIN_EMAIL: undefined })))
      .rejects
      .toThrow(/ALLOW_DEV_SEED/);
    expect(await prisma.user.count()).toBe(antes);
  });

  it("o motivo da recusa é dito inteiro, sem esconder nenhuma regra", () => {
    const problemas = errosDoSeed({ NODE_ENV: "production" });
    expect(problemas.some((p) => p.includes("ALLOW_DEV_SEED"))).toBe(true);
    expect(problemas.some((p) => p.includes("SEED_ADMIN_PASSWORD"))).toBe(true);
    expect(problemas.some((p) => p.includes("SUPER_ADMIN_EMAIL"))).toBe(true);
    // nada de senha na mensagem de erro
    expect(problemas.join(" ")).not.toContain(SEGREDO);
  });

  it("sem SEED_ADMIN_PASSWORD o seed não roda em nenhum ambiente", async () => {
    await expect(semear(ambiente({ SEED_ADMIN_PASSWORD: undefined }))).rejects.toThrow(/SEED_ADMIN_PASSWORD/);
  });

  it("a senha da conta de desenvolvimento vem do ambiente, nunca do código", () => {
    const fonte = readFileSync(resolve(process.cwd(), "prisma", "seed.ts"), "utf8");
    // As duas senhas só chegam lidas do mapa de ambiente — nunca de valor escrito.
    expect(fonte).toMatch(/ambiente\.SEED_(ADMIN|DEV)_PASSWORD/);
    // Uma leitura do ambiente jamais pode trazer valor de volta: `?? "literal"` está proibido.
    expect(fonte).not.toMatch(/SEED_(ADMIN|DEV)_PASSWORD[^\n]{0,12}(\?\?|\|\|)[^\n]{0,3}[\x22\x27\x60][^\x22\x27\x60\s]{4,}[\x22\x27\x60]/);
    // E nenhuma chave do mapa recebe senha escrita: `SEED_ADMIN_PASSWORD: "..."`.
    expect(fonte).not.toMatch(/SEED_(ADMIN|DEV)_PASSWORD[\x22\x27\x60]?\s*:\s*[\x22\x27\x60][^\x22\x27\x60\s]{4,}[\x22\x27\x60]/);
    // A senha sorteada desta corrida não existe no código-fonte do seed.
    expect(fonte).not.toContain(SEGREDO);
    expect(errosDoSeed(ambiente({ SEED_DEV_PASSWORD: undefined })).join(" ")).toContain("SEED_DEV_PASSWORD");
  });

  it("a conta de desenvolvimento não nasce em produção, nem com ALLOW_DEV_SEED", () => {
    // ALLOW_DEV_SEED libera o seed em produção; a conta dev tem trava própria
    // (SEED_DEV_ACCOUNT=1), porque "posso semear" não significa "quero a conta
    // admin@nexus.local num ambiente de produção".
    expect(criaContaDev(ambiente({ NODE_ENV: "production" }))).toBe(false);
    expect(criaContaDev(ambiente({ NODE_ENV: "production", ALLOW_DEV_SEED: "1" }))).toBe(false);
    expect(criaContaDev(ambiente({ NODE_ENV: "production", SEED_DEV_ACCOUNT: "1" }))).toBe(true);
    expect(criaContaDev(ambiente({ NODE_ENV: "development" }))).toBe(true);
    expect(criaContaDev(ambiente({ NODE_ENV: "test" }))).toBe(true);
  });

  it("o endereço do administrador global vem do ambiente e o padrão é a conta fictícia", () => {
    expect(emailDoAdministradorGlobal(ambiente({ NODE_ENV: "development" }))).toBe(EMAIL_ADMINISTRADOR);
    expect(emailDoAdministradorGlobal(ambiente({ SUPER_ADMIN_EMAIL: "Outro.Admin@exemplo.com.br" })))
      .toBe("outro.admin@exemplo.com.br");
    // produção sem a variável: nada de valor herdado do código
    expect(emailDoAdministradorGlobal({ NODE_ENV: "production" })).toBe("");
    // fora de produção, sem a variável, responde a conta fictícia — e ela não
    // casa com usuário nenhum do banco.
    expect(emailDoAdministradorGlobal({ NODE_ENV: "development" })).toBe("admin@exemplo.test");
  });
});
