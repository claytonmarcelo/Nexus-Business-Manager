import { describe, it, expect, afterAll } from "vitest";
import { app, makeAccount, login, cleanup, uid, type Fixture } from "./helpers";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";

// Notificações persistentes (seção 44). Estes testes provam o combinado do
// módulo: o aviso nasce da operação de negócio, quem provocou o evento não
// recebe o próprio aviso, cada tipo tem preferência independente, a varredura de
// contas vencidas não repete o mesmo aviso dentro do mês, a varredura
// administrativa é só de quem configura, e nada vaza entre empresas.
describe("Notificações persistentes", () => {
  const created: { userIds: string[]; companyIds: string[] } = { userIds: [], companyIds: [] };

  afterAll(async () => {
    await cleanup(created);
    await app.close();
  });

  const auth = (token: string) => ({ authorization: `Bearer ${token}` });
  const SENHA = "SenhaForte123!";

  async function account(role: "OWNER" | "ADMIN" | "MANAGER" | "STAFF") {
    const f = await makeAccount(role);
    created.userIds.push(f.userId);
    created.companyIds.push(f.companyId);
    return { f, token: await login(f.email, f.password) };
  }

  // Um segundo membro ativo na MESMA empresa: é ele quem deve receber o aviso
  // de uma ação praticada pelo dono da conta principal do teste.
  async function colegaDeEquipe(empresa: Fixture) {
    const email = uid("aviso") + "@nexus.test";
    const user = await prisma.user.create({
      data: { email, name: "Colega de equipe", passwordHash: await hashPassword(SENHA) },
    });
    await prisma.companyUser.create({ data: { userId: user.id, companyId: empresa.companyId, role: "STAFF" } });
    created.userIds.push(user.id);
    return { userId: user.id, email, token: await login(email, SENHA) };
  }

  interface Linha {
    id: string; kind: string; title: string; body: string | null;
    link: string | null; priority: string; lida: boolean;
  }
  async function avisos(token: string, filtro = ""): Promise<{ data: Linha[]; meta: { total: number } }> {
    const r = await app.inject({ method: "GET", url: "/api/notifications?pageSize=50" + filtro, headers: auth(token) });
    expect(r.statusCode).toBe(200);
    return r.json() as { data: Linha[]; meta: { total: number } };
  }

  // Produto monitorado + cliente + venda pendente confirmada pelo OWNER.
  // `quantidade` separa o caso "zerou o estoque" do caso "vendeu um pouco".
  async function vendaConfirmada(token: string, estoque: number, minimo: number, quantidade = estoque) {
    const prod = await app.inject({
      method: "POST", url: "/api/products", headers: auth(token),
      payload: { name: "Item Aviso " + uid("p"), salePrice: 25, stockQuantity: estoque, minStock: minimo },
    });
    expect(prod.statusCode).toBe(201);
    const productId = (prod.json() as { id: string }).id;

    const cli = await app.inject({
      method: "POST", url: "/api/clients", headers: auth(token),
      payload: { name: "Cliente Aviso " + uid("c") },
    });
    expect(cli.statusCode).toBe(201);

    const pend = await app.inject({
      method: "POST", url: "/api/sales", headers: auth(token),
      payload: { clientId: (cli.json() as { id: string }).id, items: [{ productId, quantity: quantidade, unitPrice: 25 }] },
    });
    expect(pend.statusCode).toBe(201);
    const saleId = (pend.json() as { id: string }).id;

    const conf = await app.inject({
      method: "PATCH", url: `/api/sales/${saleId}/status`, headers: auth(token), payload: { status: "CONFIRMED" },
    });
    expect(conf.statusCode).toBe(200);
    return { saleId, productId };
  }

  it("venda confirmada avisa a equipe, mas nunca quem vendeu", async () => {
    const { f, token } = await account("OWNER");
    const colega = await colegaDeEquipe(f);
    await vendaConfirmada(token, 4, 2);

    const paraColega = await avisos(colega.token, "&kind=sale");
    expect(paraColega.data.length).toBe(1);
    expect(paraColega.data[0]?.title).toContain("confirmada");
    expect(paraColega.data[0]?.link).toBe("/app/vendas");
    expect(paraColega.data[0]?.priority).toBe("LOW");
    expect(paraColega.data[0]?.lida).toBe(false);

    const paraQuemVendeu = await avisos(token, "&kind=sale");
    expect(paraQuemVendeu.data.length).toBe(0);
  });

  it("estoque zerado chega como prioridade alta", async () => {
    const { f, token } = await account("OWNER");
    const colega = await colegaDeEquipe(f);
    await vendaConfirmada(token, 3, 5); // saldo 3, mínimo 5, vende os 3 -> sobra zero

    const listas = await avisos(colega.token, "&kind=stock");
    expect(listas.data.length).toBe(1);
    expect(listas.data[0]?.priority).toBe("HIGH");
    expect(listas.data[0]?.title).toContain("Estoque zerado");
    expect(listas.data[0]?.link).toBe("/app/produtos");
  });

  it("desligar o aviso de estoque silencia só o estoque", async () => {
    const { f, token } = await account("OWNER");
    const colega = await colegaDeEquipe(f);

    const prefs = await app.inject({
      method: "PUT", url: "/api/notifications/preferences", headers: auth(colega.token),
      payload: { saleAlerts: true, lowStock: false, dailyReport: false, overdueBills: true, newLead: true, emailChannel: false, inAppChannel: true },
    });
    expect(prefs.statusCode).toBe(200);
    expect((prefs.json() as { lowStock: boolean }).lowStock).toBe(false);

    await vendaConfirmada(token, 2, 8); // zerou o estoque de propósito

    expect((await avisos(colega.token, "&kind=stock")).data.length).toBe(0);
    expect((await avisos(colega.token, "&kind=sale")).data.length).toBe(1);
  });

  it("contador do sino acompanha marcar uma e marcar todas", async () => {
    const { f, token } = await account("OWNER");
    const colega = await colegaDeEquipe(f);
    // mínimo 0 desliga o aviso de estoque e deixa o teste contando só venda + lead
    await vendaConfirmada(token, 5, 0);
    const lead = await app.inject({
      method: "POST", url: "/api/leads", headers: auth(token),
      payload: { name: "Lead sino " + uid("l"), value: 900 },
    });
    expect(lead.statusCode).toBe(201);

    const antes = await app.inject({ method: "GET", url: "/api/notifications/count", headers: auth(colega.token) });
    expect(antes.statusCode).toBe(200);
    const corpo = antes.json() as { naoLidas: number; urgentes: number; porTipo: Record<string, number> };
    expect(corpo.naoLidas).toBe(2);
    expect(corpo.urgentes).toBe(0);
    expect(corpo.porTipo.sale).toBe(1);
    expect(corpo.porTipo.lead).toBe(1);
    expect(corpo.porTipo.stock).toBe(0);

    const lista = await avisos(colega.token, "&status=naolidas");
    const uma = lista.data.find((n) => n.kind === "sale")!;
    const marcada = await app.inject({ method: "PATCH", url: `/api/notifications/${uma.id}/read`, headers: auth(colega.token) });
    expect(marcada.statusCode).toBe(200);
    expect((marcada.json() as { lida: boolean }).lida).toBe(true);

    const depois = (await app.inject({ method: "GET", url: "/api/notifications/count", headers: auth(colega.token) }))
      .json() as { naoLidas: number };
    expect(depois.naoLidas).toBe(1);

    const todas = await app.inject({ method: "POST", url: "/api/notifications/read-all", headers: auth(colega.token) });
    expect((todas.json() as { marcadas: number }).marcadas).toBe(1);

    const zerado = (await app.inject({ method: "GET", url: "/api/notifications/count", headers: auth(colega.token) }))
      .json() as { naoLidas: number };
    expect(zerado.naoLidas).toBe(0);
    expect((await avisos(colega.token, "&status=lidas")).data.length).toBe(2);
    expect((await avisos(colega.token, "&status=naolidas")).data.length).toBe(0);
  });

  it("varredura de contas vencidas avisa uma vez por mês", async () => {
    const { f, token } = await account("OWNER");
    const colega = await colegaDeEquipe(f);

    const lanc = await app.inject({
      method: "POST", url: "/api/finance/entries", headers: auth(token),
      payload: { type: "EXPENSE", description: "Aluguel vencido " + uid("f"), amount: 1500, dueDate: "2026-01-05", paid: false },
    });
    expect(lanc.statusCode).toBe(201);

    const primeira = await app.inject({ method: "POST", url: "/api/notifications/scan", headers: auth(token), payload: {} });
    expect(primeira.statusCode).toBe(200);
    // Os dois membros da empresa recebem o mesmo aviso da conta vencida.
    expect((primeira.json() as { criadas: number }).criadas).toBe(2);

    const segunda = await app.inject({ method: "POST", url: "/api/notifications/scan", headers: auth(token), payload: {} });
    expect((segunda.json() as { criadas: number }).criadas).toBe(0);

    const listos = await avisos(colega.token, "&kind=billing");
    expect(listos.data.length).toBe(1);
    expect(listos.data[0]?.title).toContain("Despesa vencido há");
    expect(listos.data[0]?.priority).toBe("HIGH"); // muito atrasada (mais de 7 dias)

    const trilha = await app.inject({ method: "GET", url: "/api/audit?entity=notification", headers: auth(token) });
    expect(trilha.statusCode).toBe(200);
    const acoes = (trilha.json() as { data: Array<{ action: string }> }).data.map((r) => r.action);
    expect(acoes).toContain("notification.scan");
  });

  it("atendente não pode disparar a varredura administrativa", async () => {
    const { f, token } = await account("OWNER");
    const colega = await colegaDeEquipe(f);

    const bloqueado = await app.inject({ method: "POST", url: "/api/notifications/scan", headers: auth(colega.token), payload: {} });
    expect(bloqueado.statusCode).toBe(403);

    // Ler os próprios avisos continua liberado para qualquer papel.
    expect((await app.inject({ method: "GET", url: "/api/notifications", headers: auth(colega.token) })).statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: "/api/notifications/count", headers: auth(colega.token) })).statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: "/api/notifications/preferences", headers: auth(colega.token) })).statusCode).toBe(200);
  });

  it("avisos não vazam entre empresas do mesmo usuário", async () => {
    const { f, token } = await account("OWNER");
    const colega = await colegaDeEquipe(f);
    await vendaConfirmada(token, 4, 0);

    // Na empresa A o colega tem um aviso de venda.
    expect((await avisos(colega.token)).data.length).toBe(1);

    // O mesmo usuário agora é OWNER de uma segunda empresa, onde nada aconteceu.
    const outra = await prisma.company.create({ data: { name: uid("Empresa B"), slug: uid("slugb") } });
    created.companyIds.push(outra.id);
    await prisma.companyUser.create({ data: { userId: colega.userId, companyId: outra.id, role: "OWNER" } });

    const tokenB = await login(colega.email, SENHA, outra.id);
    expect((await avisos(tokenB)).data.length).toBe(0);
    const resumoB = (await app.inject({ method: "GET", url: "/api/notifications/count", headers: auth(tokenB) }))
      .json() as { naoLidas: number };
    expect(resumoB.naoLidas).toBe(0);

    // A empresa ativa vem do token, nunca de um parâmetro do cliente.
    const tentativa = await app.inject({
      method: "GET", url: "/api/notifications?companyId=" + f.companyId, headers: auth(tokenB),
    });
    expect((tentativa.json() as { data: Linha[] }).data.length).toBe(0);

    // E o aviso da empresa A continua lá para quem está na empresa A.
    expect((await avisos(colega.token)).data.length).toBe(1);
  });

  it("preferências voltam com os rótulos dos tipos para a tela", async () => {
    const { token } = await account("OWNER");
    const r = await app.inject({ method: "GET", url: "/api/notifications/preferences", headers: auth(token) });
    expect(r.statusCode).toBe(200);
    const corpo = r.json() as { saleAlerts: boolean; inAppChannel: boolean; emailChannel: boolean; tipos: Array<{ kind: string; rotulo: string }> };
    expect(corpo.saleAlerts).toBe(true);
    expect(corpo.inAppChannel).toBe(true);
    expect(corpo.emailChannel).toBe(false); // nada de e-mail sem SMTP configurado
    expect(corpo.tipos.map((t) => t.kind)).toEqual(["sale", "stock", "lead", "billing", "report"]);
    expect(corpo.tipos[0]?.rotulo).toBe("Vendas");
  });
});
