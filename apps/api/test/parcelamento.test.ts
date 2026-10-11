import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { dividirCentavos } from "../src/lib/money";
import { diaNoFuso, mesesDepoisNoCalendario } from "../src/lib/time";
import { app, makeAccount, login, cleanup, uid } from "./helpers";

// Fase 3e da auditoria: a venda confirmada passou a existir dentro do caixa.
//
// Antes desta fase havia dois módulos que não se falavam. Vendas registrava a
// nota, o relatório mostrava a receita dela, e o Financeiro — a tela onde o dono
// olha quanto entra e quanto sai — continuava exatamente como estava, sem aquele
// lançamento. Fazer o caixa bater era trabalho de reescrever à mão, no dia
// seguinte, o valor, o cliente e a data que o sistema já sabia. E "em três vezes"
// não existia em lugar nenhum: não havia onde dizer que a nota de R$ 300,00 entra
// no caixa em R$ 100,00 por mês.
//
// O vínculo tem quatro invariantes, e é nelas que este arquivo cabe:
//
//  1. só nasce lançamento de documento EFETIVO — venda CONFIRMADA, compra
//     RECEIVED. Um rascunho ainda pode morrer sem ninguém ter pago nada; lançá-lo
//     seria infligir ao caixa receita e despesa que não aconteceram.
//  2. a política é por empresa e DESLIGADA por padrão. Quem já lança a receita à
//     mão não pode receber o dobro dela no dia em que o sistema aprender a fazer
//     o que a pessoa já fazia.
//  3. as parcelas fecham o centavo: somado, o carnê é o total da nota, exatamente,
//     com o resto na última parcela — e o vencimento é calendário mensal (o mesmo
//     dia do mês seguinte, clampado), não trinta dias somados.
//  4. cancelar tira o que ainda não aconteceu e preserva o que já foi pago.
//     Dinheiro que entrou no caixa não apaga por decreto do sistema.

const auth = (token: string) => ({ authorization: `Bearer ${token}` });

interface LinhaFinanceiro {
  id: string; description: string; amount: number; dueDate: string;
}

