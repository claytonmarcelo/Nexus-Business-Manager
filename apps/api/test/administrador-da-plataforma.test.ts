import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import type { PrismaClient } from "@prisma/client";

// F1.4 do PROMPT MESTRE: em producao o administrador da plataforma nao vem do
// seed (a F1.3 garantiu isso), vem de um bootstrap explicito que le o ambiente do
// operador. Este arquivo prova as quatro promessas do bootstrap:
//   1. recusar antes da primeira consulta quando falta qualquer pieza do ambiente;
//   2. nunca escrever senha no console nem no resumo;
//   3. nao tomar uma conta que ja existe sem consentimento escrito;
//   4. nao levar dado de demonstracao junto (sem admin@nexus.local, sem nexus-demo).
//
// A escrita e provada pelo mesmo caminho do teste da F1.3: um cliente falso que
// anota cada operacao. Assim o plano de escrita fica visivel sem tocar no banco do
// desenvolvedor. A recusa em producao continua medida no banco real.
import {
  decisaoDoBootstrap,
  emailDoBootstrap,
  errosDoBootstrap,
  instalarAdministradorDaPlataforma,
  type ContaEncontrada,
  type FonteDoOperador,
} from "../prisma/administrador-da-plataforma";
import { prisma } from "../src/lib/prisma";

const RAIZ = resolve(process.cwd(), "..", "..");
const EMAIL_DA_PLATAFORMA = "administrador@exemplo.test";
const CONTA_DE_DESENVOLVIMENTO = "admin@nexus.local";
const EMPRESA_DE_DEMONSTRACAO = "nexus-demo";

// Senha forte de verdade, gerada a cada execucao: se ela aparecer em algum log o
// teste que procura o valor falha, e o valor nunca poderia estar no repositorio.
function senhaForte(): string {
  return "A" + randomBytes(9).toString("hex") + "!";
}

function ambienteBase(mais?: FonteDoOperador): FonteDoOperador {
  return {
    NODE_ENV: "production",
    SUPER_ADMIN_EMAIL: EMAIL_DA_PLATAFORMA,
    ADMIN_CRIAR_SENHA: senhaForte(),
    ...mais,
  };
}

interface Escrita {
  readonly modelo: string;
  readonly acao: string;
  readonly dados: Record<string, unknown>;
}

// Cliente que anota e devolve o que o bootstrap espera ver. A conta "existente" e
// o numero de empresas sao entrados pelos testes, nunca lidos do banco.
function clienteQueAnota(
  registros: Escrita[],
  opts?: { conta?: ContaEncontrada | null; empresas?: Array<{ id: string }> },
): PrismaClient {
  const empresas = opts?.empresas ?? [];
  return {
    user: {
      findUnique: async (operacao: { where: { email: string } }) => {
        registros.push({ modelo: "user", acao: "findUnique", dados: operacao.where });
        return opts?.conta ?? null;
      },
      create: async (operacao: { data: Record<string, unknown> }) => {
        registros.push({ modelo: "user", acao: "create", dados: operacao.data });
        return { id: "usuario-novo" };
      },
      update: async (operacao: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        registros.push({ modelo: "user", acao: "update", dados: { ...operacao.where, ...operacao.data } });
        return { id: "usuario-existente" };
      },
    },
    company: {
      findMany: async () => {
        registros.push({ modelo: "company", acao: "findMany", dados: {} });
        return empresas;
      },
      upsert: async (operacao: { where: Record<string, unknown>; create: Record<string, unknown> }) => {
        registros.push({ modelo: "company", acao: "upsert", dados: { ...operacao.where, ...operacao.create } });
        return { id: "empresa-falsa" };
      },
    },
    companyUser: {
      upsert: async (operacao: { where: Record<string, unknown>; create: Record<string, unknown> }) => {
        registros.push({ modelo: "companyUser", acao: "upsert", dados: { ...operacao.where, ...operacao.create } });
        return { id: "vinculo-falso" };
      },
    },
  } as unknown as PrismaClient;
}

