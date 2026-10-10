import { describe, it, expect, afterAll } from "vitest";
import { app, makeAccount, login, cleanup, uid } from "./helpers";

describe("Vendas", () => {
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

  async function fixture(token: string) {
    const cli = await app.inject({ method: "POST", url: "/api/clients", headers: auth(token), payload: { name: "Cliente Venda " + uid("c") } });
    const prod = await app.inject({ method: "POST", url: "/api/products", headers: auth(token), payload: { name: "Item Venda " + uid("p"), salePrice: 10, stockQuantity: 10, minStock: 2 } });
    return { clientId: (cli.json() as { id: string }).id, productId: (prod.json() as { id: string }).id };
  }

  it("cria venda pendente sem baixar estoque e confirma com baixa auditável", async () => {
    const { token } = await account("OWNER");
    const { clientId, productId } = await fixture(token);

    const pend = await app.inject({
      method: "POST", url: "/api/sales", headers: auth(token),
      payload: { clientId, notes: "Pedido do dia", items: [{ productId, quantity: 3, unitPrice: 10 }] },
    });
    expect(pend.statusCode).toBe(201);
    const sale = pend.json() as { id: string; status: string; total: number; items: unknown[] };
    expect(sale.status).toBe("PENDING");
    expect(sale.total).toBe(30);
    expect(sale.items.length).toBe(1);

    const estoqueAntes = await app.inject({ method: "GET", url: `/api/products/${productId}`, headers: auth(token) });
    expect((estoqueAntes.json() as { stockQuantity: number }).stockQuantity).toBe(10);

    const confirm = await app.inject({
      method: "PATCH", url: `/api/sales/${sale.id}/status`, headers: auth(token),
      payload: { status: "CONFIRMED" },
    });
    expect(confirm.statusCode).toBe(200);
    expect((confirm.json() as { status: string }).status).toBe("CONFIRMED");

    const depois = await app.inject({ method: "GET", url: `/api/products/${productId}`, headers: auth(token) });
    expect((depois.json() as { stockQuantity: number }).stockQuantity).toBe(7);

    const movs = await app.inject({ method: "GET", url: `/api/products/${productId}/movements`, headers: auth(token) });
    const kinds = (movs.json() as { data: Array<{ kind: string }> }).data.map((m) => m.kind);
    expect(kinds).toContain("OUT");

    const trilha = await app.inject({ method: "GET", url: "/api/audit?pageSize=50", headers: auth(token) });
    const acoes = (trilha.json() as { data: Array<{ action: string }> }).data.map((r) => r.action);
    expect(acoes).toContain("sale.create");
    expect(acoes).toContain("sale.confirmed");
  });

  it("venda criada já confirmada baixa estoque direto; cancelamento estorna", async () => {
    const { token } = await account("OWNER");
    const { clientId, productId } = await fixture(token);

    const sale = await app.inject({
      method: "POST", url: "/api/sales", headers: auth(token),
      payload: { clientId, confirm: true, items: [{ productId, quantity: 4, unitPrice: 10 }] },
    });
    expect((sale.json() as { status: string }).status).toBe("CONFIRMED");
    let prod = await app.inject({ method: "GET", url: `/api/products/${productId}`, headers: auth(token) });
    expect((prod.json() as { stockQuantity: number }).stockQuantity).toBe(6);

    const cancel = await app.inject({
      method: "PATCH", url: `/api/sales/${(sale.json() as { id: string }).id}/status`, headers: auth(token),
      payload: { status: "CANCELLED" },
    });
    expect(cancel.statusCode).toBe(200);
    prod = await app.inject({ method: "GET", url: `/api/products/${productId}`, headers: auth(token) });
    expect((prod.json() as { stockQuantity: number }).stockQuantity).toBe(10);
  });

  it("confirmação sem estoque suficiente → 400 e venda permanece pendente", async () => {
    const { token } = await account("OWNER");
    const { productId } = await fixture(token);
    const sale = await app.inject({
      method: "POST", url: "/api/sales", headers: auth(token),
      payload: { items: [{ productId, quantity: 50, unitPrice: 10 }] },
    });
    const id = (sale.json() as { id: string }).id;
    const confirm = await app.inject({ method: "PATCH", url: `/api/sales/${id}/status`, headers: auth(token), payload: { status: "CONFIRMED" } });
    expect(confirm.statusCode).toBe(400);
    expect((confirm.json() as { message: string }).message).toMatch(/Estoque insuficiente/);
    const get = await app.inject({ method: "GET", url: `/api/sales/${id}`, headers: auth(token) });
    expect((get.json() as { status: string }).status).toBe("PENDING");
  });

  it("validações: sem itens → 400; produto/cliente de outra empresa → 400", async () => {
    const a = await account("OWNER");
    const b = await account("OWNER");
    const vazio = await app.inject({ method: "POST", url: "/api/sales", headers: auth(a.token), payload: { items: [] } });
    expect(vazio.statusCode).toBe(400);

    const bf = await fixture(b.token);
    const invasao = await app.inject({
      method: "POST", url: "/api/sales", headers: auth(a.token),
      payload: { items: [{ productId: bf.productId, quantity: 1, unitPrice: 1 }] },
    });
    expect(invasao.statusCode).toBe(400);
    const cliInvasao = await app.inject({
      method: "POST", url: "/api/sales", headers: auth(a.token),
      payload: { clientId: bf.clientId, items: [{ productId: (await fixture(a.token)).productId, quantity: 1, unitPrice: 1 }] },
    });
    expect(cliInvasao.statusCode).toBe(400);
  });

  it("listagem com filtro de status e isolamento entre empresas", async () => {
    const a = await account("OWNER");
    const b = await account("OWNER");
    const fa = await fixture(a.token);
    await app.inject({ method: "POST", url: "/api/sales", headers: auth(a.token), payload: { clientId: fa.clientId, items: [{ productId: fa.productId, quantity: 1, unitPrice: 10 }] } });

    const pend = await app.inject({ method: "GET", url: "/api/sales?status=PENDING", headers: auth(a.token) });
    expect((pend.json() as { meta: { total: number } }).meta.total).toBe(1);
    const pendBody = pend.json() as { data: Array<{ clientName: string | null; items: Array<{ productName: string | null }> }> };
    expect(pendBody.data[0]?.items[0]?.productName).toMatch(/^Item Venda/);
    expect(pendBody.data[0]?.clientName).toMatch(/^Cliente Venda/);
    const listaB = await app.inject({ method: "GET", url: "/api/sales", headers: auth(b.token) });
    expect((listaB.json() as { meta: { total: number } }).meta.total).toBe(0);
  });

  it("RBAC: STAFF lê vendas mas não cria", async () => {
    const staff = await account("STAFF");
    const leitura = await app.inject({ method: "GET", url: "/api/sales", headers: auth(staff.token) });
    expect(leitura.statusCode).toBe(200);
    const escrita = await app.inject({ method: "POST", url: "/api/sales", headers: auth(staff.token), payload: { items: [] } });
    expect(escrita.statusCode).toBe(403);
  });
});
