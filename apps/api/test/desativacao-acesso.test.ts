import { describe, it, expect, afterAll } from "vitest";
import { app, makeAccount, login, cleanup, type Fixture } from "./helpers";
import { prisma } from "../src/lib/prisma";

// A5 do prompt de mercado — desativar não é só um selo na tela de equipe.
// Antes deste arquivo, `resolveCompanyContext` conferia apenas o vínculo: um
// usuário desativado (ou uma empresa inativa) continuava operando até o access
// token vencer, ou seja, até 15 minutos de requisições válidas depois do "não".
// A porta de toda rota de empresa é essa função, então é ela que tem de dizer
// "esta conta não existe mais" na mesma hora.
describe("Conta ou empresa desativada perde o acesso na hora (A5)", () => {
  const criados: { userIds: string[]; companyIds: string[] } = { userIds: [], companyIds: [] };

  async function novaConta(role: "OWNER" | "STAFF"): Promise<Fixture> {
    const f = await makeAccount(role);
    criados.userIds.push(f.userId);
    criados.companyIds.push(f.companyId);
    return f;
  }

  const me = async (token: string) =>
    app.inject({ method: "GET", url: "/api/auth/me", headers: { authorization: `Bearer ${token}` } });

  const clients = async (token: string) =>
    app.inject({ method: "GET", url: "/api/clients?pageSize=1", headers: { authorization: `Bearer ${token}` } });

  afterAll(async () => {
    await cleanup(criados);
  });

  it("com a conta ativa a mesma sessão lê /auth/me e um módulo de empresa", async () => {
    const f = await novaConta("OWNER");
    const token = await login(f.email, f.password);
    expect((await me(token)).statusCode).toBe(200);
    expect((await clients(token)).statusCode).toBe(200);
  });

  it("desativar a conta derruba o access token que ainda está na mão do usuário", async () => {
    const f = await novaConta("STAFF");
    const token = await login(f.email, f.password);
    expect((await clients(token)).statusCode).toBe(200);

    await prisma.user.update({ where: { id: f.userId }, data: { active: false } });

    const caindo = await clients(token);
    expect(caindo.statusCode).toBe(403);
    expect(JSON.parse(caindo.body).message).toBe("Conta desativada");

    const me2 = await me(token);
    expect(me2.statusCode).toBe(403);
    expect(JSON.parse(me2.body).message).toBe("Conta desativada");
  });

  it("reativar a conta devolve o acesso com o mesmo token", async () => {
    const f = await novaConta("STAFF");
    const token = await login(f.email, f.password);
    await prisma.user.update({ where: { id: f.userId }, data: { active: false } });
    expect((await clients(token)).statusCode).toBe(403);

    await prisma.user.update({ where: { id: f.userId }, data: { active: true } });
    expect((await clients(token)).statusCode).toBe(200);
  });

  it("empresa inativa fecha o módulo para todo mundo, inclusive o proprietário", async () => {
    const f = await novaConta("OWNER");
    const token = await login(f.email, f.password);
    expect((await clients(token)).statusCode).toBe(200);

    await prisma.company.update({ where: { id: f.companyId }, data: { active: false } });

    const caindo = await clients(token);
    expect(caindo.statusCode).toBe(403);
    expect(JSON.parse(caindo.body).message).toBe("Empresa inativa");

    await prisma.company.update({ where: { id: f.companyId }, data: { active: true } });
    expect((await clients(token)).statusCode).toBe(200);
  });

  it("login continua recusando conta desativada antes de emitir token", async () => {
    const f = await novaConta("STAFF");
    await prisma.user.update({ where: { id: f.userId }, data: { active: false } });
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: f.email, password: f.password },
    });
    expect(res.statusCode).toBe(401);
  });
});
