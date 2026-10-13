import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/prisma";
import { cleanup, makeAccount } from "./helpers";

// T1 (decisao D6 do dono): a suíte nunca escreve no banco de desenvolvimento.
//
// A regra que este arquivo vigia e de endereçamento, não de conteúdo: o que roda
// aqui tem de cair no banco separado, declarado em DATABASE_URL_TESTE no .env da
// máquina, e o banco que o .env chama de DATABASE_URL — o do servidor de
// desenvolvimento — tem de continuar com as mesmas linhas de antes. A medição é
// feita dos dois lados, com um cliente aberto no endereço do arquivo, e a
// diferença aparece no número de linhas, não numa suposição.
//
// Vermelho primeiro, escrito antes de qualquer mudança em vitest.config.ts: com a
// variável ausente e a suíte apontando para o banco de desenvolvimento, os quatro
// casos abaixo caem. Eles só param de cair quando o endereço do teste passa a
// ser injetado no processo de teste.

const ARQUIVO_ENV = path.resolve(__dirname, "..", ".env");
const BANCO_DE_TESTE = "nexusbusinessmanager_teste";

function linhaDoEnv(chave: string): string {
  if (!fs.existsSync(ARQUIVO_ENV)) return "";
  const texto = fs.readFileSync(ARQUIVO_ENV, "utf8").replace(/\r\n/g, "\n");
  for (const linha of texto.split("\n")) {
    const m = linha.match(new RegExp("^\\s*" + chave + "\\s*=\\s*(.+?)\\s*$"));
    if (m) return (m[1] ?? "").replace(/^["']|["']$/g, "").trim();
  }
  return "";
}

function nomeDoBanco(url: string): string {
  if (!url) return "";
  try {
    return new URL(url).pathname.replace(/^\//, "");
  } catch {
    return "";
  }
}

const URL_DESENVOLVIMENTO = linhaDoEnv("DATABASE_URL");
const URL_TESTE = linhaDoEnv("DATABASE_URL_TESTE");
const BANCO_EM_USO = nomeDoBanco(process.env.DATABASE_URL ?? "");
const BANCO_DESENVOLVIMENTO = nomeDoBanco(URL_DESENVOLVIMENTO);
const BANCO_PEDIDO = nomeDoBanco(URL_TESTE);

const criado: { userIds: string[]; companyIds: string[] } = { userIds: [], companyIds: [] };

afterAll(async () => {
  await cleanup(criado);
});

// Contagem de linhas nos dois bancos. Tabela por tabela, lida no mesmo instante,
// sem filtro de empresa: qualquer escrita da suíte no lado errado muda um número.
type Contagem = {
  users: number;
  companies: number;
  company_users: number;
  refresh_tokens: number;
  audit_logs: number;
  clients: number;
};

async function contar(cliente: PrismaClient): Promise<Contagem> {
  const tabelas: Array<keyof Contagem> = ["users", "companies", "company_users", "refresh_tokens", "audit_logs", "clients"];
  const saida = {} as Contagem;
  for (const tabela of tabelas) {
    const linhas = await cliente.$queryRawUnsafe<Array<{ c: bigint }>>(
      `SELECT COUNT(*) AS c FROM \`${tabela}\``
    );
    saida[tabela] = Number(linhas[0] ? linhas[0].c : 0n);
  }
  return saida;
}

describe("banco de teste separado (T1 / D6)", () => {
  it("o .env da máquina declara o banco de teste com o nome combinado", () => {
    expect(URL_TESTE, "DATABASE_URL_TESTE ausente no apps/api/.env").not.toBe("");
    expect(BANCO_PEDIDO).toBe(BANCO_DE_TESTE);
  });

  it("o processo de teste está conectado ao banco de teste", () => {
    expect(BANCO_EM_USO, `a suíte está rodando no banco "${BANCO_EM_USO}"`).toBe(BANCO_DE_TESTE);
    if (BANCO_DESENVOLVIMENTO) expect(BANCO_EM_USO).not.toBe(BANCO_DESENVOLVIMENTO);
  });

  it("escrever pela suíte não muda nenhuma contagem do banco de desenvolvimento", async () => {
    const desenvolvimento = new PrismaClient({
      datasources: { db: { url: URL_DESENVOLVIMENTO || "mysql://127.0.0.1:1/banco_inexistente" } },
    });
    try {
      const antes = await contar(desenvolvimento);
      const conta = await makeAccount("OWNER");
      criado.userIds.push(conta.userId);
      criado.companyIds.push(conta.companyId);
      const depois = await contar(desenvolvimento);
      expect(depois, "o banco de desenvolvimento recebeu escrita da suíte").toEqual(antes);

      // A empresa criada tem de estar visível no banco de teste — se a escrita
      // caiu em outro lugar, este cliente não a encontra.
      const encontrada = await prisma.company.findUnique({ where: { id: conta.companyId } });
      expect(encontrada?.id).toBe(conta.companyId);

      // E não pode estar no banco de desenvolvimento.
      const la = await desenvolvimento.company.findUnique({ where: { id: conta.companyId } });
      expect(la).toBeNull();
    } finally {
      await desenvolvimento.$disconnect();
    }
  });

  it("a limpeza da prova devolve as contagens do banco de teste", async () => {
    const antes = await contar(prisma);
    const conta = await makeAccount("STAFF");
    const durante = await contar(prisma);
    expect(durante.users).toBe(antes.users + 1);
    expect(durante.companies).toBe(antes.companies + 1);
    await cleanup({ userIds: [conta.userId], companyIds: [conta.companyId] });
    const depois = await contar(prisma);
    expect(depois).toEqual(antes);
  });
});
