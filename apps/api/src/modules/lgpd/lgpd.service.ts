import type { Prisma } from "@prisma/client";
import { LegalKind } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { prisma } from "../../lib/prisma";
import { badRequest, conflict, forbidden, notFound } from "../../lib/errors";
import { hashPassword, verifyPassword } from "../../lib/password";
import { audit } from "../../lib/audit";
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
          anonymizedAt: true,
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
      // T6.4: se a pessoa já exerceu a anonimização, a foto diz. Sem esta linha o
      // estado teria de ser adivinhado pelo nome "Titular anonimizado".
      anonimizadoEm: iso(titular.anonymizedAt),
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

// ===== T6.4 — o direito de eliminação (LGPD art. 18, VI): a pessoa pede para sair
//
// Aqui está o pedaço da conformidade que se escreve com mais cuidado, porque os dois
// erros possíveis são caros e ficam em lados opostos. Apagar a linha da conta de quem
// escriturou um lançamento em 2023 destrói documento que a lei manda guardar por
// cinco anos (Código Civil art. 225 e a legislação tributária), e a empresa responde
// por isso sozinha. Não apagar nada, "por segurança", nega à pessoa o direito que ela
// tem. O meio-termo não é opinião: é a divisão entre o que é **dado pessoal dela** e o
// que é **documento da empresa que ela praticou**.
//
// Dois caminhos, e a diferença entre eles está na linha da conta:
//
//  - **anonimizar** mantém a linha, mas não sobra nenhum campo que identifique alguém:
//    nome, endereço eletrônico, telefone, avatar, verificação de caixa postal, segundo
//    fator e a empresa lembrada vão todos; a senha vira hash de um valor que ninguém
//    conhece; a conta fica inativa, então nem o token que ainda estava no bolso da
//    pessoa abre porta alguma (A5). É o caminho de quem quer sair mas precisa que o
//    histórico da casa continue contável — a assinatura dela nos documentos passa a ser
//    um número sem nome.
//  - **excluir** apaga a linha. As chaves estrangeiras de negócio já são `SET NULL`
//    desde o baseline, então venda, compra, lançamento, cobrança, ordem de serviço,
//    agenda, lead e trilha de auditoria sobrevivem com o campo de quem praticou a ação
//    devolvido a nulo. As tabelas de acesso da pessoa (sessões, tokens de recuperação e
//    de confirmação, códigos do segundo fator, avisos, preferências de aviso, vínculos e
//    aceites) são `CASCADE` e caem junto — elas só existem para servir àquela conta.
//
// As duas guardas, e as duas medem a mesma coisa:
//
//  1. **último OWNER de empresa ativa.** Uma casa não pode ficar sem responsável: se a
//     pessoa é o único OWNER ativo dela, o pedido é recusado com 409 e a frase manda
//     transferir a propriedade antes. Empresa adormecida não conta — não há propriedade
//     a transferir numa casa que não opera.
//  2. **conta da plataforma.** Quem administra a instalação inteira responde pelo
//     sistema, e a regra de acesso do dono dele está acima de qualquer pedido: essa
//     conta não se elimina por aqui, em nenhum dos dois caminhos (403).
//
// E nada disso acontece sem a senha da pessoa no corpo do pedido. Um direito de
// eliminação executado por token roubado seria o estrago mais caro que este sistema
// pode fazer, então a senha é conferida contra o hash antes de qualquer escrita, e a
// tentativa que não confere fica na trilha.

/** Os dois caminhos de eliminação, com o nome que cada um leva na trilha. */
type DireitoDeEliminacao = "anonimizacao" | "exclusao";
const ACAO_DA_TRILHA: Record<DireitoDeEliminacao, string> = {
  anonimizacao: "lgpd.anonymize",
  exclusao: "lgpd.delete",
};

/** O que a anonimização deixa como identidade: um rótulo fixo e um número de protocolo
 *  no domínio que a RFC 6761 reserva para "não resolve em lugar nenhum". */
const NOME_ANONIMO = "Titular anonimizado";
function emailAnonimo(id: string): string {
  return "titular-anonimizado+" + id + "@invalid";
}

