import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { app, makeAccount, login, cleanup, uid } from "./helpers";

// F3.2 Parte 1 — Ordens de Serviço.
//
// Este arquivo nasce ANTES do módulo: cada asserção abaixo é uma regra de
// negócio que o projeto ainda não tinha. Ele foi escrito para falhar, e a
// primeira execução dele (sem schema, sem rotas) derruba 404 em cima de 404 —
// é essa saída, colada no relatório, que prova que o teste não foi colado
// depois do código.
//
// O que ele vigia, na ordem em que a OS acontece na empresa:
//   criar com peças e serviços → total calculado no servidor, em Decimal exato;
//   numeração sequencial por empresa sem corrida (10 criações simultâneas);
//   as transições de status que existem e TODAS as que não existem (409);
//   o estoque, que só baixa ao concluir, uma única vez, com movimentação;
//   o estorno idempotente, que só ADMIN/OWNER fazem;
//   o isolamento A×B e a matriz de permissões, inclusive o STAFF que só mexe
//   na OS atribuída a ele — regra aplicada no backend, não na tela.

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

// Membro novo DENTRO da empresa de quem convida — é assim que se monta o caso
// do STAFF que tem OS atribuída e do STAFF que não tem nenhuma.
async function membro(tokenDeQuemConvida: string, role: "MANAGER" | "STAFF") {
  const email = `${uid("m")}@nexus.test`;
  const password = "SenhaForte123!";
  const res = await app.inject({
    method: "POST",
    url: "/api/users",
    headers: auth(tokenDeQuemConvida),
    payload: { email, name: "Membro " + role, password, role },
  });
  expect(res.statusCode).toBe(201);
  const userId = (res.json() as { id: string }).id;
  created.userIds.push(userId);
  return { userId, token: await login(email, password) };
}

interface Cadastro {
  clientId: string;
  productId: string;
}

// Nome de cliente SEM dígito: os testes de busca por número precisam que o
// "2" da OS não encontre, por acaso, o uid de um cliente.
async function cadastro(token: string, nomeCliente: string, estoque = 10, preco = 10): Promise<Cadastro> {
  const cli = await app.inject({
    method: "POST", url: "/api/clients", headers: auth(token), payload: { name: nomeCliente },
  });
  const prod = await app.inject({
    method: "POST", url: "/api/products", headers: auth(token),
    payload: { name: "Peça " + nomeCliente, salePrice: preco, stockQuantity: estoque, minStock: 0 },
  });
  expect(cli.statusCode).toBe(201);
  expect(prod.statusCode).toBe(201);
  return { clientId: (cli.json() as { id: string }).id, productId: (prod.json() as { id: string }).id };
}

function itensPeca(productId: string, quantity: number) {
  return [{ kind: "PART", productId, quantity }];
}

async function abrir(token: string, d: Cadastro, extra: Record<string, unknown> = {}) {
  return app.inject({
    method: "POST",
    url: "/api/service-orders",
    headers: auth(token),
    payload: {
      clientId: d.clientId,
      title: "Equipamento com falha",
      description: "Relato do cliente",
      items: itensPeca(d.productId, 2),
      ...extra,
    },
  });
}

async function novaOs(token: string, d: Cadastro, extra: Record<string, unknown> = {}) {
  const res = await abrir(token, d, extra);
  expect(res.statusCode).toBe(201);
  return res.json() as { id: string; number: number; total: number };
}

async function status(token: string, id: string, alvo: string, note?: string) {
  return app.inject({
    method: "POST",
    url: `/api/service-orders/${id}/status`,
    headers: auth(token),
    payload: { status: alvo, note },
  });
}

async function anda(token: string, id: string, alvo: string, motivo: string) {
  const res = await status(token, id, alvo, motivo);
  expect(res.statusCode, motivo).toBe(200);
}

async function estoqueAtual(productId: string): Promise<number> {
  const p = await prisma.product.findUniqueOrThrow({ where: { id: productId }, select: { stockQuantity: true } });
  return Number(p.stockQuantity);
}

async function detalhe(token: string, id: string) {
  return app.inject({ method: "GET", url: `/api/service-orders/${id}`, headers: auth(token) });
}

async function editar(token: string, id: string, payload: Record<string, unknown>) {
  return app.inject({ method: "PATCH", url: `/api/service-orders/${id}`, headers: auth(token), payload });
}