function textos(jsons: Escrita[]): string {
  return JSON.stringify(jsons);
}

describe("Bootstrap do administrador da plataforma (F1.4)", () => {
  it("recusa o que falta no ambiente do operador, pelo nome da chave", () => {
    expect(errosDoBootstrap(ambienteBase({ ADMIN_CRIAR_SENHA: undefined }))).toEqual([
      expect.stringContaining("ADMIN_CRIAR_SENHA"),
    ]);
    expect(errosDoBootstrap(ambienteBase({ SUPER_ADMIN_EMAIL: undefined }))).toEqual([
      expect.stringContaining("SUPER_ADMIN_EMAIL"),
    ]);
    expect(errosDoBootstrap(ambienteBase({ SUPER_ADMIN_EMAIL: "   " }))).toEqual([
      expect.stringContaining("SUPER_ADMIN_EMAIL"),
    ]);
    // Fora de producao o padrao e a conta ficticia, entao so falta endereco em producao.
    expect(emailDoBootstrap({ NODE_ENV: "development" })).toBe("admin@exemplo.test");
    expect(emailDoBootstrap({ NODE_ENV: "production" })).toBe("");
  });

  it("aplica a regra definitiva de acesso na senha e nao imprime o valor recusado", () => {
    // As quatro recusas medem as quatro exigencias da regra: comprimento, maiuscula,
    // especial e comprimento maximo. O underscore e especial pela regua do projeto
    // (`isStrongPassword` aceita qualquer nao alfanumerico), entao o caso abaixo nao
    // pode ter underscore no lugar do especial.
    const recusas = ["curta1!", "todasminusculas1!", "SEMPONTOSEMVIRGULA2026", "x".repeat(129)];
    for (const senha of recusas) {
      expect(errosDoBootstrap(ambienteBase({ ADMIN_CRIAR_SENHA: senha })), senha).toEqual([
        expect.stringContaining("senha"),
      ]);
    }
    expect(errosDoBootstrap(ambienteBase())).toEqual([]);
    // O placeholder do .env.example e fraco de proposito: copiar a linha nunca instala conta.
    const exemplo = readFileSync(resolve(RAIZ, "apps/api/.env.example"), "utf8");
    const placeholder = exemplo.match(/^ADMIN_CRIAR_SENHA=(.*)$/m)?.[1] ?? "";
    expect(placeholder.length).toBeGreaterThan(0);
    expect(errosDoBootstrap(ambienteBase({ ADMIN_CRIAR_SENHA: placeholder }))).not.toEqual([]);
  });

  it("nenhuma recusa de ambiente chega a tocar o banco", async () => {
    const registros: Escrita[] = [];
    await expect(
      instalarAdministradorDaPlataforma(
        ambienteBase({ ADMIN_CRIAR_SENHA: undefined }),
        clienteQueAnota(registros),
      ),
    ).rejects.toThrow(/ADMIN_CRIAR_SENHA/);
    expect(registros).toEqual([]);
  });

  it("conta nova: cria com papel da plataforma e guarda o hash, nunca a senha", async () => {
    const registros: Escrita[] = [];
    const senha = senhaForte();
    const resumo = await instalarAdministradorDaPlataforma(
      ambienteBase({ ADMIN_CRIAR_SENHA: senha }),
      clienteQueAnota(registros, { conta: null }),
    );
    const criacoes = registros.filter((r) => r.modelo === "user" && r.acao === "create");
    expect(criacoes).toHaveLength(1);
    expect(criacoes[0]?.dados).toMatchObject({
      email: EMAIL_DA_PLATAFORMA,
      platformRole: "SUPER_ADMIN",
    });
    const hash = String(criacoes[0]?.dados.passwordHash ?? "");
    expect(hash.startsWith("$2")).toBe(true);
    expect(hash).not.toContain(senha);
    expect(resumo.senha).toBe("definida agora");
    expect(resumo.email).toBe(EMAIL_DA_PLATAFORMA);
    expect(resumo.acao).toBe("criar");
  });

  it("o bootstrap nao leva demonstracao nenhuma no plano de escrita", async () => {
    const registros: Escrita[] = [];
    await instalarAdministradorDaPlataforma(ambienteBase(), clienteQueAnota(registros, { conta: null }));
    const plano = textos(registros);
    expect(plano).not.toContain(CONTA_DE_DESENVOLVIMENTO);
    expect(plano).not.toContain(EMPRESA_DE_DEMONSTRACAO);
    expect(registros.filter((r) => r.modelo === "company" && r.acao === "upsert")).toEqual([]);
  });

  it("administrador existente: confirma o papel e preserva a senha sem consentimento", () => {
    const decisao = decisaoDoBootstrap({ platformRole: "SUPER_ADMIN", active: true }, ambienteBase());
    expect(decisao.acao).toBe("confirmar-papel");
    expect(decisao.escreveSenha).toBe(false);
    expect(decisao.motivo).toContain("preservada");
  });

  it("administrador existente so tem a senha reescrita com a escrita explicita", () => {
    const semConsentimento = decisaoDoBootstrap({ platformRole: "SUPER_ADMIN", active: true }, ambienteBase());
    expect(semConsentimento.acao).not.toBe("renovar-senha");
    const com = decisaoDoBootstrap(
      { platformRole: "SUPER_ADMIN", active: true },
      ambienteBase({ ADMIN_CRIAR_RENOVAR_SENHA: "1" }),
    );
    expect(com.acao).toBe("renovar-senha");
    expect(com.escreveSenha).toBe(true);
  });

  it("conta de cliente nunca vira administrador da plataforma por acidente", () => {
    const recusa = decisaoDoBootstrap({ platformRole: null, active: true }, ambienteBase());
    expect(recusa.acao).toBe("recusar");
    expect(recusa.motivo).toContain("ADMIN_CRIAR_PROMOVER");
    const com = decisaoDoBootstrap(
      { platformRole: null, active: true },
      ambienteBase({ ADMIN_CRIAR_PROMOVER: "1" }),
    );
    expect(com.acao).toBe("promover");
    // Promover exige senha nova: nao se entrega a plataforma inteira a uma credencial
    // que quem roda o script nao acabou de definir.
    expect(com.escreveSenha).toBe(true);
  });

  it("promover conta desativada pede os dois consentimentos, um por efeito", () => {
    const soPromover = decisaoDoBootstrap(
      { platformRole: null, active: false },
      ambienteBase({ ADMIN_CRIAR_PROMOVER: "1" }),
    );
    expect(soPromover.acao).toBe("recusar");
    expect(soPromover.motivo).toContain("ADMIN_CRIAR_REATIVAR");
    const dois = decisaoDoBootstrap(
      { platformRole: null, active: false },
      ambienteBase({ ADMIN_CRIAR_PROMOVER: "1", ADMIN_CRIAR_REATIVAR: "1" }),
    );
    expect(dois.acao).toBe("promover");
    expect(dois.reativa).toBe(true);
    expect(dois.escreveSenha).toBe(true);
  });

  it("conta desativada so volta com a escrita explicita", () => {
    const recusa = decisaoDoBootstrap({ platformRole: "SUPER_ADMIN", active: false }, ambienteBase());
    expect(recusa.acao).toBe("recusar");
    expect(recusa.motivo).toContain("ADMIN_CRIAR_REATIVAR");
    const com = decisaoDoBootstrap(
      { platformRole: "SUPER_ADMIN", active: false },
      ambienteBase({ ADMIN_CRIAR_REATIVAR: "1" }),
    );
    expect(com.acao).toBe("reativar-conta");
    expect(com.reativa).toBe(true);
    expect(com.escreveSenha).toBe(false);
  });

  it("recusa de estado nao escreve nada", async () => {
    const registros: Escrita[] = [];
    await expect(
      instalarAdministradorDaPlataforma(
        ambienteBase(),
        clienteQueAnota(registros, { conta: { platformRole: null, active: true } }),
      ),
    ).rejects.toThrow(/ADMIN_CRIAR_PROMOVER/);
    expect(registros.filter((r) => r.acao === "create" || r.acao === "update" || r.acao === "upsert")).toEqual([]);
  });

  it("o administrador recebe OWNER em toda empresa que ja existe, sem criar empresa", async () => {
    const registros: Escrita[] = [];
    const resumo = await instalarAdministradorDaPlataforma(
      ambienteBase(),
      clienteQueAnota(registros, { conta: null, empresas: [{ id: "a" }, { id: "b" }, { id: "c" }] }),
    );
    const vinculos = registros.filter((r) => r.modelo === "companyUser");
    expect(vinculos).toHaveLength(3);
    expect(vinculos.map((v) => v.dados.role)).toEqual(["OWNER", "OWNER", "OWNER"]);
    expect(resumo.empresasComoOwner).toBe(3);
    expect(registros.filter((r) => r.modelo === "company" && r.acao === "upsert")).toEqual([]);
  });

  it("nenhuma saida imprime a senha", async () => {
    const senha = senhaForte();
    const logs: unknown[][] = [];
    const espiao = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args);
    });
    try {
      await instalarAdministradorDaPlataforma(
        ambienteBase({ ADMIN_CRIAR_SENHA: senha }),
        clienteQueAnota([], { conta: null }),
      );
    } finally {
      espiao.mockRestore();
    }
    const saida = JSON.stringify(logs);
    expect(saida).not.toContain(senha);
    expect(saida).toContain(EMAIL_DA_PLATAFORMA);
    expect(saida).not.toContain("$2");
  });

  it("bootstrap e validador de producao cobram o mesmo endereco", () => {
    const fonte = readFileSync(resolve(RAIZ, "apps/api/prisma/administrador-da-plataforma.ts"), "utf8");
    expect(fonte).toContain("emailDoAdministradorGlobal");
    // O seed continua sendo o caminho de desenvolvimento; o bootstrap nao chama semear.
    expect(fonte).not.toContain("semear(");
  });

  it("o comando existe nos dois package.json e a chave nova esta na guarda estrutural", () => {
    const doWorkspace = JSON.parse(readFileSync(resolve(RAIZ, "apps/api/package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    const daRaiz = JSON.parse(readFileSync(resolve(RAIZ, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(doWorkspace.scripts["admin:criar"]).toContain("prisma/administrador-da-plataforma.ts");
    expect(daRaiz.scripts["admin:criar"]).toContain("@nexus/api");
    const guarda = readFileSync(resolve(RAIZ, "apps/api/test/identificadores-fora-do-codigo.test.ts"), "utf8");
    expect(guarda).toContain("ADMIN_CRIAR_SENHA");
    const exemplo = readFileSync(resolve(RAIZ, "apps/api/.env.example"), "utf8");
    expect(exemplo).toContain("ADMIN_CRIAR_SENHA=");
    expect(exemplo).toContain("ADMIN_CRIAR_PROMOVER=0");
    expect(exemplo).toContain("ADMIN_CRIAR_RENOVAR_SENHA=0");
    expect(exemplo).toContain("ADMIN_CRIAR_REATIVAR=0");
  });

  it("em producao sem as variaveis o bootstrap nao cria usuario nem empresa no banco real", async () => {
    const antesUsuario = await prisma.user.count();
    const antesEmpresa = await prisma.company.count();
    await expect(
      instalarAdministradorDaPlataforma({ NODE_ENV: "production", SUPER_ADMIN_EMAIL: EMAIL_DA_PLATAFORMA }),
    ).rejects.toThrow(/ADMIN_CRIAR_SENHA/);
    expect(await prisma.user.count()).toBe(antesUsuario);
    expect(await prisma.company.count()).toBe(antesEmpresa);
  });
});
