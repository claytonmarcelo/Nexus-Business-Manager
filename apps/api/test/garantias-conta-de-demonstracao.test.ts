import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "../src/lib/prisma";
import { problemasDeProducao } from "../src/config/producao";
import { JOBS } from "../src/modules/cron/cron.handlers";
import {
  CONTA_DE_DESENVOLVIMENTO,
  EMPRESA_DE_DEMONSTRACAO,
  criaContaDev,
  empresaDeDemonstracao,
  errosDoSeed,
  semear,
  type FonteDeSemente,
} from "../prisma/seed";

// F1.3 do PROMPT MESTRE: as garantias da conta de demonstração. A decisão do dono
// (§0.1) é não rotacionar nada das contas fictícias — o que esta fase fecha é a
// porta que deixa essas contas e essa empresa aparecerem num banco de cliente.
//
// O seed recebe o cliente Prisma por parâmetro. Aqui entra um cliente que só
// anota o que foi pedido, então dá para provar a ESCOLHA de escrita do seed em
// produção (nada da demonstração) sem encostar no banco local do desenvolvedor.
// A recusa em si continua provada no banco real, no último caso.

// Senha sorteada a cada corrida: se o seed a imprimir ou gravar onde não deve,
// o que procura é este valor, não um exemplo escrito no teste.
const SEGREDO = `senha-de-teste-${randomBytes(9).toString("hex")}`;
const EMAIL_DA_PLATAFORMA = `plataforma-${randomBytes(4).toString("hex")}@exemplo.test`;

function ambiente(com: FonteDeSemente): FonteDeSemente {
  return {
    NODE_ENV: "production",
    ALLOW_DEV_SEED: "1",
    SEED_ADMIN_PASSWORD: SEGREDO,
    SEED_DEV_PASSWORD: SEGREDO,
    SUPER_ADMIN_EMAIL: EMAIL_DA_PLATAFORMA,
    ...com,
  };
}

interface Escrita {
  readonly modelo: string;
  readonly onde: Record<string, unknown>;
  readonly criar: Record<string, unknown>;
}

// Cliente falso que registra cada upsert e devolve uma linha vazia para as
// leituras. Nada dele toca o banco.
function clienteQueAnota(registros: Escrita[]): PrismaClient {
  const modelo = (nome: string) => ({
    upsert: async (operacao: { where: Record<string, unknown>; create: Record<string, unknown> }) => {
      registros.push({ modelo: nome, onde: operacao.where, criar: operacao.create });
      return { id: `${nome}-falso` };
    },
    findMany: async () => [],
  });
  return {
    user: modelo("user"),
    company: modelo("company"),
    companyUser: modelo("companyUser"),
    cronJob: modelo("cronJob"),
  } as unknown as PrismaClient;
}

function emailsGravados(registros: Escrita[]): string[] {
  return registros.filter((r) => r.modelo === "user").map((r) => String(r.criar.email));
}

function slugsDeEmpresa(registros: Escrita[]): string[] {
  return registros.filter((r) => r.modelo === "company").map((r) => String(r.criar.slug));
}