describe("Ordens de serviço — criar", () => {
  it("cria OPEN com número 1, total do servidor e histórico inicial", async () => {
    const { token } = await conta("OWNER");
    const d = await cadastro(token, "Alfa");
    const res = await abrir(token, d, {
      priority: "HIGH",
      discount: "20,00",
      items: [
        { kind: "SERVICE", description: "Mão de obra especializada", quantity: 1, unitPrice: "50,00" },
        { kind: "PART", productId: d.productId, quantity: 2 },
      ],
    });
    expect(res.statusCode).toBe(201);
    const os = res.json() as {
      id: string; number: number; status: string; priority: string; total: number; discount: number;
      clientName: string | null; createdByName: string | null;
      items: { kind: string; unitPrice: number; lineTotal: number; productName: string | null }[];
    };
    expect(os.number).toBe(1);
    expect(os.status).toBe("OPEN");
    expect(os.priority).toBe("HIGH");
    // 50,00 + 2 × 10,00 = 70,00; menos 20,00 de desconto = 50,00. A soma é de
    // centavo feita no servidor — a tela só mostrou uma prévia.
    expect(os.total).toBe(50);
    expect(os.discount).toBe(20);
    expect(os.items[0]?.productName).toBeNull();
    expect(os.items[1]?.productName).toBe("Peça Alfa");
    expect(os.clientName).toBe("Alfa");
    expect(os.createdByName).toBe("Teste");

    const corpo = (await detalhe(token, os.id)).json() as {
      history: { fromStatus: string | null; toStatus: string; userName: string | null }[];
    };
    expect(corpo.history.length).toBe(1);
    expect(corpo.history[0]?.fromStatus).toBeNull();
    expect(corpo.history[0]?.toStatus).toBe("OPEN");
    expect(corpo.history[0]?.userName).toBe("Teste");

    const trilha = await app.inject({ method: "GET", url: "/api/audit?pageSize=50", headers: auth(token) });
    const acoes = (trilha.json() as { data: { action: string }[] }).data.map((r) => r.action);
    expect(acoes).toContain("service_order.create");
  });

  it("total exato em Decimal: 3 × 0,10 = 0,30 e a linha casa com o total", async () => {
    const { token } = await conta("OWNER");
    const d = await cadastro(token, "Bravo", 10, 0.1);
    const os = await abrir(token, d, { items: [{ kind: "PART", productId: d.productId, quantity: 3 }] });
    const corpo = os.json() as { total: number; items: { lineTotal: number }[] };
    expect(corpo.items[0]?.lineTotal).toBe(0.3);
    expect(corpo.total).toBe(0.3);
  });

  it("peça sem preço informado usa o preço de venda do produto", async () => {
    const { token } = await conta("OWNER");
    const d = await cadastro(token, "Charlie", 5, 35.5);
    const corpo = (await abrir(token, d, { items: [{ kind: "PART", productId: d.productId, quantity: 2 }] })).json() as {
      total: number; items: { unitPrice: number }[];
    };
    expect(corpo.items[0]?.unitPrice).toBe(35.5);
    expect(corpo.total).toBe(71);
  });

  it("peça com preço informado paga pelo que a empresa decidiu, não pelo preço de tabela", async () => {
    const { token } = await conta("OWNER");
    const d = await cadastro(token, "Delta", 5, 100);
    const corpo = (await abrir(token, d, {
      items: [{ kind: "PART", productId: d.productId, quantity: 1, unitPrice: "80,00" }],
    })).json() as { total: number };
    expect(corpo.total).toBe(80);
  });

  it("validações: sem cliente, sem itens, título vazio, quantidade zero, serviço sem descrição, desconto acima da soma", async () => {
    const { token } = await conta("ADMIN");
    const d = await cadastro(token, "Echo");

    const semCliente = await app.inject({
      method: "POST", url: "/api/service-orders", headers: auth(token),
      payload: { title: "X", items: [{ kind: "SERVICE", description: "Serviço", quantity: 1, unitPrice: 10 }] },
    });
    expect(semCliente.statusCode).toBe(400);

    const semItens = await app.inject({
      method: "POST", url: "/api/service-orders", headers: auth(token),
      payload: { clientId: d.clientId, title: "X", items: [] },
    });
    expect(semItens.statusCode).toBe(400);

    const semTitulo = await app.inject({
      method: "POST", url: "/api/service-orders", headers: auth(token),
      payload: { clientId: d.clientId, title: "   ", items: [{ kind: "SERVICE", description: "Serviço", quantity: 1, unitPrice: 10 }] },
    });
    expect(semTitulo.statusCode).toBe(400);

    const qtdZero = await app.inject({
      method: "POST", url: "/api/service-orders", headers: auth(token),
      payload: { clientId: d.clientId, title: "X", items: [{ kind: "PART", productId: d.productId, quantity: 0 }] },
    });
    expect(qtdZero.statusCode).toBe(400);

    const serviceSemDescricao = await app.inject({
      method: "POST", url: "/api/service-orders", headers: auth(token),
      payload: { clientId: d.clientId, title: "X", items: [{ kind: "SERVICE", quantity: 1, unitPrice: 10 }] },
    });
    expect(serviceSemDescricao.statusCode).toBe(400);

    const pecaSemProduto = await app.inject({
      method: "POST", url: "/api/service-orders", headers: auth(token),
      payload: { clientId: d.clientId, title: "X", items: [{ kind: "PART", quantity: 1, unitPrice: 10 }] },
    });
    expect(pecaSemProduto.statusCode).toBe(400);

    const descontoGrande = await app.inject({
      method: "POST", url: "/api/service-orders", headers: auth(token),
      payload: { clientId: d.clientId, title: "X", discount: 500, items: itensPeca(d.productId, 1) },
    });
    expect(descontoGrande.statusCode).toBe(400);
    expect((descontoGrande.json() as { message: string }).message).toMatch(/desconto/i);
  });

  it("responsável precisa ser membro ativo da empresa", async () => {
    const { token, f } = await conta("OWNER");
    const d = await cadastro(token, "Foxtrot");
    const fora = await conta("OWNER");
    const equipe = await membro(token, "STAFF");

    const deOutraEmpresa = await abrir(token, d, { assignedUserId: fora.f.userId });
    expect(deOutraEmpresa.statusCode).toBe(400);

    await prisma.user.update({ where: { id: equipe.userId }, data: { active: false } });
    const inativo = await abrir(token, d, { assignedUserId: equipe.userId });
    expect(inativo.statusCode).toBe(400);
    await prisma.user.update({ where: { id: equipe.userId }, data: { active: true } });

    const ok = await abrir(token, d, { assignedUserId: equipe.userId });
    expect(ok.statusCode).toBe(201);
    expect((ok.json() as { clientId: string; assignedUserId: string }).clientId).toBe(d.clientId);
    expect((ok.json() as { assignedUserId: string }).assignedUserId).toBe(equipe.userId);
    expect(f.companyId).not.toBe(fora.f.companyId);
  });
});

describe("Ordens de serviço — numeração sem corrida", () => {
  it("dez criações simultâneas recebem 1..10, sem falha e sem repetição", async () => {
    const { token } = await conta("OWNER");
    const d = await cadastro(token, "Golf");
    const voos = await Promise.all(Array.from({ length: 10 }, () => abrir(token, d, { title: "Concorrente" })));
    expect(voos.map((v) => v.statusCode)).toEqual(new Array(10).fill(201));
    const numeros = voos.map((v) => (v.json() as { number: number }).number).sort((a, b) => a - b);
    expect(numeros).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    // A numeração é POR EMPRESA: uma empresa nova recomeça no 1.
    const outra = await conta("OWNER");
    const dd = await cadastro(outra.token, "Hotel");
    expect((await novaOs(outra.token, dd)).number).toBe(1);
  });
});

