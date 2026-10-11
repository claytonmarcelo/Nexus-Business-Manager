import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { decimalDeCentavos, dividirCentavos } from "./money";
import { calendarioDaEmpresa, fusoDaEmpresa, mesesDepoisNoCalendario } from "./time";

// A venda e a compra têm reflexo no financeiro (Fase 3e da auditoria).
//
// O produto tinha dois caixas que não se falavam: o módulo de Vendas registrava
// a nota, o relatório de vendas mostrava a receita dela, e o Financeiro — a tela
// onde o dono olha quanto dinheiro entra e sai — permanecia exatamente como
// estava, sem aquele lançamento. Quem quisesse ver o caixa real tinha que
// reescrever à mão, no dia seguinte, o que o sistema já sabia: o valor, o cliente
// e a data. Pior: uma venda parcelada em três notas nunca existiu no painel,
// porque não havia onde dizer "em três vezes".
//
// Esta é a casa única da regra. Vendas e compras chamam; ninguém mais escreve
// lançamento de documento aqui (um lançamento manual continua sendo do usuário,
// com `saleId`/`purchaseId` nulos — é o que o separa do gerado).
//
// Três decisões que não são óbvias:
//
//  1. Gera no CONFIRMAR, não no criar. Um pedido rascunho ainda pode ser
//     cancelado sem ninguém pagar nada; lançá-lo no caixa seria infligir despesa
//     e receita que não aconteceram. O mesmo vale para a compra em DRAFT.
//  2. Divide em centavo, com a última parcela fechando a conta (lib/money.ts).
//     Somar três parcelas do carnê tem que dar exatamente o total da nota, e
//     essa igualdade é o que o teste confere.
//  3. Cancelar tira só o que ainda não aconteceu (`PENDING`). Dinheiro pago não
//     se apaga por decreto: se a parcela já entrou no caixa, o cancelamento a
//     deixa lá, visível, para o dono estornar de propósito — apagar em silêncio
//     seria o sistema inventando um passado diferente do que aconteceu.
//
// A política é por empresa e desligada por padrão (companies.auto_finance_*),
// porque ligada sem perguntar duplica o lançamento de quem já anota à mão.

/** A categoria que nasce com o primeiro lançamento gerado, por lado. */
export const CATEGORIA_VENDAS = "Vendas";
export const CATEGORIA_COMPRAS = "Compras";

/** Os dois lados possíveis de um documento que gera lançamentos. */
export type LadoDocumento =
  | { tipo: "INCOME"; documento: "VENDA"; saleId: string; pessoa: string | null }
  | { tipo: "EXPENSE"; documento: "COMPRA"; purchaseId: string; pessoa: string };

interface Politica {
  autoFinanceSales: boolean;
  autoFinancePurchases: boolean;
}

/**
 * A empresa quer lançamento automático deste lado? Lida na fonte (uma leitura
 * por requisição de escrita) porque é decisão de cadastro, não de request: a
 * pessoa muda nas Configurações e vale para a próxima nota, sem redeploy.
 */
export async function politicaDeLançamento(companyId: string): Promise<Politica> {
  const empresa = await prisma.company.findUnique({
    where: { id: companyId },
    select: { autoFinanceSales: true, autoFinancePurchases: true },
  });
  return {
    autoFinanceSales: empresa?.autoFinanceSales ?? false,
    autoFinancePurchases: empresa?.autoFinancePurchases ?? false,
  };
}

/**
 * Rótulo curto do documento, do mesmo jeito que a movimentação de estoque já
 * assina ("Venda A1B2C3D4"): o id completo não cabe na descrição de 200 e o
 * operador reconhece o pedido pelos oito primeiros caracteres.
 */
function referencia(documento: "VENDA" | "COMPRA", id: string): string {
  return (documento === "VENDA" ? "Venda " : "Compra ") + id.slice(0, 8).toUpperCase();
}