describe("Garantias da conta de demonstração (F1.3)", () => {
  it("fora de produção a casa de demonstração é criada; em produção, só com escrita própria", () => {
    expect(empresaDeDemonstracao({ NODE_ENV: "development" })).toBe(true);
    expect(empresaDeDemonstracao({ NODE_ENV: "test" })).toBe(true);
    // ALLOW_DEV_SEED libera o seed em produção; não é a mesma coisa que querer
    // dado de demonstração no banco de um cliente.
    expect(empresaDeDemonstracao(ambiente({}))).toBe(false);
    expect(empresaDeDemonstracao(ambiente({ SEED_DEMO_COMPANY: "1" }))).toBe(true);
    expect(empresaDeDemonstracao(ambiente({ SEED_DEMO_COMPANY: "0" }))).toBe(false);
  });

  it("a conta de desenvolvimento só existe junto da casa de demonstração", () => {
    // Em produção pedir a conta dev sem a casa é um ambiente incoerente: a conta
    // dev é dona da empresa de demonstração, sem ela não tem o que administrar.
    expect(criaContaDev(ambiente({ SEED_DEV_ACCOUNT: "1" }))).toBe(true);
    expect(empresaDeDemonstracao(ambiente({ SEED_DEV_ACCOUNT: "1" }))).toBe(false);
    const problemas = errosDoSeed(ambiente({ SEED_DEV_ACCOUNT: "1" }));
    expect(problemas.some((p) => p.includes("SEED_DEV_ACCOUNT") && p.includes("SEED_DEMO_COMPANY"))).toBe(true);
    // Declaradas as duas, a recusa some e o seed pode rodar nesse ambiente de teste.
    expect(
      errosDoSeed(ambiente({ SEED_DEV_ACCOUNT: "1", SEED_DEMO_COMPANY: "1" })),
    ).toEqual([]);
  });

  it("em produção o seed não pede a empresa de demonstração nem a conta de desenvolvimento", async () => {
    const registros: Escrita[] = [];
    const resumo = await semear(ambiente({}), clienteQueAnota(registros));

    expect(emailsGravados(registros)).toEqual([EMAIL_DA_PLATAFORMA]);
    expect(slugsDeEmpresa(registros)).toEqual([]);
    expect(registros.filter((r) => r.modelo === "companyUser")).toEqual([]);
    expect(registros.filter((r) => r.modelo === "cronJob")).toHaveLength(JOBS.length);
    expect(resumo.contaDev).toContain("não criada");
    expect(resumo.empresaDemo).toContain("não criada");
    expect(resumo.adminDefinitivo).toBe(EMAIL_DA_PLATAFORMA);
  });

  it("liberadas as duas escritas, produção recebe a conta dev e a casa de demonstração", async () => {
    const registros: Escrita[] = [];
    const resumo = await semear(
      ambiente({ SEED_DEV_ACCOUNT: "1", SEED_DEMO_COMPANY: "1" }),
      clienteQueAnota(registros),
    );
    expect(emailsGravados(registros).sort()).toEqual([CONTA_DE_DESENVOLVIMENTO, EMAIL_DA_PLATAFORMA].sort());
    expect(slugsDeEmpresa(registros)).toEqual([EMPRESA_DE_DEMONSTRACAO]);
    expect(resumo.empresaDemo).toBe(EMPRESA_DE_DEMONSTRACAO);
    expect(resumo.contaDev).toContain("via SEED_DEV_PASSWORD");
  });

  it("fora de produção o seed continua pedindo os dois (nada da vitrine de teste mudou)", async () => {
    const registros: Escrita[] = [];
    await semear(ambiente({ NODE_ENV: "development", ALLOW_DEV_SEED: undefined }), clienteQueAnota(registros));
    expect(emailsGravados(registros).sort()).toEqual([CONTA_DE_DESENVOLVIMENTO, EMAIL_DA_PLATAFORMA].sort());
    expect(slugsDeEmpresa(registros)).toEqual([EMPRESA_DE_DEMONSTRACAO]);
  });

  it("nenhuma senha aparece no log nem no resumo do seed", async () => {
    const impresso = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      const resumo = await semear(ambiente({}), clienteQueAnota([]));
      expect(JSON.stringify(resumo)).not.toContain(SEGREDO);
      for (const chamada of impresso.mock.calls) {
        expect(chamada.join(" ")).not.toContain(SEGREDO);
      }
    } finally {
      impresso.mockRestore();
    }
  });

  it("seed e validador de produção cobram o mesmo endereço do administrador", () => {
    // As duas travas têm de falar da mesma variável: se uma mudar de nome e a
    // outra não, o servidor sobe com um administrador que o seed nunca criou.
    const semVariaveis: FonteDeSemente = { NODE_ENV: "production" };
    expect(errosDoSeed(semVariaveis).some((p) => p.includes("SUPER_ADMIN_EMAIL"))).toBe(true);
    expect(problemasDeProducao({ ...semVariaveis, AUTH_EXPOSE_RESET_TOKEN: "0" })
      .some((p) => p.includes("SUPER_ADMIN_EMAIL"))).toBe(true);
  });

  it("o .env.example documenta a trava nova sem carregar valor de credencial", () => {
    const exemplo = readFileSync(resolve(process.cwd(), ".env.example"), "utf8");
    expect(exemplo).toContain("SEED_DEMO_COMPANY=0");
    expect(exemplo).not.toMatch(/SEED_(ADMIN|DEV)_PASSWORD\s*=\s*["'][^"']{4,}["']/);
    expect(exemplo).not.toMatch(/SEED_DEMO_COMPANY\s*=\s*["'][^"']{4,}["']/);
  });

  it("em produção sem ALLOW_DEV_SEED o banco real não ganha usuário nem empresa", async () => {
    const usuariosAntes = await prisma.user.count();
    const empresasAntes = await prisma.company.count();
    await expect(semear({ NODE_ENV: "production", SEED_ADMIN_PASSWORD: SEGREDO, SUPER_ADMIN_EMAIL: EMAIL_DA_PLATAFORMA }))
      .rejects
      .toThrow(/ALLOW_DEV_SEED/);
    expect(await prisma.user.count()).toBe(usuariosAntes);
    expect(await prisma.company.count()).toBe(empresasAntes);
  });
});
