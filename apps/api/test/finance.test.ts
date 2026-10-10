import { describe, it, expect, afterAll } from "vitest";
import { app, makeAccount, login, cleanup, uid } from "./helpers";

describe("Financeiro", () => {
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

  function mesAtual() {
    const d = new Date();
    return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0");
  }

  it("categorias por tipo, duplicada 409 e exclusao", async () => {
    const { token } = await account("OWNER");
    const nome = "Vendas Balcão " + uid("c");
    const criacao = await app.inject({ method: "POST", url: "/api/finance/categories", headers: auth(token), payload: { name: nome, type: "INCOME" } });
    expect(criacao.statusCode).toBe(201);
    const id = (criacao.json() as { id: string }).id;

    const dup = await app.inject({ method: "POST", url: "/api/finance/categories", headers: auth(token), payload: { name: nome, type: "INCOME" } });
    expect(dup.statusCode).toBe(409);

    // mesmo nome em tipo diferente e permitido
    const outro = await app.inject({ method: "POST", url: "/api/finance/categories", headers: auth(token), payload: { name: nome, type: "EXPENSE" } });
    expect(outro.statusCode).toBe(201);

    const lista = await app.inject({ method: "GET", url: "/api/finance/categories?type=INCOME", headers: auth(token) });
    expect((lista.json() as Array<{ name: string }>).some((c) => c.name === nome)).toBe(true);

    const rem = await app.inject({ method: "DELETE", url: `/api/finance/categories/${id}`, headers: auth(token) });
    expect(rem.statusCode).toBe(200);
  });

  it("cria receita pendente, marca paga e resumo do mes reflete", async () => {
    const { token } = await account("OWNER");
    const cat = await app.inject({ method: "POST", url: "/api/finance/categories", headers: auth(token), payload: { name: "Serviços " + uid("c"), type: "INCOME" } });
    const catId = (cat.json() as { id: string }).id;

    const lanc = await app.inject({
      method: "POST", url: "/api/finance/entries", headers: auth(token),
      payload: { type: "INCOME", description: "Consultoria mensal", amount: 1500, dueDate: mesAtual() + "-15", categoryId: catId },
    });
    expect(lanc.statusCode).toBe(201);
    const e = lanc.json() as { id: string; status: string; amount: number; categoryName: string };
    expect(e.status).toBe("PENDING");
    expect(e.amount).toBe(1500);
    expect(e.categoryName).toMatch(/^Serviços/);

    const pago = await app.inject({ method: "PATCH", url: `/api/finance/entries/${e.id}/status`, headers: auth(token), payload: { status: "PAID" } });
    expect((pago.json() as { status: string; paidAt: string | null }).paidAt).not.toBeNull();

    const resumo = await app.inject({ method: "GET", url: `/api/finance/summary?month=${mesAtual()}`, headers: auth(token) });
    const s = resumo.json() as { income: number; pendingIncome: number; balance: number };
    expect(s.income).toBe(1500);
    expect(s.pendingIncome).toBe(0);
    expect(s.balance).toBe(1500);

    const trilha = await app.inject({ method: "GET", url: "/api/audit?pageSize=50", headers: auth(token) });
    const acoes = (trilha.json() as { data: Array<{ action: string }> }).data.map((r) => r.action);
    expect(acoes).toContain("finance.create");
    expect(acoes).toContain("finance.paid");
  });

  it("despesa atrasada conta no resumo e filtro por mes isola", async () => {
    const { token } = await account("ADMIN");
    const atrasada = await app.inject({
      method: "POST", url: "/api/finance/entries", headers: auth(token),
      payload: { type: "EXPENSE", description: "Aluguel atrasado", amount: 900, dueDate: "2025-01-10" },
    });
    expect(atrasada.statusCode).toBe(201);

    const resumo = await app.inject({ method: "GET", url: "/api/finance/summary", headers: auth(token) });
    const s = resumo.json() as { overdueCount: number; overdueAmount: number };
    expect(s.overdueCount).toBe(1);
    expect(s.overdueAmount).toBe(900);

    const jan25 = await app.inject({ method: "GET", url: "/api/finance/entries?month=2025-01", headers: auth(token) });
    expect((jan25.json() as { meta: { total: number } }).meta.total).toBe(1);
    const outro = await app.inject({ method: "GET", url: "/api/finance/entries?month=2026-06", headers: auth(token) });
    expect((outro.json() as { meta: { total: number } }).meta.total).toBe(0);
  });

  it("validacoes: categoria de tipo errado, mes invalido e valor negativo", async () => {
    const { token } = await account("OWNER");
    const cat = await app.inject({ method: "POST", url: "/api/finance/categories", headers: auth(token), payload: { name: "Despesas fixas " + uid("c"), type: "EXPENSE" } });
    const catId = (cat.json() as { id: string }).id;

    const errado = await app.inject({
      method: "POST", url: "/api/finance/entries", headers: auth(token),
      payload: { type: "INCOME", description: "Conta errada", amount: 10, dueDate: "2026-10-10", categoryId: catId },
    });
    expect(errado.statusCode).toBe(400);

    const mesRuim = await app.inject({ method: "GET", url: "/api/finance/entries?month=10-2026", headers: auth(token) });
    expect(mesRuim.statusCode).toBe(400);

    const negativo = await app.inject({
      method: "POST", url: "/api/finance/entries", headers: auth(token),
      payload: { type: "INCOME", description: "Valor inválido", amount: -5, dueDate: "2026-10-10" },
    });
    expect(negativo.statusCode).toBe(400);
  });

  it("isolamento entre empresas e RBAC STAFF", async () => {
    const a = await account("OWNER");
    const b = await account("OWNER");
    const lanc = await app.inject({
      method: "POST", url: "/api/finance/entries", headers: auth(a.token),
      payload: { type: "EXPENSE", description: "Segredo industrial", amount: 42, dueDate: mesAtual() + "-20" },
    });
    const id = (lanc.json() as { id: string }).id;

    const listaB = await app.inject({ method: "GET", url: "/api/finance/entries", headers: auth(b.token) });
    expect((listaB.json() as { meta: { total: number } }).meta.total).toBe(0);
    const getB = await app.inject({ method: "GET", url: `/api/finance/entries/${id}`, headers: auth(b.token) });
    expect(getB.statusCode).toBe(404);

    const staff = await account("STAFF");
    expect((await app.inject({ method: "GET", url: "/api/finance/entries", headers: auth(staff.token) })).statusCode).toBe(200);
    const escrita = await app.inject({
      method: "POST", url: "/api/finance/entries", headers: auth(staff.token),
      payload: { type: "INCOME", description: "Sem permissao", amount: 1, dueDate: mesAtual() + "-01" },
    });
    expect(escrita.statusCode).toBe(403);
  });
});
