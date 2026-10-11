import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
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

const SEGREDO = "senha-de-teste-apenas-para-o-ambiente-local";

function ambiente(com: FonteDeSemente): FonteDeSemente {
  return {
    NODE_ENV: "test",
    SEED_ADMIN_PASSWORD: SEGREDO,
    SEED_DEV_PASSWORD: SEGREDO,
    SUPER_ADMIN_EMAIL: "nexusbussiness.admin@gmail.com",
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
    // O arquivo do seed não carrega mais nenhuma senha escrita.
    const fonte = readFileSync(resolve(process.cwd(), "prisma", "seed.ts"), "utf8");
    expect(fonte).not.toMatch(/Nexus@2026/);
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

  it("o endereço do administrador global vem do ambiente e o padrão só vale fora de produção", () => {
    expect(emailDoAdministradorGlobal(ambiente({ NODE_ENV: "development" }))).toBe("nexusbussiness.admin@gmail.com");
    expect(emailDoAdministradorGlobal(ambiente({ SUPER_ADMIN_EMAIL: "Outro.Admin@exemplo.com.br" })))
      .toBe("outro.admin@exemplo.com.br");
    // produção sem a variável: nada de valor fixo herdado do código
    expect(emailDoAdministradorGlobal({ NODE_ENV: "production" })).toBe("");
    expect(emailDoAdministradorGlobal({ NODE_ENV: "development" })).toBe("nexusbussiness.admin@gmail.com");
  });
});