describe("Ordens de serviço — transições de status", () => {
  it("anda OPEN → IN_PROGRESS → COMPLETED com total, estoque e histórico conferidos", async () => {
    const { token } = await conta("OWNER");
    const d = await cadastro(token, "India");
    const os = await novaOs(token, d, { items: itensPeca(d.productId, 3) });

    const andamento = await status(token, os.id, "IN_PROGRESS", "Abri o equipamento");
    expect(andamento.statusCode).toBe(200);
    const corpoAndamento = andamento.json() as { status: string; startedAt: string | null };
    expect(corpoAndamento.status).toBe("IN_PROGRESS");
    expect(corpoAndamento.startedAt).not.toBeNull();
    expect(await estoqueAtual(d.productId)).toBe(10);

    const concluida = await status(token, os.id, "COMPLETED", "Peças aplicadas");
    expect(concluida.statusCode).toBe(200);
    const corpo = concluida.json() as { status: string; completedAt: string | null; total: number };
    expect(corpo.status).toBe("COMPLETED");
    expect(corpo.completedAt).not.toBeNull();
    expect(corpo.total).toBe(30);
    expect(await estoqueAtual(d.productId)).toBe(7);

    const movs = await app.inject({
      method: "GET", url: `/api/products/${d.productId}/movements`, headers: auth(token),
    });
    const saidas = (movs.json() as { data: { kind: string; quantity: number; note: string | null }[] }).data
      .filter((m) => m.kind === "OUT");
    expect(saidas.length).toBe(1);
    expect(saidas[0]?.quantity).toBe(3);
    expect(saidas[0]?.note).toMatch(/OS/);

    const historia = (await detalhe(token, os.id)).json() as {
      history: { fromStatus: string | null; toStatus: string; note: string | null }[];
    };
    expect(historia.history.map((h) => h.toStatus)).toEqual(["OPEN", "IN_PROGRESS", "COMPLETED"]);
    expect(historia.history[1]?.fromStatus).toBe("OPEN");
    expect(historia.history[2]?.note).toBe("Peças aplicadas");

    const trilha = await app.inject({ method: "GET", url: "/api/audit?pageSize=50", headers: auth(token) });
    const acoes = (trilha.json() as { data: { action: string }[] }).data.map((r) => r.action);
    expect(acoes).toContain("service_order.in_progress");
    expect(acoes).toContain("service_order.completed");
  });

  it("todas as transições permitidas passam", async () => {
    const { token } = await conta("ADMIN");
    const caminhos: [string, string, string[]][] = [
      ["OPEN", "IN_PROGRESS", []],
      ["OPEN", "WAITING", []],
      ["OPEN", "CANCELLED", []],
      ["IN_PROGRESS", "WAITING", ["IN_PROGRESS"]],
      ["IN_PROGRESS", "COMPLETED", ["IN_PROGRESS"]],
      ["IN_PROGRESS", "CANCELLED", ["IN_PROGRESS"]],
      ["WAITING", "IN_PROGRESS", ["IN_PROGRESS", "WAITING"]],
      ["WAITING", "CANCELLED", ["IN_PROGRESS", "WAITING"]],
    ];
    for (const [de, para, trilha] of caminhos) {
      const d = await cadastro(token, `Rota ${de}${para}`.replace(/[^A-Za-z ]/g, ""));
      const os = await novaOs(token, d);
      for (const passo of trilha) await anda(token, os.id, passo, `${de} -> ${para}`);
      const res = await status(token, os.id, para);
      expect(res.statusCode, `${de} -> ${para}`).toBe(200);
      expect((res.json() as { status: string }).status, `${de} -> ${para}`).toBe(para);
    }
  });

  it("toda transição proibida devolve 409 e não mexe em nada", async () => {
    const { token } = await conta("OWNER");
    const d = await cadastro(token, "Kilo");
    const os = await novaOs(token, d, { items: itensPeca(d.productId, 1) });

    // OPEN -> COMPLETED não existe: sem IN_PROGRESS ninguém conclui serviço.
    const direto = await status(token, os.id, "COMPLETED");
    expect(direto.statusCode).toBe(409);
    expect((direto.json() as { message: string }).message).toMatch(/não é permitida/);
    expect(await estoqueAtual(d.productId)).toBe(10);
    expect((await detalhe(token, os.id)).json()).toMatchObject({ status: "OPEN" });

    await anda(token, os.id, "IN_PROGRESS", "aberta");
    // WAITING -> COMPLETED também não existe; é preciso voltar a IN_PROGRESS.
    await anda(token, os.id, "WAITING", "esperando peça");
    expect((await status(token, os.id, "COMPLETED")).statusCode).toBe(409);
    await anda(token, os.id, "IN_PROGRESS", "peça chegou");
    await anda(token, os.id, "COMPLETED", "entregue");

    for (const para of ["OPEN", "IN_PROGRESS", "WAITING", "COMPLETED"]) {
      expect((await status(token, os.id, para)).statusCode, `COMPLETED -> ${para}`).toBe(409);
    }
    expect(await estoqueAtual(d.productId)).toBe(9);

    await anda(token, os.id, "CANCELLED", "estorno");
    for (const para of ["OPEN", "IN_PROGRESS", "WAITING", "COMPLETED", "CANCELLED"]) {
      expect((await status(token, os.id, para)).statusCode, `CANCELLED -> ${para}`).toBe(409);
    }
    expect(await estoqueAtual(d.productId)).toBe(10);
  });

  it("repetir o status que a OS já tem é 400, não uma transição nova", async () => {
    const { token } = await conta("OWNER");
    const d = await cadastro(token, "Lima");
    const os = await novaOs(token, d);
    expect((await status(token, os.id, "OPEN")).statusCode).toBe(400);
  });

  it("status inexistente no enum é 400 e não cria linha no histórico", async () => {
    const { token } = await conta("OWNER");
    const d = await cadastro(token, "Mike");
    const os = await novaOs(token, d);
    expect((await status(token, os.id, "RESOLVIDA")).statusCode).toBe(400);
    expect(await prisma.serviceOrderHistory.count({ where: { serviceOrderId: os.id } })).toBe(1);
  });
});

