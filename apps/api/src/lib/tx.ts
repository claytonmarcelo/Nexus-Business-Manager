import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

// Fase 3a da auditoria: com o estoque passando a ser baixado por
// `UPDATE ... WHERE saldo >= q` dentro de transação, duas vendas simultâneas
// do mesmo produto podem morrer em DEADLOCK (P2034) antes mesmo do guarda
// decidir: o INSERT do item pega lock COMPARTILHADO na linha do produto
// (checagem de FK do InnoDB) e o decremento em seguida pede o EXCLUSIVO —
// duas transações segurando S e esperando X uma da outra. O deadlock é prova
// de que a serialização funciona, não de um erro de negócio: a transação
// vítima foi toda desfeita (nenhuma venda ficou pela metade) e a resposta
// honesta para ela é tentar de novo, onde o WHERE do saldo dirá "não há
// estoque" com 400. Sem este wrapper, o usuário veria 500 em um clique duplo.

const TENTATIVAS = 3;

/**
 * Conflito de transação chega ao MySQL por duas portas. O wrapper do Prisma
 * reconhece o deadlock e devolve P2034/P2037; já um `SELECT ... FOR UPDATE`
 * escrito à mão morre em P2010, carregando o código nativo do servidor na
 * mensagem — 1213 (deadlock) ou 1205 (lock wait timeout). Para quem chama as
 * duas são a mesma situação: a transação foi desfeita por inteira, e a resposta
 * honesta é tentar de novo. Sem tratar as duas, uma numeração lida em SQL bruto
 * devolvia 500 ao usuário onde havia apenas duas requisições disputando a mesma
 * fila.
 */
export function eConflitoDeTransacao(e: unknown): boolean {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (e.code === "P2034" || e.code === "P2037") return true;
  return e.code === "P2010" && /\b(?:1213|1205)\b/.test(String(e.message));
}

export async function transacaoEstoque<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let tentativa = 1; ; tentativa++) {
    try {
      return await prisma.$transaction(fn);
    } catch (e) {
      if (!eConflitoDeTransacao(e) || tentativa >= TENTATIVAS) throw e;
      // Recuo curto e progressivo: dá ao vencedor espaço para commitar antes
      // de a transação derrotada brigar pelo mesmo lock de novo.
      await new Promise((r) => setTimeout(r, 25 * tentativa));
    }
  }
}
