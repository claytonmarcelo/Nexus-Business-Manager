import { describe, it, expect, afterAll } from "vitest";
import { app, makeAccount, login, cleanup, uid } from "./helpers";

describe("Clientes", () => {
  const created: { userIds: string[]; companyIds: string[] } = { userIds: [], companyIds: [] };
  afterAll(async () => {
    await cleanup(created);
    await app.close();
  });

  async function account(role: "OWNER" | "ADMIN" | "MANAGER" | "STAFF") {
    const f = await makeAccount(role);
    created.userIds.push(f.userId);
    created.companyIds.push(f.companyId);
    return { f, token: await login(f.email, f.password) };
  }
  const auth = (token: string) => ({ authorization: `Bearer ${token}` });

  it("CRUD completo com auditoria e paginação", async () => {
    const { token } = await account("OWNER");

    const criacao = await app.inject({
      method: "POST", url: "/api/clients", headers: auth(token),
      payload: { name: "Padaria Aurora", email: "contato@aurora.test", phone: "11 99999-0000", document: "12.345.678/0001-90" },
    });
    expect(criacao.statusCode).toBe(201);
    const id = (criacao.json() as { id: string }).id;

    const lista = await app.inject({ method: "GET", url: "/api/clients?page=1&pageSize=10&search=Aurora", headers: auth(token) });
    expect(lista.statusCode).toBe(200);
    const body = lista.json() as { data: Array<{ id: string; name: string }>; meta: { total: number } };
    expect(body.meta.total).toBe(1);
    expect(body.data[0].name).toBe("Padaria Aurora");

    const edicao = await app.inject({
      method: "PATCH", url: `/api/clients/${id}`, headers: auth(token),
      payload: { phone: "11 88888-1111" },
    });
    expect(edicao.statusCode).toBe(200);
    expect((edicao.json() as { phone: string }).phone).toBe("11 88888-1111");

    const remocao = await app.inject({ method: "DELETE", url: `/api/clients/${id}`, headers: auth(token) });
    expect(remocao.statusCode).toBe(200);

    const detalhe = await app.inject({ method: "GET", url: `/api/clients/${id}`, headers: auth(token) });
    expect((detalhe.json() as { active: boolean }).active).toBe(false);

    const trilha = await app.inject({ method: "GET", url: "/api/audit?pageSize=50", headers: auth(token) });
    const acoes = (trilha.json() as { data: Array<{ action: string }> }).data.map((r) => r.action);
    expect(acoes).toContain("client.create");
    expect(acoes).toContain("client.update");
    expect(acoes).toContain("client.delete");
  });

  it("isolamento entre empresas: B não vê nem acessa cliente de A", async () => {
    const a = await account("OWNER");
    const b = await account("OWNER");
    const criacao = await app.inject({
      method: "POST", url: "/api/clients", headers: auth(a.token),
      payload: { name: "Cliente Sigiloso " + uid("x") },
    });
    const id = (criacao.json() as { id: string }).id;

    const listaB = await app.inject({ method: "GET", url: "/api/clients", headers: auth(b.token) });
    expect((listaB.json() as { meta: { total: number } }).meta.total).toBe(0);

    const getB = await app.inject({ method: "GET", url: `/api/clients/${id}`, headers: auth(b.token) });
    expect(getB.statusCode).toBe(404);

    const patchB = await app.inject({
      method: "PATCH", url: `/api/clients/${id}`, headers: auth(b.token),
      payload: { name: "invasao" },
    });
    expect(patchB.statusCode).toBe(404);
  });

  it("RBAC: STAFF lê clientes mas não escreve", async () => {
    const staff = await account("STAFF");
    const leitura = await app.inject({ method: "GET", url: "/api/clients", headers: auth(staff.token) });
    expect(leitura.statusCode).toBe(200);
    const escrita = await app.inject({
      method: "POST", url: "/api/clients", headers: auth(staff.token),
      payload: { name: "Sem Permissao" },
    });
    expect(escrita.statusCode).toBe(403);
  });

  it("validação Zod: nome curto → 400 com issues", async () => {
    const { token } = await account("ADMIN");
    const res = await app.inject({ method: "POST", url: "/api/clients", headers: auth(token), payload: { name: "X" } });
    expect(res.statusCode).toBe(400);
    expect((res.json() as { error: string }).error).toBe("VALIDATION_ERROR");
  });

  it("documento duplicado na mesma empresa → 409", async () => {
    const { token } = await account("ADMIN");
    const doc = uid("doc");
    await app.inject({ method: "POST", url: "/api/clients", headers: auth(token), payload: { name: "Empresa Um", document: doc } });
    const res = await app.inject({ method: "POST", url: "/api/clients", headers: auth(token), payload: { name: "Empresa Dois", document: doc } });
    expect(res.statusCode).toBe(409);
  });
});
