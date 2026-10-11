import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { badRequest } from "./errors";

// Fase 3 da auditoria (seção E, o CRÍTICO de oversell): enquanto a guarda de
// saldo viveu em JavaScript — ler produto, comparar, gravar valor ABSOLUTO —
// dois pedidos simultâneos liam o mesmo 5, passavam os dois na comparação e o
// segundo escrevia 4 por cima, vendendo duas vezes a mesma unidade. Aqui não
// existe mais escrita absoluta de saldo a partir de leitura: a baixa é um
// `UPDATE ... SET stock = stock - q WHERE stock >= q`, e o `count === 0` é a
// prova de que o saldo não casou. A subida é `increment`, nunca a soma feita
// em JS. O banco virou quem decide; o JS só traduz o "não" em mensagem.
//
// `trackStock: true` dentro do where mantém o combinado de sempre: produto
// sem rastreamento não tem saldo mexido por venda/compra.

type Tx = Prisma.TransactionClient;

export interface Movimentacao {
  tx: Tx;
  companyId: string;
  productId: string;
  quantity: number;
  nota?: string;
  createdBy: string;
  // Nome/unidade chegam de uma leitura de fora (a mensagem bonita não precisa
  // ser exata sob concorrência — o número exibido é re-lido dentro da tx).
  nome?: string;
  unidade?: string;
  // Política de estoque da empresa (Fase 3): com permissão de negativo, o
  // WHERE deixa de exigir saldo e a baixa acontece mesmo assim — o movimento
  // continua sendo a verdade contábil do que saiu.
  permitirNegativo?: boolean;
  // Custo da última entrada (compra): grava na mesma unidade atômica do
  // increment, em vez de um update absoluto separado.
  custo?: Prisma.Decimal | number;
}

export async function baixarEstoque(o: Movimentacao): Promise<void> {
  const guard = o.permitirNegativo ? {} : { stockQuantity: { gte: o.quantity } };
  const baixou = await o.tx.product.updateMany({
    where: { id: o.productId, companyId: o.companyId, trackStock: true, ...guard },
    data: { stockQuantity: { decrement: o.quantity } },
  });
  if (baixou.count === 0) {
    const atual = await o.tx.product.findFirst({
      where: { id: o.productId, companyId: o.companyId },
      select: { stockQuantity: true, name: true, unit: true, trackStock: true },
    });
    if (!atual) throw badRequest("Produto não pertence a esta empresa");
    // Com a política de negativo ligada não existia WHERE de saldo: se mesmo
    // assim nenhuma linha casou, o motivo é o produto (inativo ao rastreio),
    // não a conta — mentir "estoque insuficiente" aqui seria um 400 sem futuro.
    if (o.permitirNegativo || !atual.trackStock) {
      throw badRequest(`Não foi possível baixar "${atual.name}": este produto não controla estoque`);
    }
    throw badRequest(
      `Estoque insuficiente para "${o.nome ?? atual.name}": disponível ${Number(atual.stockQuantity)} ${o.unidade ?? atual.unit}, solicitado ${o.quantity}`,
    );
  }
  await o.tx.stockMovement.create({
    data: { companyId: o.companyId, productId: o.productId, kind: "OUT", quantity: o.quantity, note: o.nota, createdBy: o.createdBy },
  });
}

export async function subirEstoque(o: Movimentacao): Promise<void> {
  const subiu = await o.tx.product.updateMany({
    where: { id: o.productId, companyId: o.companyId, trackStock: true },
    data: {
      stockQuantity: { increment: o.quantity },
      ...(o.custo !== undefined ? { costPrice: o.custo } : {}),
    },
  });
  if (subiu.count === 0) throw badRequest("Produto não pertence a esta empresa ou não controla estoque");
  await o.tx.stockMovement.create({
    data: { companyId: o.companyId, productId: o.productId, kind: "IN", quantity: o.quantity, note: o.nota, createdBy: o.createdBy },
  });
}

// Fase 3b: a política de estoque é da EMPRESA, não do sistema. Os serviços
// leem aqui em vez de repetir o findUnique — a decisão "pode ficar negativo?"
// precisa estar na mesma fonte em venda, compra e lançamento manual, senão o
// switch da tela valeria só em parte das saídas.
export async function permiteEstoqueNegativo(companyId: string): Promise<boolean> {
  const empresa = await prisma.company.findUnique({
    where: { id: companyId },
    select: { allowNegativeStock: true },
  });
  return empresa?.allowNegativeStock === true;
}
