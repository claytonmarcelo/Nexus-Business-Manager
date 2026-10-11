import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { app, makeAccount, login, cleanup, uid } from "./helpers";

// Fase 3b da auditoria: "saída pode deixar o saldo negativo?" deixou de ser a
// opinião única do sistema e virou política da empresa, gravada na aba Empresa
// e lida por TODAS as portas de saída — venda confirmada, estorno de compra e
// lançamento manual. Estes testes ligam a chave e percorrem as três.

describe("Política de estoque por empresa (Fase 3b)", () => {
  const created: { userIds: string[]; companyIds: string[] } = { userIds: [], companyIds: [] };
  afterAll(async () => {
    await cleanup(created);
    await app.close();
  });

  async function account(role: "OWNER" | "MANAGER" = "OWNER") {
    const f = await makeAccount(role);
    created.userIds.push(f.userId);
    created.companyIds.push(f.companyId);
    return { f, token: await login(f.email, f.password) };
  }
  const auth = (token: string) => ({ authorization: `Bearer ${token}` });

  async function produto(token: string, estoque: number) {
    const r = await app.inject({
      method: "POST", url: "/api/products", headers: auth(token),
      payload: { name: "Item Política " + uid("p"), salePrice: 10, stockQuantity: estoque, minStock: 0 },
    });
    return (r.json() as { id: string }).id;
  }
  const saldo = (productId: string) =>
    prisma.product
      .findUniqueOrThrow({ where: { id: productId }, select: { stockQuantity: true } })
      .then((p) => Number(p.stockQuantity));

  it("padrão é fechado: sem a chave ligada nenhuma saída passa sem saldo", async () => {
    const { token } = await account();
    const atual = await app.inject({ method: "GET", url: "/api/companies/current", headers: auth(token) });
    expect((atual.json() as { allowNegativeStock: boolean }).allowNegativeStock).toBe(false);

    const productId = await produto(token, 2);
    const out = await app.inject({
      method: "POST", url: `/api/products/${productId}/movements`, headers: auth(token),
      payload: { kind: "OUT", quantity: 5 },
    });
    expect(out.statusCode).toBe(400);
    expect((out.json() as { message: string }).message).toMatch(/Estoque insuficiente/);
    expect(await saldo(productId)).toBe(2);
  });

  it("liga a chave e as três portas de saída passam a aceitar o negativo", async () => {
    const { token, f } = await account();

    const liga = await app.inject({
      method: "PATCH", url: "/api/companies/current", headers: auth(token),
      payload: { allowNegativeStock: true },
    });
    expect(liga.statusCode).toBe(200);
    expect((liga.json() as { alterados: string[] }).alterados).toEqual(["allowNegativeStock"]);
    expect((liga.json() as { empresa: { allowNegativeStock: boolean } }).empresa.allowNegativeStock).toBe(true);

    // 1) Lançamento manual de saída.
    const p1 = await produto(token, 1);
    const out = await app.inject({
      method: "POST", url: `/api/products/${p1}/movements`, headers: auth(token),
      payload: { kind: "OUT", quantity: 4 },
    });
    expect(out.statusCode).toBe(201);
    expect(await saldo(p1)).toBe(-3);

    // 2) Venda confirmada acima do saldo — nem a checagem amigável de antes
    // da transação pode travar o que a empresa autorizou.
    const p2 = await produto(token, 1);
    const cli = await app.inject({ method: "POST", url: "/api/clients", headers: auth(token), payload: { name: "Cliente Política " + uid("c") } });
    const venda = await app.inject({
      method: "POST", url: "/api/sales", headers: auth(token),
      payload: { clientId: (cli.json() as { id: string }).id, confirm: true, items: [{ productId: p2, quantity: 3, unitPrice: 10 }] },
    });
    expect(venda.statusCode).toBe(201);
    expect(await saldo(p2)).toBe(-2);

    // 3) Estorno de compra recebida cujo estoque já foi consumido.
    const sup = await app.inject({ method: "POST", url: "/api/suppliers", headers: auth(token), payload: { name: "Fornecedor Política " + uid("s") } });
    const compra = await app.inject({
      method: "POST", url: "/api/purchases", headers: auth(token),
      payload: { supplierId: (sup.json() as { id: string }).id, receive: true, items: [{ productId: p1, quantity: 2, unitCost: 4 }] },
    });
    expect(compra.statusCode).toBe(201);
    expect(await saldo(p1)).toBe(-1);
    const cancel = await app.inject({
      method: "PATCH", url: `/api/purchases/${(compra.json() as { id: string }).id}/status`, headers: auth(token),
      payload: { status: "CANCELLED" },
    });
    expect(cancel.statusCode).toBe(200);
    expect(await saldo(p1)).toBe(-3);

    // A trilha de auditoria registra a mudança de política — configuração
    // sensível tem de-para, como os outros blocos da aba Empresa.
    const logs = await prisma.auditLog.findMany({
      where: { companyId: f.companyId, action: "company.settings.updated" },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    const registro = logs.find((l) => (l.metadata as { campos?: string[] } | null)?.campos?.includes("allowNegativeStock"));
    expect(registro).toBeTruthy();
    expect((registro!.metadata as { antes: Record<string, unknown>; depois: Record<string, unknown> }).depois.allowNegativeStock).toBe(true);
  });

  it("desliga de novo e a porta fecha; reenviar o mesmo valor não escreve", async () => {
    const { token } = await account();
    await app.inject({ method: "PATCH", url: "/api/companies/current", headers: auth(token), payload: { allowNegativeStock: true } });

    const repe = await app.inject({
      method: "PATCH", url: "/api/companies/current", headers: auth(token), payload: { allowNegativeStock: true },
    });
    expect((repe.json() as { alterados: string[] }).alterados).toEqual([]);

    const desliga = await app.inject({
      method: "PATCH", url: "/api/companies/current", headers: auth(token), payload: { allowNegativeStock: false },
    });
    expect((desliga.json() as { alterados: string[] }).alterados).toEqual(["allowNegativeStock"]);

    const productId = await produto(token, 1);
    const out = await app.inject({
      method: "POST", url: `/api/products/${productId}/movements`, headers: auth(token),
      payload: { kind: "OUT", quantity: 2 },
    });
    expect(out.statusCode).toBe(400);
  });

  it("gerente não liga a chave: política de empresa é settings:write", async () => {
    const { token } = await account("MANAGER");
    const tenta = await app.inject({
      method: "PATCH", url: "/api/companies/current", headers: auth(token),
      payload: { allowNegativeStock: true },
    });
    expect(tenta.statusCode).toBe(403);
  });

  it("lixo no campo é 400: o strict do schema não aceita string no booleano", async () => {
    const { token } = await account();
    const errado = await app.inject({
      method: "PATCH", url: "/api/companies/current", headers: auth(token),
      payload: { allowNegativeStock: "sim" },
    });
    expect(errado.statusCode).toBe(400);
  });
});