export interface ResultadoDaEliminacao {
  feito: true;
  direito: DireitoDeEliminacao;
  em: string;
  /** Só na anonimização: como a pessoa passou a se chamar a partir daqui. */
  identidade?: { nome: string; email: string };
  apagado: Record<string, number>;
  preservado: Record<string, number>;
  guarda: Array<{ item: string; motivo: string }>;
  aviso: string;
}

/**
 * O que cada eliminação deixa para trás, com o motivo. A lista vem na resposta porque
 * uma empresa que apaga sem explicar não tem como provar depois por que apagou pouco.
 */
function guardaConforme(direito: DireitoDeEliminacao) {
  const base = [
    {
      item: "documentos de negócio da empresa",
      motivo:
        "Venda, compra, lançamento, cobrança, ordem de serviço, agenda e lead têm prazo legal de guarda. O documento fica; a referência à pessoa sai (exclusão) ou passa a ser um número sem nome (anonimização).",
    },
    {
      item: "trilha de auditoria",
      motivo:
        "As linhas de ação continuam na auditoria da empresa, porque são o registro de que o direito foi exercido e de quem respondeu pelo que aconteceu antes dele.",
    },
    {
      item: "cadastros de terceiros",
      motivo:
        "Cliente, fornecedor e colega de trabalho são dados de outras pessoas. O pedido de uma delas não alcança as demais.",
    },
  ];
  return direito === "anonimizacao"
    ? [
        ...base,
        {
          item: "aceite dos textos legais",
          motivo:
            "A linha do aceite continua, sem o endereço de origem: é a prova que a empresa precisa para o fundamento jurídico do tratamento. O número que aponta para ela não identifica mais ninguém.",
        },
      ]
    : [
        ...base,
        {
          item: "aceite dos textos legais",
          motivo:
            "A linha do aceite caiu junto da conta. A empresa perde essa prova, e é consequência direta do direito exercido — não existe como conservá-la sem os dados da pessoa.",
        },
      ];
}

/** As três casas que uma conta tem, lidas para a decisão. Empresa inativa não entra:
 *  numa casa dormente não há propriedade a transferir. */
async function ultimoDonoDeCasaAtiva(userId: string): Promise<string | null> {
  const casas = await prisma.companyUser.findMany({
    where: { userId, role: "OWNER", company: { active: true } },
    select: { companyId: true, company: { select: { name: true } } },
  });
  for (const casa of casas) {
    const outros = await prisma.companyUser.count({
      where: { companyId: casa.companyId, role: "OWNER", userId: { not: userId }, user: { active: true } },
    });
    if (outros === 0) return casa.company.name;
  }
  return null;
}

/** Guarda compartilhada dos dois caminhos. Cada recusa é registrada: um direito negado
 *  sem trilha é uma palavra contra a outra. */
async function titularELiberadoParaEliminacao(
  ctx: CompanyContext,
  direito: DireitoDeEliminacao,
  ip?: string | null,
) {
  const titular = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
      platformRole: true,
      anonymizedAt: true,
    },
  });
  if (!titular) throw notFound("Conta não encontrada");

  const motivo = (texto: string) => ({ motivo: texto.slice(0, 200), direito });

  if (titular.platformRole) {
    await audit({
      userId: ctx.userId,
      companyId: ctx.companyId,
      action: `${ACAO_DA_TRILHA[direito]}.blocked`,
      entity: "user",
      entityId: ctx.userId,
      ip,
      metadata: motivo("Conta da plataforma: responde pela instalação inteira."),
    });
    throw forbidden(
      "A conta da plataforma não se elimina por aqui: ela responde pela instalação inteira, e o acesso a ela é regra de operação do sistema.",
    );
  }

  const empresaSemDono = await ultimoDonoDeCasaAtiva(ctx.userId);
  if (empresaSemDono) {
    await audit({
      userId: ctx.userId,
      companyId: ctx.companyId,
      action: `${ACAO_DA_TRILHA[direito]}.blocked`,
      entity: "user",
      entityId: ctx.userId,
      ip,
      metadata: motivo(`Último responsável ativo pela empresa ${empresaSemDono}.`),
    });
    throw conflict(
      `Você é o último responsável ativo pela empresa ${empresaSemDono}. Transfira a propriedade para outra pessoa antes de eliminar a conta — a empresa não pode ficar sem responsável.`,
    );
  }

  return titular;
}

