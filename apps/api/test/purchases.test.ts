import { describe, it, expect, afterAll } from "vitest";
import { app, makeAccount, login, cleanup, uid } from "./helpers";

describe("Compras + Fornecedores", () => {
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
    const sup = await app.inject({ method: "POST", url: "/api/suppliers", headers: auth(token), payload: { name: "Distribuidora " + uid("s") } });
    const prod = await app.inject({ method: "POST", url: "/api/products", headers: auth(token), payload: { name: "Insumo " + uid("p"), salePrice: 20, costPrice: 5, stockQuantity: 10, minStock: 2 } });
    return { supplierId: (sup.json() as { id: string }).id, productId: (prod.json() as { id: string }).id };
  }

  it("CRUD de fornecedor com auditoria e nome duplicado → 409", async () => {
    const { token } = await account("OWNER");
    const nome = "Fornecedor Único " + uid("f");
    const criacao = await app.inject({ method: "POST", url: "/api/suppliers", headers: auth(token), payload: { name: nome, email: "vendas@teste.com" } });
    expect(criacao.statusCode).toBe(201);
    const id = (criacao.json() as { id: string }).id;

    const duplicado = await app.inject({ method: "POST", url: "/api/suppliers", headers: auth(token), payload: { name: nome } });
    expect(duplicado.statusCode).toBe(409);

    const edicao = await app.inject({ method: "PATCH", url: `/api/suppliers/${id}`, headers: auth(token), payload: { phone: "11 3333-4444" } });
    expect(edicao.statusCode).toBe(200);

    const remocao = await app.inject({ method: "DELETE", url: `/api/suppliers/${id}`, headers: auth(token) });
    expect((remocao.json() as { active: boolean }).active).toBe(false);

    const trilha = await app.inject({ method: "GET", url: "/api/audit?pageSize=50", headers: auth(token) });
    const acoes = (trilha.json() as { data: Array<{ action: string }> }).data.map((r) => r.action);
    expect(acoes).toContain("supplier.create");
    expect(acoes).toContain("supplier.update");
    expect(acoes).toContain("supplier.delete");
  });

  it("compra rascunho não mexe no estoque; receber dá entrada e atualiza custo", async () => {
    const { token } = await account("OWNER");
    const { supplierId, productId } = await fixture(token);

    const criacao = await app.inject({
      method: "POST", url: "/api/purchases", headers: auth(token),
      payload: { supplierId, notes: "Recarga semanal", items: [{ productId, quantity: 8, unitCost: 6.5 }] },
    });
    expect(criacao.statusCode).toBe(201);
    const compra = criacao.json() as { id: string; status: string; total: number };
    expect(compra.status).toBe("DRAFT");
    expect(compra.total).toBe(52);

    const antes = await app.inject({ method: "GET", url: `/api/products/${productId}`, headers: auth(token) });
    expect((antes.json() as { stockQuantity: number }).stockQuantity).toBe(10);

    const receber = await app.inject({ method: "PATCH", url: `/api/purchases/${compra.id}/status`, headers: auth(token), payload: { status: "RECEIVED" } });
    expect(receber.statusCode).toBe(200);
    expect((receber.json() as { status: string }).status).toBe("RECEIVED");

    const depois = await app.inject({ method: "GET", url: `/api/products/${productId}`, headers: auth(token) });
    const prod = depois.json() as { stockQuantity: number; costPrice: number };
    expect(prod.stockQuantity).toBe(18);
    expect(prod.costPrice).toBe(6.5);

    const trilha = await app.inject({ method: "GET", url: "/api/audit?pageSize=50", headers: auth(token) });
    const acoes = (trilha.json() as { data: Array<{ action: string }> }).data.map((r) => r.action);
    expect(acoes).toContain("purchase.create");
    expect(acoes).toContain("purchase.received");
  });

  it("receber na criação e cancelar devolve o estoque com estorno", async () => {
    const { token } = await account("ADMIN");
    const { supplierId, productId } = await fixture(token);

    const criacao = await app.inject({
      method: "POST", url: "/api/purchases", headers: auth(token),
      payload: { supplierId, receive: true, items: [{ productId, quantity: 15, unitCost: 4 }] },
    });
    const compra = criacao.json() as { id: string; status: string };
    expect(compra.status).toBe("RECEIVED");

    const meio = await app.inject({ method: "GET", url: `/api/products/${productId}`, headers: auth(token) });
    expect((meio.json() as { stockQuantity: number }).stockQuantity).toBe(25);

    const cancelar = await app.inject({ method: "PATCH", url: `/api/purchases/${compra.id}/status`, headers: auth(token), payload: { status: "CANCELLED" } });
    expect(cancelar.statusCode).toBe(200);

    const fim = await app.inject({ method: "GET", url: `/api/products/${productId}`, headers: auth(token) });
    expect((fim.json() as { stockQuantity: number }).stockQuantity).toBe(10);
  });

  it("estorno bloqueado quando o estoque já foi consumido", async () => {
    const { token } = await account("OWNER");
    const { supplierId, productId } = await fixture(token);

    await app.inject({
      method: "POST", url: "/api/purchases", headers: auth(token),
      payload: { supplierId, receive: true, items: [{ productId, quantity: 20, unitCost: 3 }] },
    });
    // consome tudo vendendo confirmado
    await app.inject({
      method: "POST", url: "/api/sales", headers: auth(token),
      payload: { confirm: true, items: [{ productId, quantity: 30, unitPrice: 20 }] },
    });

    const lista = await app.inject({ method: "GET", url: "/api/purchases?status=RECEIVED", headers: auth(token) });
    const id = (lista.json() as { data: Array<{ id: string }> }).data[0]!.id;
    const cancelar = await app.inject({ method: "PATCH", url: `/api/purchases/${id}/status`, headers: auth(token), payload: { status: "CANCELLED" } });
    expect(cancelar.statusCode).toBe(400);
    expect((cancelar.json() as { error: string }).error).toBe("BAD_REQUEST");
  });

  it("validações: sem itens, fornecedor de outra empresa e produto inválido → 400", async () => {
    const a = await account("OWNER");
    const b = await account("OWNER");
    const vazio = await app.inject({ method: "POST", url: "/api/purchases", headers: auth(a.token), payload: { supplierId: "x", items: [] } });
    expect(vazio.statusCode).toBe(400);

    const fb = await fixture(b.token);
    const invasao = await app.inject({
      method: "POST", url: "/api/purchases", headers: auth(a.token),
      payload: { supplierId: fb.supplierId, items: [{ productId: fb.productId, quantity: 1, unitCost: 1 }] },
    });
    expect(invasao.statusCode).toBe(400);
  });

  it("isolamento entre empresas e filtro por fornecedor", async () => {
    const a = await account("OWNER");
    const b = await account("OWNER");
    const fa = await fixture(a.token);
    await app.inject({
      method: "POST", url: "/api/purchases", headers: auth(a.token),
      payload: { supplierId: fa.supplierId, items: [{ productId: fa.productId, quantity: 2, unitCost: 5 }] },
    });

    const listaB = await app.inject({ method: "GET", url: "/api/purchases", headers: auth(b.token) });
    expect((listaB.json() as { meta: { total: number } }).meta.total).toBe(0);

    const filtro = await app.inject({ method: "GET", url: `/api/purchases?supplierId=${fa.supplierId}`, headers: auth(a.token) });
    expect((filtro.json() as { meta: { total: number } }).meta.total).toBe(1);
    const corpo = filtro.json() as { data: Array<{ supplierName: string | null; items: Array<{ productName: string | null }> }> };
    expect(corpo.data[0]?.supplierName).toMatch(/^Distribuidora/);
    expect(corpo.data[0]?.items[0]?.productName).toMatch(/^Insumo/);

    const getB = await app.inject({ method: "GET", url: `/api/purchases/${(filtro.json() as { data: Array<{ id: string }> }).data[0]!.id}`, headers: auth(b.token) });
    expect(getB.statusCode).toBe(404);
  });

  it("RBAC: STAFF lê compras e fornecedores mas não escreve", async () => {
    const staff = await account("STAFF");
    expect((await app.inject({ method: "GET", url: "/api/purchases", headers: auth(staff.token) })).statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: "/api/suppliers", headers: auth(staff.token) })).statusCode).toBe(200);
    const escrita = await app.inject({ method: "POST", url: "/api/suppliers", headers: auth(staff.token), payload: { name: "Sem Permissao" } });
    expect(escrita.statusCode).toBe(403);
  });
});
