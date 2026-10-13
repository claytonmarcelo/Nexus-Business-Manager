import { describe, it, expect, afterAll } from "vitest";
import { app, cleanup, uid } from "./helpers";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";

// N32 (decisão D5 do dono, tarefa T2) — a escolha de empresa quando ninguém pede.
//
// O sintoma medido no achado: o login sem `companyId` chamava
// `memberships.find((m) => m.company.active)` e recebia "a primeira empresa ativa
// na ordem que o banco entrega". Essa ordem não é de ninguém: o `include` do
// Prisma não tem `orderBy`, o MySQL varre o índice único `(user_id, company_id)`
// e devolve os vínculos em ordem de uuid. Quem tem três casas acorda numa
// diferente a cada login, e foi assim que o cabeçalho das capturas do painel
// mudou de empresa sozinho.
//
// A regra agora escrita tem três degraus, nesta ordem:
//   1. a empresa pedida na requisição manda (contrato que já existia, intocado);
//   2. sem pedido, vale a última empresa que a pessoa escolheu em
//      `switch-company` — a lembrança mora na conta, não no navegador;
//   3. sem lembrança (ou com lembrança que caiu/adormeceu), o vínculo mais antigo
//      por `createdAt`, e empate resolvido pelo `id` do vínculo.
//
// Os ids de empresa e de vínculo são escolhidos à mão de propósito, e cada caso
// cria ids novos (a chave da empresa tem 36 caracteres, então o selo é curto). É
// assim que a prova garante que a ordem do índice do banco e a ordem dos vínculos
// por data apontam para casas diferentes: sem isso o caso poderia passar por
// acaso com o bug ainda aceso.

const SENHA = "SenhaForte123!";
const MAR = Date.parse("2026-01-01T00:00:00.000Z");

interface Casa {
  empresaId: string;
  vinculoId: string;
  criadaEm: number;
  ativa?: boolean;
}

const criados: { userIds: string[]; companyIds: string[] } = { userIds: [], companyIds: [] };

let seloSeq = 0;
function selo(): string {
  seloSeq += 1;
  return Date.now().toString(36).slice(-5) + seloSeq.toString(36);
}

// Três casas vivas. A mais antiga é a `A`; os prefixes de id são escritos de
// forma que o índice do banco entregue primeiro seja a `C` ("xx" antes de "yy",
// e "yy" antes de "zz").
function tresCasas(): { A: Casa; B: Casa; C: Casa } {
  const r = selo();
  return {
    A: { empresaId: "zz-casa-" + r + "-a", vinculoId: "vv-zz-" + r, criadaEm: MAR },
    B: { empresaId: "yy-casa-" + r + "-b", vinculoId: "vv-yy-" + r, criadaEm: MAR + 60_000 },
    C: { empresaId: "xx-casa-" + r + "-c", vinculoId: "vv-xx-" + r, criadaEm: MAR + 120_000 },
  };
}

async function crieContas(casas: Casa[]): Promise<{ userId: string; email: string; password: string }> {
  const email = `${uid("multiempresa")}@nexus.test`;
  const user = await prisma.user.create({
    data: { email, name: "Dono de três casas", passwordHash: await hashPassword(SENHA) },
  });
  for (const casa of casas) {
    await prisma.company.create({
      data: { id: casa.empresaId, name: uid("Empresa"), slug: uid("slug"), active: casa.ativa ?? true },
    });
    await prisma.companyUser.create({
      data: {
        id: casa.vinculoId,
        userId: user.id,
        companyId: casa.empresaId,
        role: "OWNER",
        createdAt: new Date(casa.criadaEm),
      },
    });
  }
  criados.userIds.push(user.id);
  criados.companyIds.push(...casas.map((c) => c.empresaId));
  return { userId: user.id, email, password: SENHA };
}

async function sessao(email: string, password: string, companyId?: string) {
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email, password, ...(companyId ? { companyId } : {}) },
  });
  if (res.statusCode !== 200) throw new Error(`login falhou: ${res.statusCode} ${res.body}`);
  const corpo = res.json() as { accessToken: string; refreshToken: string; user: { companyId: string } };
  return { ...corpo, empresa: corpo.user.companyId };
}

async function trocarCasa(token: string, companyId: string) {
  return app.inject({
    method: "POST",
    url: "/api/auth/switch-company",
    headers: { authorization: `Bearer ${token}` },
    payload: { companyId },
  });
}

// A lembrança é lida pela SQL crua de propósito: a prova não pode depender do
// gerador do PrismaClient para existir, senão o teste vermelho falharia por tipo
// antes de falhar por comportamento.
async function casaLembrada(userId: string): Promise<string | null> {
  const linhas = await prisma.$queryRawUnsafe<Array<{ last_company_id: string | null }>>(
    "SELECT last_company_id FROM `users` WHERE `id` = ?",
    userId,
  );
  const primeira = linhas[0];
  return primeira ? primeira.last_company_id : null;
}