/** A senha presente no corpo confere contra o hash da conta? Sem ela, nada muda. */
async function conferirSenhaDeEliminacao(
  ctx: CompanyContext,
  direito: DireitoDeEliminacao,
  senha: string,
  passwordHash: string,
  ip?: string | null,
): Promise<void> {
  if (await verifyPassword(senha, passwordHash)) return;
  await audit({
    userId: ctx.userId,
    companyId: ctx.companyId,
    action: `${ACAO_DA_TRILHA[direito]}.failed`,
    entity: "user",
    entityId: ctx.userId,
    ip,
    metadata: { motivo: "Senha apresentada não confere.", direito },
  });
  throw badRequest("A senha não confere. Nenhum dado foi alterado.");
}

/** O que fica, contado antes de mexer em qualquer linha — os números que a resposta
 *  devolve são os do pedido, não uma estimativa depois do fato. */
async function contarOQueFica(userId: string): Promise<Record<string, number>> {
  const [lancamentos, vendas, compras, leads, eventosDeAgenda, ordensDeServico, historicoDeOrdens, cobrancas, aceites, trilhaDeAuditoria] =
    await Promise.all([
      prisma.financeEntry.count({ where: { userId } }),
      prisma.sale.count({ where: { userId } }),
      prisma.purchase.count({ where: { userId } }),
      prisma.lead.count({ where: { userId } }),
      prisma.agendaEvent.count({ where: { userId } }),
      prisma.serviceOrder.count({ where: { OR: [{ createdBy: userId }, { assignedUserId: userId }] } }),
      prisma.serviceOrderHistory.count({ where: { userId } }),
      prisma.charge.count({ where: { OR: [{ createdBy: userId }, { paidBy: userId }, { cancelledBy: userId }] } }),
      prisma.consentRecord.count({ where: { userId } }),
      prisma.auditLog.count({ where: { userId } }),
    ]);
  return {
    lancamentos,
    vendas,
    compras,
    leads,
    eventosDeAgenda,
    ordensDeServico,
    historicoDeOrdens,
    cobrancas,
    aceites,
    trilhaDeAuditoria,
  };
}

/**
 * LGPD art. 18, VI no caminho da **anonimização**: a linha da conta continua existindo
 * para os documentos que apontam para ela, e nenhum campo que identifique alguém sobra.
 */
export async function anonimizarTitular(
  ctx: CompanyContext,
  senha: string,
  ip?: string | null,
): Promise<ResultadoDaEliminacao> {
  const titular = await titularELiberadoParaEliminacao(ctx, "anonimizacao", ip);
  await conferirSenhaDeEliminacao(ctx, "anonimizacao", senha, titular.passwordHash, ip);

  const preservado = await contarOQueFica(ctx.userId);
  const em = new Date();
  // Hash de um valor gerado agora e descartado em seguida: a senha não é "zerada"
  // (a coluna é NOT NULL), ela passa a ser uma porta sem chave em lugar nenhum.
  const hashSemDono = await hashPassword(randomBytes(24).toString("base64url"));
  const email = emailAnonimo(ctx.userId);

  const apagado = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: ctx.userId },
      data: {
        name: NOME_ANONIMO,
        email,
        phone: null,
        avatarUrl: null,
        passwordHash: hashSemDono,
        active: false,
        emailVerifiedAt: null,
        totpSecretCiphertext: null,
        totpEnabledAt: null,
        lastCompanyId: null,
        anonymizedAt: em,
      },
    });
    const sessoes = await tx.refreshToken.deleteMany({ where: { userId: ctx.userId } });
    const tokens = await tx.passwordResetToken.deleteMany({ where: { userId: ctx.userId } });
    const confirmacoes = await tx.emailVerificationToken.deleteMany({ where: { userId: ctx.userId } });
    const recuperacao = await tx.recoveryCode.deleteMany({ where: { userId: ctx.userId } });
    const avisos = await tx.notification.deleteMany({ where: { userId: ctx.userId } });
    await tx.notificationPreference.deleteMany({ where: { userId: ctx.userId } });
    // O aceite continua sendo prova da empresa; o endereço de onde ele foi dado é da
    // pessoa, e sai.
    await tx.consentRecord.updateMany({ where: { userId: ctx.userId }, data: { ip: null } });
    // A contagem de tentativas é chaveada pelo endereço (F4): trocado o endereço, a
    // linha antiga é dado de alguém que não existe mais aqui.
    const tentativas = await tx.loginAttempt.deleteMany({ where: { email: titular.email.toLowerCase() } });

    return {
      conta: 0,
      vinculos: 0,
      aceites: 0,
      sessoes: sessoes.count,
      tokensDeAcesso: tokens.count + confirmacoes.count + recuperacao.count,
      avisos: avisos.count,
      tentativasDeLogin: tentativas.count,
    };
  });

  await audit({
    userId: ctx.userId,
    companyId: ctx.companyId,
    action: ACAO_DA_TRILHA.anonimizacao,
    entity: "user",
    entityId: ctx.userId,
    ip,
    metadata: { direito: "anonimizacao", preservado },
  });

  return {
    feito: true,
    direito: "anonimizacao",
    em: em.toISOString(),
    identidade: { nome: NOME_ANONIMO, email },
    apagado,
    preservado,
    guarda: guardaConforme("anonimizacao"),
    aviso:
      "Seus dados pessoais foram removidos desta conta. Ela continua existindo como número para os documentos em que você aparece, e não há como voltar: para voltar a usar o sistema é preciso criar uma conta nova.",
  };
}