describe("Ordens de serviço — estoque", () => {
  it("linhas repetidas do mesmo produto somam antes de validar e geram uma única saída", async () => {
    const { token } = await conta("OWNER");
    const d = await cadastro(token, "November");
    const os = await novaOs(token, d, {
      items: [
        { kind: "PART", productId: d.productId, quantity: 2 },
        { kind: "PART", productId: d.productId, quantity: 4 },
      ],
    });
    await anda(token, os.id, "IN_PROGRESS", "mãos à obra");
    const concluida = await status(token, os.id, "COMPLETED");
    expect(concluida.statusCode).toBe(200);
    expect((concluida.json() as { total: number }).total).toBe(60);
    // Dez peças no saldo, seis consumidas: a conta é do estoque, não das linhas.
    expect(await estoqueAtual(d.productId)).toBe(4);

    const movs = await prisma.stockMovement.findMany({ where: { productId: d.productId, kind: "OUT" } });
    expect(movs.length).toBe(1);
    expect(Number(movs[0]?.quantity)).toBe(6);
  });

  it("três linhas de 0,333 num saldo de 0,666 não são barradas por sobra de vírgula flutuante", async () => {
    const { token } = await conta("OWNER");
    const d = await cadastro(token, "Oscar", 0.666, 1);
    const os = await novaOs(token, d, {
      items: [
        { kind: "PART", productId: d.productId, quantity: 0.333 },
        { kind: "PART", productId: d.productId, quantity: 0.333 },
      ],
    });
    await anda(token, os.id, "IN_PROGRESS", "medição");
    expect((await status(token, os.id, "COMPLETED")).statusCode).toBe(200);
    expect(await estoqueAtual(d.productId)).toBe(0);
  });

  it("estoque insuficiente: 400, nada baixado e status inalterado", async () => {
    const { token } = await conta("OWNER");
    const d = await cadastro(token, "Papa", 5);
    const os = await novaOs(token, d, {
      items: [
        { kind: "PART", productId: d.productId, quantity: 3 },
        { kind: "PART", productId: d.productId, quantity: 3 },
      ],
    });
    await anda(token, os.id, "IN_PROGRESS", "peça contada errado");

    const falha = await status(token, os.id, "COMPLETED");
    expect(falha.statusCode).toBe(400);
    expect((falha.json() as { message: string }).message).toMatch(/Estoque insuficiente/);
    expect(await estoqueAtual(d.productId)).toBe(5);
    expect((await detalhe(token, os.id)).json()).toMatchObject({ status: "IN_PROGRESS" });
    expect(await prisma.stockMovement.count({ where: { productId: d.productId, kind: "OUT" } })).toBe(0);
    expect(await prisma.serviceOrderHistory.count({ where: { serviceOrderId: os.id, toStatus: "COMPLETED" } })).toBe(0);
  });

  it("produto sem rastreamento de estoque não é baixado", async () => {
    const { token } = await conta("OWNER");
    const d = await cadastro(token, "Quebec");
    await prisma.product.update({ where: { id: d.productId }, data: { trackStock: false } });
    // O cadastro com saldo já escreveu a movimentação `IN` de abertura
    // ("Estoque inicial") — é ela que está em `antes`. O que a OS não pode
    // fazer, num produto que não é rastreado, é acrescentar movimento nenhum.
    const antes = await prisma.stockMovement.count({ where: { productId: d.productId } });
    const os = await novaOs(token, d);
    await anda(token, os.id, "IN_PROGRESS", "serviço com item virtual");
    expect((await status(token, os.id, "COMPLETED")).statusCode).toBe(200);
    expect(await estoqueAtual(d.productId)).toBe(10);
    expect(await prisma.stockMovement.count({ where: { productId: d.productId } })).toBe(antes);
  });

  it("duas conclusões simultâneas: uma passa, a outra pega 409 e o estoque baixa uma vez", async () => {
    const { token } = await conta("OWNER");
    const d = await cadastro(token, "Romeo");
    const os = await novaOs(token, d, { items: itensPeca(d.productId, 4) });
    await anda(token, os.id, "IN_PROGRESS", "duplo clique");

    const voos = await Promise.all([status(token, os.id, "COMPLETED"), status(token, os.id, "COMPLETED")]);
    expect(voos.map((v) => v.statusCode).sort()).toEqual([200, 409]);
    expect(await estoqueAtual(d.productId)).toBe(6);
    expect(await prisma.stockMovement.count({ where: { productId: d.productId, kind: "OUT" } })).toBe(1);
    expect(await prisma.serviceOrderHistory.count({ where: { serviceOrderId: os.id, toStatus: "COMPLETED" } })).toBe(1);
  });

  it("a política de estoque negativo da empresa vale também para a OS", async () => {
    const { token, f } = await conta("OWNER");
    const d = await cadastro(token, "Sigma", 2);
    const os = await novaOs(token, d, { items: itensPeca(d.productId, 5) });
    await anda(token, os.id, "IN_PROGRESS", "falta peça");
    expect((await status(token, os.id, "COMPLETED")).statusCode).toBe(400);

    await prisma.company.update({ where: { id: f.companyId }, data: { allowNegativeStock: true } });
    expect((await status(token, os.id, "COMPLETED")).statusCode).toBe(200);
    expect(await estoqueAtual(d.productId)).toBe(-3);
  });

  it("estorna ao cancelar a concluída: peças voltam uma única vez", async () => {
    const { token } = await conta("OWNER");
    const d = await cadastro(token, "Tango");
    // A abertura do cadastro (saldo 10) já é uma entrada no razão. O estorno
    // tem de acrescentar UMA entrada, não ser a primeira linha da conta.
    const entradasDeAbertura = await prisma.stockMovement.count({
      where: { productId: d.productId, kind: "IN" },
    });
    const os = await novaOs(token, d, { items: itensPeca(d.productId, 3) });
    await anda(token, os.id, "IN_PROGRESS", "execução");
    await anda(token, os.id, "COMPLETED", "entrega");
    expect(await estoqueAtual(d.productId)).toBe(7);

    const cancelada = await status(token, os.id, "CANCELLED", "Cliente desistiu");
    expect(cancelada.statusCode).toBe(200);
    expect(await estoqueAtual(d.productId)).toBe(10);
    expect(await prisma.stockMovement.count({ where: { productId: d.productId, kind: "IN" } })).toBe(
      entradasDeAbertura + 1,
    );

    // Idempotência sob concorrência: duas chamadas juntas e o saldo volta a 10,
    // não a 12 — o estorno acontece uma vez porque a reivindicação do status é
    // condicional dentro da transação.
    const outra = await novaOs(token, d, { items: itensPeca(d.productId, 2) });
    await anda(token, outra.id, "IN_PROGRESS", "outra");
    await anda(token, outra.id, "COMPLETED", "entregue de novo");
    expect(await estoqueAtual(d.productId)).toBe(8);
    const voos = await Promise.all([status(token, outra.id, "CANCELLED"), status(token, outra.id, "CANCELLED")]);
    expect(voos.map((v) => v.statusCode).sort()).toEqual([200, 409]);
    expect(await estoqueAtual(d.productId)).toBe(10);

    // O saldo que a tela mostra é o razão conferido no banco: entradas menos
    // saídas, incluída a abertura de 10 que o cadastro do produto gravou.
    const [entradas, saidas] = await Promise.all([
      prisma.stockMovement.aggregate({ where: { productId: d.productId, kind: "IN" }, _sum: { quantity: true } }),
      prisma.stockMovement.aggregate({ where: { productId: d.productId, kind: "OUT" }, _sum: { quantity: true } }),
    ]);
    const razao = Number(entradas._sum.quantity ?? 0) - Number(saidas._sum.quantity ?? 0);
    expect(razao).toBe(await estoqueAtual(d.productId));
    expect(razao).toBe(10);
  });

  it("cancelar uma OS que nunca baixou estoque não inventa entrada", async () => {
    const { token } = await conta("OWNER");
    const d = await cadastro(token, "Uni");
    const antes = await prisma.stockMovement.count({ where: { productId: d.productId } });
    const os = await novaOs(token, d);
    expect((await status(token, os.id, "CANCELLED", "Aberta por engano")).statusCode).toBe(200);
    expect(await estoqueAtual(d.productId)).toBe(10);
    // Nenhum movimento novo: a OS nunca baixou peça, então não há o que
    // estornar — cancelar uma ordem viva não inventa entrada no razão.
    expect(await prisma.stockMovement.count({ where: { productId: d.productId } })).toBe(antes);
  });
});

