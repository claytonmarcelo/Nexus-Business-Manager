import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { app, makeAccount, login, cleanup, uid } from "./helpers";

// F3.2 Parte 2 — Cobranças e Gateways.
//
// Este arquivo nasce ANTES do módulo, igual à Parte 1: cada asserção abaixo é uma
// regra de negócio que o projeto ainda não tem. Ele foi escrito para falhar, e a
// primeira execução (sem tabela, sem rota, sem permissão) derruba 404 em cima de
// 404 — é essa saída, colada no relatório, que prova que o teste não foi colado
// depois do código.
//
// O que ele vigia:
//   criar cobrança (PIX por chave, boleto/transferência por instruções, dinheiro,
//   cartão por maquininha) com número sequencial POR EMPRESA e sem corrida;
//   a chave PIX validada pelo TIPO dela, e nada de credencial de terceiro;
//   no máximo uma cobrança PENDING por venda e por ordem de serviço (409);
//   o pagamento registrado por pessoa, que cria o lançamento financeiro UMA
//   única vez — inclusive quando duas requisições chegam juntas;
//   o cancelamento com motivo, e o PAID que não se cancela;
//   "vencida" calculada na leitura, no calendário da empresa, não no do servidor;
//   isolamento A×B, matriz de permissões e auditoria em toda escrita;
//   a tela de gateways: MANUAL configurável e os três provedores de mercado
//   declarados indisponíveis, sem campo de credencial e sem webhook.

type Papel = "OWNER" | "ADMIN" | "MANAGER" | "STAFF";

const created: { userIds: string[]; companyIds: string[] } = { userIds: [], companyIds: [] };

afterAll(async () => {
  await cleanup(created);
  await app.close();
});

const auth = (token: string) => ({ authorization: `Bearer ${token}` });

async function conta(role: Papel) {
  const f = await makeAccount(role);
  created.userIds.push(f.userId);
  created.companyIds.push(f.companyId);
  return { f, token: await login(f.email, f.password) };
}

async function cliente(token: string, nome: string): Promise<string> {
  const res = await app.inject({ method: "POST", url: "/api/clients", headers: auth(token), payload: { name: nome } });
  expect(res.statusCode).toBe(201);
  return (res.json() as { id: string }).id;
}

async function produto(token: string, nome: string): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/api/products",
    headers: auth(token),
    payload: { name: nome, salePrice: 10, stockQuantity: 10, minStock: 0 },
  });
  expect(res.statusCode).toBe(201);
  return (res.json() as { id: string }).id;
}

async function venda(token: string, clientId: string, productId: string): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/api/sales",
    headers: auth(token),
    payload: { clientId, confirm: true, items: [{ productId, quantity: 1, unitPrice: "10,00" }] },
  });
  expect(res.statusCode).toBe(201);
  return (res.json() as { id: string }).id;
}

async function ordem(token: string, clientId: string, productId: string): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/api/service-orders",
    headers: auth(token),
    payload: {
      clientId,
      title: "Conserto para cobrar",
      items: [{ kind: "SERVICE", description: "Mao de obra", quantity: 1, unitPrice: "40,00" }, { kind: "PART", productId, quantity: 1 }],
    },
  });
  expect(res.statusCode).toBe(201);
  return (res.json() as { id: string }).id;
}

/** "AAAA-MM-DD" do dia da empresa, `dias` antes ou depois de hoje. */
function diaEmpresa(timeZone: string, dias: number): string {
  const base = new Date(Date.now() + dias * 86_400_000);
  const partes = new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(base);
  const campo = (t: string) => partes.find((p) => p.type === t)?.value ?? "01";
  return `${campo("year")}-${campo("month")}-${campo("day")}`;
}

async function criar(token: string, payload: Record<string, unknown>) {
  return app.inject({ method: "POST", url: "/api/charges", headers: auth(token), payload });
}

async function novaCobranca(token: string, clientId: string, extra: Record<string, unknown> = {}) {
  const res = await criar(token, {
    clientId,
    title: "Cobranca de servico",
    amount: "150,00",
    method: "BOLETO",
    dueDate: diaEmpresa("UTC", 5),
    instructions: "Pague no balcao ou por transferencia.",
    ...extra,
  });
  expect(res.statusCode, res.body).toBe(201);
  return res.json() as { id: string; number: number; status: string; amount: number; dueDate: string; overdue: boolean; financeEntryId: string | null };
}

