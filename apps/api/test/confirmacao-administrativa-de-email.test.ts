import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { app, cleanup, comFlag, login, makeAccount, uid, type Fixture } from "./helpers";
import { prisma } from "../src/lib/prisma";
import { instalarAdministradorDaPlataforma, type FonteDoOperador } from "../prisma/administrador-da-plataforma";

// T5.5, achado N61 da auditoria comercial: não havia porta administrativa para
// confirmar o e-mail de uma conta. A única escrita em `users.email_verified_at`
// era o clique no link ou o código digitado na tela pública, e com a D2 obrigando
// verificação em produção o cenário deixou de ser teórico: SMTP muda no momento do
// cadastro (`auth.verificacao_entrega_falhou` na auditoria), a pessoa fica sem
// link, sem confirmação e sem painel, e quem atende não tem botão — a saída era
// escrever no banco à mão.
//
// O que este arquivo cobra, pelo caminho do usuário:
//  1. a lista de plataforma mostra só quem não confirmou, paginada e buscável;
//  2. quem não responde pela plataforma não abre a lista nem confirma (403), e sem
//     token não abre nada (401) — confirmação de identidade não é permissão de
//     módulo de tenant;
//  3. confirmar marca a coluna, gasta os tokens de verificação que estavam vivos e
//     carimba a TRILHA DA PLATAFORMA (N14: sem empresa dona, endereço mascarado);
//  4. repetir não escreve nem audita de novo — a porta é idempotente;
//  5. conta inexistente é 404 e não escreve nada;
//  6. a porta destranca o que ela promete destrancar: com a régua ligada, o login
//     nega antes e deixa entrar depois;
//  7. N78 — o bootstrap do administrador da plataforma nasce com o e-mail
//     confirmado, porque a mesma régua trancaria do lado de fora a conta que a
//     regra de acesso diz que jamais pode ficar sem acesso.

const RAIZ = resolve(process.cwd(), "..", "..");
const auth = (token: string) => ({ authorization: `Bearer ${token}` });
const ACAO = "admin.email_confirmado";

interface ContaListada {
  userId: string;
  name: string;
  email: string;
  active: boolean;
  criadoEm: string;
  empresas: number;
  confirmarEmail?: unknown;
}
interface Paged<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

const trilha = { userIds: [] as string[], companyIds: [] as string[], emails: [] as string[] };
let plataformaToken = "";
let platasFixture: Fixture;
let visitanteToken = "";
let pendente: Fixture;

function senhaForte(): string {
  return "A" + randomBytes(9).toString("hex") + "!";
}