describe("Ordens de serviço — edição", () => {
  it("itens, desconto e responsável só mudam enquanto a OS está viva", async () => {
    const { token } = await conta("ADMIN");
    const d = await cadastro(token, "Victor");
    const equipe = await membro(token, "STAFF");
    const os = await novaOs(token, d);

    const edita = await editar(token, os.id, {
      title: "Diagnóstico novo",
      priority: "URGENT",
      assignedUserId: equipe.userId,
      discount: 5,
      items: [{ kind: "PART", productId: d.productId, quantity: 1 }],
    });
    expect(edita.statusCode).toBe(200);
    const corpo = edita.json() as { title: string; priority: string; assignedUserId: string | null; total: number; discount: number };
    expect(corpo.title).toBe("Diagnóstico novo");
    expect(corpo.priority).toBe("URGENT");
    expect(corpo.assignedUserId).toBe(equipe.userId);
    expect(corpo.total).toBe(5);
    expect(corpo.discount).toBe(5);

    await anda(token, os.id, "IN_PROGRESS", "andamento");
    await anda(token, os.id, "COMPLETED", "concluída");

    const depoisDeConcluir = await editar(token, os.id, { items: itensPeca(d.productId, 9) });
    expect(depoisDeConcluir.statusCode).toBe(409);

    // Anotação e diagnóstico continuam editáveis em COMPLETED por ADMIN/OWNER.
    const anota = await editar(token, os.id, { diagnosis: "Conector queimado", notes: "Cliente retirou no balcão" });
    expect(anota.statusCode).toBe(200);
    const comNota = anota.json() as { diagnosis: string | null; notes: string | null; items: unknown[] };
    expect(comNota.diagnosis).toBe("Conector queimado");
    expect(comNota.notes).toBe("Cliente retirou no balcão");
    expect(comNota.items.length).toBe(1);

    await anda(token, os.id, "CANCELLED", "estorno final");
    expect((await editar(token, os.id, { notes: "nada" })).statusCode).toBe(409);
  });

  it("editar com cliente, produto ou responsável de outra empresa é barrado", async () => {
    const a = await conta("OWNER");
    const b = await conta("OWNER");
    const da = await cadastro(a.token, "Yankee");
    const db = await cadastro(b.token, "Zulu");
    const os = await novaOs(a.token, da);

    expect((await editar(a.token, os.id, { clientId: db.clientId })).statusCode).toBe(400);
    expect((await editar(a.token, os.id, { items: itensPeca(db.productId, 1) })).statusCode).toBe(400);
    expect((await editar(a.token, os.id, { assignedUserId: b.f.userId })).statusCode).toBe(400);
    expect((await detalhe(a.token, os.id)).json()).toMatchObject({ clientId: da.clientId, assignedUserId: null });
  });

  it("desconto que passa da soma das linhas no PATCH é 400", async () => {
    const { token } = await conta("OWNER");
    const d = await cadastro(token, "Win");
    const os = await novaOs(token, d, { items: itensPeca(d.productId, 1) });
    const res = await editar(token, os.id, { discount: 999 });
    expect(res.statusCode).toBe(400);
    expect((await detalhe(token, os.id)).json()).toMatchObject({ discount: 0, total: 10 });
  });
});