async function pagar(token: string, id: string, payload: Record<string, unknown> = {}) {
  return app.inject({ method: "POST", url: `/api/charges/${id}/pay`, headers: auth(token), payload });
}

async function cancelar(token: string, id: string, reason: string) {
  return app.inject({ method: "POST", url: `/api/charges/${id}/cancel`, headers: auth(token), payload: { reason } });
}

async function detalhe(token: string, id: string) {
  return app.inject({ method: "GET", url: `/api/charges/${id}`, headers: auth(token) });
}

async function audios(token: string): Promise<string[]> {
  const res = await app.inject({ method: "GET", url: "/api/audit?pageSize=60", headers: auth(token) });
  return (res.json() as { data: { action: string }[] }).data.map((r) => r.action);
}

// Fuso fixo da empresa + o relógio do teste convivem: a cobrança vencida é a de
// ONTEM no calendário de quem cobra, e a do dia nunca nasce vencida.
describe("Cobranças — criar", () => {
  it("cria PENDING com número 1, valor do servidor e sem lançamento financeiro", async () => {
    const { token } = await conta("OWNER");
    const cli = await cliente(token, "Cliente Alfa");
    const c = await novaCobranca(token, cli);
    expect(c.number).toBe(1);
    expect(c.status).toBe("PENDING");
    expect(c.amount).toBe(150);
    expect(c.financeEntryId).toBeNull();
    expect(c.overdue).toBe(false);

    const corpo = (await detalhe(token, c.id)).json() as {
      clientName: string | null;
      createdByName: string | null;
      instructions: string | null;
      method: string;
    };
    expect(corpo.clientName).toBe("Cliente Alfa");
    expect(corpo.createdByName).toBe("Teste");
    expect(corpo.method).toBe("BOLETO");
    expect(corpo.instructions).toBe("Pague no balcao ou por transferencia.");

    expect(await audios(token)).toContain("charge.create");
  });

  it("numera por empresa: duas empresas têm cobrança 1, e a mesma empresa segue 1, 2", async () => {
    const a = await conta("OWNER");
    const b = await conta("OWNER");
    const ca = await cliente(a.token, "Cliente A");
    const cb = await cliente(b.token, "Cliente B");
    const primeira = await novaCobranca(a.token, ca);
    const doLado = await novaCobranca(b.token, cb);
    const segunda = await novaCobranca(a.token, ca, { amount: "80,00" });
    expect(primeira.number).toBe(1);
    expect(doLado.number).toBe(1);
    expect(segunda.number).toBe(2);
  });

  it("oito criações simultâneas viram números 1..8, sem repetição", async () => {
    const { token } = await conta("OWNER");
    const cli = await cliente(token, "Cliente Concorrente");
    const respostas = await Promise.all(
      Array.from({ length: 8 }, () => criar(token, {
        clientId: cli,
        title: "Cobranca simultanea",
        amount: "10,00",
        method: "DINHEIRO",
        dueDate: diaEmpresa("UTC", 3),
      })),
    );
    for (const r of respostas) expect(r.statusCode, r.body).toBe(201);
    const numeros = (respostas.map((r) => (r.json() as { number: number }).number)).sort((x, y) => x - y);
    expect(numeros).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("recusa valor zero, valor negativo e título vazio", async () => {
    const { token } = await conta("OWNER");
    const cli = await cliente(token, "Cliente Borda");
    expect((await criar(token, { clientId: cli, title: "X", amount: "0,00", method: "BOLETO", dueDate: diaEmpresa("UTC", 1) })).statusCode).toBe(400);
    expect((await criar(token, { clientId: cli, title: "X", amount: "-5,00", method: "BOLETO", dueDate: diaEmpresa("UTC", 1) })).statusCode).toBe(400);
    expect((await criar(token, { clientId: cli, title: "", amount: "5,00", method: "BOLETO", dueDate: diaEmpresa("UTC", 1) })).statusCode).toBe(400);
  });

  it("exige cliente próprio, ou venda/OS da própria empresa", async () => {
    const { token } = await conta("OWNER");
    const cli = await cliente(token, "Cliente Vinculo");
    // Sem ninguém para cobrar: a cobrança não tem destinatário.
    expect((await criar(token, { title: "Solta", amount: "10,00", method: "BOLETO", dueDate: diaEmpresa("UTC", 1) })).statusCode).toBe(400);
    // Vinculo existe, mas é de outra empresa — o id do corpo nunca vale.
    const outra = await conta("OWNER");
    const vendaDeOutra = await venda(outra.token, await cliente(outra.token, "Cliente de Outra Empresa"), await produto(outra.token, "Produto de Outra Empresa"));
    const res = await criar(token, { clientId: cli, saleId: vendaDeOutra, title: "Ajabizada", amount: "10,00", method: "BOLETO", dueDate: diaEmpresa("UTC", 1) });
    expect(res.statusCode).toBe(400);
  });

  it("liga em venda e em ordem de serviço, e deriva o cliente do documento", async () => {
    const { token } = await conta("OWNER");
    const cli = await cliente(token, "Cliente Documento");
    const prod = await produto(token, "Produto Documento");
    const v = await venda(token, cli, prod);
    const c = await criar(token, { saleId: v, title: "Cobranca da venda", amount: "10,00", method: "PIX", pixKeyType: "ALEATORIA", pixKey: "abc-123-chave", dueDate: diaEmpresa("UTC", 2) });
    expect(c.statusCode, c.body).toBe(201);
    const corpo = (await detalhe(token, (c.json() as { id: string }).id)).json() as { clientId: string | null; saleId: string | null };
    expect(corpo.clientId).toBe(cli);
    expect(corpo.saleId).toBe(v);

    const os = await ordem(token, cli, prod);
    const daOs = await criar(token, { serviceOrderId: os, title: "Cobranca da OS", amount: "50,00", method: "TRANSFERENCIA", dueDate: diaEmpresa("UTC", 2), instructions: "Chave do banco" });
    expect(daOs.statusCode, daOs.body).toBe(201);
  });

  it("não deixa duas pendentes na mesma venda nem na mesma OS", async () => {
    const { token } = await conta("OWNER");
    const cli = await cliente(token, "Cliente Unica");
    const prod = await produto(token, "Produto Unico");
    const v = await venda(token, cli, prod);
    const primeira = await criar(token, { saleId: v, title: "Cobranca da venda", amount: "10,00", method: "BOLETO", dueDate: diaEmpresa("UTC", 2) });
    expect(primeira.statusCode).toBe(201);
    const duplicada = await criar(token, { saleId: v, title: "Outra cobranca da venda", amount: "10,00", method: "BOLETO", dueDate: diaEmpresa("UTC", 2) });
    expect(duplicada.statusCode).toBe(409);

    const os = await ordem(token, cli, prod);
    expect((await criar(token, { serviceOrderId: os, title: "Cobranca da OS", amount: "10,00", method: "BOLETO", dueDate: diaEmpresa("UTC", 2) })).statusCode).toBe(201);
    expect((await criar(token, { serviceOrderId: os, title: "Repetida da OS", amount: "10,00", method: "BOLETO", dueDate: diaEmpresa("UTC", 2) })).statusCode).toBe(409);

    // Paga a da venda, uma nova pode nascer: a trava é sobre a pendente.
    await pagar(token, (primeira.json() as { id: string }).id);
    expect((await criar(token, { saleId: v, title: "Cobranca seguinte da venda", amount: "12,00", method: "BOLETO", dueDate: diaEmpresa("UTC", 2) })).statusCode).toBe(201);
  });

  it("valida a chave PIX pelo tipo dela", async () => {
    const { token } = await conta("OWNER");
    const cli = await cliente(token, "Cliente Pix");
    const base = { clientId: cli, title: "Cobranca pix", amount: "10,00", method: "PIX", dueDate: diaEmpresa("UTC", 2) };
    expect((await criar(token, { ...base, pixKeyType: "EMAIL", pixKey: "cobranca@empresa.test" })).statusCode).toBe(201);
    expect((await criar(token, { ...base, pixKeyType: "EMAIL", pixKey: "sem-arroba" })).statusCode).toBe(400);
    // Formato e dígito verificador: a chave PIX devolvida pelo banco do cliente
    // precisa ser a dele, e um CPF trocado no cadastro é pagamento perdido.
    expect((await criar(token, { ...base, pixKeyType: "CPF", pixKey: "1234567890" })).statusCode).toBe(400);
    expect((await criar(token, { ...base, pixKeyType: "CPF", pixKey: "123.456.789-01" })).statusCode).toBe(400);
    expect((await criar(token, { ...base, pixKeyType: "CPF", pixKey: "123.456.789-09" })).statusCode).toBe(201);
    expect((await criar(token, { ...base, pixKeyType: "CNPJ", pixKey: "11.222.333/0001-81" })).statusCode).toBe(201);
    expect((await criar(token, { ...base, pixKeyType: "CNPJ", pixKey: "12.345.678/0001-9" })).statusCode).toBe(400);
    expect((await criar(token, { ...base, pixKeyType: "TELEFONE", pixKey: "11" })).statusCode).toBe(400);
    expect((await criar(token, { ...base, pixKeyType: "TELEFONE", pixKey: "+55 11 98765-4321" })).statusCode).toBe(201);
    expect((await criar(token, { ...base, pixKeyType: "ALEATORIA", pixKey: "   " })).statusCode).toBe(400);
    // PIX sem chave não é cobrança: o cliente não tem para onde pagar.
    expect((await criar(token, { ...base, pixKeyType: undefined, pixKey: undefined })).statusCode).toBe(400);
  });
});

describe("Cobranças — pagar e cancelar", () => {
  it("pagar cria o lançamento de receita uma única vez, na mesma conta", async () => {
    const { f, token } = await conta("OWNER");
    const cli = await cliente(token, "Cliente Pago");
    const c = await novaCobranca(token, cli, { amount: "200,00" });
    const res = await pagar(token, c.id, { paidMethod: "DINHEIRO", paymentNote: "Recebido no balcao" });
    expect(res.statusCode, res.body).toBe(200);
    const corpo = res.json() as { status: string; paidAt: string | null; paidByName: string | null; financeEntryId: string | null };
    expect(corpo.status).toBe("PAID");
    expect(corpo.paidAt).not.toBeNull();
    expect(corpo.paidByName).toBe("Teste");
    expect(corpo.financeEntryId).not.toBeNull();

    const lancamento = await prisma.financeEntry.findUnique({ where: { id: corpo.financeEntryId as string } });
    expect(lancamento).not.toBeNull();
    expect(lancamento?.type).toBe("INCOME");
    expect(lancamento?.status).toBe("PAID");
    expect(lancamento?.companyId).toBe(f.companyId);
    expect(lancamento?.clientId).toBe(cli);
    expect(Number(lancamento?.amount)).toBe(200);
    expect((await audios(token))).toContain("charge.paid");
  });

  it("dois pagamentos simultâneos criam um único lançamento", async () => {
    const { f, token } = await conta("OWNER");
    const cli = await cliente(token, "Cliente Corrida");
    const c = await novaCobranca(token, cli, { amount: "90,00" });
    const respostas = await Promise.all([pagar(token, c.id), pagar(token, c.id)]);
    const aceita = respostas.filter((r) => r.statusCode === 200);
    const recusada = respostas.filter((r) => r.statusCode === 409);
    expect(aceita.length).toBe(1);
    expect(recusada.length).toBe(1);

    const corpo = (await detalhe(token, c.id)).json() as { status: string; financeEntryId: string | null };
    expect(corpo.status).toBe("PAID");
    expect(corpo.financeEntryId).not.toBeNull();
    // A prova não é o id devolvido, é o banco: esta empresa não tinha nenhum
    // lançamento antes da corrida, e continua tendo exatamente um.
    expect(await prisma.financeEntry.count({ where: { companyId: f.companyId } })).toBe(1);
  });

  it("pagar o que já está pago, ou cancelar o que já foi pago, é conflito", async () => {
    const { token } = await conta("OWNER");
    const cli = await cliente(token, "Cliente Final");
    const c = await novaCobranca(token, cli);
    await pagar(token, c.id);
    expect((await pagar(token, c.id)).statusCode).toBe(409);
    expect((await cancelar(token, c.id, "Motivo tardio")).statusCode).toBe(409);
  });

  it("cancelar exige motivo, apaga nada e não gera lançamento", async () => {
    const { token } = await conta("OWNER");
    const cli = await cliente(token, "Cliente Cancelada");
    const c = await novaCobranca(token, cli);
    expect((await app.inject({ method: "POST", url: `/api/charges/${c.id}/cancel`, headers: auth(token), payload: { reason: "" } })).statusCode).toBe(400);
    const res = await cancelar(token, c.id, "Cliente desistiu do servico");
    expect(res.statusCode, res.body).toBe(200);
    const corpo = res.json() as { status: string; cancelReason: string | null; cancelledAt: string | null; financeEntryId: string | null };
    expect(corpo.status).toBe("CANCELLED");
    expect(corpo.cancelReason).toBe("Cliente desistiu do servico");
    expect(corpo.cancelledAt).not.toBeNull();
    expect(corpo.financeEntryId).toBeNull();
    expect(await audios(token)).toContain("charge.cancelled");
  });

  it("cobrança cancelada libera a pendente da mesma venda", async () => {
    const { token } = await conta("OWNER");
    const cli = await cliente(token, "Cliente Troca");
    const prod = await produto(token, "Produto Troca");
    const v = await venda(token, cli, prod);
    const primeira = await criar(token, { saleId: v, title: "Cobranca antiga", amount: "10,00", method: "BOLETO", dueDate: diaEmpresa("UTC", 2) });
    await cancelar(token, (primeira.json() as { id: string }).id, "Emitida com valor errado");
    expect((await criar(token, { saleId: v, title: "Cobranca corrigida", amount: "12,00", method: "BOLETO", dueDate: diaEmpresa("UTC", 2) })).statusCode).toBe(201);
  });
});

describe("Cobranças — vencida, listagem e resumo", () => {
  it("vencida é lida no calendário da empresa, não no relógio do servidor", async () => {
    const { f, token } = await conta("OWNER");
    await app.inject({
      method: "PATCH",
      url: "/api/companies/current",
      headers: auth(token),
      payload: { timezone: "America/Sao_Paulo" },
    });
    const cli = await cliente(token, "Cliente Vencida");
    const ontem = await novaCobranca(token, cli, { title: "Conta de ontem", dueDate: diaEmpresa("America/Sao_Paulo", -1) });
    const hoje = await novaCobranca(token, cli, { title: "Conta de hoje", dueDate: diaEmpresa("America/Sao_Paulo", 0) });

    const corpoOntem = (await detalhe(token, ontem.id)).json() as { overdue: boolean };
    const corpoHoje = (await detalhe(token, hoje.id)).json() as { overdue: boolean };
    expect(corpoOntem.overdue).toBe(true);
    expect(corpoHoje.overdue).toBe(false);

    const lista = await app.inject({ method: "GET", url: "/api/charges?overdue=true", headers: auth(token) });
    const ids = (lista.json() as { data: { id: string }[] }).data.map((r) => r.id);
    expect(ids).toContain(ontem.id);
    expect(ids).not.toContain(hoje.id);

    const resumo = (await app.inject({ method: "GET", url: "/api/charges/summary", headers: auth(token) })).json() as {
      pendingCount: number;
      overdueCount: number;
      overdueAmount: number;
    };
    expect(resumo.pendingCount).toBe(2);
    expect(resumo.overdueCount).toBe(1);
    expect(resumo.overdueAmount).toBe(150);
    expect(f.companyId).toBeTruthy();
  });

  it("lista paginada com filtro por status, método e busca", async () => {
    const { token } = await conta("OWNER");
    const cli = await cliente(token, "Cliente Filtro");
    await novaCobranca(token, cli, { title: "Mensalidade de outubro" });
    await novaCobranca(token, cli, { title: "Conserto do notebook", method: "PIX", pixKeyType: "ALEATORIA", pixKey: "chave-aleatoria" });
    const todas = (await app.inject({ method: "GET", url: "/api/charges?pageSize=20", headers: auth(token) })).json() as {
      data: { id: string }[];
      meta: { total: number; page: number; pageSize: number; totalPages: number };
    };
    expect(todas.meta.total).toBe(2);
    expect(todas.data.length).toBe(2);

    const peloTexto = (await app.inject({ method: "GET", url: "/api/charges?search=notebook", headers: auth(token) })).json() as { meta: { total: number } };
    expect(peloTexto.meta.total).toBe(1);

    const porMetodo = (await app.inject({ method: "GET", url: "/api/charges?method=PIX", headers: auth(token) })).json() as { meta: { total: number } };
    expect(porMetodo.meta.total).toBe(1);

    const porStatus = (await app.inject({ method: "GET", url: "/api/charges?status=PAID", headers: auth(token) })).json() as { meta: { total: number } };
    expect(porStatus.meta.total).toBe(0);
  });
});

describe("Cobranças — permissões e isolamento", () => {
  it("STAFF lê, mas não cria, não paga e não cancela", async () => {
    const dono = await conta("OWNER");
    const email = `${uid("staff")}@nexus.test`;
    const convidado = await app.inject({
      method: "POST",
      url: "/api/users",
      headers: auth(dono.token),
      payload: { email, name: "Atendente", password: "SenhaForte123!", role: "STAFF" },
    });
    expect(convidado.statusCode).toBe(201);
    created.userIds.push((convidado.json() as { id: string }).id);
    const token = await login(email, "SenhaForte123!");
    const cli = await cliente(dono.token, "Cliente do Atendente");
    const c = await novaCobranca(dono.token, cli);

    expect((await app.inject({ method: "GET", url: "/api/charges", headers: auth(token) })).statusCode).toBe(200);
    expect((await criar(token, { clientId: cli, title: "Cobranca do staff", amount: "10,00", method: "BOLETO", dueDate: diaEmpresa("UTC", 1) })).statusCode).toBe(403);
    expect((await pagar(token, c.id)).statusCode).toBe(403);
    expect((await cancelar(token, c.id, "sem permissao")).statusCode).toBe(403);
  });

  it("MANAGER cria e paga, e aparece na matriz de permissões", async () => {
    const { token } = await conta("MANAGER");
    const cli = await cliente(token, "Cliente Gerente");
    const c = await novaCobranca(token, cli);
    expect((await pagar(token, c.id)).statusCode).toBe(200);

    const matriz = (await app.inject({ method: "GET", url: "/api/users/permissions", headers: auth(token) })).json() as {
      recursos: { recurso: string; rotulo: string }[];
    };
    expect(matriz.recursos.map((r) => r.recurso)).toContain("charge");
  });

  it("a empresa B não lê, não paga e não cancela a cobrança da empresa A", async () => {
    const a = await conta("OWNER");
    const b = await conta("OWNER");
    const ca = await cliente(a.token, "Cliente de A");
    const c = await novaCobranca(a.token, ca);

    expect((await detalhe(b.token, c.id)).statusCode).toBe(404);
    expect((await pagar(b.token, c.id)).statusCode).toBe(404);
    expect((await cancelar(b.token, c.id, "invasao")).statusCode).toBe(404);

    const listaB = (await app.inject({ method: "GET", url: "/api/charges?pageSize=50", headers: auth(b.token) })).json() as { data: { id: string }[] };
    expect(listaB.data.map((r) => r.id)).not.toContain(c.id);

    // E o pagamento da B jamais tocou o lançamento da A.
    const corpo = (await detalhe(a.token, c.id)).json() as { status: string; financeEntryId: string | null };
    expect(corpo.status).toBe("PENDING");
    expect(corpo.financeEntryId).toBeNull();
  });
});

describe("Gateways", () => {
  it("mostra MANUAL disponível e os três provedores de mercado indisponíveis, sem credencial", async () => {
    const { token } = await conta("OWNER");
    const res = await app.inject({ method: "GET", url: "/api/gateways", headers: auth(token) });
    expect(res.statusCode).toBe(200);
    const lista = res.json() as {
      data: { provider: string; available: boolean; credentialCipher?: string; webhookCipher?: string; publicKey?: string }[];
    };
    expect(lista.data.map((g) => g.provider).sort()).toEqual(["EFI", "MANUAL", "MERCADO_PAGO", "STRIPE"]);
    expect(lista.data.find((g) => g.provider === "MANUAL")?.available).toBe(true);
    for (const g of lista.data.filter((x) => x.provider !== "MANUAL")) {
      expect(g.available).toBe(false);
    }
    // A resposta não devolve material de credencial, nem vazio, nem por chave.
    for (const g of lista.data) {
      expect(g).not.toHaveProperty("credentialCipher");
      expect(g).not.toHaveProperty("webhookCipher");
    }
  });

  it("configura o MANUAL com chave PIX, beneficiário, instruções e vencimento padrão", async () => {
    const { f, token } = await conta("OWNER");
    const res = await app.inject({
      method: "PUT",
      url: "/api/gateways/manual",
      headers: auth(token),
      payload: {
        environment: "PRODUCTION",
        displayName: "Cobranca no balcao",
        pixKeyType: "EMAIL",
        pixKey: "financeiro@empresa.test",
        beneficiaryName: "Empresa Alfa Ltda",
        instructions: "Apos o pagamento, retire o equipamento na loja.",
        defaultDueDays: 7,
      },
    });
    expect(res.statusCode, res.body).toBe(200);
    const corpo = res.json() as {
      provider: string;
      environment: string;
      pixKey: string | null;
      beneficiaryName: string | null;
      defaultDueDays: number;
      available: boolean;
    };
    expect(corpo.provider).toBe("MANUAL");
    expect(corpo.environment).toBe("PRODUCTION");
    expect(corpo.pixKey).toBe("financeiro@empresa.test");
    expect(corpo.beneficiaryName).toBe("Empresa Alfa Ltda");
    expect(corpo.defaultDueDays).toBe(7);
    expect(corpo.available).toBe(true);

    const deNOVO = await app.inject({
      method: "PUT",
      url: "/api/gateways/manual",
      headers: auth(token),
      payload: { environment: "PRODUCTION", pixKeyType: "EMAIL", pixKey: "outro@empresa.test", beneficiaryName: "Empresa Alfa Ltda", instructions: "Retirada na loja.", defaultDueDays: 3 },
    });
    expect(deNOVO.statusCode).toBe(200);
    // Gravar de novo é editar a mesma configuração, não abrir uma segunda: a
    // uniqueness (empresa, provedor, ambiente) é o que impede o balcão de ter
    // duas chaves PIX diferentes para o mesmo cliente.
    expect(await prisma.paymentGateway.count({ where: { companyId: f.companyId, provider: "MANUAL" } })).toBe(1);
    expect((deNOVO.json() as { pixKey: string }).pixKey).toBe("outro@empresa.test");
    expect(await audios(token)).toContain("gateway.update");
  });

  it("recusa chave PIX malformada no cadastro do gateway", async () => {
    const { token } = await conta("OWNER");
    const res = await app.inject({
      method: "PUT",
      url: "/api/gateways/manual",
      headers: auth(token),
      payload: { environment: "SANDBOX", pixKeyType: "CPF", pixKey: "12", beneficiaryName: "Empresa Alfa", defaultDueDays: 5 },
    });
    expect(res.statusCode).toBe(400);
  });

  it("fecha a porta de MERCADO_PAGO, EFI e STRIPE: sem credencial, sem webhook, 400 honesto", async () => {
    const { token } = await conta("OWNER");
    for (const slug of ["mercado-pago", "efi", "stripe"]) {
      const res = await app.inject({
        method: "PUT",
        url: `/api/gateways/${slug}`,
        headers: auth(token),
        payload: { environment: "PRODUCTION", publicKey: "pk_test_qualquercoisa", active: true },
      });
      expect(res.statusCode, slug).toBe(400);
      expect((res.json() as { message: string }).message).toContain("Integração ainda não disponível");
    }
    // Nenhuma linha de gateway de terceiro nasceu com isso.
    const terceiros = await prisma.paymentGateway.count({ where: { provider: { in: ["MERCADO_PAGO", "EFI", "STRIPE"] } } });
    expect(terceiros).toBe(0);
  });
});
