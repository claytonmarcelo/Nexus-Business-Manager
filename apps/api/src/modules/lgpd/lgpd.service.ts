import type { Prisma } from "@prisma/client";
import { LegalKind } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { notFound } from "../../lib/errors";
import type { CompanyContext } from "../../lib/company-context";
import { obterLegal } from "../cms/cms.service";

// ===== F7 (LGPD) — o que a pessoa aceitou, e onde isso ficou =====
//
// A prateleira dos textos já existia (T-cinco do CMS: `legal_documents`, editor na
// plataforma, leitura pública que recusa o que não foi publicado). O que faltava é
// a outra ponta da LGPD item 1: o **registro** do aceite. Sem ele, a resposta para
// "mostre o que este usuário aceitou" é a palavra de quem opera o sistema, e não
// uma linha com data, versão e endereço.
//
// Três decisões moram aqui, e todas são reversíveis (padrão seguro, decisão D14 do
// dono — registradas em `docs/decisoes/`):
//
// 1. **duas vontades, duas caixas.** Termos de uso e Política de privacidade têm
//    fundamentos jurídicos diferentes — um é o contrato, o outro é o consentimento
//    sobre dados pessoais. Aceitar um não aceita o outro, então a tela exige as
//    duas e a gravação faz duas linhas.
// 2. **o aceite é do cadastro self-service.** A conta que um ADMIN cria para a
//    própria equipe não tem aceite: ninguém marcou caixa por aquela pessoa, e
//    registrar um aceite que ela nunca deu seria fabricar a prova. A tela de
//    equipe continua criando conta como criava (o teste amarra isso).
// 3. **a linha guarda a versão daquele momento**, não uma junção viva com o
//    documento: o texto pode ser reescrito amanhã, e o aceite de ontem continua
//    apontando para a versão que estava em vigor quando a pessoa leu.
//
// Limitação declarada, não escondida: se o dono ainda não publicou os textos, a
// linha registra a versão da prateleira vazia (1). O cadastro não é barrado por
// isso — numa instalação recém-subida não haveria como criar a primeira conta —,
// mas a prova de aceite só fica forte depois de publicar os documentos, e é por
// isso que `docs/PRODUCAO.md`, seção 9 ("Depois da primeira subida"), tem essa linha.

/** Os dois textos que a tela de cadastro apresenta. O LGPD fica de fora: ele é a
 *  prestação de contas da empresa sobre o tratamento, não um contrato que se
 *  assina para entrar. */
export const TEXTOS_DO_CADASTRO = [LegalKind.TERMS, LegalKind.PRIVACY] as const;

export interface OfertaDeAceite {
  kind: LegalKind;
  version: number;
  publicado: boolean;
}

/**
 * O que está sendo oferecido agora, com a versão de cada texto. Lida fora da
 * transação de cadastro: `obterLegal` garante a prateleira (upsert) e não escreve
 * conteúdo nenhum, e a versão lida aqui é a que vai para a linha de aceite.
 */
export async function ofertasDoCadastro(): Promise<OfertaDeAceite[]> {
  const documentos = await Promise.all(TEXTOS_DO_CADASTRO.map((kind) => obterLegal(kind)));
  return documentos.map((doc) => ({ kind: doc.kind, version: doc.version, publicado: doc.published }));
}

/**
 * Grava as linhas de aceite dentro da MESMA transação que cria a conta: ou a
 * pessoa existe com o aceite dela, ou não existe nenhuma das duas. Uma conta sem
 * linha de aceite só existe num cenário em que o cadastro não passou por esta
 * função — é o caso da conta criada pela equipe, acima.
 */
export async function registrarAceites(
  tx: Prisma.TransactionClient,
  args: { userId: string; ofertas: OfertaDeAceite[]; ip?: string | null },
): Promise<number> {
  for (const oferta of args.ofertas) {
    await tx.consentRecord.create({
      data: {
        userId: args.userId,
        kind: oferta.kind,
        version: oferta.version,
        ip: args.ip ?? null,
      },
    });
  }
  return args.ofertas.length;
}