describe("Ordens de serviço — isolamento A×B", () => {
  it("a empresa B não enxerga, não edita e não muda status da OS da empresa A", async () => {
    const a = await conta("OWNER");
    const b = await conta("OWNER");
    const da = await cadastro(a.token, "Alpha");
    const db = await cadastro(b.token, "Beta");
    const os = await novaOs(a.token, da);

    expect((await detalhe(b.token, os.id)).statusCode).toBe(404);
    expect((await editar(b.token, os.id, { title: "Invasão" })).statusCode).toBe(404);
    expect((await status(b.token, os.id, "IN_PROGRESS")).statusCode).toBe(404);
    expect((await status(b.token, os.id, "CANCELLED")).statusCode).toBe(404);
    expect((await status(b.token, os.id, "COMPLETED")).statusCode).toBe(404);

    // A OS da empresa A continua exatamente como estava.
    expect((await detalhe(a.token, os.id)).json()).toMatchObject({ status: "OPEN" });

    const listaA = await app.inject({ method: "GET", url: "/api/service-orders", headers: auth(a.token) });
    const listaB = await app.inject({ method: "GET", url: "/api/service-orders", headers: auth(b.token) });
    expect((listaA.json() as { meta: { total: number } }).meta.total).toBe(1);
    expect((listaB.json() as { meta: { total: number } }).meta.total).toBe(0);

    // Cliente, peça e responsável da empresa A não servem na empresa B.
    expect((await abrir(b.token, { clientId: db.clientId, productId: da.productId })).statusCode).toBe(400);
    expect((await abrir(b.token, { clientId: da.clientId, productId: db.productId })).statusCode).toBe(400);
    expect((await abrir(b.token, db, { assignedUserId: a.f.userId })).statusCode).toBe(400);

    // O companyId forjado no corpo é ignorado: a OS nasce na empresa do token.
    const forjado = await abrir(b.token, db, { companyId: a.f.companyId, title: "Forjado" });
    expect(forjado.statusCode).toBe(201);
    const id = (forjado.json() as { id: string }).id;
    expect((await detalhe(a.token, id)).statusCode).toBe(404);
    expect((await detalhe(b.token, id)).statusCode).toBe(200);
  });

  it("uma OS não pode ser mudada pela outra empresa nem por id de outra origem", async () => {
    const a = await conta("OWNER");
    const b = await conta("OWNER");
    const da = await cadastro(a.token, "Certo");
    const db = await cadastro(b.token, "Errado");
    const os = await novaOs(a.token, da);
    const propria = await novaOs(b.token, db);

    // B tenta concluir a OS de A e, no mesmo corpo, a própria: nada acontece.
    expect((await status(b.token, os.id, "IN_PROGRESS")).statusCode).toBe(404);
    expect((await status(b.token, "os-que-nao-existe", "IN_PROGRESS")).statusCode).toBe(404);
    expect((await detalhe(b.token, propria.id)).json()).toMatchObject({ status: "OPEN" });
  });

  it("o resumo responde pela empresa ativa, nunca pela outra", async () => {
    const a = await conta("OWNER");
    const b = await conta("OWNER");
    const da = await cadastro(a.token, "Soma");
    await abrir(a.token, da, { title: "Só na A" });
    const resumoA = await app.inject({ method: "GET", url: "/api/service-orders/summary", headers: auth(a.token) });
    const resumoB = await app.inject({ method: "GET", url: "/api/service-orders/summary", headers: auth(b.token) });
    expect(resumoA.statusCode).toBe(200);
    expect((resumoA.json() as { open: number }).open).toBe(1);
    expect((resumoB.json() as { open: number; total: number }).open).toBe(0);
    expect((resumoB.json() as { total: number }).total).toBe(0);
  });

  it("sem token nenhuma rota de OS responde", async () => {
    const alvos: { method: "GET" | "POST" | "PATCH"; url: string }[] = [
      { method: "GET", url: "/api/service-orders" },
      { method: "GET", url: "/api/service-orders/summary" },
      { method: "GET", url: "/api/service-orders/inexistente" },
      { method: "POST", url: "/api/service-orders" },
      { method: "PATCH", url: "/api/service-orders/inexistente" },
      { method: "POST", url: "/api/service-orders/inexistente/status" },
    ];
    for (const alvo of alvos) {
      const res = await app.inject({ method: alvo.method, url: alvo.url });
      expect(res.statusCode, alvo.url).toBe(401);
    }
  });
});

