import { describe, it, expect, afterAll } from "vitest";
import { app, makeAccount, login, cleanup, uid } from "./helpers";

describe("RBAC", () => {
  const created: { userIds: string[]; companyIds: string[] } = { userIds: [], companyIds: [] };
  afterAll(async () => {
    await cleanup(created);
    await app.close();
  });

  async function tokenFor(role: "OWNER" | "ADMIN" | "MANAGER" | "STAFF") {
    const f = await makeAccount(role);
    created.userIds.push(f.userId);
    created.companyIds.push(f.companyId);
    return { f, token: await login(f.email, f.password) };
  }

  it("STAFF não pode listar usuários (user:read) → 403", async () => {
    const { token } = await tokenFor("STAFF");
    const res = await app.inject({ method: "GET", url: "/api/users", headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(403);
  });

  it("MANAGER pode listar usuários → 200", async () => {
    const { token } = await tokenFor("MANAGER");
    const res = await app.inject({ method: "GET", url: "/api/users", headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
  });

  it("ADMIN pode criar membro na própria empresa", async () => {
    const { token } = await tokenFor("ADMIN");
    const res = await app.inject({
      method: "POST",
      url: "/api/users",
      headers: { authorization: `Bearer ${token}` },
      payload: { email: `${uid("novo")}@nexus.test`, name: "Novo Membro", password: "SenhaForte123!", role: "STAFF" },
    });
    expect(res.statusCode).toBe(201);
  });

  it("STAFF não pode criar usuário → 403", async () => {
    const { token } = await tokenFor("STAFF");
    const res = await app.inject({
      method: "POST",
      url: "/api/users",
      headers: { authorization: `Bearer ${token}` },
      payload: { email: `${uid("x")}@nexus.test`, name: "X", password: "SenhaForte123!", role: "STAFF" },
    });
    expect(res.statusCode).toBe(403);
  });
});
