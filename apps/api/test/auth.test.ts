import { describe, it, expect, afterAll } from "vitest";
import { app, makeAccount, login, cleanup, uid } from "./helpers";

describe("Autenticação", () => {
  const created: { userIds: string[]; companyIds: string[] } = { userIds: [], companyIds: [] };
  afterAll(async () => {
    await cleanup(created);
    await app.close();
  });

  it("login válido retorna tokens e usuário com empresa ativa", async () => {
    const f = await makeAccount("OWNER");
    created.userIds.push(f.userId);
    created.companyIds.push(f.companyId);
    const res = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: f.email, password: f.password } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.accessToken).toBeTypeOf("string");
    expect(body.refreshToken).toBeTypeOf("string");
    expect(body.user.role).toBe("OWNER");
    expect(body.user.companyId).toBe(f.companyId);
  });

  it("senha errada → 401 com mensagem genérica", async () => {
    const f = await makeAccount("STAFF");
    created.userIds.push(f.userId);
    created.companyIds.push(f.companyId);
    const res = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: f.email, password: "errada" } });
    expect(res.statusCode).toBe(401);
    expect(res.json().message).toBe("Credenciais inválidas");
  });

  it("/me sem token → 401", async () => {
    const res = await app.inject({ method: "GET", url: "/api/auth/me" });
    expect(res.statusCode).toBe(401);
  });

  it("/me com token retorna sessão correta", async () => {
    const f = await makeAccount("ADMIN");
    created.userIds.push(f.userId);
    created.companyIds.push(f.companyId);
    const token = await login(f.email, f.password);
    const res = await app.inject({ method: "GET", url: "/api/auth/me", headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    expect(res.json().email).toBe(f.email);
  });

  it("login com company_id de empresa alheia → 403", async () => {
    const f = await makeAccount("OWNER");
    const other = await makeAccount("OWNER");
    created.userIds.push(f.userId, other.userId);
    created.companyIds.push(f.companyId, other.companyId);
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: f.email, password: f.password, companyId: other.companyId },
    });
    expect(res.statusCode).toBe(403);
  });
});