describe("Ordens de serviço — permissões por papel", () => {
  it("STAFF lê, não cria, não cancela e só mexe na OS atribuída a ele", async () => {
    const chefe = await conta("ADMIN");
    const d = await cadastro(chefe.token, "Equipe");
    const equipe = await membro(chefe.token, "STAFF");
    const outro = await membro(chefe.token, "STAFF");
    const propria = await novaOs(chefe.token, d, { assignedUserId: equipe.userId });
    const deOutrem = await novaOs(chefe.token, d, { assignedUserId: outro.userId });
    const semDono = await novaOs(chefe.token, d);

    const ler = await app.inject({ method: "GET", url: "/api/service-orders", headers: auth(equipe.token) });
    expect(ler.statusCode).toBe(200);
    expect((await detalhe(equipe.token, propria.id)).statusCode).toBe(200);

    // Criar ordem não é do atendente.
    expect((await abrir(equipe.token, d)).statusCode).toBe(403);

    // OS que não é dele é invisível para a escrita, mas continua legível.
    expect((await status(equipe.token, deOutrem.id, "IN_PROGRESS")).statusCode).toBe(403);
    expect((await status(equipe.token, semDono.id, "IN_PROGRESS")).statusCode).toBe(403);
    expect((await editar(equipe.token, semDono.id, { title: "X" })).statusCode).toBe(403);
    expect((await detalhe(equipe.token, deOutrem.id)).statusCode).toBe(200);

    // Na dele: status e anotações podem; itens, desconto e responsável, não.
    expect((await status(equipe.token, propria.id, "IN_PROGRESS", "Atendido")).statusCode).toBe(200);
    const anota = await editar(equipe.token, propria.id, { diagnosis: "Peça a caminho", notes: "Cliente avisado" });
    expect(anota.statusCode).toBe(200);
    expect((await editar(equipe.token, propria.id, { title: "Mudou o assunto" })).statusCode).toBe(403);
    expect((await editar(equipe.token, propria.id, { items: itensPeca(d.productId, 1) })).statusCode).toBe(403);
    expect((await editar(equipe.token, propria.id, { discount: 1 })).statusCode).toBe(403);
    expect((await editar(equipe.token, propria.id, { assignedUserId: chefe.f.userId })).statusCode).toBe(403);
    expect((await editar(equipe.token, propria.id, { priority: "LOW" })).statusCode).toBe(403);

    // Cancelar nunca é do atendente; concluir a própria, sim; estornar, não.
    expect((await status(equipe.token, propria.id, "COMPLETED")).statusCode).toBe(200);
    expect((await status(equipe.token, propria.id, "CANCELLED")).statusCode).toBe(403);
    const outra = await novaOs(chefe.token, d, { assignedUserId: equipe.userId });
    expect((await status(equipe.token, outra.id, "CANCELLED")).statusCode).toBe(403);
  });

  it("MANAGER opera, mas não estorna uma concluída", async () => {
    const { token } = await conta("MANAGER");
    const d = await cadastro(token, "Gerencia");
    const os = await novaOs(token, d, { items: itensPeca(d.productId, 1) });
    await anda(token, os.id, "IN_PROGRESS", "gerenciando");
    await anda(token, os.id, "COMPLETED", "fechada");
    expect(await estoqueAtual(d.productId)).toBe(9);
    const estorno = await status(token, os.id, "CANCELLED");
    expect(estorno.statusCode).toBe(403);
    expect(await estoqueAtual(d.productId)).toBe(9);
    const aberta = await novaOs(token, d);
    expect((await status(token, aberta.id, "CANCELLED")).statusCode).toBe(200);
  });

  it("OWNER e ADMIN estornam a concluída", async () => {
    for (const papel of ["OWNER", "ADMIN"] as Papel[]) {
      const { token } = await conta(papel);
      const d = await cadastro(token, `Estorno ${papel}`.replace(/[^A-Za-z ]/g, ""));
      const os = await novaOs(token, d, { items: itensPeca(d.productId, 1) });
      await anda(token, os.id, "IN_PROGRESS", papel);
      await anda(token, os.id, "COMPLETED", papel);
      expect(await estoqueAtual(d.productId)).toBe(9);
      expect((await status(token, os.id, "CANCELLED")).statusCode, papel).toBe(200);
      expect(await estoqueAtual(d.productId), papel).toBe(10);
    }
  });

  it("a matriz de permissões expõe o recurso service_order", async () => {
    const { token } = await conta("OWNER");
    const res = await app.inject({ method: "GET", url: "/api/users/permissions", headers: auth(token) });
    expect(res.statusCode).toBe(200);
    const corpo = res.json() as {
      recursos?: { recurso: string; rotulo: string }[];
      celulas?: { recurso: string; acao: string; roles: string[] }[];
    };
    expect((corpo.recursos ?? []).map((r) => r.recurso)).toContain("service_order");
    const leitura = (corpo.celulas ?? []).find((c) => c.recurso === "service_order" && c.acao === "read");
    expect(leitura?.roles).toEqual(["OWNER", "ADMIN", "MANAGER", "STAFF"]);
    const escrita = (corpo.celulas ?? []).find((c) => c.recurso === "service_order" && c.acao === "write");
    expect(escrita?.roles).toEqual(["OWNER", "ADMIN", "MANAGER"]);
  });
});

