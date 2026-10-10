import { describe, it, expect, afterAll } from "vitest";
import { app, makeAccount, login, cleanup, uid } from "./helpers";

describe("Produtos + Estoque", () => {
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

  it("CRUD de produto com categoria, estoque inicial e auditoria", async () => {
    const { token } = await account("OWNER");

    const cat = await app.inject({
      method: "POST", url: "/api/product-categories", headers: auth(token),
      payload: { name: "Bebidas " + uid("c") },
    });
    expect(cat.statusCode).toBe(201);
    const catId = (cat.json() as { id: string }).id;

    const prod = await app.inject({
      method: "POST", url: "/api/products", headers: auth(token),
      payload: { name: "Café Premium 250g", sku: uid("sku"), unit: "un", categoryId: catId, salePrice: 24.9, costPrice: 12.5, stockQuantity: 40, minStock: 10 },
    });
    expect(prod.statusCode).toBe(201);
    const p = prod.json() as { id: string; stockQuantity: number; lowStock: boolean; salePrice: number };
    expect(p.stockQuantity).toBe(40);
    expect(p.salePrice).toBe(24.9);
    expect(p.lowStock).toBe(false);

    const movs = await app.inject({ method: "GET", url: `/api/products/${p.id}/movements`, headers: auth(token) });
    expect(movs.statusCode).toBe(200);
    const lista = movs.json() as { data: Array<{ kind: string; quantity: number }> };
    expect(lista.data.length).toBe(1);
    expect(lista.data[0].kind).toBe("IN");
    expect(lista.data[0].quantity).toBe(40);

    const edicao = await app.inject({
      method: "PATCH", url: `/api/products/${p.id}`, headers: auth(token),
      payload: { salePrice: 27.9 },
    });
    expect((edicao.json() as { salePrice: number }).salePrice).toBe(27.9);

    const remocao = await app.inject({ method: "DELETE", url: `/api/products/${p.id}`, headers: auth(token) });
    expect(remocao.statusCode).toBe(200);
    const detalhe = await app.inject({ method: "GET", url: `/api/products/${p.id}`, headers: auth(token) });
    expect((detalhe.json() as { active: boolean }).active).toBe(false);

    const trilha = await app.inject({ method: "GET", url: "/api/audit?pageSize=50", headers: auth(token) });
    const acoes = (trilha.json() as { data: Array<{ action: string }> }).data.map((r) => r.action);
    expect(acoes).toContain("category.create");
    expect(acoes).toContain("product.create");
    expect(acoes).toContain("product.update");
    expect(acoes).toContain("product.delete");
  });

  it("movimentações: entrada, saída com saldo e saída maior que o estoque → 400", async () => {
    const { token } = await account("OWNER");
    const prod = await app.inject({
      method: "POST", url: "/api/products", headers: auth(token),
      payload: { name: "Açúcar 1kg", salePrice: 6.5, stockQuantity: 10 },
    });
    const id = (prod.json() as { id: string }).id;

    const entrada = await app.inject({
      method: "POST", url: `/api/products/${id}/movements`, headers: auth(token),
      payload: { kind: "IN", quantity: 5, note: "Reposicao" },
    });
    expect(entrada.statusCode).toBe(201);
    expect((entrada.json() as { stockQuantity: number }).stockQuantity).toBe(15);

    const saida = await app.inject({
      method: "POST", url: `/api/products/${id}/movements`, headers: auth(token),
      payload: { kind: "OUT", quantity: 4 },
    });
    expect((saida.json() as { stockQuantity: number }).stockQuantity).toBe(11);

    const estouro = await app.inject({
      method: "POST", url: `/api/products/${id}/movements`, headers: auth(token),
      payload: { kind: "OUT", quantity: 999 },
    });
    expect(estouro.statusCode).toBe(400);
    expect((estouro.json() as { message: string }).message).toMatch(/Estoque insuficiente/);

    const ajuste = await app.inject({
      method: "POST", url: `/api/products/${id}/movements`, headers: auth(token),
      payload: { kind: "ADJUST", quantity: 8, note: "Inventario" },
    });
    expect((ajuste.json() as { stockQuantity: number }).stockQuantity).toBe(8);
  });

  it("filtro de estoque baixo e resumo", async () => {
    const { token } = await account("OWNER");
    await app.inject({
      method: "POST", url: "/api/products", headers: auth(token),
      payload: { name: "Produto Critico", salePrice: 1, stockQuantity: 2, minStock: 5 },
    });
    await app.inject({
      method: "POST", url: "/api/products", headers: auth(token),
      payload: { name: "Produto Saudavel", salePrice: 2, stockQuantity: 100, minStock: 5 },
    });

    const baixo = await app.inject({ method: "GET", url: "/api/products?lowStock=true", headers: auth(token) });
    const body = baixo.json() as { data: Array<{ name: string; lowStock: boolean }>; meta: { total: number } };
    expect(body.meta.total).toBe(1);
    expect(body.data[0].name).toBe("Produto Critico");
    expect(body.data[0].lowStock).toBe(true);

    const resumo = await app.inject({ method: "GET", url: "/api/products/stock-summary", headers: auth(token) });
    const s = resumo.json() as { totalProducts: number; lowStock: number; outOfStock: number };
    expect(s.totalProducts).toBe(2);
    expect(s.lowStock).toBe(1);
    expect(s.outOfStock).toBe(0);
  });

  it("SKU duplicado na mesma empresa → 409", async () => {
    const { token } = await account("ADMIN");
    const sku = uid("sku");
    await app.inject({ method: "POST", url: "/api/products", headers: auth(token), payload: { name: "Um", sku, salePrice: 1 } });
    const res = await app.inject({ method: "POST", url: "/api/products", headers: auth(token), payload: { name: "Dois", sku, salePrice: 2 } });
    expect(res.statusCode).toBe(409);
  });

  it("isolamento entre empresas: B não vê produto de A", async () => {
    const a = await account("OWNER");
    const b = await account("OWNER");
    const prod = await app.inject({
      method: "POST", url: "/api/products", headers: auth(a.token),
      payload: { name: "Produto Sigiloso " + uid("x"), salePrice: 9.9 },
    });
    const id = (prod.json() as { id: string }).id;

    const listaB = await app.inject({ method: "GET", url: "/api/products", headers: auth(b.token) });
    expect((listaB.json() as { meta: { total: number } }).meta.total).toBe(0);
    const getB = await app.inject({ method: "GET", url: `/api/products/${id}`, headers: auth(b.token) });
    expect(getB.statusCode).toBe(404);
    const movB = await app.inject({
      method: "POST", url: `/api/products/${id}/movements`, headers: auth(b.token),
      payload: { kind: "IN", quantity: 1 },
    });
    expect(movB.statusCode).toBe(404);
  });

  it("RBAC: STAFF lê produtos mas não escreve", async () => {
    const staff = await account("STAFF");
    const leitura = await app.inject({ method: "GET", url: "/api/products", headers: auth(staff.token) });
    expect(leitura.statusCode).toBe(200);
    const escrita = await app.inject({
      method: "POST", url: "/api/products", headers: auth(staff.token),
      payload: { name: "Sem Permissao", salePrice: 1 },
    });
    expect(escrita.statusCode).toBe(403);
  });

  it("validação: preço negativo → 400 e categoria de outra empresa → 400", async () => {
    const a = await account("ADMIN");
    const b = await account("ADMIN");
    const precoRuim = await app.inject({
      method: "POST", url: "/api/products", headers: auth(a.token),
      payload: { name: "Preco Invalido", salePrice: -5 },
    });
    expect(precoRuim.statusCode).toBe(400);

    const catB = await app.inject({
      method: "POST", url: "/api/product-categories", headers: auth(b.token),
      payload: { name: "Categoria de B " + uid("c") },
    });
    const catBId = (catB.json() as { id: string }).id;
    const invasao = await app.inject({
      method: "POST", url: "/api/products", headers: auth(a.token),
      payload: { name: "Invasor", salePrice: 1, categoryId: catBId },
    });
    expect(invasao.statusCode).toBe(400);
    expect((invasao.json() as { message: string }).message).toMatch(/Categoria inválida/);
  });
});
