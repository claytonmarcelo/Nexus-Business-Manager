import { describe, it, expect, afterAll } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import {
  centavos,
  decimalDeCentavos,
  linhaDecimal,
  mediaPorUnidade,
  moeda,
  moedaDeCentavos,
  porcentagem,
  somarCentavos,
  variacaoPercentual,
} from "../src/lib/money";
import { calendarioDaEmpresa, fusoDaEmpresa } from "../src/lib/time";
import { app, makeAccount, login, cleanup, uid } from "./helpers";

// Fase 3d da auditoria: dinheiro deixou de ser soma de double.
//
// As colunas do banco sempre foram DECIMAL — o problema era o caminho entre a
// leitura e a escrita. `Number(decimal)` virava double, a conta seguia em base
// 2 e só no fim um `Math.round(x * 100) / 100` consertava a etiqueta. Na tela,
// na maioria dos dias, o resultado saía certo: a poeira de 2026 parcelas de
// R$ 0,10 é 7 trilionésimos e o round do fim a engolia. O que essa rede de
// proteção NÃO protegia era o que ela mesma arredondava:
//
//   - a linha do item de venda era `Math.round(quantidade × preço × 100)/100`
//     calculada sobre o preço ANTES de a coluna DECIMAL(12,2) o guardar, então
//     3 × 1,005 virava 3,01 (meio centavo para baixo) e a nota batia 3,50 com
//     um preço unitário de 1,01 na mesma linha — valor escrito no histórico;
//   - a porta de entrada era `z.coerce.number()`: `Number("1.290,50")` é NaN,
//     então o teclado brasileiro era recusado, `""` virava zero silencioso e
//     `12,3456` passava cru para uma coluna de duas casas, onde o MySQL
//     arredondava por conta própria e o echo da API discordava do banco.
//
// A regra nova: entre a leitura e a escrita o dinheiro anda em CENTAVOS
// inteiros ou `Prisma.Decimal`, e `Number` só aparece na borda do JSON. Estes
// testes amarram as três garantias:
//
//   1. meio centavo arredonda para CIMA na base 10, e a linha é
//      `quantidade × preço` com UMA rodada, sobre o preço que a nota mostra;
//   2. o total de uma nota — e de um painel inteiro — é soma de centavos
//      inteiros, então não depende da ordem nem do tamanho da acumulação;
//   3. a porta aceita o que o teclado brasileiro digita (`1.290,50`) e devolve
//      exatamente o valor que a coluna DECIMAL(x,2) guarda.
//
// Os números esperados abaixo foram calculados à mão, no comentário de cada
// caso, em vez de chamados no próprio helper — senão a regra conferiria a si
// mesma. Onde o double antigo ACERTAVA (a subtração da meta, por exemplo) isto
// está dito com todas as letras: o teste ali vale pela invariante, não por uma
// falha que ele não tem.

const auth = (token: string) => ({ authorization: `Bearer ${token}` });