describe("Ordens de serviço — listagem e resumo", () => {
  it("busca por número, cliente e título, com filtros e ordenação", async () => {
    const { token } = await conta("ADMIN");
    const equipe = await membro(token, "STAFF");
    const um = await cadastro(token, "Alvo");
    const dois = await cadastro(token, "Busca");
    const a = await novaOs(token, um, { title: "Instalação de painel", priority: "HIGH", assignedUserId: equipe.userId });
    const b = await novaOs(token, dois, { title: "Reparo do no-break", priority: "LOW" });

    const lista = await app.inject({ method: "GET", url: "/api/service-orders", headers: auth(token) });
    expect((lista.json() as { meta: { total: number } }).meta.total).toBe(2);
    const linha = (lista.json() as { data: { number: number; clientName: string | null; items: unknown[] }[] }).data[0];
    expect(linha?.items.length).toBeGreaterThan(0);

    // O "2" do número não pode achar cliente nem título: os nomes aqui não têm dígito.
    const porNumero = await app.inject({ method: "GET", url: "/api/service-orders?search=2", headers: auth(token) });
    const corpos = (porNumero.json() as { data: { id: string }[] }).data;
    expect(corpos.length).toBe(1);
    expect(corpos[0]?.id).toBe(b.id);

    const porCliente = await app.inject({ method: "GET", url: "/api/service-orders?search=busca", headers: auth(token) });
    expect((porCliente.json() as { meta: { total: number } }).meta.total).toBe(1);
    const porTitulo = await app.inject({ method: "GET", url: "/api/service-orders?search=instal", headers: auth(token) });
    expect((porTitulo.json() as { meta: { total: number } }).meta.total).toBe(1);

    expect((await app.inject({ method: "GET", url: "/api/service-orders?status=IN_PROGRESS", headers: auth(token) })).json())
      .toMatchObject({ meta: { total: 0 } });
    await anda(token, b.id, "IN_PROGRESS", "filtro de status");
    const porStatus = await app.inject({ method: "GET", url: "/api/service-orders?status=IN_PROGRESS", headers: auth(token) });
    expect((porStatus.json() as { meta: { total: number } }).meta.total).toBe(1);
    const porPrioridade = await app.inject({ method: "GET", url: "/api/service-orders?priority=HIGH", headers: auth(token) });
    expect((porPrioridade.json() as { data: { id: string }[] }).data[0]?.id).toBe(a.id);
    const porResponsavel = await app.inject({
      method: "GET", url: `/api/service-orders?assignedUserId=${equipe.userId}`, headers: auth(token),
    });
    expect((porResponsavel.json() as { data: { id: string }[] }).data[0]?.id).toBe(a.id);

    const ordenado = await app.inject({ method: "GET", url: "/api/service-orders?sort=number", headers: auth(token) });
    expect((ordenado.json() as { data: { number: number }[] }).data.map((r) => r.number)).toEqual([1, 2]);

    const pagina = await app.inject({ method: "GET", url: "/api/service-orders?page=2&pageSize=1", headers: auth(token) });
    expect((pagina.json() as { meta: { totalPages: number; page: number } }).meta).toMatchObject({ totalPages: 2, page: 2 });
    expect((pagina.json() as { data: unknown[] }).data.length).toBe(1);

    const amanha = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const hoje = new Date().toISOString().slice(0, 10);
    const periodo = await app.inject({ method: "GET", url: `/api/service-orders?from=${amanha}`, headers: auth(token) });
    expect((periodo.json() as { meta: { total: number } }).meta.total).toBe(0);
    const dentro = await app.inject({ method: "GET", url: `/api/service-orders?to=${hoje}`, headers: auth(token) });
    expect((dentro.json() as { meta: { total: number } }).meta.total).toBe(2);
  });

  it("resumo com contagens reais por status e o valor concluído no mês", async () => {
    const { token } = await conta("OWNER");
    const d = await cadastro(token, "Medidor");
    const andamento = await novaOs(token, d, { items: itensPeca(d.productId, 2) });
    const espera = await novaOs(token, d, { items: itensPeca(d.productId, 3) });
    const feita = await novaOs(token, d, { items: itensPeca(d.productId, 4) });
    const morta = await novaOs(token, d, { priority: "URGENT" });
    // A primeira fica aberta de propósito: é o "open: 1" da conta abaixo.
    await novaOs(token, d, { items: itensPeca(d.productId, 1) });

    await anda(token, andamento.id, "IN_PROGRESS", "contagem");
    await anda(token, espera.id, "IN_PROGRESS", "contagem");
    await anda(token, espera.id, "WAITING", "contagem");
    await anda(token, feita.id, "IN_PROGRESS", "contagem");
    await anda(token, feita.id, "COMPLETED", "contagem");
    await anda(token, morta.id, "CANCELLED", "contagem");

    const res = await app.inject({ method: "GET", url: "/api/service-orders/summary", headers: auth(token) });
    expect(res.statusCode).toBe(200);
    const s = res.json() as {
      total: number; open: number; inProgress: number; waiting: number; completed: number; cancelled: number;
      urgent: number; completedThisMonth: number; completedValueThisMonth: number;
    };
    expect(s.total).toBe(5);
    expect(s.open).toBe(1);
    expect(s.inProgress).toBe(1);
    expect(s.waiting).toBe(1);
    expect(s.completed).toBe(1);
    expect(s.cancelled).toBe(1);
    expect(s.urgent).toBe(1);
    expect(s.completedThisMonth).toBe(1);
    // Quatro peças de 10,00 concluídas no mês da empresa.
    expect(s.completedValueThisMonth).toBe(40);
  });

  it("OS concluída em outro mês não entra na conta do mês corrente", async () => {
    const { token } = await conta("OWNER");
    const d = await cadastro(token, "Passado");
    const os = await novaOs(token, d, { items: itensPeca(d.productId, 1) });
    await anda(token, os.id, "IN_PROGRESS", "viagem no tempo");
    await anda(token, os.id, "COMPLETED", "fechada hoje");
    // Move a conclusão para o mês anterior, direto na coluna que a conta lê.
    await prisma.serviceOrder.update({ where: { id: os.id }, data: { completedAt: new Date(Date.now() - 40 * 86400000) } });
    const s = (await app.inject({ method: "GET", url: "/api/service-orders/summary", headers: auth(token) })).json() as {
      completed: number; completedThisMonth: number; completedValueThisMonth: number;
    };
    expect(s.completed).toBe(1);
    expect(s.completedThisMonth).toBe(0);
    expect(s.completedValueThisMonth).toBe(0);
  });

  it("itens de uma OS nunca aparecem em outra e o total lido é o gravado", async () => {
    const { token } = await conta("OWNER");
    const d = await cadastro(token, "Separado");
    const uma = await novaOs(token, d, { items: [{ kind: "SERVICE", description: "Visita técnica", quantity: 1, unitPrice: "120,00" }] });
    const outra = await novaOs(token, d, { items: itensPeca(d.productId, 2) });
    const corpoUma = (await detalhe(token, uma.id)).json() as { items: { kind: string; lineTotal: number }[]; total: number };
    const corpoOutra = (await detalhe(token, outra.id)).json() as { items: { kind: string }[]; total: number };
    expect(corpoUma.items.length).toBe(1);
    expect(corpoUma.items[0]?.kind).toBe("SERVICE");
    expect(corpoUma.total).toBe(120);
    expect(corpoOutra.items.length).toBe(1);
    expect(corpoOutra.total).toBe(20);
    expect(uma.id).not.toBe(outra.id);
  });
});
