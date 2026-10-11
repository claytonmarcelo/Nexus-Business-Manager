import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { app, makeAccount, login, cleanup, uid } from "./helpers";

// Fase 3a da auditoria (seção E, o CRÍTICO de oversell): estes testes não
// perguntam se a guarda existe — perguntam se ela AGUENTA dois cliques ao
// mesmo tempo. Cada cenário martela a mesma linha em paralelo e exige que o
// banco, não o JavaScript, seja quem decidiu o saldo no fim.

describe("Estoque atômico sob concorrência (Fase 3a)", () => {
  const created: { userIds: string[]; companyIds: string[] } = { userIds: [], companyIds: [] };
  afterAll(async () => {
    await cleanup(created);
    await app.close();
  });

  async function account() {
    const f = await makeAccount("OWNER");
    created.userIds.push(f.userId);
    created.companyIds.push(f.companyId);
    return { f, token: await login(f.email, f.password) };
  }
  const auth = (token: string) => ({ authorization: `Bearer ${token}` });

  async function produto(token: string, estoque: number, nome = "Item Oversell " + uid("p")) {
    const r = await app.inject({
      method: "POST", url: "/api/products", headers: auth(token),
      payload: { name: nome, salePrice: 10, stockQuantity: estoque, minStock: 0 },
    });
    return (r.json() as { id: string }).id;
  }
  async function cliente(token: string) {
    const r = await app.inject({
      method: "POST", url: "/api/clients", headers: auth(token),
      payload: { name: "Cliente Oversell " + uid("c") },
    });
    return (r.json() as { id: string }).id;
  }
  const saldo = async (productId: string) =>
    Number(await prisma.product
      .findUniqueOrThrow({ where: { id: productId }, select: { stockQuantity: true } })
      .then((p) => p.stockQuantity));

  it("duas confirmações simultâneas da MESMA venda: uma passa, o estoque baixa uma vez", async () => {
    const { token } = await account();
    const productId = await produto(token, 5);
    const clientId = await cliente(token);

    const pend = await app.inject({
      method: "POST", url: "/api/sales", headers: auth(token),
      payload: { clientId, items: [{ productId, quantity: 3, unitPrice: 10 }] },
    });
    const saleId = (pend.json() as { id: string }).id;

    const [a, b] = await Promise.all([
      app.inject({ method: "PATCH", url: `/api/sales/${saleId}/status`, headers: auth(token), payload: { status: "CONFIRMED" } }),
      app.inject({ method: "PATCH", url: `/api/sales/${saleId}/status`, headers: auth(token), payload: { status: "CONFIRMED" } }),
    ]);
    const codigos = [a.statusCode, b.statusCode].sort();
    expect(codigos[0]).toBe(200);
    expect(codigos[1]).toBe(400);
    // 5 - 3 UMA vez; se a segunda baixada tivesse passado, daria 2 (ou negativo).
    expect(await saldo(productId)).toBe(2);
    const outs = await prisma.stockMovement.count({ where: { productId, kind: "OUT" } });
    expect(outs).toBe(1);
  });

  it("duas vendas diferentes disputando o mesmo saldo: não existe oversell, nunca negativa", async () => {
    const { token } = await account();
    const productId = await produto(token, 5);
    const clientId = await cliente(token);

    const corrida = await Promise.all([
      app.inject({ method: "POST", url: "/api/sales", headers: auth(token), payload: { clientId, confirm: true, items: [{ productId, quantity: 5, unitPrice: 10 }] } }),
      app.inject({ method: "POST", url: "/api/sales", headers: auth(token), payload: { clientId, confirm: true, items: [{ productId, quantity: 5, unitPrice: 10 }] } }),
    ]);
    const codigos = corrida.map((r) => r.statusCode).sort();
    expect(codigos[0]).toBe(201);
    expect(codigos[1]).toBe(400);
    expect(await saldo(productId)).toBe(0);
    // A venda recusada não pode ter deixado rastro no banco.
    const confirmadas = await prisma.sale.count({ where: { items: { some: { productId } }, status: "CONFIRMED" } });
    expect(confirmadas).toBe(1);
  });

  it("receber a mesma compra duas vezes em paralelo: estoque entra uma única vez", async () => {
    const { token } = await account();
    const productId = await produto(token, 0);
    const sup = await app.inject({
      method: "POST", url: "/api/suppliers", headers: auth(token),
      payload: { name: "Fornecedor Oversell " + uid("s") },
    });
    const purchase = await app.inject({
      method: "POST", url: "/api/purchases", headers: auth(token),
      payload: { supplierId: (sup.json() as { id: string }).id, items: [{ productId, quantity: 7, unitCost: 4 }] },
    });
    const id = (purchase.json() as { id: string }).id;

    const [a, b] = await Promise.all([
      app.inject({ method: "PATCH", url: `/api/purchases/${id}/status`, headers: auth(token), payload: { status: "RECEIVED" } }),
      app.inject({ method: "PATCH", url: `/api/purchases/${id}/status`, headers: auth(token), payload: { status: "RECEIVED" } }),
    ]);
    const codigos = [a.statusCode, b.statusCode].sort();
    expect(codigos[0]).toBe(200);
    expect(codigos[1]).toBe(400);
    expect(await saldo(productId)).toBe(7);
    const ins = await prisma.stockMovement.count({ where: { productId, kind: "IN" } });
    expect(ins).toBe(1);
  });

  it("dois lançamentos OUT manuais simultâneos: só o que tem saldo passa", async () => {
    const { token } = await account();
    const productId = await produto(token, 10);

    const corrida = await Promise.all([
      app.inject({ method: "POST", url: `/api/products/${productId}/movements`, headers: auth(token), payload: { kind: "OUT", quantity: 8 } }),
      app.inject({ method: "POST", url: `/api/products/${productId}/movements`, headers: auth(token), payload: { kind: "OUT", quantity: 8 } }),
    ]);
    const codigos = corrida.map((r) => r.statusCode).sort();
    expect(codigos[0]).toBe(201);
    expect(codigos[1]).toBe(400);
    expect(await saldo(productId)).toBe(2);
  });

  it("cancelar e receber a mesma compra em paralelo: o status é reivindicado uma vez", async () => {
    const { token } = await account();
    const productId = await produto(token, 0);
    const sup = await app.inject({
      method: "POST", url: "/api/suppliers", headers: auth(token),
      payload: { name: "Fornecedor Corrida " + uid("s") },
    });
    const purchase = await app.inject({
      method: "POST", url: "/api/purchases", headers: auth(token),
      payload: { supplierId: (sup.json() as { id: string }).id, items: [{ productId, quantity: 3, unitCost: 5 }] },
    });
    const id = (purchase.json() as { id: string }).id;

    const [a, b] = await Promise.all([
      app.inject({ method: "PATCH", url: `/api/purchases/${id}/status`, headers: auth(token), payload: { status: "RECEIVED" } }),
      app.inject({ method: "PATCH", url: `/api/purchases/${id}/status`, headers: auth(token), payload: { status: "CANCELLED" } }),
    ]);
    const codigos = [a.statusCode, b.statusCode].sort();
    expect(codigos[0]).toBe(200);
    expect(codigos[1]).toBe(400);
    // Seja qual for o vencedor, o saldo conta a mesma história que o status.
    const final = await prisma.purchase.findUniqueOrThrow({ where: { id }, select: { status: true } });
    expect(await saldo(productId)).toBe(final.status === "RECEIVED" ? 3 : 0);
  });

  // A3 do prompt de mercado, no caso que a validação linha a linha nunca viu:
  // a mesma nota pedindo o MESMO produto duas vezes. Cada linha de 6 passava
  // sozinha na comparação com o saldo 10, e a baixa absoluta escrevia uma vez
  // só — vendia 6 e cobrava 12. Hoje o saldo é decidido dentro da transação,
  // linha por linha, e a segunda baixa não casa: a nota inteira volta.
  it("mesmo produto em duas linhas (6+6) sobre saldo 10: 400 e nada aconteceu", async () => {
    const { token } = await account();
    const productId = await produto(token, 10);
    const clientId = await cliente(token);

    const res = await app.inject({
      method: "POST", url: "/api/sales", headers: auth(token),
      payload: {
        clientId,
        confirm: true,
        items: [
          { productId, quantity: 6, unitPrice: 10 },
          { productId, quantity: 6, unitPrice: 10 },
        ],
      },
    });
    expect(res.statusCode).toBe(400);

    // O saldo não foi "quase" mexido: a transação voltou inteira.
    expect(await saldo(productId)).toBe(10);
    expect(await prisma.stockMovement.count({ where: { productId, kind: "OUT" } })).toBe(0);
    expect(await prisma.sale.count({ where: { clientId } })).toBe(0);
  });

  // A outra ponta da A3: o saldo final tem que conferir com a soma das
  // movimentações. Se a baixa fosse uma conta de JavaScript escrita por cima,
  // a corrida deixaria para trás um número que o razão não sabe explicar.
  it("depois de entrada, saída e recusa, o saldo é exatamente a conta do razão", async () => {
    const { token } = await account();
    const productId = await produto(token, 10);
    const clientId = await cliente(token);

    await app.inject({
      method: "POST", url: `/api/products/${productId}/movements`, headers: auth(token),
      payload: { kind: "OUT", quantity: 2, note: "Perda de inventário" },
    });
    // Venda de 6: passa (sobravam 8).
    const primeira = await app.inject({
      method: "POST", url: "/api/sales", headers: auth(token),
      payload: { clientId, confirm: true, items: [{ productId, quantity: 6, unitPrice: 10 }] },
    });
    expect(primeira.statusCode).toBe(201);
    // Venda de 6 outra vez: sobraram 2, e o banco diz não.
    const segunda = await app.inject({
      method: "POST", url: "/api/sales", headers: auth(token),
      payload: { clientId, confirm: true, items: [{ productId, quantity: 6, unitPrice: 10 }] },
    });
    expect(segunda.statusCode).toBe(400);

    const entradas = await prisma.stockMovement.aggregate({ where: { productId, kind: "IN" }, _sum: { quantity: true } });
    const saidas = await prisma.stockMovement.aggregate({ where: { productId, kind: "OUT" }, _sum: { quantity: true } });
    // ADJUST declara um saldo absoluto de propósito (é contagem de inventário, não
    // movimento), então a invariante do razão vale neste produto enquanto ele não
    // houver passado por um — e aqui não passou.
    expect(await prisma.stockMovement.count({ where: { productId, kind: "ADJUST" } })).toBe(0);
    expect(await saldo(productId)).toBe(
      Number(entradas._sum.quantity ?? 0) - Number(saidas._sum.quantity ?? 0),
    );
    expect(await saldo(productId)).toBe(2);
  });
});