// ===== T6.3 — o direito de acesso (LGPD art. 18, II): a pessoa pede, a casa mostra
//
// Até aqui, responder "o que vocês guardam sobre mim?" era trabalho de quem opera o
// sistema: abrir a auditoria, a tela de equipe, as sessões, e juntar pedaço por
// pedaço. O produto passa a responder sozinho, em JSON, para quem autentica.
//
// Três decisões moram nesta função, e as três estão amarradas por teste:
//
// 1. **o recorte é a pessoa, não a empresa.** Identidade, aceites, sessões e a trilha
//    de ações que levam a assinatura dela saem por `userId` — inclusive a ação que
//    ela praticou noutra casa em que trabalha, porque é ação dela. O que é da
//    *empresa* (avisos, preferências de aviso) sai por `userId` + a empresa ativa do
//    token, nunca por corpo de requisição (ADR-0002).
// 2. **credencial não é dado pessoal exportável.** Hash de senha, segredo cifrado do
//    segundo fator, hash de refresh token e códigos de recuperação existem no banco e
//    ficam de fora da resposta: entregá-los daria a quem pergunta a capacidade de
//    entrar na conta de outra pessoa que usasse o mesmo endereço. A lista do que não
//    sai vai no próprio corpo, com o motivo, para a resposta ser auditável.
// 3. **o metadata da auditoria não acompanha.** Uma linha de trilha pode carregar
//    texto escrito sobre cliente, fornecedor ou colega. Aquilo é dado de *outra*
//    pessoa, e o pedido de acesso de um titular não alcança terceiros.
//
// Tetos declarados: 500 eventos e 200 avisos, com o total real vindo do banco junto.
// Uma conta antiga com trilha longa recebe o recorte mais recente e o número do que
// existe — silêncio sobre o tamanho seria a pior resposta possível aqui.

const TRILHA_DE_EVENTOS = 500;
const TRILHA_DE_AVISOS = 200;

function iso(data: Date | null | undefined): string | null {
  return data ? data.toISOString() : null;
}

/** O que a resposta declara de fora, com o motivo de cada ausência. */
export const O_QUE_NAO_SAI = [
  {
    campo: "senha e segundo fator",
    motivo:
      "Guardados como hash e segredo cifrado. Exportar entregaria a chave de acesso da conta, não um dado sobre a pessoa.",
  },
  {
    campo: "tokens de sessão e de recuperação",
    motivo:
      "As linhas de sessão saem sem o hash do token: quem vê o hash consegue usar a sessão aberta.",
  },
  {
    campo: "conteúdo das ações registradas",
    motivo:
      "A trilha de auditoria sai sem o metadata, que pode trazer texto escrito sobre clientes, fornecedores e colegas da empresa.",
  },
  {
    campo: "registros de negócio da empresa",
    motivo:
      "Cliente, fornecedor, venda e lançamento pertencem à empresa e aos titulares deles. O pedido de uma pessoa não alcança dados de outra.",
  },
];