/**
 * Gera as parcelas do documento dentro da MESMA transação que confirmou a venda
 * / recebeu a compra. Se o estoque não baixou, nada aqui é escrito; se um dos
 * INSERT falhar, a confirmação inteira volta — não existe nota confirmada com
 * metade do carnê no caixa.
 *
 * Devolve quantos lançamentos nasceram — 0 quando o documento não tem valor ou
 * quando o número de parcelas não é utilizável. Se a empresa quer lançamento
 * automático é a chamada de quem chama que decide, e ela nem abre esta conta
 * quando está desligada.
 */
export async function gerarParcelasDoDocumento(args: {
  tx: Prisma.TransactionClient;
  companyId: string;
  documentoId: string;
  totalCentavos: number;
  parcelas: number;
  /** Instante em que o documento virou efetivo — a âncora do primeiro vencimento. */
  base: Date;
  userId: string;
  lado: LadoDocumento;
}): Promise<number> {
  const n = Math.trunc(args.parcelas);
  // Sem valor não há o que lançar: uma nota zerada geraria N linhas de R$ 0,00
  // no caixa, que é poluição e não informação.
  if (args.totalCentavos <= 0 || !Number.isFinite(n) || n < 1) return 0;

  const parcelas = dividirCentavos(args.totalCentavos, n);
  const fuso = await fusoDaEmpresa(args.companyId);
  // O dia da primeira parcela é o dia da empresa em que o documento foi
  // confirmado (coluna `@db.Date` = calendário ancorado em UTC, Fase 3c), e cada
  // seguinte é o MESMO dia do mês seguinte, clampado — não trinta dias somados.
  const ancora = calendarioDaEmpresa(fuso, args.base);

  const categoria = args.lado.tipo === "INCOME" ? CATEGORIA_VENDAS : CATEGORIA_COMPRAS;
  const cat = await args.tx.financeCategory.upsert({
    where: {
      companyId_name_type: { companyId: args.companyId, name: categoria, type: args.lado.tipo },
    },
    update: {},
    create: { companyId: args.companyId, name: categoria, type: args.lado.tipo },
    select: { id: true },
  });

  const total = parcelas.length;
  await args.tx.financeEntry.createMany({
    data: parcelas.map((c, i) => ({
      companyId: args.companyId,
      categoryId: cat.id,
      clientId: args.lado.tipo === "INCOME" ? args.lado.pessoa : null,
      supplierId: args.lado.tipo === "EXPENSE" ? args.lado.pessoa : null,
      saleId: args.lado.documento === "VENDA" ? args.lado.saleId : null,
      purchaseId: args.lado.documento === "COMPRA" ? args.lado.purchaseId : null,
      userId: args.userId,
      type: args.lado.tipo,
      status: "PENDING" as const,
      description:
        total === 1
          ? `${referencia(args.lado.documento, args.documentoId)} — à vista`
          : `${referencia(args.lado.documento, args.documentoId)} — parcela ${i + 1} de ${total}`,
      amount: decimalDeCentavos(c),
      dueDate: mesesDepoisNoCalendario(ancora, i),
      notes: null,
      paidAt: null,
    })),
  });

  return total;
}

/**
 * Remove o que o documento gerou e ainda não aconteceu. `PENDING` é o único
 * status que se apaga: paga (`PAID`) fica para o dono estornar de propósito, e
 * cancelada (`CANCELLED`) também fica — já é uma decisão registrada.
 */
export async function removerParcelasDoDocumento(args: {
  tx: Prisma.TransactionClient;
  companyId: string;
  lado: { documento: "VENDA"; saleId: string } | { documento: "COMPRA"; purchaseId: string };
}): Promise<number> {
  const vinculo =
    args.lado.documento === "VENDA" ? { saleId: args.lado.saleId } : { purchaseId: args.lado.purchaseId };
  const removidos = await args.tx.financeEntry.deleteMany({
    where: { companyId: args.companyId, status: "PENDING", ...vinculo },
  });
  return removidos.count;
}