/**
 * LGPD art. 18, VI no caminho da **exclusão**: a linha da pessoa sai, os documentos da
 * empresa ficam sem referência a ninguém, e a linha que conta este pedido sobrevive sem
 * dono — porque foi escrita depois da conta deixar de existir.
 */
export async function excluirTitular(
  ctx: CompanyContext,
  senha: string,
  ip?: string | null,
): Promise<ResultadoDaEliminacao> {
  const titular = await titularELiberadoParaEliminacao(ctx, "exclusao", ip);
  await conferirSenhaDeEliminacao(ctx, "exclusao", senha, titular.passwordHash, ip);

  const preservado = await contarOQueFica(ctx.userId);
  const em = new Date();
  const emailOriginal = titular.email.toLowerCase();

  const apagado = await prisma.$transaction(async (tx) => {
    // Contado antes: o `delete` da conta leva isso em cascata, e a resposta teria
    // zeros honestos sobre linhas que existiam.
    const sessoes = await tx.refreshToken.count({ where: { userId: ctx.userId } });
    const tokens = await tx.passwordResetToken.count({ where: { userId: ctx.userId } });
    const confirmacoes = await tx.emailVerificationToken.count({ where: { userId: ctx.userId } });
    const recuperacao = await tx.recoveryCode.count({ where: { userId: ctx.userId } });
    const avisos = await tx.notification.count({ where: { userId: ctx.userId } });
    const vinculos = await tx.companyUser.count({ where: { userId: ctx.userId } });
    const aceites = await tx.consentRecord.count({ where: { userId: ctx.userId } });
    const tentativasDeLogin = await tx.loginAttempt.count({ where: { email: emailOriginal } });

    await tx.loginAttempt.deleteMany({ where: { email: emailOriginal } });
    await tx.user.delete({ where: { id: ctx.userId } });

    return {
      conta: 1,
      sessoes,
      tokensDeAcesso: tokens + confirmacoes + recuperacao,
      avisos,
      vinculos,
      aceites,
      tentativasDeLogin,
    };
  });

  // Depois da transação de propósito: com a conta já apagada, o `userId` não pode ser
  // escrito (a chave estrangeira não aceitaria um fantasma). A linha nasce sem dono e
  // é assim que ela conta o pedido sem recriar a pessoa.
  await audit({
    userId: null,
    companyId: ctx.companyId,
    action: ACAO_DA_TRILHA.exclusao,
    entity: "user",
    entityId: ctx.userId,
    ip,
    metadata: { direito: "exclusao", motivo: "Pedido do titular.", preservado },
  });

  return {
    feito: true,
    direito: "exclusao",
    em: em.toISOString(),
    apagado,
    preservado,
    guarda: guardaConforme("exclusao"),
    aviso:
      "Sua conta foi excluída. Os documentos de negócio em que você aparece continuam guardados pela empresa, sem referência a nenhuma pessoa, e a linha que registra este pedido também continua.",
  };
}