export async function exportarDadosDoTitular(ctx: CompanyContext) {
  const { userId, companyId } = ctx;

  const [titular, vinculos, aceites, sessoes, avisos, preferencias, trilha, totalDeEventos] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          avatarUrl: true,
          active: true,
          platformRole: true,
          emailVerifiedAt: true,
          totpEnabledAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.companyUser.findMany({
        where: { userId },
        include: { company: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.consentRecord.findMany({ where: { userId }, orderBy: { acceptedAt: "asc" } }),
      prisma.refreshToken.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { companyId: true, createdAt: true, expiresAt: true, usedAt: true, revokedAt: true, createdByIp: true },
      }),
      prisma.notification.findMany({
        where: { userId, companyId },
        orderBy: { createdAt: "desc" },
        take: TRILHA_DE_AVISOS,
      }),
      prisma.notificationPreference.findUnique({ where: { userId_companyId: { userId, companyId } } }),
      prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: TRILHA_DE_EVENTOS,
        select: { id: true, action: true, entity: true, entityId: true, ip: true, scope: true, createdAt: true },
      }),
      prisma.auditLog.count({ where: { userId } }),
    ]);

  // `resolveCompanyContext` já conferiu conta, vínculo e empresa antes de qualquer
  // rota chegar aqui; a guarda existe porque a função recebe um contexto montado em
  // outro instante, e a conta pode ter saído do banco nesse meio-tempo.
  if (!titular) throw notFound("Conta não encontrada");

  const empresaAtiva = vinculos.find((v) => v.companyId === companyId);
  const tentativas = await prisma.loginAttempt.findMany({
    where: { email: titular.email.toLowerCase() },
    select: { email: true, failures: true, firstFailedAt: true, lastFailedAt: true, lockedUntil: true },
  });

  return {
    geradoEm: new Date().toISOString(),
    aviso:
      "Estes são os dados que a casa guarda sobre você nesta empresa. O que diz respeito às outras empresas em que você trabalha precisa ser pedido logado nelas.",
    titular: {
      id: titular.id,
      nome: titular.name,
      email: titular.email,
      telefone: titular.phone,
      avatarUrl: titular.avatarUrl,
      contaAtiva: titular.active,
      papelNaPlataforma: titular.platformRole ?? null,
      emailVerificadoEm: iso(titular.emailVerifiedAt),
      segundoFatorDesde: iso(titular.totpEnabledAt),
      criadoEm: iso(titular.createdAt),
      atualizadoEm: iso(titular.updatedAt),
    },
    empresaAtiva: {
      id: companyId,
      nome: empresaAtiva?.company.name ?? null,
      papel: empresaAtiva?.role ?? null,
      desde: iso(empresaAtiva?.createdAt),
    },
    vinculos: vinculos.map((v) => ({ empresa: v.company.name, papel: v.role, desde: iso(v.createdAt) })),
    aceites: aceites.map((a) => ({ tipo: a.kind, versao: a.version, aceitoEm: iso(a.acceptedAt), ip: a.ip })),
    sessoes: sessoes.map((s) => ({
      empresa: s.companyId,
      criadaEm: iso(s.createdAt),
      expiraEm: iso(s.expiresAt),
      usadaEm: iso(s.usedAt),
      revogadaEm: iso(s.revokedAt),
      ipOrigem: s.createdByIp,
    })),
    notificacoes: avisos.map((n) => ({
      tipo: n.kind,
      titulo: n.title,
      corpo: n.body,
      link: n.link,
      prioridade: n.priority,
      lidaEm: iso(n.readAt),
      criadaEm: iso(n.createdAt),
    })),
    preferenciasDeAviso: preferencias
      ? {
          alertasDeVenda: preferencias.saleAlerts,
          estoqueBaixo: preferencias.lowStock,
          relatorioDiario: preferencias.dailyReport,
          contasVencidas: preferencias.overdueBills,
          novoLead: preferencias.newLead,
          canalDeEmail: preferencias.emailChannel,
          canalDoPainel: preferencias.inAppChannel,
          atualizadoEm: iso(preferencias.updatedAt),
        }
      : null,
    trilhaDeAuditoria: {
      total: totalDeEventos,
      mostrado: trilha.length,
      eventos: trilha.map((e) => ({
        id: e.id,
        acao: e.action,
        entidade: e.entity,
        entidadeId: e.entityId,
        ip: e.ip,
        escopo: e.scope,
        em: iso(e.createdAt),
      })),
    },
    tentativasDeLogin: tentativas.map((t) => ({
      email: t.email,
      falhas: t.failures,
      primeiraFalha: iso(t.firstFailedAt),
      ultimaFalha: iso(t.lastFailedAt),
      bloqueadoAte: iso(t.lockedUntil),
    })),
    naoIncluidos: O_QUE_NAO_SAI,
  };
}