beforeAll(async () => {
  const platas = await makeAccount("OWNER", { plataforma: true });
  platasFixture = platas;
  trilha.userIds.push(platas.userId);
  trilha.companyIds.push(platas.companyId);
  trilha.emails.push(platas.email);
  plataformaToken = await login(platas.email, platas.password);

  // Uma conta comum da MESMA empresa: tem permissão de usuário no tenant e mesmo
  // assim não abre a porta da plataforma.
  const visitante = await makeAccount("ADMIN");
  trilha.userIds.push(visitante.userId);
  trilha.companyIds.push(visitante.companyId);
  trilha.emails.push(visitante.email);
  await prisma.companyUser.create({
    data: { userId: visitante.userId, companyId: platas.companyId, role: "ADMIN" },
  });
  visitanteToken = await login(visitante.email, visitante.password, platas.companyId);

  // A conta pendente do cenário: cadastro normal, sem confirmação, com um link
  // vivo no banco — é exatamente ela que o suporte precisa destravar.
  pendente = await makeAccount("STAFF");
  trilha.userIds.push(pendente.userId);
  trilha.companyIds.push(pendente.companyId);
  trilha.emails.push(pendente.email);
  await prisma.emailVerificationToken.create({
    data: {
      userId: pendente.userId,
      tokenHash: uid("hash-vivo"),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
});

afterAll(async () => {
  // A prova escreve limpo: tokens primeiro (apontam para as contas), depois os
  // fixtures pela ordem de sempre.
  await prisma.emailVerificationToken.deleteMany({ where: { userId: { in: trilha.userIds } } });
  await prisma.auditLog.deleteMany({ where: { userId: { in: trilha.userIds } } });
  await cleanup(trilha);
});

async function listar(query = ""): Promise<{ status: number; corpo: Paged<ContaListada> }> {
  const res = await app.inject({
    method: "GET",
    url: `/api/plataforma/contas/sem-confirmacao${query}`,
    headers: auth(plataformaToken),
  });
  return { status: res.statusCode, corpo: res.json() as Paged<ContaListada> };
}

describe("Porta administrativa de confirmação de e-mail (N61)", () => {
  it("a lista da plataforma mostra a conta pendente, com o endereço e as empresas", async () => {
    const { status, corpo } = await listar(`?search=${encodeURIComponent(pendente.email)}`);
    expect(status).toBe(200);
    const achada = corpo.data.find((c) => c.userId === pendente.userId);
    expect(achada, "a conta sem confirmação precisa aparecer na lista").toBeTruthy();
    expect(achada?.email).toBe(pendente.email);
    expect(achada?.empresas).toBe(1);
    expect(achada?.confirmarEmail, "a lista não devolve a coluna crua; o estado vem dito").toBeUndefined();
    // Conta confirmada pelo link não tem nada que fazer aqui: a lista é de
    // pendentes, não de contas.
    await prisma.user.update({ where: { id: platasFixture.userId }, data: { emailVerifiedAt: new Date() } });
    const depois = await listar(`?search=${encodeURIComponent(platasFixture.email)}`);
    expect(depois.corpo.data.map((c) => c.userId)).not.toContain(platasFixture.userId);
  });

  it("a lista é paginada e não inclui quem já confirmou", async () => {
    const { status, corpo } = await listar("?pageSize=1&page=1");
    expect(status).toBe(200);
    expect(corpo.data).toHaveLength(1);
    expect(corpo.meta.pageSize).toBe(1);
    expect(corpo.meta.totalPages).toBeGreaterThanOrEqual(1);
    // A busca é por conta sem `email_verified_at`; conferir no banco que a linha
    // listada continua sem confirmação é o que impede a lista de mentir.
    const noBanco = await prisma.user.findUnique({
      where: { id: corpo.data[0]?.userId ?? "" },
      select: { emailVerifiedAt: true },
    });
    expect(noBanco?.emailVerifiedAt, "toda linha listada está sem confirmação").toBeNull();
  });

  it("quem não responde pela plataforma não abre a porta, e sem token não abre nada", async () => {
    const comoAdminDeTenant = await app.inject({
      method: "GET",
      url: "/api/plataforma/contas/sem-confirmacao",
      headers: auth(visitanteToken),
    });
    expect(comoAdminDeTenant.statusCode).toBe(403);

    const confirmaComoTenant = await app.inject({
      method: "POST",
      url: `/api/plataforma/contas/${pendente.userId}/confirmar-email`,
      headers: auth(visitanteToken),
      payload: { motivo: "tentativa de administrador de tenant" },
    });
    expect(confirmaComoTenant.statusCode).toBe(403);
    const coluna = await prisma.user.findUnique({
      where: { id: pendente.userId },
      select: { emailVerifiedAt: true },
    });
    expect(coluna?.emailVerifiedAt, "a recusa não escreve").toBeNull();

    const anonimo = await app.inject({ method: "GET", url: "/api/plataforma/contas/sem-confirmacao" });
    expect(anonimo.statusCode).toBe(401);
  });

  it("confirmar marca a coluna, gasta o link que estava vivo e carimba a trilha da plataforma", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/plataforma/contas/${pendente.userId}/confirmar-email`,
      headers: auth(plataformaToken),
      payload: { motivo: "entrega do provedor falhou no cadastro" },
    });
    expect(res.statusCode, res.body).toBe(200);
    const corpo = res.json() as { alterado: boolean; confirmadoEm: string | null; userId: string };
    expect(corpo.alterado).toBe(true);
    expect(corpo.userId).toBe(pendente.userId);
    expect(corpo.confirmadoEm).toBeTruthy();

    const conta = await prisma.user.findUnique({
      where: { id: pendente.userId },
      select: { emailVerifiedAt: true },
    });
    expect(conta?.emailVerifiedAt).toBeInstanceOf(Date);

    // O link que estava vivo morre com a confirmação administrativa: se ele
    // continuasse válido, a pessoa clicaria meses depois num caminho que já foi
    // fechado por outra decisão.
    const tokensVivos = await prisma.emailVerificationToken.count({
      where: { userId: pendente.userId, usedAt: null },
    });
    expect(tokensVivos).toBe(0);

    const linha = await prisma.auditLog.findFirst({
      where: { action: ACAO, entityId: pendente.userId },
      orderBy: { createdAt: "desc" },
    });
    expect(linha, "a escrita precisa de rastro").toBeTruthy();
    expect(linha?.scope, "é evento da plataforma, não do tenant").toBe("platform");
    expect(linha?.companyId, "evento de plataforma não tem empresa dona (N14)").toBeNull();
    const metadata = linha?.metadata as { para?: string; motivo?: string; autor?: string } | null;
    expect(metadata?.motivo).toBe("entrega do provedor falhou no cadastro");
    expect(metadata?.para, "endereço mascarado na auditoria").toBe(
      `${pendente.email.slice(0, 1).toLowerCase()}***@${pendente.email.split("@")[1]}`,
    );
    expect(JSON.stringify(metadata)).not.toContain(pendente.email);
  });

  it("repetir a confirmação não escreve nem audita de novo", async () => {
    const antes = await prisma.auditLog.count({ where: { action: ACAO } });
    const colunas = await prisma.user.findUnique({
      where: { id: pendente.userId },
      select: { emailVerifiedAt: true },
    });
    const res = await app.inject({
      method: "POST",
      url: `/api/plataforma/contas/${pendente.userId}/confirmar-email`,
      headers: auth(plataformaToken),
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { alterado: boolean }).alterado).toBe(false);
    expect(await prisma.auditLog.count({ where: { action: ACAO } })).toBe(antes);
    const depois = await prisma.user.findUnique({
      where: { id: pendente.userId },
      select: { emailVerifiedAt: true },
    });
    expect(depois?.emailVerifiedAt?.getTime()).toBe(colunas?.emailVerifiedAt?.getTime());
  });

  it("conta que não existe é 404, e o motivo vazio não trava a escrita", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/plataforma/contas/conta-que-nao-existe/confirmar-email",
      headers: auth(plataformaToken),
      payload: {},
    });
    expect(res.statusCode).toBe(404);
    // 404 do Fastify por rota inexistente tem a mesma cara, e o caso passaria em
    // branco sem a rota existir. A mensagem é a do serviço, não a da estrutura.
    expect((res.json() as { message?: string }).message ?? "").toContain("Conta não encontrada");
    expect(await prisma.auditLog.count({ where: { action: ACAO, entityId: "conta-que-nao-existe" } })).toBe(0);
  });

  it("a porta destranca o login: com a régua ligada a conta nega antes e entra depois", async () => {
    // A régua de produção é lida do objeto `env` na hora da chamada, então o
    // trecho mede os dois lados sem subir um segundo processo (mesmo caminho da F4).
    const travada = await makeAccount("STAFF");
    trilha.userIds.push(travada.userId);
    trilha.companyIds.push(travada.companyId);
    trilha.emails.push(travada.email);

    await comFlag("REQUIRE_EMAIL_VERIFICATION", "1", async () => {
      const negado = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email: travada.email, password: travada.password },
      });
      expect(negado.statusCode, negado.body).toBe(403);
      expect(negado.json() as { message?: string }).toEqual(
        expect.objectContaining({ message: expect.stringContaining("Confirme") }),
      );

      const confirmado = await app.inject({
        method: "POST",
        url: `/api/plataforma/contas/${travada.userId}/confirmar-email`,
        headers: auth(plataformaToken),
        payload: { motivo: "prova da porta: conta travada fora do painel" },
      });
      expect(confirmado.statusCode, confirmado.body).toBe(200);
      expect((confirmado.json() as { alterado: boolean }).alterado).toBe(true);

      // Depois da porta a pessoa entra — que é o único motivo de a porta existir.
      const token = await login(travada.email, travada.password);
      expect(token.length).toBeGreaterThan(20);
      const lista = await listar(`?search=${encodeURIComponent(travada.email)}`);
      expect(lista.corpo.data.map((c) => c.userId)).not.toContain(travada.userId);
    });
  });

  it("o bootstrap do administrador da plataforma nasce com o e-mail confirmado (N78)", async () => {
    // Escrito pelo cliente falso: o plano de escrita é visível sem tocar no banco.
    const escritas: Array<{ acao: string; dados: Record<string, unknown> }> = [];
    const cliente = {
      user: {
        findUnique: async () => null,
        create: async (operacao: { data: Record<string, unknown> }) => {
          escritas.push({ acao: "create", dados: operacao.data });
          return { id: "usuario-novo" };
        },
        update: async (operacao: { data: Record<string, unknown> }) => {
          escritas.push({ acao: "update", dados: operacao.data });
          return { id: "usuario-existente" };
        },
      },
      company: { findMany: async () => [] },
      companyUser: {
        upsert: async () => ({ id: "vinculo-falso" }),
      },
    } as unknown as Parameters<typeof instalarAdministradorDaPlataforma>[1];

    const senha = senhaForte();
    const ambiente: FonteDoOperador = {
      NODE_ENV: "production",
      SUPER_ADMIN_EMAIL: uid("administrador") + "@exemplo.test",
      ADMIN_CRIAR_SENHA: senha,
    };
    await instalarAdministradorDaPlataforma(ambiente, cliente);

    const criacao = escritas.find((e) => e.acao === "create");
    expect(criacao?.dados.emailVerifiedAt, "a conta nasce travada pela própria régua de produção").toBeInstanceOf(Date);
    expect(JSON.stringify(escritas)).not.toContain(senha);

    // E no banco de prova, lida de volta: a coluna é o que o login confere.
    const emailReal = uid("administrador") + "@exemplo.test";
    const resumo = await instalarAdministradorDaPlataforma(
      { ...ambiente, SUPER_ADMIN_EMAIL: emailReal },
      prisma,
    );
    try {
      expect(resumo.acao).toBe("criar");
      const conta = await prisma.user.findUnique({
        where: { email: emailReal },
        select: { emailVerifiedAt: true, platformRole: true },
      });
      expect(conta?.platformRole).toBe("SUPER_ADMIN");
      expect(conta?.emailVerifiedAt, "sem esta coluna a conta raiz fica do lado de fora do painel").toBeInstanceOf(Date);
    } finally {
      const criada = await prisma.user.findUnique({ where: { email: emailReal }, select: { id: true } });
      if (criada) {
        await prisma.companyUser.deleteMany({ where: { userId: criada.id } });
        await prisma.user.delete({ where: { id: criada.id } });
      }
      expect(await prisma.user.count({ where: { email: emailReal } })).toBe(0);
    }
  });

  it("a rota está na matriz de plataforma e o prefixo declarado é conferido", () => {
    // Guarda estrutural: a matriz de rotas só chama de plataforma o que mora em
    // prefixo declarado. Se a rota nova saísse de lá, ela seria uma porta de
    // plataforma que o teste de matriz não vigia.
    const matriz = readFileSync(resolve(RAIZ, "apps/api/test/isolamento-rotas.test.ts"), "utf8");
    expect(matriz).toContain('caminho.startsWith("/api/plataforma")');
    const rotas = readFileSync(
      resolve(RAIZ, "apps/api/src/modules/platform-accounts/contas.routes.ts"),
      "utf8",
    );
    expect(rotas).toContain("assertPlatformAdmin");
    expect(rotas).not.toContain("assertPermission");
    const appArquivo = readFileSync(resolve(RAIZ, "apps/api/src/app.ts"), "utf8");
    expect(appArquivo).toContain("platform-accounts/contas.routes");
  });
});