describe("A empresa escolhida quando ninguém pede (N32 / D5)", () => {
  afterAll(async () => {
    await cleanup(criados);
    await app.close();
  });

  it("sem pedir empresa, o login devolve o vínculo mais antigo — e sempre o mesmo", async () => {
    const { A, B, C } = tresCasas();
    const f = await crieContas([A, B, C]);
    const primeira = await sessao(f.email, f.password);
    expect(primeira.empresa).toBe(A.empresaId);
    for (let tentativa = 2; tentativa <= 4; tentativa++) {
      const login = await sessao(f.email, f.password);
      expect(login.empresa, "tentativa " + tentativa).toBe(A.empresaId);
    }
  });

  it("trocar de casa grava a escolha na conta, e o login seguinte volta para ela", async () => {
    const { A, C } = tresCasas();
    const f = await crieContas([A, C]);
    const inicial = await sessao(f.email, f.password);
    expect(inicial.empresa).toBe(A.empresaId);

    const troca = await trocarCasa(inicial.accessToken, C.empresaId);
    expect(troca.statusCode).toBe(200);
    expect((troca.json() as { user: { companyId: string } }).user.companyId).toBe(C.empresaId);

    expect(await casaLembrada(f.userId)).toBe(C.empresaId);

    // a pessoa fecha o navegador e faz login de novo, sem dizer empresa nenhuma
    const depois = await sessao(f.email, f.password);
    expect(depois.empresa).toBe(C.empresaId);
  });

  it("a casa lembrada adormeceu: o login cai para o vínculo mais antigo ainda ativo", async () => {
    const { A, B } = tresCasas();
    const f = await crieContas([A, B]);
    const inicial = await sessao(f.email, f.password);
    const troca = await trocarCasa(inicial.accessToken, B.empresaId);
    expect(troca.statusCode).toBe(200);
    expect(await casaLembrada(f.userId)).toBe(B.empresaId);

    await prisma.company.update({ where: { id: B.empresaId }, data: { active: false } });

    const depois = await sessao(f.email, f.password);
    expect(depois.empresa).toBe(A.empresaId);
  });

  it("o vínculo com a casa lembrada caiu: cai para o vínculo mais antigo ainda ativo", async () => {
    const { A, C } = tresCasas();
    const f = await crieContas([A, C]);
    const inicial = await sessao(f.email, f.password);
    await trocarCasa(inicial.accessToken, C.empresaId);
    expect(await casaLembrada(f.userId)).toBe(C.empresaId);

    await prisma.companyUser.deleteMany({ where: { userId: f.userId, companyId: C.empresaId } });

    const depois = await sessao(f.email, f.password);
    expect(depois.empresa).toBe(A.empresaId);
  });

  it("empresa pedida no login continua mandando, e não reescreve a lembrança", async () => {
    const { A, B } = tresCasas();
    const f = await crieContas([A, B]);
    const naB = await sessao(f.email, f.password, B.empresaId);
    expect(naB.empresa).toBe(B.empresaId);
    // ninguém escolheu casa na tela de trocas: a conta não ganha lembrança sozinha
    expect(await casaLembrada(f.userId)).toBeNull();
  });

  it("empate na data de criação decide pelo id do vínculo", async () => {
    // Mesma data nos dois vínculos. O índice do banco entrega a empresa "aa"
    // primeiro; a regra do empate aponta para o vínculo de id menor, que é o da
    // empresa "zz".
    const r = selo();
    const perdedora: Casa = { empresaId: "aa-empresa-" + r, vinculoId: "zz-vinculo-" + r, criadaEm: MAR };
    const vencedora: Casa = { empresaId: "zz-empresa-" + r, vinculoId: "aa-vinculo-" + r, criadaEm: MAR };
    const f = await crieContas([perdedora, vencedora]);

    const login = await sessao(f.email, f.password);
    expect(login.empresa).toBe(vencedora.empresaId);
  });

  it("a renovação de um token sem empresa gravada segue a lembrança da conta", async () => {
    const { A, B, C } = tresCasas();
    const f = await crieContas([A, B, C]);
    const inicial = await sessao(f.email, f.password);
    // A lembrança é a do meio: nem a mais antiga da regra de desempate (A), nem a
    // que o índice do banco entrega primeiro hoje (C). Assim o caso prova que a
    // renovação leu a conta, e não um acaso de ordenação.
    const naB = await trocarCasa(inicial.accessToken, B.empresaId);
    expect(naB.statusCode).toBe(200);

    // Simula a carteira antiga, anterior à coluna de empresa do refresh token,
    // numa conta que já tem a lembrança da casa B gravada.
    await prisma.$executeRaw`UPDATE refresh_tokens SET company_id = NULL WHERE user_id = ${f.userId}`;

    const renovado = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      payload: { refreshToken: (naB.json() as { refreshToken: string }).refreshToken },
    });
    expect(renovado.statusCode).toBe(200);
    const novo = (renovado.json() as { accessToken: string }).accessToken;
    const me = await app.inject({ method: "GET", url: "/api/auth/me", headers: { authorization: `Bearer ${novo}` } });
    expect((me.json() as { companyId: string }).companyId).toBe(B.empresaId);
  });
});
