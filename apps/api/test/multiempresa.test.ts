import { describe, it, expect, afterAll } from "vitest";
import { app, makeAccount, login, cleanup } from "./helpers";

describe("Isolamento multiempresa", () => {
  const created: { userIds: string[]; companyIds: string[] } = { userIds: [], companyIds: [] };
  afterAll(async () => {
    await cleanup(created);
    await app.close();
  });

  it("/users retorna apenas membros da empresa do token", async () => {
    const a = await makeAccount("OWNER");
    const b = await makeAccount("OWNER");
    created.userIds.push(a.userId, b.userId);
    created.companyIds.push(a.companyId, b.companyId);

    const tokenA = await login(a.email, a.password);
    const res = await app.inject({ method: "GET", url: "/api/users", headers: { authorization: `Bearer ${tokenA}` } });
    expect(res.statusCode).toBe(200);
    const emails = (res.json() as { data: { email: string }[] }).data.map((u) => u.email);
    expect(emails).toContain(a.email);
    expect(emails).not.toContain(b.email);
  });

  it("trocar para empresa da qual não se é membro → 403", async () => {
    const a = await makeAccount("OWNER");
    const b = await makeAccount("OWNER");
    created.userIds.push(a.userId, b.userId);
    created.companyIds.push(a.companyId, b.companyId);
    const tokenA = await login(a.email, a.password);
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/switch-company",
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { companyId: b.companyId },
    });
    expect(res.statusCode).toBe(403);
  });

  it("não é possível alterar papel de membro de outra empresa", async () => {
    const a = await makeAccount("OWNER");
    const b = await makeAccount("OWNER");
    created.userIds.push(a.userId, b.userId);
    created.companyIds.push(a.companyId, b.companyId);
    const tokenA = await login(a.email, a.password);
    // b.userId não pertence à empresa de A → 404
    const res = await app.inject({
      method: "PATCH",
      url: `/api/users/${b.userId}/role`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { role: "STAFF" },
    });
    expect(res.statusCode).toBe(404);
  });
});
