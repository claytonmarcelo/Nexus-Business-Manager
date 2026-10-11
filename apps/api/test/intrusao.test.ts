import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { app, makeAccount, login, cleanup, uid } from "./helpers";
import { prisma } from "../src/lib/prisma";

// ===== Fase 1d da auditoria — intrusão A×B =====
// Duas empresas reais, dois OWNERs reais. A cria registros pela API como sempre
// foi; B ataca toda rota de escrita (e toda leitura por id) com os ids da
// empresa A, mandando payloads perfeitamente válidos — o único erro de B é
// apontar para a linha de outra empresa. Nenhum ataque pode passar: 404 na
// linha que não é dele, 403 onde a regra é da pessoa (sessão), 400 quando a
// tentativa é conectar um registro de A num cadastro de B. No fim cada linha
// de A é conferida no banco para provar que nada foi tocado em silêncio. Esta
// é a rede que segura a camada da Fase 1c: mesmo que uma chamada futura pule
// a leitura de confirmação, o companyId dentro do where não deixa escrever.

describe("Intrusão A×B em todas as rotas de escrita de tenant", () => {
  const created: { userIds: string[]; companyIds: string[] } = { userIds: [], companyIds: [] };
  let a: { userId: string; companyId: string; email: string; password: string };
  let b: { userId: string; companyId: string; email: string; password: string };
  let tokenA = "";
  let tokenB = "";

  const ids: Record<string, string> = {};
  let sessaoA = "";
  let avisosA = 0;

  const auth = (t: string) => ({ authorization: `Bearer ${t}` });

  async function criarComA(url: string, payload: unknown): Promise<{ id?: string }> {
    const res = await app.inject({ method: "POST", url, headers: auth(tokenA), payload: payload as object });
    expect([200, 201], `setup POST ${url} → ${res.statusCode} ${res.body.slice(0, 200)}`).toContain(res.statusCode);
    return res.json() as { id?: string };
  }

  async function atacar(codigo: number, method: "GET" | "POST" | "PATCH" | "DELETE", url: string, payload?: unknown) {
    const res = await app.inject({
      method,
      url,
      headers: auth(tokenB),
      ...(payload ? { payload: payload as object } : {}),
    });
    expect(res.statusCode, `${method} ${url} → esperado ${codigo}, veio ${res.statusCode}: ${res.body.slice(0, 200)}`).toBe(codigo);
    return res;
  }

  beforeAll(async () => {
    a = await makeAccount("OWNER");
    b = await makeAccount("OWNER");
    created.userIds.push(a.userId, b.userId);
    created.companyIds.push(a.companyId, b.companyId);
    tokenA = await login(a.email, a.password);
    tokenB = await login(b.email, b.password);

    ids.cliente = (await criarComA("/api/clients", { name: uid("Cliente A") })).id!;
    ids.categoria = (await criarComA("/api/product-categories", { name: uid("Categoria A") })).id!;
    ids.produto = (await criarComA("/api/products", {
      name: uid("Produto A"), unit: "un", salePrice: 10, stockQuantity: 5, trackStock: true,
    })).id!;
    ids.fornecedor = (await criarComA("/api/suppliers", { name: uid("Fornecedor A") })).id!;
    ids.fincat = (await criarComA("/api/finance/categories", { name: uid("Despesa A"), type: "EXPENSE" })).id!;
    // Vencida de propósito: serve de isca para a varredura cross-tenant.
    ids.lancamento = (await criarComA("/api/finance/entries", {
      type: "EXPENSE", description: "Luz da empresa A", amount: 150, dueDate: "2020-01-05T12:00:00.000Z",
    })).id!;
    ids.lead = (await criarComA("/api/leads", { name: uid("Lead A"), value: 500 })).id!;
    ids.evento = (await criarComA("/api/agenda/events", {
      title: "Reuniao da empresa A", startAt: "2026-12-03T15:00:00.000Z",
    })).id!;
    ids.venda = (await criarComA("/api/sales", {
      items: [{ productId: ids.produto, quantity: 1, unitPrice: 10 }],
    })).id!;
    ids.compra = (await criarComA("/api/purchases", {
      supplierId: ids.fornecedor, items: [{ productId: ids.produto, quantity: 2, unitCost: 8 }],
    })).id!;

    const aviso = await prisma.notification.create({
      data: { userId: a.userId, companyId: a.companyId, kind: "auditoria", title: "Aviso só da empresa A" },
    });
    ids.aviso = aviso.id;
    avisosA = await prisma.notification.count({ where: { companyId: a.companyId } });

    const sess = await prisma.refreshToken.findFirst({
      where: { userId: a.userId, revokedAt: null },
      orderBy: { createdAt: "desc" },
    });
    expect(sess, "o login de A precisa deixar uma sessão").toBeTruthy();
    sessaoA = sess!.id;
  });

  afterAll(async () => {
    if (ids.aviso) await prisma.notification.deleteMany({ where: { id: ids.aviso } });
    await cleanup(created);
  });

  it("leituras por id não atravessam: todo GET de linha alheia volta 404", async () => {
    await atacar(404, "GET", `/api/clients/${ids.cliente}`);
    await atacar(404, "GET", `/api/products/${ids.produto}`);
    await atacar(404, "GET", `/api/sales/${ids.venda}`);
    await atacar(404, "GET", `/api/purchases/${ids.compra}`);
    await atacar(404, "GET", `/api/finance/entries/${ids.lancamento}`);
    await atacar(404, "GET", `/api/leads/${ids.lead}`);
    await atacar(404, "GET", `/api/agenda/events/${ids.evento}`);
  });

  it("clientes: alterar e desativar a linha de A → 404", async () => {
    await atacar(404, "PATCH", `/api/clients/${ids.cliente}`, { name: "B roubou o cliente" });
    await atacar(404, "DELETE", `/api/clients/${ids.cliente}`);
  });

  it("produtos e categorias: editar, desativar e movimentar estoque de A → 404", async () => {
    await atacar(404, "PATCH", `/api/product-categories/${ids.categoria}`, { name: "B roubou a categoria" });
    await atacar(404, "PATCH", `/api/products/${ids.produto}`, { name: "B roubou o produto", salePrice: 99 });
    await atacar(404, "DELETE", `/api/products/${ids.produto}`);
    await atacar(404, "POST", `/api/products/${ids.produto}/movements`, { kind: "IN", quantity: 100 });
  });

  it("vendas: confirmar a venda de A → 404 e nada de estoque baixado", async () => {
    await atacar(404, "PATCH", `/api/sales/${ids.venda}/status`, { status: "CONFIRMED" });
  });

  it("fornecedores e compras: editar, desativar e receber de A → 404", async () => {
    await atacar(404, "PATCH", `/api/suppliers/${ids.fornecedor}`, { name: "B roubou o fornecedor" });
    await atacar(404, "DELETE", `/api/suppliers/${ids.fornecedor}`);
    await atacar(404, "PATCH", `/api/purchases/${ids.compra}/status`, { status: "RECEIVED" });
  });

  it("financeiro: editar, pagar e excluir de A → 404", async () => {
    await atacar(404, "DELETE", `/api/finance/categories/${ids.fincat}`);
    await atacar(404, "PATCH", `/api/finance/entries/${ids.lancamento}`, { description: "B roubou o lançamento", amount: 999 });
    await atacar(404, "PATCH", `/api/finance/entries/${ids.lancamento}/status`, { status: "PAID" });
  });

  it("CRM: editar e ganhar o lead de A → 404, sem converter em cliente de B", async () => {
    await atacar(404, "PATCH", `/api/leads/${ids.lead}`, { name: "B roubou o lead" });
    await atacar(404, "PATCH", `/api/leads/${ids.lead}/status`, { status: "WON" });
  });

  it("agenda: editar, concluir e excluir o compromisso de A → 404", async () => {
    await atacar(404, "PATCH", `/api/agenda/events/${ids.evento}`, { title: "B roubou o compromisso" });
    await atacar(404, "PATCH", `/api/agenda/events/${ids.evento}/status`, { status: "DONE" });
    await atacar(404, "DELETE", `/api/agenda/events/${ids.evento}`);
  });

  it("avisos: marcar lida a notificação de outra pessoa em outra empresa → 404", async () => {
    await atacar(404, "PATCH", `/api/notifications/${ids.aviso}/read`);
  });

  it("sessão: derrubar o login de A pela rota da empresa de B → 403 (regra da pessoa, não da empresa)", async () => {
    await atacar(403, "DELETE", `/api/users/sessions/${sessaoA}`);
  });

  it("usuários: mudar o papel de quem não é membro da empresa de B → 404", async () => {
    await atacar(404, "PATCH", `/api/users/${a.userId}/role`, { role: "STAFF" });
  });

  it("referências cruzadas: cadastro de B não pode apontar para linha de A", async () => {
    await atacar(400, "POST", "/api/finance/entries", {
      type: "EXPENSE", description: "B ligada na categoria de A", amount: 10,
      dueDate: "2026-01-10T12:00:00.000Z", categoryId: ids.fincat,
    });
    await atacar(400, "POST", "/api/sales", {
      items: [{ productId: ids.produto, quantity: 1, unitPrice: 10 }],
    });
    await atacar(400, "POST", "/api/purchases", {
      supplierId: ids.fornecedor, items: [{ productId: ids.produto, quantity: 1, unitCost: 8 }],
    });
  });

  it("varredura: o scan de B ignora companyId no corpo e não gera aviso na empresa de A", async () => {
    const res = await atacar(200, "POST", "/api/notifications/scan", { companyId: a.companyId });
    expect(res.json().criadas).toBe(0);
    expect(await prisma.notification.count({ where: { companyId: a.companyId } })).toBe(avisosA);
  });

  it("conferido no banco: nenhuma linha de A foi tocada em silêncio", async () => {
    const cliente = await prisma.client.findFirst({ where: { id: ids.cliente } });
    expect(cliente?.active).toBe(true);
    expect(cliente?.name).not.toMatch(/^B roubou/);

    const produto = await prisma.product.findFirst({ where: { id: ids.produto } });
    expect(produto?.active).toBe(true);
    expect(Number(produto?.stockQuantity)).toBe(5);

    const venda = await prisma.sale.findFirst({ where: { id: ids.venda } });
    expect(venda?.status).toBe("PENDING");

    const compra = await prisma.purchase.findFirst({ where: { id: ids.compra } });
    expect(compra?.status).toBe("DRAFT");

    const fornecedor = await prisma.supplier.findFirst({ where: { id: ids.fornecedor } });
    expect(fornecedor?.active).toBe(true);

    const lancamento = await prisma.financeEntry.findFirst({ where: { id: ids.lancamento } });
    expect(lancamento?.status).toBe("PENDING");
    expect(lancamento?.paidAt).toBeNull();

    const lead = await prisma.lead.findFirst({ where: { id: ids.lead } });
    expect(lead?.status).toBe("NEW");
    expect(lead?.clientId).toBeNull();

    const evento = await prisma.agendaEvent.findFirst({ where: { id: ids.evento } });
    expect(evento?.status).toBe("SCHEDULED");
    expect(evento?.title).toBe("Reuniao da empresa A");

    const aviso = await prisma.notification.findFirst({ where: { id: ids.aviso } });
    expect(aviso?.readAt).toBeNull();

    const sessao = await prisma.refreshToken.findFirst({ where: { id: sessaoA } });
    expect(sessao?.revokedAt).toBeNull();
  });
});
