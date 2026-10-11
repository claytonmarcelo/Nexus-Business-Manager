import { describe, it, expect, afterAll } from "vitest";
import { app, makeAccount, login, cleanup, uid, type Fixture } from "./helpers";
import { prisma } from "../src/lib/prisma";

// A4 + A6 do prompt de mercado — a empresa ativa sobrevive à renovação, e a
// lista de sessões responde pela empresa da sessão, não pela pessoa.
//
// Antes: a tabela de refresh tokens não guardava empresa nenhuma. Toda renovação
// chamava `pickMembership(memberships)` sem pedir nada e recebia a PRIMEIRA
// empresa ativa do usuário. O efeito prático para quem tem duas empresas: depois
// de trocar para a B, o access token vencia em 15 minutos, o navegador renovava
// em silêncio e a pessoa acordava na A — gravando venda, cliente e financeiro na
// empresa errada, sem nenhum aviso. Na aba Sessões era a mesma confusão: a lista
// trazia toda sessão de quem tivesse vínculo com a empresa, inclusive a aberta em
// outra empresa, e mostrava o IP de origem para gerente e atendente.
//
// Agora o refresh token carrega a empresa em que foi emitido (coluna nova,
// nullable para os tokens que já existiam), a renovação reemite para ela, e a
// lista/revogação de sessões filtram por essa empresa.
describe("O refresh token lembra a empresa ativa (A4) e as sessões seguem a empresa (A6)", () => {
  const criados: { userIds: string[]; companyIds: string[] } = { userIds: [], companyIds: [] };

  afterAll(async () => {
    await cleanup(criados);
  });

  interface SessaoCompleta {
    accessToken: string;
    refreshToken: string;
    empresa: string;
  }

  async function sessao(email: string, password: string, companyId?: string): Promise<SessaoCompleta> {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email, password, ...(companyId ? { companyId } : {}) },
    });
    if (res.statusCode !== 200) throw new Error(`login falhou: ${res.statusCode} ${res.body}`);
    const corpo = res.json() as { accessToken: string; refreshToken: string; user: { companyId: string } };
    return { accessToken: corpo.accessToken, refreshToken: corpo.refreshToken, empresa: corpo.user.companyId };
  }

  async function trocarEmpresa(token: string, companyId: string): Promise<SessaoCompleta> {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/switch-company",
      headers: { authorization: `Bearer ${token}` },
      payload: { companyId },
    });
    if (res.statusCode !== 200) throw new Error(`troca falhou: ${res.statusCode} ${res.body}`);
    const corpo = res.json() as { accessToken: string; refreshToken: string; user: { companyId: string } };
    return { accessToken: corpo.accessToken, refreshToken: corpo.refreshToken, empresa: corpo.user.companyId };
  }

  // Renova e pergunta para qual empresa o novo token abriu sessão (via /auth/me).
  async function renovar(refreshToken: string): Promise<SessaoCompleta & { status: number }> {
    const res = await app.inject({ method: "POST", url: "/api/auth/refresh", payload: { refreshToken } });
    if (res.statusCode !== 200) return { status: res.statusCode, accessToken: "", refreshToken: "", empresa: "" };
    const corpo = res.json() as { accessToken: string; refreshToken: string };
    const me = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { authorization: `Bearer ${corpo.accessToken}` },
    });
    return {
      status: 200,
      accessToken: corpo.accessToken,
      refreshToken: corpo.refreshToken,
      empresa: (me.json() as { companyId: string }).companyId,
    };
  }

  interface LinhaDeSessao {
    id: string;
    userId: string;
    papel: string;
    origem: string | null;
  }

  async function listarSessoes(token: string): Promise<LinhaDeSessao[]> {
    const res = await app.inject({
      method: "GET",
      url: "/api/users/sessions",
      headers: { authorization: `Bearer ${token}` },
    });
    if (res.statusCode !== 200) throw new Error(`listagem falhou: ${res.statusCode} ${res.body}`);
    return (res.json() as { data: LinhaDeSessao[] }).data;
  }

  // Pessoa com duas empresas vivas: A (onde nasceu, como OWNER) e B (ADMIN).
  async function donoDeDuas(): Promise<{ f: Fixture; a: string; b: string }> {
    const f = await makeAccount("OWNER");
    const b = await prisma.company.create({ data: { name: uid("Empresa B"), slug: uid("slugb") } });
    await prisma.companyUser.create({ data: { userId: f.userId, companyId: b.id, role: "ADMIN" } });
    criados.userIds.push(f.userId);
    criados.companyIds.push(f.companyId, b.id);
    return { f, a: f.companyId, b: b.id };
  }

  it("quem trocou para a B continua na B depois de renovar o token", async () => {
    const { f, a, b } = await donoDeDuas();
    const inicial = await sessao(f.email, f.password, a);
    expect(inicial.empresa).toBe(a);

    const naB = await trocarEmpresa(inicial.accessToken, b);
    expect(naB.empresa).toBe(b);

    const renovada = await renovar(naB.refreshToken);
    expect(renovada.status).toBe(200);
    expect(renovada.empresa).toBe(b);

    // e renova de novo: a empresa não escorrega para a A na segunda renovação
    const outra = await renovar(renovada.refreshToken);
    expect(outra.empresa).toBe(b);
  });

  it("perder o vínculo com a B na renovação devolve a empresa que ainda é válida", async () => {
    const { f, a, b } = await donoDeDuas();
    const naB = await trocarEmpresa((await sessao(f.email, f.password, a)).accessToken, b);
    expect(naB.empresa).toBe(b);

    await prisma.companyUser.deleteMany({ where: { userId: f.userId, companyId: b } });

    const renovada = await renovar(naB.refreshToken);
    expect(renovada.status).toBe(200);
    expect(renovada.empresa).not.toBe(b);
    expect(renovada.empresa).toBe(a);
  });

  it("empresa inativa não sobrevive à renovação", async () => {
    const { f, a, b } = await donoDeDuas();
    const naB = await trocarEmpresa((await sessao(f.email, f.password, a)).accessToken, b);

    await prisma.company.update({ where: { id: b }, data: { active: false } });

    const renovada = await renovar(naB.refreshToken);
    expect(renovada.status).toBe(200);
    expect(renovada.empresa).toBe(a);
  });

  it("sem empresa ativa nenhuma a renovação é recusada", async () => {
    const { f, a, b } = await donoDeDuas();
    const naB = await trocarEmpresa((await sessao(f.email, f.password, a)).accessToken, b);
    await prisma.company.updateMany({ where: { id: { in: [a, b] } }, data: { active: false } });

    const renovada = await renovar(naB.refreshToken);
    expect(renovada.status).toBe(403);
  });

  it("token antigo, sem empresa gravada, continua funcionando como antes", async () => {
    const { f, a, b } = await donoDeDuas();
    const inicial = await sessao(f.email, f.password, a);
    // simula o registro criado antes da migration: empresa nula no banco
    await prisma.$executeRaw`UPDATE refresh_tokens SET company_id = NULL WHERE user_id = ${f.userId}`;

    const renovada = await renovar(inicial.refreshToken);
    expect(renovada.status).toBe(200);
    // comportamento histórico: cai na primeira empresa ativa do usuário
    expect([a, b]).toContain(renovada.empresa);
  });

  it("a lista de sessões da empresa A não mostra a sessão aberta na B", async () => {
    const { f, a, b } = await donoDeDuas();
    const naA = await sessao(f.email, f.password, a);
    const naB = await trocarEmpresa(naA.accessToken, b);

    const listaA = await listarSessoes(naA.accessToken);
    const listaB = await listarSessoes(naB.accessToken);

    // cada lista responde pelo próprio contexto de empresa, e nenhuma sessão
    // aparece nas duas
    expect(listaA.length).toBeGreaterThan(0);
    expect(listaB.length).toBeGreaterThan(0);
    const idsA = new Set(listaA.map((s) => s.id));
    const idsB = new Set(listaB.map((s) => s.id));
    for (const id of idsB) expect(idsA.has(id)).toBe(false);
    // a sessão que a pessoa abriu na B está na lista da B
    expect(listaB.every((s) => s.userId === f.userId)).toBe(true);
  });

  it("a sessão aberta na B não se encerra com o contexto da empresa A", async () => {
    const { f, a, b } = await donoDeDuas();
    const naA = await sessao(f.email, f.password, a);
    const naB = await trocarEmpresa(naA.accessToken, b);

    const listaB = await listarSessoes(naB.accessToken);
    const alvo = listaB[0];
    if (!alvo) throw new Error("a lista de sessões da empresa B veio vazia");

    // contexto A tentando derrubar sessão de B: 404, para nem confirmar que existe
    const tentativa = await app.inject({
      method: "DELETE",
      url: "/api/users/sessions/" + alvo.id,
      headers: { authorization: `Bearer ${naA.accessToken}` },
    });
    expect(tentativa.statusCode).toBe(404);

    // e a mesma sessão cai pelo contexto certo
    const encerrada = await app.inject({
      method: "DELETE",
      url: "/api/users/sessions/" + alvo.id,
      headers: { authorization: `Bearer ${naB.accessToken}` },
    });
    expect(encerrada.statusCode).toBe(200);
  });

  it("gerente e atendente não leem o IP de origem das sessões", async () => {
    const dono = await makeAccount("OWNER");
    criados.userIds.push(dono.userId);
    criados.companyIds.push(dono.companyId);
    const email = `${uid("g")}@nexus.test`;
    const tokenDono = await login(dono.email, dono.password);
    await app.inject({
      method: "POST",
      url: "/api/users",
      headers: { authorization: `Bearer ${tokenDono}` },
      payload: { email, name: "Gerente", password: "SenhaForte123!", role: "MANAGER" },
    });
    const tokenGerente = await login(email, "SenhaForte123!");

    const lista = await listarSessoes(tokenGerente);
    expect(lista.length).toBeGreaterThan(0);
    for (const s of lista) expect(s.origem).toBeNull();

    const listaDono = await listarSessoes(tokenDono);
    expect(listaDono.some((s) => s.origem !== null)).toBe(true);
  });
});