describe("Vínculo venda↔financeiro com parcelamento (Fase 3e)", () => {
  const created: { userIds: string[]; companyIds: string[] } = { userIds: [], companyIds: [] };
  afterAll(async () => {
    await cleanup(created);
    await app.close();
  });

  async function account(role: "OWNER" | "ADMIN" | "MANAGER" | "STAFF" = "OWNER") {
    const f = await makeAccount(role);
    created.userIds.push(f.userId);
    created.companyIds.push(f.companyId);
    return { f, token: await login(f.email, f.password) };
  }

  /** Liga a política da empresa pelo PATCH parcial de Configurações. */
  async function ligarPolitica(token: string, campos: { venda?: boolean; compra?: boolean }) {
    const res = await app.inject({
      method: "PATCH", url: "/api/companies/current", headers: auth(token),
      payload: {
        ...(campos.venda === undefined ? {} : { autoFinanceSales: campos.venda }),
        ...(campos.compra === undefined ? {} : { autoFinancePurchases: campos.compra }),
      },
    });
    expect(res.statusCode).toBe(200);
  }

  async function produto(token: string, salePrice: number) {
    const res = await app.inject({
      method: "POST", url: "/api/products", headers: auth(token),
      payload: { name: "Item 3e " + uid("p"), salePrice, costPrice: salePrice / 2, stockQuantity: 100, minStock: 1 },
    });
    expect(res.statusCode).toBe(201);
    return (res.json() as { id: string }).id;
  }

  async function cliente(token: string) {
    const res = await app.inject({
      method: "POST", url: "/api/clients", headers: auth(token),
      payload: { name: "Cliente 3e " + uid("c") },
    });
    return (res.json() as { id: string }).id;
  }

  async function fornecedor(token: string) {
    const res = await app.inject({
      method: "POST", url: "/api/suppliers", headers: auth(token),
      payload: { name: "Fornecedor 3e " + uid("s") },
    });
    expect(res.statusCode).toBe(201);
    return (res.json() as { id: string }).id;
  }

  async function criarVenda(token: string, payload: Record<string, unknown>) {
    const res = await app.inject({ method: "POST", url: "/api/sales", headers: auth(token), payload });
    expect(res.statusCode).toBe(201);
    return res.json() as { id: string; total: number; installments: number; status: string };
  }

  async function mudarStatusVenda(token: string, id: string, status: "CONFIRMED" | "CANCELLED") {
    const res = await app.inject({
      method: "PATCH", url: `/api/sales/${id}/status`, headers: auth(token), payload: { status },
    });
    expect(res.statusCode).toBe(200);
    return res.json() as { status: string };
  }

  async function estoque(token: string, productId: string) {
    const res = await app.inject({ method: "GET", url: `/api/products/${productId}`, headers: auth(token) });
    return (res.json() as { stockQuantity: number }).stockQuantity;
  }

  /** O carnê como o banco o guarda: ordem de vencimento, valor exato, vínculo. */
  function parcelasDaVenda(saleId: string) {
    return prisma.financeEntry.findMany({
      where: { saleId },
      orderBy: { dueDate: "asc" },
      include: { category: { select: { name: true } } },
    });
  }

  function parcelasDaCompra(purchaseId: string) {
    return prisma.financeEntry.findMany({
      where: { purchaseId },
      orderBy: { dueDate: "asc" },
      include: { category: { select: { name: true } } },
    });
  }

  /** Vencimentos em "AAAA-MM-DD" lidos como o banco os guarda (coluna @db.Date). */
  const dia = (d: Date) => d.toISOString().slice(0, 10);

  it("política desligada (o padrão): venda confirmada não escreve nada no caixa", async () => {
    const { token } = await account();
    const productId = await produto(token, 10);
    const venda = await criarVenda(token, { confirm: true, items: [{ productId, quantity: 3, unitPrice: 10 }] });
    expect(venda.total).toBe(30);
    // Ausente na chamada é à vista: a tela anterior a esta fase, um integrador e
    // os testes de isolamento mandam sem falar de parcelas.
    expect(venda.installments).toBe(1);

    expect(await parcelasDaVenda(venda.id)).toHaveLength(0);
    const resumo = await app.inject({ method: "GET", url: "/api/finance/summary", headers: auth(token) });
    const corpo = resumo.json() as { pendingIncome: number; income: number };
    expect(corpo.pendingIncome).toBe(0);
    expect(corpo.income).toBe(0);

    // As duas chaves existem, são booleanas e vêm desligadas nas duas pontas.
    const empresa = await app.inject({ method: "GET", url: "/api/companies/current", headers: auth(token) });
    const cfg = empresa.json() as { autoFinanceSales: boolean; autoFinancePurchases: boolean; timezone: string };
    expect(cfg.autoFinanceSales).toBe(false);
    expect(cfg.autoFinancePurchases).toBe(false);
    expect(cfg.timezone).toBe("America/Sao_Paulo");
  });

  it("venda confirmada com a política ligada gera um lançamento de receita no dia da empresa", async () => {
    const { f, token } = await account();
    await ligarPolitica(token, { venda: true });
    const productId = await produto(token, 10);
    const clientId = await cliente(token);
    const venda = await criarVenda(token, {
      confirm: true, clientId, items: [{ productId, quantity: 3, unitPrice: 10 }],
    });

    const parcelas = await parcelasDaVenda(venda.id);
    expect(parcelas).toHaveLength(1);
    const unica = parcelas[0]!;
    expect(unica.type).toBe("INCOME");
    expect(unica.status).toBe("PENDING");
    expect(unica.amount.toFixed(2)).toBe("30.00");
    expect(unica.category?.name).toBe("Vendas");
    expect(unica.clientId).toBe(clientId);
    expect(unica.saleId).toBe(venda.id);
    expect(unica.userId).toBe(f.userId);
    expect(unica.description).toContain("à vista");
    expect(unica.description).toContain(venda.id.slice(0, 8).toUpperCase());
    // À vista vence HOJE no calendário da empresa — coluna @db.Date lida em UTC,
    // exatamente como o resumo financeiro a compara (Fase 3c).
    expect(dia(unica.dueDate)).toBe(diaNoFuso("America/Sao_Paulo"));
  });

  it("parcelada em 3 fecha o centavo: 33,33 + 33,33 + 33,34 = 100,00, com vencimento mensal", async () => {
    const { token } = await account();
    await ligarPolitica(token, { venda: true });
    const productId = await produto(token, 100);
    const venda = await criarVenda(token, {
      confirm: true, installments: 3, items: [{ productId, quantity: 1, unitPrice: 100 }],
    });
    expect(venda.installments).toBe(3);

    const parcelas = await parcelasDaVenda(venda.id);
    expect(parcelas).toHaveLength(3);
    expect(parcelas.map((p) => p.amount.toFixed(2))).toEqual(["33.33", "33.33", "33.34"]);

    // A invariante que o carnê inteiro precisa manter: somado, é a nota.
    const emCentavos = parcelas.reduce((s, p) => s + Math.round(Number(p.amount) * 100), 0);
    expect(emCentavos).toBe(10_000);
    expect(emCentavos).toBe(Math.round(venda.total * 100));

    // Vencimentos: meses seguidos, sempre o mesmo dia — ou o último dia do mês,
    // quando ele não tem aquele dia. A regra é conferida contra o calendário do
    // mês alvo, não contra o helper (o clamp em si está amarrado à mão lá embaixo).
    const hoje = diaNoFuso("America/Sao_Paulo");
    const dias = parcelas.map((p) => dia(p.dueDate));
    expect(dias[0]).toBe(hoje);
    const diaOriginal = Number(hoje.slice(8, 10));
    for (let i = 1; i < dias.length; i++) {
      const [ano, mes] = dias[i]!.split("-").map(Number) as [number, number];
      const ultimoDoMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
      expect(dias[i]!.slice(8, 10)).toBe(String(Math.min(diaOriginal, ultimoDoMes)).padStart(2, "0"));
      const anterior = dias[i - 1]!.split("-").map(Number) as [number, number];
      expect(ano * 12 + mes).toBe(anterior[0] * 12 + anterior[1] + 1);
    }
  });

  it("rascunho não lança nada; confirmar depois gera o carnê inteiro", async () => {
    const { token } = await account();
    await ligarPolitica(token, { venda: true });
    const productId = await produto(token, 25);
    const venda = await criarVenda(token, {
      confirm: false, installments: 4, items: [{ productId, quantity: 2, unitPrice: 25 }],
    });
    // Pedido pendente ainda pode ser jogado fora sem ninguém ter pago: o caixa não
    // pode ter visto receita de algo que não aconteceu.
    expect(await parcelasDaVenda(venda.id)).toHaveLength(0);
    expect(await estoque(token, productId)).toBe(100);

    await mudarStatusVenda(token, venda.id, "CONFIRMED");
    const parcelas = await parcelasDaVenda(venda.id);
    expect(parcelas).toHaveLength(4);
    expect(parcelas.reduce((s, p) => s + Math.round(Number(p.amount) * 100), 0)).toBe(5_000);
    // 5.000 / 4 = 1.250 centavos exatos: sem resto, as quatro parcelas são iguais.
    expect(new Set(parcelas.map((p) => p.amount.toFixed(2)))).toEqual(new Set(["12.50"]));
    expect(await estoque(token, productId)).toBe(98);
  });

  it("cancelar tira as parcelas pendentes e preserva o que já foi pago", async () => {
    const { token } = await account();
    await ligarPolitica(token, { venda: true });
    const productId = await produto(token, 30);
    const venda = await criarVenda(token, {
      confirm: true, installments: 3, items: [{ productId, quantity: 3, unitPrice: 30 }],
    });
    const antes = await parcelasDaVenda(venda.id);
    expect(antes).toHaveLength(3);

    // A primeira parcela entrou no caixa.
    const paga = await app.inject({
      method: "PATCH", url: `/api/finance/entries/${antes[0]!.id}/status`, headers: auth(token),
      payload: { status: "PAID" },
    });
    expect(paga.statusCode).toBe(200);

    await mudarStatusVenda(token, venda.id, "CANCELLED");

    const depois = await parcelasDaVenda(venda.id);
    expect(depois).toHaveLength(1);
    expect(depois[0]!.status).toBe("PAID");
    // O que já é dinheiro de verdade continua no resumo do mês.
    const resumo = await app.inject({ method: "GET", url: "/api/finance/summary", headers: auth(token) });
    expect((resumo.json() as { income: number }).income).toBe(30);
    expect((resumo.json() as { pendingIncome: number }).pendingIncome).toBe(0);
    // ...e o estoque voltou, como sempre voltou.
    expect(await estoque(token, productId)).toBe(100);
  });

  it("compra recebida gera despesa a pagar na categoria Compras; cancelar remove", async () => {
    const { f, token } = await account();
    await ligarPolitica(token, { compra: true });
    const productId = await produto(token, 10);
    const supplierId = await fornecedor(token);

    const criacao = await app.inject({
      method: "POST", url: "/api/purchases", headers: auth(token),
      payload: { supplierId, receive: true, installments: 2, items: [{ productId, quantity: 4, unitCost: 25 }] },
    });
    expect(criacao.statusCode).toBe(201);
    const compra = criacao.json() as { id: string; total: number; installments: number };
    expect(compra.total).toBe(100);
    expect(compra.installments).toBe(2);

    const parcelas = await parcelasDaCompra(compra.id);
    expect(parcelas).toHaveLength(2);
    expect(parcelas[0]!.type).toBe("EXPENSE");
    expect(parcelas[0]!.status).toBe("PENDING");
    expect(parcelas[0]!.supplierId).toBe(supplierId);
    expect(parcelas[0]!.category?.name).toBe("Compras");
    expect(parcelas.map((p) => p.amount.toFixed(2))).toEqual(["50.00", "50.00"]);
    // As duas chaves são independentes: a política de receita está desligada
    // nesta empresa, então nenhum INCOME nasce dela.
    expect(await prisma.financeEntry.count({ where: { companyId: f.companyId, type: "INCOME" } })).toBe(0);

    const resumo = await app.inject({ method: "GET", url: "/api/finance/summary", headers: auth(token) });
    expect((resumo.json() as { pendingExpense: number }).pendingExpense).toBe(100);

    const cancel = await app.inject({
      method: "PATCH", url: `/api/purchases/${compra.id}/status`, headers: auth(token),
      payload: { status: "CANCELLED" },
    });
    expect(cancel.statusCode).toBe(200);
    expect(await prisma.financeEntry.count({ where: { purchaseId: compra.id } })).toBe(0);
    const depois = await app.inject({ method: "GET", url: "/api/finance/summary", headers: auth(token) });
    expect((depois.json() as { pendingExpense: number }).pendingExpense).toBe(0);
    // Estorno de estoque segue acontecendo, como antes da fase.
    expect(await estoque(token, productId)).toBe(100);
  });

  it("a categoria automática é criada uma vez só, não uma por documento", async () => {
    const { f, token } = await account();
    await ligarPolitica(token, { venda: true });
    const productId = await produto(token, 10);
    await criarVenda(token, { confirm: true, items: [{ productId, quantity: 1, unitPrice: 10 }] });
    await criarVenda(token, { confirm: true, installments: 2, items: [{ productId, quantity: 1, unitPrice: 10 }] });
    await criarVenda(token, { confirm: true, installments: 3, items: [{ productId, quantity: 1, unitPrice: 10 }] });

    const categorias = await prisma.financeCategory.findMany({
      where: { companyId: f.companyId, name: "Vendas", type: "INCOME" },
    });
    expect(categorias).toHaveLength(1);
    const gerados = await prisma.financeEntry.count({ where: { companyId: f.companyId, saleId: { not: null } } });
    expect(gerados).toBe(6);
    const soma = await prisma.financeEntry.aggregate({
      where: { companyId: f.companyId, saleId: { not: null } },
      _sum: { amount: true },
    });
    // Três notas de R$ 10,00, carnês de 1, 2 e 3 parcelas: R$ 30,00 no caixa,
    // nem um centavo a mais (duplicidade) nem a menos (truncamento).
    expect(soma._sum.amount?.toFixed(2)).toBe("30.00");
  });

  it("uma empresa não enxerga o carnê da outra", async () => {
    const a = await account();
    const b = await account();
    await ligarPolitica(a.token, { venda: true });
    await ligarPolitica(b.token, { venda: true });
    const produtoA = await produto(a.token, 10);
    const produtoB = await produto(b.token, 10);
    const vendaA = await criarVenda(a.token, {
      confirm: true, installments: 5, items: [{ productId: produtoA, quantity: 1, unitPrice: 10 }],
    });
    const vendaB = await criarVenda(b.token, {
      confirm: true, items: [{ productId: produtoB, quantity: 1, unitPrice: 10 }],
    });
    expect(await parcelasDaVenda(vendaA.id)).toHaveLength(5);
    expect(await parcelasDaVenda(vendaB.id)).toHaveLength(1);

    const listaB = await app.inject({
      method: "GET", url: "/api/finance/entries?pageSize=50", headers: auth(b.token),
    });
    const linhas = (listaB.json() as { data: LinhaFinanceiro[] }).data;
    expect(linhas).toHaveLength(1);
    expect(linhas[0]!.description).toContain(vendaB.id.slice(0, 8).toUpperCase());
    expect(linhas.some((l) => l.description.includes(vendaA.id.slice(0, 8).toUpperCase()))).toBe(false);

    // E apagar o lançamento da venda A pelo token da empresa B não apaga nada.
    const parcelaA = (await parcelasDaVenda(vendaA.id))[0]!;
    const travada = await app.inject({
      method: "PATCH", url: `/api/finance/entries/${parcelaA.id}/status`, headers: auth(b.token),
      payload: { status: "PAID" },
    });
    expect(travada.statusCode).toBe(404);
    expect((await parcelasDaVenda(vendaA.id))[0]!.status).toBe("PENDING");
  });

  it("a porta recusa parcelas que não são número de parcela", async () => {
    const { f, token } = await account();
    const productId = await produto(token, 10);
    for (const installments of [0, -1, 2.5, 121, "três"]) {
      const res = await app.inject({
        method: "POST", url: "/api/sales", headers: auth(token),
        payload: { confirm: true, installments, items: [{ productId, quantity: 1, unitPrice: 10 }] },
      });
      expect(res.statusCode).toBe(400);
    }
    // Nada foi criado, então nada poderia ser lançado.
    expect(await prisma.sale.count({ where: { companyId: f.companyId } })).toBe(0);
    expect(await prisma.financeEntry.count({ where: { companyId: f.companyId } })).toBe(0);
  });

  it("dividir em centavo e andar no calendário: as duas contas puras do carnê", () => {
    // O resto vai todo na ÚLTIMA parcela, e a soma é o total por construção.
    expect(dividirCentavos(10_000, 3)).toEqual([3333, 3333, 3334]);
    expect(dividirCentavos(10_000, 3).reduce((a, b) => a + b, 0)).toBe(10_000);
    expect(dividirCentavos(1, 3)).toEqual([0, 0, 1]);
    expect(dividirCentavos(999, 7).reduce((a, b) => a + b, 0)).toBe(999);
    expect(dividirCentavos(100, 1)).toEqual([100]);
    // Uma parcela é o total; sem parcela não há carnê, e o helper devolve o tudo.
    expect(dividirCentavos(100, 0)).toEqual([100]);

    // Calendário, não trinta dias: 31 de janeiro não tem 31 de fevereiro, então o
    // dia 31 de janeiro de 2026 parcela em 28/02 (não é bissexto), 31/03, 30/04.
    const janeiro31 = new Date(Date.UTC(2026, 0, 31));
    expect(dia(mesesDepoisNoCalendario(janeiro31, 0))).toBe("2026-01-31");
    expect(dia(mesesDepoisNoCalendario(janeiro31, 1))).toBe("2026-02-28");
    expect(dia(mesesDepoisNoCalendario(janeiro31, 2))).toBe("2026-03-31");
    expect(dia(mesesDepoisNoCalendario(janeiro31, 3))).toBe("2026-04-30");
    // Ano bissexto: fevereiro de 2028 tem 29 dias, e o clamp respeita isso.
    expect(dia(mesesDepoisNoCalendario(janeiro31, 13))).toBe("2027-02-28");
    expect(dia(mesesDepoisNoCalendario(janeiro31, 25))).toBe("2028-02-29");
    // Doze meses são o mesmo dia do ano seguinte — sem transbordo de um dia, que
    // é o que `Date.UTC(ano, mês + 12, 31)` de um "ajuste rápido" faria.
    expect(dia(mesesDepoisNoCalendario(janeiro31, 12))).toBe("2027-01-31");
    // Para trás a regra é a mesma: 31/12 menos um mês é 30/11, novembro tem 30.
    const dezembro31 = new Date(Date.UTC(2026, 11, 31));
    expect(dia(mesesDepoisNoCalendario(dezembro31, -1))).toBe("2026-11-30");
    // 120 parcelas (o teto da porta) não deslocam o dia para além do horizonte.
    expect(dia(mesesDepoisNoCalendario(janeiro31, 120))).toBe("2036-01-31");
  });
});