describe("Dinheiro em centavo (Fase 3d)", () => {
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

  it("meio centavo sobe na base 10, e a linha é quantidade × preço com uma única rodada", () => {
    // 3 × 1,005 = 3,015 → meia casa para cima = 3,02. O código antigo fazia
    // `Math.round(3 * 1.005 * 100) / 100`: 3 × 1,005 em double é
    // 3,01499999999999968, então o round devolvia 3,01 — um centavo a menos,
    // cobrado do cliente, e escrito na nota.
    expect(linhaDecimal(3, "1.005").toFixed(2)).toBe("3.02");
    expect(Math.round(3 * 1.005 * 100) / 100).toBe(3.01);

    // 7 × 0,07 = 0,49 exato. Em double o produto chega 0,49000000000000004663 e
    // 3 × 0,07 chega 0,21000000000000001998; nos dois o `Math.round` do fim
    // resgata o centavo certo. Que ele resgate nestes dois casos não é garantia
    // de nada — é o 1,005 logo acima que mostra o dia em que ele não resgata.
    expect(linhaDecimal(7, "0.07").toFixed(2)).toBe("0.49");
    expect(centavos(0.07 * 3)).toBe(21);

    // O total de uma nota é a soma dos CENTAVOS das linhas: 302 + 49 = 351, e
    // 351 centavos são R$ 3,51 — sem depender de como a adição de doubles cai
    // mais perto ou mais longe do centavo.
    const linhas = [linhaDecimal(3, "1.005"), linhaDecimal(7, "0.07")];
    expect(somarCentavos(linhas)).toBe(351);
    expect(moedaDeCentavos(somarCentavos(linhas))).toBe(3.51);
    expect(decimalDeCentavos(351).toFixed(2)).toBe("3.51");
  });

  it("a armadilha do decimal.js-light que o Prisma embute fica registrada no teste", () => {
    // `round(casas, modo)` IGNORA o número de casas nesta build: 0,07 × 3 com
    // round(2, HALF_UP) devolve "0". O `.d.ts` do Prisma nem declara esse
    // argumento — a assinatura é `round()` sem nada — e é exatamente por isso
    // que todo arredondamento de dinheiro no projeto usa `toDecimalPlaces`, que
    // respeita as casas pedidas. O cast abaixo só existe para provar o
    // comportamento; ele nunca aparece no código de produção.
    const linha = new Prisma.Decimal("0.07").mul(3);
    const roundDeCasas = linha as unknown as {
      round: (casas: number, modo: number) => { toString(): string };
    };
    expect(roundDeCasas.round(2, Prisma.Decimal.ROUND_HALF_UP).toString()).toBe("0");
    expect(linha.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toFixed(2)).toBe("0.21");
  });

  it("2026 lançamentos de R$ 0,10 somam exatos R$ 202,60 — o double antigo não somava", () => {
    // A conta que o painel de fluxo de caixa fazia: um `+=` de double por linha.
    // O `arredonda` que vinha depois na tela escondia isto (202,59999999999278
    // arredonda para 202,6), mas o número torto era o que as divisões —
    // percentual de meta, ticket médio, participação por categoria — recebiam.
    let emDouble = 0;
    for (let i = 0; i < 2026; i++) emDouble += 0.1;
    expect(emDouble).not.toBe(202.6);
    expect(emDouble).toBeLessThan(202.6);

    // A conta de agora: inteiro somado, sem erro acumulável. 2026 × 10 centavos
    // são 20 260 centavos, que são R$ 202,60 por construção.
    let emCentavo = 0;
    for (let i = 0; i < 2026; i++) emCentavo += centavos("0.10");
    expect(emCentavo).toBe(20_260);
    expect(moedaDeCentavos(emCentavo)).toBe(202.6);
    expect(moedaDeCentavos(somarCentavos(Array.from({ length: 2026 }, () => "0.10")))).toBe(202.6);
  });

  it("percentual, variação e média de dinheiro saem do centavo", () => {
    expect(porcentagem(352, 400)).toBe(88);
    expect(porcentagem(1, 3)).toBe(33);
    expect(porcentagem(10, 0)).toBe(0);
    // 802 para 3,51: (351 − 802)/802 = −56,23441…% → −56,23
    expect(variacaoPercentual(351, 802)).toBe(-56.23);
    expect(variacaoPercentual(351, 0)).toBeNull();
    // 351 centavos divididos em 3 pedidos = 117 centavos → 1,17
    expect(mediaPorUnidade(351, 3)).toBe(1.17);
    expect(mediaPorUnidade(351, 0)).toBe(0);
  });

  it("a porta do dinheiro aceita o teclado brasileiro e devolve duas casas", () => {
    const campo = moeda({ minimo: 0.01, mensagem: "Valor deve ser maior que zero e no máximo 99.999.999,99" });
    // Sai da porta exatamente o que a coluna DECIMAL(12,2) ia guardar: texto de
    // duas casas, meia casa para cima na base 10.
    expect(campo.parse(1290.5)).toBe("1290.50");
    expect(campo.parse("1290,50")).toBe("1290.50");
    expect(campo.parse("1.290,50")).toBe("1290.50");
    expect(campo.parse("0.125")).toBe("0.13");
    expect(campo.parse(0.01)).toBe("0.01");
    expect(() => campo.parse("abc")).toThrow();
    // `Number("")` é 0, e o `z.coerce.number()` antigo aceitava o campo vazio
    // como lançamento de valor zero. Aqui vazio é erro de digitação, não dinheiro.
    expect(() => campo.parse("")).toThrow();
    expect(() => campo.parse(-1)).toThrow();
    expect(() => campo.parse(0)).toThrow();
    expect(() => campo.parse(100_000_000)).toThrow();
    // Sem a borda pedida, o zero é valor (preço unitário de brinde, por exemplo).
    expect(moeda().parse(0)).toBe("0.00");
  });

  it("preço digitado como no formulário entra exato no produto", async () => {
    const { token } = await account();
    const bom = await app.inject({
      method: "POST", url: "/api/products", headers: auth(token),
      payload: { name: "Kit centavo " + uid("p"), salePrice: "1.290,50", costPrice: "12,345", stockQuantity: 0, trackStock: false },
    });
    expect(bom.statusCode).toBe(201);
    const produto = bom.json() as { salePrice: number; costPrice: number };
    // "1.290,50" → milhar + decimal = 1290.50. "12,345" → só vírgula, então é
    // decimal: 12,345 → duas casas, meia casa para cima = 12,35. Antes da porta
    // nova nenhum dos dois existia: `Number("1.290,50")` é NaN e o cadastro
    // respondia 400 para quem digitou do jeito que o formulário mostra.
    expect(produto.salePrice).toBe(1290.5);
    expect(produto.costPrice).toBe(12.35);

    const ruim = await app.inject({
      method: "POST", url: "/api/products", headers: auth(token),
      payload: { name: "Preço texto " + uid("p"), salePrice: "doze reais" },
    });
    expect(ruim.statusCode).toBe(400);
  });

  it("a venda cobra preço × quantidade e o total é a soma das linhas", async () => {
    const { token } = await account();
    const cli = await app.inject({ method: "POST", url: "/api/clients", headers: auth(token), payload: { name: "Cliente centavo " + uid("c") } });
    const p1 = await app.inject({ method: "POST", url: "/api/products", headers: auth(token), payload: { name: "Linha 1 " + uid("p"), salePrice: 1.005, stockQuantity: 100 } });
    const p2 = await app.inject({ method: "POST", url: "/api/products", headers: auth(token), payload: { name: "Linha 2 " + uid("p"), salePrice: 0.07, stockQuantity: 100 } });

    const venda = await app.inject({
      method: "POST", url: "/api/sales", headers: auth(token),
      payload: {
        clientId: (cli.json() as { id: string }).id,
        items: [
          { productId: (p1.json() as { id: string }).id, quantity: 3, unitPrice: "1.005" },
          { productId: (p2.json() as { id: string }).id, quantity: 7, unitPrice: 0.07 },
        ],
      },
    });
    expect(venda.statusCode).toBe(201);
    const nota = venda.json() as {
      total: number;
      items: { unitPrice: number; quantity: number; lineTotal: number }[];
    };

    // O preço entra normalizado em duas casas (a coluna é DECIMAL(12,2)), e a
    // linha é o produto DOS VALORES QUE A NOTA MOSTRA: 1,01 × 3 = 3,03. Antes, a
    // linha saía de 3 × 1,005 = 3,01 — calculada sobre um preço que a própria
    // nota não tinha — e era 3,01 que entrava no histórico da venda.
    //
    // As linhas são procuradas pelo preço, não pela posição: o `include: { items }`
    // do Prisma não declara ordem, e o MySQL já devolveu as duas de cabeça para
    // baixo em outra execução desta suíte.
    expect(nota.items).toHaveLength(2);
    const linhaDe = (preco: number) => nota.items.find((i) => i.unitPrice === preco);
    expect(linhaDe(1.01)?.quantity).toBe(3);
    expect(linhaDe(1.01)?.lineTotal).toBe(3.03);
    expect(linhaDe(0.07)?.lineTotal).toBe(0.49);
    expect(nota.total).toBe(3.52);

    // A invariante que a regra nova cria: total em centavo = soma dos centavos
    // das linhas, e cada linha = preço × quantidade.
    const centavosDasLinhas = nota.items.reduce((s, i) => s + centavos(i.lineTotal), 0);
    expect(centavos(nota.total)).toBe(centavosDasLinhas);
    for (const i of nota.items) {
      expect(centavos(i.lineTotal)).toBe(Math.round(centavos(i.unitPrice) * i.quantity));
    }
  });

  it("a compra segue o mesmo critério de linha e total", async () => {
    const { token } = await account();
    const forn = await app.inject({ method: "POST", url: "/api/suppliers", headers: auth(token), payload: { name: "Distribuidora centavo " + uid("s") } });
    const prod = await app.inject({ method: "POST", url: "/api/products", headers: auth(token), payload: { name: "Insumo centavo " + uid("p"), salePrice: 10, stockQuantity: 0 } });

    const compra = await app.inject({
      method: "POST", url: "/api/purchases", headers: auth(token),
      payload: {
        supplierId: (forn.json() as { id: string }).id,
        items: [{ productId: (prod.json() as { id: string }).id, quantity: 3, unitCost: "1.005" }],
      },
    });
    expect(compra.statusCode).toBe(201);
    const ordem = compra.json() as { total: number; items: { unitCost: number; lineTotal: number }[] };
    expect(ordem.items).toHaveLength(1);
    expect(ordem.items[0]?.unitCost).toBe(1.01);
    expect(ordem.items[0]?.lineTotal).toBe(3.03);
    expect(ordem.total).toBe(3.03);
  });

  it("o painel fecha 2026 lançamentos de R$ 0,10 em R$ 202,60 exatos", async () => {
    const { f, token } = await account();
    // Uma página de HTTP para cada lançamento seria lenta e estaria testando o
    // cliente; o que o painel soma é a coluna, então a massa entra pelo mesmo
    // caminho que a API escreveria: DECIMAL "0.10".
    const hoje = calendarioDaEmpresa(await fusoDaEmpresa(f.companyId));
    await prisma.financeEntry.createMany({
      data: Array.from({ length: 2026 }, () => ({
        companyId: f.companyId,
        type: "INCOME" as const,
        status: "PAID" as const,
        description: "Recibo de R$ 0,10 " + uid("e"),
        amount: new Prisma.Decimal("0.10"),
        dueDate: hoje,
      })),
    });

    const resumo = (await (
      await app.inject({ method: "GET", url: "/api/finance/summary", headers: auth(token) })
    ).json()) as { income: number; expense: number; balance: number };
    expect(resumo.income).toBe(202.6);
    expect(resumo.expense).toBe(0);
    // Saldo = 20.260 centavos − 0. Aqui o `Math.round((income − expense) * 100)
    // / 100` antigo também dava 202,6 — a soma veio do `_sum` do banco, inteira
    // até virar `Number`. O teste não finge que esta tela somava errado: ele
    // amarra que o saldo agora é subtração de centavos, então nenhuma tela do
    // grupo depende mais do round que vinha no fim da fila para aparecer certa.
    expect(resumo.balance).toBe(202.6);

    const fluxo = (await (
      await app.inject({ method: "GET", url: "/api/reports/finance?dias=7", headers: auth(token) })
    ).json()) as {
      resumo: { entradas: number; saidas: number; saldo: number };
      fluxo: { dia: string; entradas: number; saidas: number; saldo: number }[];
      centros: { nome: string; valor: number; participacao: number }[];
    };
    expect(fluxo.resumo.entradas).toBe(202.6);
    expect(fluxo.resumo.saldo).toBe(202.6);
    const ultimo = fluxo.fluxo[fluxo.fluxo.length - 1];
    expect(ultimo?.entradas).toBe(202.6);
    // Os 2026 lançamentos caem todos no dia de hoje da empresa, então o balde
    // anterior fica zerado e o saldo corrido tem que atravessar seis dias
    // vazios sem trazer poeira de double para a tela.
    expect(fluxo.fluxo[0]?.saldo).toBe(0);
    expect(fluxo.centros[0]?.valor).toBe(202.6);
    expect(fluxo.centros[0]?.participacao).toBe(100);
  });

  it("a meta do Dashboard é dinheiro contado em centavo", async () => {
    const { token } = await account();
    const prod = await app.inject({ method: "POST", url: "/api/products", headers: auth(token), payload: { name: "Serviço meta " + uid("p"), salePrice: 1.76, stockQuantity: 100, trackStock: false } });
    await app.inject({
      method: "POST", url: "/api/sales", headers: auth(token),
      payload: { items: [{ productId: (prod.json() as { id: string }).id, quantity: 2, unitPrice: 1.76 }] },
    });
    await app.inject({ method: "PATCH", url: "/api/companies/current", headers: auth(token), payload: { revenueTarget: 4 } });

    const corpo = (await (
      await app.inject({ method: "GET", url: "/api/reports/overview", headers: auth(token) })
    ).json()) as {
      vendas: { receita: number; pedidos: number; ticket: number; variacao: number | null };
      meta: { alvo: number; atingido: number; faltando: number; ritmoDiario: number } | null;
    };
    expect(corpo.vendas.receita).toBe(3.52);
    expect(corpo.vendas.pedidos).toBe(1);
    // A venda é 2 × 1,76 = 3,52 (352 centavos) num único pedido, então o ticket
    // — 352 centavos divididos por 1 — é o próprio valor da nota.
    expect(corpo.vendas.ticket).toBe(3.52);
    const meta = corpo.meta;
    expect(meta).not.toBeNull();
    expect(meta?.alvo).toBe(4);
    // 352 / 400 = 88%, contado em centavo: `porcentagem` recebe os dois lados
    // como inteiros e a divisão nunca vê double intermediário.
    expect(meta?.atingido).toBe(88);
    // 4,00 − 3,52 = 0,48. Nesta subtração o double também acertava, e o teste
    // não inventa falha que não existiu: o que ele amarra é a ORIGEM do 3,52,
    // que agora são 352 centavos contados na nota, e não a soma re-arredondada
    // de linhas que a nota antiga gravava em 3,50.
    expect(meta?.faltando).toBe(0.48);
    expect(meta?.ritmoDiario).toBeGreaterThan(0);
    expect(meta?.ritmoDiario).toBeLessThanOrEqual(0.48);
  });
});
