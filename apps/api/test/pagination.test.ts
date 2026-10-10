import { describe, it, expect, afterAll } from "vitest";
import { app, makeAccount, login, cleanup, uid } from "./helpers";
import { prisma } from "../src/lib/prisma";

describe("Paginação global", () => {
  const created: { userIds: string[]; companyIds: string[] } = { userIds: [], companyIds: [] };
  afterAll(async () => {
    await cleanup(created);
    await app.close();
  });

  it("respeita pageSize e devolve meta coerente", async () => {
    const owner = await makeAccount("OWNER");
    created.userIds.push(owner.userId);
    created.companyIds.push(owner.companyId);
    // adiciona 5 membros
    for (let i = 0; i < 5; i++) {
      const u = await prisma.user.create({ data: { email: `${uid("m")}${i}@nexus.test`, name: "M", passwordHash: "x" } });
      await prisma.companyUser.create({ data: { userId: u.id, companyId: owner.companyId, role: "STAFF" } });
      created.userIds.push(u.id);
    }
    const token = await login(owner.email, owner.password);
    const res = await app.inject({ method: "GET", url: "/api/users?page=1&pageSize=2", headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: unknown[]; meta: { page: number; pageSize: number; total: number; totalPages: number } };
    expect(body.data).toHaveLength(2);
    expect(body.meta.total).toBe(6);
    expect(body.meta.totalPages).toBe(3);
    expect(body.meta.pageSize).toBe(2);
  });

  it("pageSize acima do limite → 400", async () => {
    const owner = await makeAccount("OWNER");
    created.userIds.push(owner.userId);
    created.companyIds.push(owner.companyId);
    const token = await login(owner.email, owner.password);
    const res = await app.inject({ method: "GET", url: "/api/users?pageSize=500", headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("VALIDATION_ERROR");
  });
});
