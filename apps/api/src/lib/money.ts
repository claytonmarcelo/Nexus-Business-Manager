import { Prisma } from "@prisma/client";
import { z } from "zod";

// Dinheiro se conta em centavo, não em vírgula flutuante (Fase 3d da auditoria).
//
// As colunas do banco são DECIMAL(12,2)/(14,2) — exatas. O que não era exato era
// a conta em cima delas: `Number(decimal)` virava double, e os painéis somavam
// milhares desses doubles (`reduce((s, v) => s + Number(v.total), 0)`) antes de
// arredondar no fim. 2026 lançamentos de R$ 0,10 somam 202,59999999999277520 —
// a tela escondia isso com um `Math.round(x * 100) / 100` na última linha, mas
// o número torto era o que as divisões recebiam (percentual de meta, ticket
// médio, participação de categoria, curva ABC de clientes). E o round do fim
// não é uma conta de dinheiro: `1.005 * 100` em double é 100,49999999999999,
// então a linha de 3 × R$ 1,005 virava R$ 3,01 — meio centavo para BAIXO — e
// era esse valor que nascia escrito na nota do cliente.
//
// A regra daqui: entre a leitura do banco e a escrita no banco, dinheiro anda em
// centavo inteiro (Number de inteiro é exato até 2^53 — US$ 90 trilhões) ou em
// `Prisma.Decimal`. O `Number` só aparece na última linha antes do JSON, porque
// é o formato que a tela já espera e um valor de duas casas convertido uma única
// vez não tem o que acumular.
//
// Por que `ROUND_HALF_UP` em vez do arredondamento nativo do JS: `Math.round` é
// meio-para-cima sobre um double que já chegou 100,49999999999999, e "meio
// centavo" em venda é decisão de dinheiro, não de binário. O Decimal do Prisma
// faz a conta na base 10, que é a base em que a pessoa digitou o preço.

/** Todo dinheiro que entra de leitura: Decimal do banco, número ou texto. */
type Valor = Prisma.Decimal | number | string | null | undefined;

