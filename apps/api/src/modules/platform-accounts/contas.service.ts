import { prisma } from "../../lib/prisma";
import { notFound } from "../../lib/errors";
import { audit, ESCOPO_PLATAFORMA } from "../../lib/audit";
import { mascaraEndereco } from "../../lib/mail";
import { paginate, skipTake, type Paginated, type PaginationInput } from "../../lib/pagination";

// T5.5, achado N61: a porta administrativa de confirmação de e-mail.
//
// Antes dela a única escrita em `users.email_verified_at` era o clique no link ou
// o código digitado na tela pública. Com a decisão D2 cobrando verificação em
// produção, isso deixou de ser teórico: o provedor de e-mail falha exatamente
// durante um cadastro (`auth.verificacao_entrega_falhou` na auditoria), a pessoa
// fica sem link, sem confirmação e sem painel — e quem atende não tem botão. A
// saída documentada era escrever no banco à mão, que é a coisa que um runbook
// existe para evitar.
//
// Três regras deste arquivo:
//  1. a porta é da PLATAFORMA, não do tenant. Confirmar um endereço é afirmar
//     identidade, e um ADMIN de empresa que pudesse fazer isso escolheria quais
//     contas entram sem provar a caixa postal delas;
//  2. o e-mail do link continua morrendo quando a confirmação administrativa
//     chega — um link vivo depois de o assunto ter sido encerrado por outra porta
//     é uma segunda escritura para a mesma coluna, sem rastro;
//  3. nada aqui simula verificação de entrega: a coluna diz "confirmada por quem
//     administra a instalação", e a auditoria diz quem foi, quando, com que motivo
//     e para qual endereço mascarado.

/** Quem opera a porta: a sessão do administrador da plataforma. */
export interface AtorDaPlataforma {
  userId: string;
  companyId: string;
  ip?: string;
}

export interface ContaSemConfirmacao {
  userId: string;
  name: string;
  email: string;
  active: boolean;
  criadoEm: string;
  /** Quantas casas esta conta serve — é o que diz o tamanho do transtorno. */
  empresas: number;
}

export interface ResultadoDaConfirmacao {
  userId: string;
  /** `false` quando a conta já estava confirmada: nada foi escrito, nada foi auditado. */
  alterado: boolean;
  confirmadoEm: string | null;
}

/**
 * A fila de quem nunca confirmou. `emailVerifiedAt` nulo é o único estado que
 * entra; conta desativada continua na lista porque desativar não apaga a pessoa —
 * quem atende precisa ver o endereço para saber do que se trata.
 */
export async function contasSemConfirmacao(
  p: PaginationInput,
  search?: string,
): Promise<Paginated<ContaSemConfirmacao>> {
  const where = {
    emailVerifiedAt: null,
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        createdAt: true,
        _count: { select: { memberships: true } },
      },
      orderBy: { createdAt: "asc" },
      ...skipTake(p),
    }),
    prisma.user.count({ where }),
  ]);
  return paginate(
    rows.map((r) => ({
      userId: r.id,
      name: r.name,
      email: r.email,
      active: r.active,
      criadoEm: r.createdAt.toISOString(),
      empresas: r._count.memberships,
    })),
    total,
    p,
  );
}

/**
 * Confirma pelo lado de dentro. Idempotente de propósito: o botão pode ser clicado
 * duas vezes, a corrida pode chegar antes do clique, e a segunda chamada não pode
 * produzir segunda auditoria como se fosse segunda decisão.
 */
export async function confirmarEmailPelaPlataforma(
  userId: string,
  ator: AtorDaPlataforma,
  motivo?: string,
): Promise<ResultadoDaConfirmacao> {
  const conta = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, emailVerifiedAt: true },
  });
  if (!conta) throw notFound("Conta não encontrada");

  if (conta.emailVerifiedAt) {
    return {
      userId: conta.id,
      alterado: false,
      confirmadoEm: conta.emailVerifiedAt.toISOString(),
    };
  }

  const agora = new Date();
  await prisma.$transaction([
    prisma.user.update({ where: { id: conta.id }, data: { emailVerifiedAt: agora } }),
    // Todo link de verificação ainda vivo desta conta morre aqui, pelo mesmo
    // motivo do `confirmarEmail()` público: não há por que sete portas escreverem
    // na mesma coluna.
    prisma.emailVerificationToken.updateMany({
      where: { userId: conta.id, usedAt: null },
      data: { usedAt: agora },
    }),
  ]);

  await audit({
    userId: ator.userId,
    companyId: ator.companyId,
    scope: ESCOPO_PLATAFORMA,
    action: "admin.email_confirmado",
    entity: "user",
    entityId: conta.id,
    ip: ator.ip ?? null,
    metadata: {
      para: mascaraEndereco(conta.email),
      ...(motivo ? { motivo } : {}),
    },
  });

  return { userId: conta.id, alterado: true, confirmadoEm: agora.toISOString() };
}