/** O valor em centavos, exato e inteiro (nulo conta como zero, como no `_sum`). */
export function centavos(v: Valor): number {
  if (v === null || v === undefined) return 0;
  // `toDecimalPlaces` e não `round`: no decimal.js-light que o Prisma embute,
  // `round(dp, rm)` ignora as casas pedidas — `(0,07 × 3).round(2, HALF_UP)`
  // devolve "0". O teste de dinheiro grava essa armadilha para ela não voltar.
  return new Prisma.Decimal(v.valueOf()).mul(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * Soma VALORES (o que veio do banco ou do formulário) e devolve o total em
 * centavos. Não passou por `centavos` antes: `centavos(centavos(x))` multiplica
 * por 100 duas vezes. Para acumular centavos que já estão em centavo, use `+=`
 * ou um `reduce` comum — soma de inteiro é exata.
 */
export function somarCentavos(valores: Iterable<Valor>): number {
  let total = 0;
  for (const v of valores) total += centavos(v);
  return total;
}

/**
 * Divide um montante em `partes` parcelas EXATAS em centavo: a soma do que sai
 * daqui é o total que entrou, sempre. A conta é o piso inteiro em cada parte e o
 * resto todo na última — R$ 100,00 em 3 parcelas são R$ 33,33 + R$ 33,33 +
 * R$ 33,34, não três valores de 33,3333 que a coluna de duas casas truncaria em
 * R$ 99,99 e o cliente cobraria do caixa.
 *
 * Por que o resto vai na última e não na primeira ou distribuído: é o critério
 * do carnê brasileiro (a última parcela fecha a conta) e o efeito colateral é
 * bom — quem confere as primeiras parcelas contra o preço vê um valor redondo.
 */
export function dividirCentavos(totalCentavos: number, partes: number): number[] {
  const n = Math.trunc(partes);
  if (!Number.isFinite(n) || n < 1) return [totalCentavos];
  if (n === 1) return [totalCentavos];
  const cada = Math.floor(totalCentavos / n);
  const parcelas = new Array<number>(n - 1).fill(cada);
  parcelas.push(totalCentavos - cada * (n - 1));
  return parcelas;
}

/** Centavos de volta em valor de duas casas: só na borda da resposta JSON. */
export function moedaDeCentavos(cents: number): number {
  return cents / 100;
}
/** Centavos prontos para escrever numa coluna DECIMAL(x,2). */
export function decimalDeCentavos(cents: number): Prisma.Decimal {
  return new Prisma.Decimal(cents).div(100);
}

/**
 * Linha de item: quantidade × preço com duas casas, arredondada UMA vez, na
 * base 10. É o valor que o cliente vê no item; o total da nota é a soma dos
 * centavos dessas linhas, nunca o produto somado em float.
 */
export function linhaDecimal(quantidade: Valor, precoUnitario: Valor): Prisma.Decimal {
  return new Prisma.Decimal(quantidade ?? 0)
    .mul(precoUnitario ?? 0)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

/** Percentual inteiro (participação, conversão): 0 quando não há base. */
export function porcentagem(parte: number, todo: number): number {
  return todo === 0 ? 0 : Math.round((parte / todo) * 100);
}

/**
 * Variação percentual entre dois montantes, com duas casas. Recebe centavos
 * justamente para não haver vírgula flutuante antes da divisão.
 */
export function variacaoPercentual(atual: number, anterior: number): number | null {
  if (anterior <= 0) return null;
  return Math.round(((atual - anterior) / anterior) * 10000) / 100;
}

/** Valor por unidade em reais (ticket médio, ritmo diário), duas casas. */
export function mediaPorUnidade(cents: number, unidades: number): number {
  if (unidades <= 0) return 0;
  return Math.round((cents / unidades)) / 100;
}

// ---- A porta de entrada do dinheiro ----

const NUMERO_APOS_NORMALIZAR = /^-?\d+(?:\.\d{1,4})?$/;

/**
 * O texto do formulário para o texto do Decimal. Aceita os três formatos que
 * chegam hoje das telas e de um cliente avulso: `1290.50` (JSON), `1290,50`
 * (digitado no teclado brasileiro) e `1.290,50` (com o ponto de milhar). Sem
 * adivinhação: ponto e vírgula juntos só podem significar milhar + decimal.
 */
function normalizarTextoMoeda(texto: string): string {
  const temVirgula = texto.includes(",");
  const temPonto = texto.includes(".");
  if (temVirgula && temPonto) return texto.replace(/\./g, "").replace(",", ".");
  if (temVirgula) return texto.replace(",", ".");
  return texto;
}

/**
 * Campo de dinheiro da API: aceita `1290`, `"1290.5"` e `"1290,50"` (o que o
 * formulário mandou) e devolve TEXTO com duas casas — o Prisma escreve direto
 * na coluna DECIMAL e nenhuma vírgula flutuante atravessa a camada de serviço.
 * Mais de duas casas de entrada é arredondado uma vez, meio para cima, porque a
 * coluna não guarda o resto e o cliente tem o direito de saber qual regra usou.
 */
export const moedaSchema = z.union([z.string().trim(), z.number()]).transform((v, ctx) => {
  // O número JSON vira texto com quatro casas antes de tocar o Decimal: `String`
  // puro imprimiria `1e+21` para um valor fora do teto de qualquer campo, e
  // quatro casas é o que a coluna DECIMAL(x,2) ainda consegue arredondar com
  // critério. `toFixed` só entra em expoente acima de 1e21 — fora do teto.
  const texto = typeof v === "number" ? (Number.isFinite(v) ? v.toFixed(4) : "") : normalizarTextoMoeda(v);
  const invalido = () => {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Valor monetário inválido" });
    return z.NEVER;
  };
  if (texto === "" || !NUMERO_APOS_NORMALIZAR.test(texto)) return invalido();
  try {
    return new Prisma.Decimal(texto).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toFixed(2);
  } catch {
    return invalido();
  }
});

/**
 * Encadeamento com as bordas que os campos já tinham. O teto é o do DECIMAL(14,2)
 * do banco (99.999.999,99 cabem em `99999999` com duas casas); quem tem coluna
 * maior — a meta de receita — passa o próprio `maximo`. A mensagem é uma só para
 * as duas bordas porque, depois do `moedaSchema`, o que falta ao valor é
 * grandeza, não formato: "0" e "99.999.999.999" falham pelo mesmo motivo prático
 * (o campo não aceita aquilo), e a tela mostra o texto que o campo escolheu.
 */
export function moeda(opts?: { minimo?: number; maximo?: number; mensagem?: string }) {
  const minimo = opts?.minimo ?? 0;
  const maximo = opts?.maximo ?? 99999999;
  return moedaSchema.refine(
    (v) => {
      const n = Number(v);
      return n >= minimo && n <= maximo;
    },
    { message: opts?.mensagem ?? "Valor monetário inválido" },
  );
}
