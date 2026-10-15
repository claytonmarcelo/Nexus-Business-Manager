import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { hashPassword, verifyPassword } from "../../lib/password";
import { hashToken, msUntil } from "../../lib/tokens";
import { env, isProd } from "../../config/env";
import { badRequest, conflict, forbidden, notFound, unauthorized } from "../../lib/errors";
import { audit } from "../../lib/audit";
import type { AccessTokenPayload } from "../../plugins/auth";
import { rolePermissions } from "../../lib/rbac";
import { somenteDigitos } from "../../lib/brFields";
// F4 (D1): o serviço monta a mensagem; quem entrega é decisão do ambiente.
// N58 (T5.3): e a entrega acontece na fila do processo, não dentro do request.
import { enfileirarMail } from "../../lib/mail/fila";
import { resumoDaFalha } from "../../lib/mail/porta";
import { mensagemDeRecuperacao } from "../../lib/mail/mensagens";
// F4 (T3.2): a contagem de tentativas vive fora de `users` — ver lib/tentativas.
import {
  HASH_DE_ISCACAO,
  JANELA_DE_CONTAGEM_MS,
  lerTentativas,
  registrarFalha,
  zerarTentativas,
} from "../../lib/tentativas";
// F4 (D3): segunda etapa do login.
import { TTL_DA_CONFIGURACAO, TTL_DO_DESAFIO, doisFatorObrigatorio } from "../../lib/segundo-fator";
import { emitirTokenDeVerificacao } from "./verificacao.service";
// F7 (LGPD, item 1): o aceite dos textos legais nasce junto da conta.
import { ofertasDoCadastro, registrarAceites } from "../lgpd/lgpd.service";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  companyId: string;
  companyName: string;
  role: string;
  permissions: string[];
  // Moeda, fuso e idioma da empresa ativa: as telas formatam com eles.
  currency: string;
  timezone: string;
  language: string;
  // Administrador da plataforma (Fase 1b): true quando platformRole = SUPER_ADMIN.
  platform: boolean;
}

// Exportada porque as duas etapas do login (segundo fator obrigatório e desafio)
// também precisam emitir sessão exatamente com as mesmas regras: empresa no
// refresh, mesmo TTL, mesmo registro.
export async function issueTokens(
  app: FastifyInstance,
  userId: string,
  companyId: string,
  role: string,
  ip?: string,
): Promise<AuthTokens> {
  const payload: AccessTokenPayload = { sub: userId, cid: companyId, role };
  const accessToken = await app.jwt.sign(payload);

  const refreshToken = crypto.randomBytes(48).toString("hex");
  await prisma.refreshToken.create({
    data: {
      userId,
      // A4: a empresa ativa gruda no refresh token. O access token que carrega o
      // `cid` morre em 15 minutos; se a empresa não sobreviver à renovação, a
      // pessoa volta para a primeira empresa ativa sem perceber.
      companyId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + msUntil(env.JWT_REFRESH_TTL)),
      createdByIp: ip ?? null,
    },
  });

  return { accessToken, refreshToken, expiresIn: env.JWT_ACCESS_TTL };
}

// O vínculo tal como vem do `include` usado em login/refresh: a empresa inteira
// acompanha, porque a sessão carrega moeda, fuso e idioma dela. O `id` e o
// `createdAt` também servem: são os dois degraus do desempate da N32.
type VinculoComEmpresa = {
  id: string;
  companyId: string;
  role: string;
  createdAt: Date;
  company: { active: boolean; name: string; currency: string; timezone: string; language: string };
};

// N32 (decisão D5): quando ninguém pede empresa, a escolha deixa de ser "a
// primeira que o banco entrega". O `include` do Prisma não tem `orderBy`, então o
// MySQL varre o índice único `(user_id, company_id)` e devolve os vínculos em
// ordem de uuid — que para uma pessoa com três casas significa "qualquer uma", e
// para as capturas do painel significou trocar de cabeçalho sozinhas. A ordem
// agora é escrita: vínculo mais antigo, e empate resolvido pelo id do vínculo
// (comparação por código, que para uuids em minúsculas é a mesma ordem do banco).
function vinculoMaisAntigo(memberships: VinculoComEmpresa[]): VinculoComEmpresa | undefined {
  const ativas = memberships.filter((m) => m.company.active);
  if (ativas.length === 0) return undefined;
  return ativas.slice().sort((a, b) => {
    const delta = a.createdAt.getTime() - b.createdAt.getTime();
    if (delta !== 0) return delta;
    if (a.id === b.id) return 0;
    return a.id < b.id ? -1 : 1;
  })[0];
}

function pickMembership(
  memberships: VinculoComEmpresa[],
  opcoes: { pedida?: string; lembrada?: string | null } = {},
) {
  if (opcoes.pedida) {
    const found = memberships.find((m) => m.companyId === opcoes.pedida);
    if (!found) throw forbidden("Você não pertence a esta empresa");
    if (!found.company.active) throw conflict("Empresa inativa");
    return found;
  }
  // A casa que a pessoa escolheu por último em `switch-company` volta primeiro:
  // é a resposta para "onde eu estava trabalhando". Se o vínculo caiu ou a casa
  // adormeceu, a lembrança não segura ninguém do lado errado de uma empresa morta
  // — cai para a regra determinística abaixo, sem avisar e sem derrubar a sessão.
  const lembrada = opcoes.lembrada
    ? memberships.find((m) => m.companyId === opcoes.lembrada && m.company.active)
    : undefined;
  if (lembrada) return lembrada;
  const padrao = vinculoMaisAntigo(memberships);
  if (!padrao) throw forbidden("Nenhuma empresa ativa vinculada ao usuário");
  return padrao;
}

// A4: a renovação devolve a empresa em que o token de refresh foi emitido. Se o
// vínculo com ela caiu ou a empresa adormeceu enquanto o token estava na
// carteira da pessoa, ela não é derrubada no meio do trabalho nem deixada
// gravando na empresa errada em silêncio: volta para a casa lembrada da conta,
// e sem lembrança para o vínculo mais ativo ainda vivo. Sem empresa ativa
// nenhuma, o `pickMembership` responde 403 e o app manda fazer login de novo.
// Token antigo (sem empresa gravada) usa direto a lembrança da conta.
function renovacaoDaEmpresa(
  memberships: VinculoComEmpresa[],
  companyId: string | null,
  lembrada?: string | null,
) {
  if (!companyId) return pickMembership(memberships, { lembrada });
  const daquelaEmpresa = memberships.find((m) => m.companyId === companyId);
  if (daquelaEmpresa?.company.active) return daquelaEmpresa;
  return pickMembership(memberships, { lembrada });
}

// O que o login devolve hoje são três estados, não um: sessão pronta, sessão
// esperando o segundo fator, ou sessão nenhuma porque a conta precisa ligar o
// segundo fator antes de existir. Os dois últimos trazem um token de escopo
// curto, que não abre rota de negócio alguma (ver `plugins/auth.ts`).
export type ResultadoDeLogin =
  | { tokens: AuthTokens; user: SessionUser }
  | { twoFactorRequired: true; challengeToken: string }
  | { twoFactorSetupRequired: true; setupToken: string };

export async function login(
  app: FastifyInstance,
  email: string,
  password: string,
  requestedCompanyId: string | undefined,
  ip?: string,
): Promise<ResultadoDeLogin> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { include: { company: true } } },
  });
  // T3.2: leitura da contagem ANTES de qualquer resposta. Um timeout aqui faria o
  // erro do banco abrir a porta em vez de fechá-la, então a régua é "se não
  // consigo ler o bloqueio, não deixo entrar".
  const { trancada } = await lerTentativas(email);

  // T3.2: o hash de iscaço não é credencial de ninguém — é o trabalho que o
  // caminho de "e-mail inexistente" passa a fazer de propósito, para responder no
  // mesmo tempo que o caminho de "senha errada". Sem ele, um cronômetro na tela
  // de login diria quais endereços estão cadastrados, e o bloqueio por conta só
  // existiria para quem já tem conta.
  const confere = await verifyPassword(password, user?.passwordHash ?? HASH_DE_ISCACAO);

  // Conta, conta desativada e senha errada respondem a mesma coisa. O registro da
  // falha vem antes da resposta, sempre — inclusive quando o e-mail não existe.
  if (!user || !user.active || !confere) {
    const estado = await registrarFalha(email);
    if (estado.bloqueouAgora) {
      await audit({
        userId: user?.id ?? null,
        action: "auth.login_bloqueado",
        entity: "user",
        entityId: user?.id ?? null,
        ip,
        metadata: { tentativas: estado.failures, janelaDeContagemMinutos: Math.round(JANELA_DE_CONTAGEM_MS / 60_000) },
      });
    }
    await audit({ userId: user?.id ?? null, action: "auth.login.failed", entity: "user", ip, metadata: { email } });
    throw unauthorized("Credenciais inválidas");
  }

  // A senha está certa e a conta continua de fora: é exatamente isso que faz o
  // bloqueio ser uma resposta ao ataque e não um aviso cosmético. A falha aqui
  // soma na contagem mas NÃO empurra o prazo (regra de `registrarFalha`), senão
  // quem espera ansioso pelo fim do bloqueio nunca veria o fim dele.
  if (trancada) {
    await registrarFalha(email);
    await audit({ userId: user.id, action: "auth.login.failed", entity: "user", entityId: user.id, ip, metadata: { email } });
    throw unauthorized("Credenciais inválidas");
  }

  // Entrou: a contagem some, e com ela qualquer bloqueio antigo.
  await zerarTentativas(email);

  if (user.memberships.length === 0) {
    throw forbidden("Usuário sem vínculo com empresa");
  }

  const membership = pickMembership(user.memberships, {
    pedida: requestedCompanyId,
    lembrada: user.lastCompanyId,
  });

  // D2: conta sem e-mail confirmado não entra no painel — e só se cobra dela o
  // que ela mesma já provou ter: a senha conferiu acima, então a frase que avisa
  // "confirme seu e-mail" não entrega a ninguém que aquele endereço existe.
  if (env.REQUIRE_EMAIL_VERIFICATION === "1" && !user.emailVerifiedAt) {
    throw forbidden("Confirme o seu e-mail para entrar. Reenvie a mensagem se ela não chegou.");
  }

  // D3: quem responde pela plataforma, e todo OWNER de empresa, tem segundo fator
  // obrigatório em produção. Sem ele a sessão não nasce: o que volta é um token de
  // configuração, que só abre as rotas de 2FA.
  const exigeConfigurar = doisFatorObrigatorio({
    platformRole: user.platformRole,
    papeis: user.memberships.map((m) => m.role),
    nodeEnv: env.NODE_ENV,
  });
  if (exigeConfigurar && !user.totpEnabledAt) {
    const setupToken = await app.jwt.sign(
      { sub: user.id, cid: membership.companyId, role: membership.role, escopo: "2fa-configuracao" },
      { expiresIn: TTL_DA_CONFIGURACAO },
    );
    await audit({ userId: user.id, action: "auth.2fa_configuracao_exigida", entity: "user", entityId: user.id, ip });
    return { twoFactorSetupRequired: true, setupToken };
  }

  // D3: segundo fator ligado é uma etapa, não um campo a mais na mesma tela. A
  // senha conferiu, a sessão ainda não existe — o que existe é um token de
  // desafio, curto, que só serve para a rota de confirmação.
  if (user.totpEnabledAt && user.totpSecretCiphertext) {
    const desafio = await app.jwt.sign(
      { sub: user.id, cid: membership.companyId, role: membership.role, escopo: "2fa-desafio" },
      { expiresIn: TTL_DO_DESAFIO },
    );
    await audit({ userId: user.id, action: "auth.login.aguarda_segundo_fator", entity: "user", entityId: user.id, ip });
    return { twoFactorRequired: true, challengeToken: desafio };
  }

  const tokens = await issueTokens(app, user.id, membership.companyId, membership.role, ip);
  await audit({ userId: user.id, companyId: membership.companyId, action: "auth.login", entity: "user", entityId: user.id, ip });

  return { tokens, user: toSessionUser(user, membership) };
}

// T3.5: a tolerância da corrida de duas abas, em milissegundos. Explicada no ramo
// que a usa, dentro de `refresh`. Dez segundos é o intervalo em que dois pedidos
// de renovação legítimos podem sair com o mesmo token na mão — o `refreshSession()`
// do front_end tem voo único por design, e o giro do token no navegador acontece
// quando a resposta chega; nada além de um concorrente do mesmo navegador entra
// nessa janela sem ser a própria pessoa.
const JANELA_DE_CORRIDA_MS = 10_000;

export async function refresh(
  app: FastifyInstance,
  refreshToken: string,
  ip?: string,
): Promise<AuthTokens> {
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    include: { user: { include: { memberships: { include: { company: true } } } } },
  });
  if (!record || record.expiresAt < new Date()) {
    throw unauthorized("Sessão expirada");
  }
  // Fase 2 da auditoria: um refresh token rotacionado que volta a aparecer é
  // a assinatura clássica de roubo — o dono legítimo nunca reapresenta o código
  // que já trocou. Aqui a família inteira cai (todas as sessões vivas desta
  // pessoa) e o evento fica na auditoria. Revogação por decisão — logout,
  // encerrar sessão, troca de senha, recuperação — marca só revokedAt, sem
  // usedAt, e por isso não dispara a reação em cadeia.
  if (record.usedAt && record.revokedAt) {
    // T3.5 (F4): a corrida de duas abas, antes do alarme de roubo.
    //
    // Duas abas abertas da mesma conta renovam no mesmo instante — a do acesso que
    // expira primeiro dispara o `refreshSession()` de cada uma, com o mesmo token
    // velho na mão, porque o giro do `localStorage` ainda não aconteceu quando a
    // segunda requisição saiu. Sem esta janela, o segundo pedido legítimo seria
    // tratado como roubo: derrubaria todas as sessões da própria pessoa e a
    // derrubaria no meio do trabalho. Um alarme que toca em uso normal é um alarme
    // que se aprende a ignorar, e é assim que deteção de roubo vira ruído.
    //
    // O preço aceito: um token roubado reapresentado nos dez segundos seguintes à
    // rotação legítima ganha um par novo em vez de fechar a família. É uma janela
    // estreíssima comparada ao que o roubo já exige (ter o token e usá-lo antes da
    // próxima renovação da vítima), e cada uso dela fica registrado em
    // `auth.refresh_corrida` — repetição desse evento é o que o teste de intrusão
    // e a auditoria de plataforma passam a procurar. Fora da janela, a reação em
    // cadeia de roubo continua exatamente como estava.
    if (Date.now() - record.usedAt.getTime() <= JANELA_DE_CORRIDA_MS) {
      // Guarda da própria janela (T3.5): ela é da rotação, não da conta. A janela
      // existe porque a segunda aba do MESMO navegador saiu com o token velho na
      // mão antes de o giro chegar ao disco — e só faz sentido enquanto a linhagem
      // que aquela rotação abriu continua de pé. Toda revogação por decisão (troca
      // de senha, recuperação de senha, logout, admin encerrando sessão) derruba o
      // filho que a rotação emitiu; conferredo aqui, e não no `revokedAt` do pai,
      // porque o pai já estava revogado pela própria rotação. Sem nenhum token vivo
      // nascido depois do consumo, reapresentar o pai dentro dos dez segundos não
      // reabre porta nenhuma — e volta a ser o comportamento da Fase 2, anterior à
      // janela. O custo aceito é estreito: um concorrente que espere a pessoa fazer
      // logout ou trocar a senha para reapresentar o token roubado no instante
      // seguinte passa a tomar 401 em vez de ganhar sessão.
      const linhagemViva = await prisma.refreshToken.count({
        where: { userId: record.userId, revokedAt: null, createdAt: { gte: record.usedAt } },
      });
      if (linhagemViva > 0) {
        if (!record.user.active) throw forbidden("Usuário inativo");
        const empresa = renovacaoDaEmpresa(record.user.memberships, record.companyId, record.user.lastCompanyId);
        await audit({
          userId: record.userId,
          companyId: empresa.companyId,
          action: "auth.refresh_corrida",
          entity: "user",
          entityId: record.userId,
          ip,
          metadata: { desdeARotacaoMs: Date.now() - record.usedAt.getTime(), motivo: "duas abas renovando juntas" },
        });
        return issueTokens(app, record.userId, empresa.companyId, empresa.role, ip);
      }
    }
    // Fora da janela — ou com a linhagem já derrubada por decisão — a reapresentação
    // de um token consumido é a assinatura clássica de roubo: a família inteira cai.
    await prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await audit({
      userId: record.userId,
      action: "auth.refresh_reuse",
      entity: "user",
      entityId: record.userId,
      ip,
      metadata: { sessoesRevogadas: "todas", motivo: "token rotacionado reapresentado" },
    });
    throw unauthorized("Sessão expirada");
  }
  if (record.revokedAt) throw unauthorized("Sessão expirada");
  if (!record.user.active) throw forbidden("Usuário inativo");
  const membership = renovacaoDaEmpresa(record.user.memberships, record.companyId, record.user.lastCompanyId);

  // Rotação: revoga o token usado antes de emitir um novo — usado E revogado,
  // para que a reapresentação dele seja reconhecível como reuso.
  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date(), usedAt: new Date() },
  });
  return issueTokens(app, record.userId, membership.companyId, membership.role, ip);
}

export async function logout(refreshToken: string, ip?: string): Promise<void> {
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(refreshToken) } });
  if (record && !record.revokedAt) {
    await prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
    await audit({ userId: record.userId, action: "auth.logout", entity: "user", entityId: record.userId, ip });
  }
}

export async function getMe(userId: string, companyId: string): Promise<SessionUser> {
  const membership = await prisma.companyUser.findUnique({
    where: { userId_companyId: { userId, companyId } },
    include: { user: { include: { memberships: { include: { company: true } } } }, company: true },
  });
  if (!membership) throw forbidden("Acesso não autorizado a esta empresa");
  return toSessionUser(membership.user, membership);
}

export async function switchCompany(
  app: FastifyInstance,
  userId: string,
  companyId: string,
  ip?: string,
): Promise<AuthTokens> {
  const membership = await prisma.companyUser.findUnique({
    where: { userId_companyId: { userId, companyId } },
    include: { company: true },
  });
  if (!membership) throw forbidden("Você não pertence a esta empresa");
  if (!membership.company.active) throw conflict("Empresa inativa");
  // N32 (decisão D5): a escolha vira memória da conta, não só da aba. Sem esta
  // linha, quem trocava para a B e fechava o navegador voltava no login
  // seguinte para a casa que o índice do banco quisesse — a troca durava o
  // tempo de uma sessão. Grava antes de emitir, para o token novo nunca nascer
  // de uma escolha que o banco ainda não conhece.
  await prisma.user.update({ where: { id: userId }, data: { lastCompanyId: companyId } });
  return issueTokens(app, userId, companyId, membership.role, ip);
}

export function toSessionUser(
  user: {
    id: string; email: string; name: string; phone: string | null;
    platformRole?: string | null;
  },
  membership: {
    companyId: string;
    role: string;
    company: { name: string; currency: string; timezone: string; language: string };
  },
): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    companyId: membership.companyId,
    companyName: membership.company.name,
    role: membership.role,
    permissions: rolePermissions(membership.role as never),
    currency: membership.company.currency,
    timezone: membership.company.timezone,
    language: membership.company.language,
    // O papel de plataforma nunca sai do banco: a sessão apenas informa o que
    // já foi conferido por assertPlatformAdmin em cada requisição reservada.
    platform: user.platformRole === "SUPER_ADMIN",
  };
}

// ---- Fluxos de cadastro e recuperação de senha ----

const RESET_TTL_MS = 30 * 60 * 1000; // código válido por 30 minutos

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "empresa";
}

// Cadastro self-service: cria usuário + empresa própria.
//
// Com `REQUIRE_EMAIL_VERIFICATION=1` (a régua de produção) o cadastro NÃO emite
// sessão: ele emite a mensagem de confirmação e devolve "falta confirmar". Sem a
// flag, emite sessão como sempre emitiu — é o que mantém o desenvolvimento e a
// suíte de testes independentes de caixa de e-mail, e é a decisão D2 registrada em
// `docs/decisoes/ADR-0014`.
export type ResultadoDeCadastro =
  | { tokens: AuthTokens; user: SessionUser }
  | { verificationRequired: true };

export async function register(
  app: FastifyInstance,
  input: {
    name: string;
    email: string;
    password: string;
    aceitaTermos: boolean;
    aceitaPrivacidade: boolean;
  },
  ip?: string,
): Promise<ResultadoDeCadastro> {
  // F7: o esquema da rota já recusa cadastro sem os dois aceites, e esta linha é a
  // segunda guarda, por construção — quem chamar o serviço por outro caminho não
  // cria conta sem a pessoa ter aceitado. A régua mora no módulo de LGPD.
  if (input.aceitaTermos !== true || input.aceitaPrivacidade !== true) {
    throw badRequest("Leia e aceite os Termos de uso e a Política de privacidade para criar a conta");
  }
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw conflict("Este e-mail já está cadastrado");

  // A versão oferecida é lida antes de abrir a transação: é ela, e não a versão que
  // o documento tiver amanhã, que vai para a linha de aceite.
  const ofertas = await ofertasDoCadastro();

  const passwordHash = await hashPassword(input.password);
  const firstName = input.name.trim().split(/\s+/)[0] ?? "Empresa";
  const baseSlug = slugify(firstName);

  const { user, membership } = await prisma.$transaction(async (tx) => {
    const novo = await tx.user.create({
      data: { email: input.email, name: input.name.trim(), passwordHash },
    });
    await registrarAceites(tx, { userId: novo.id, ofertas, ip });
    let slug = baseSlug;
    for (let i = 2; await tx.company.findUnique({ where: { slug } }); i++) {
      slug = baseSlug + "-" + i;
    }
    const empresa = await tx.company.create({
      data: { name: firstName + " (minha empresa)", slug },
    });
    const vinculo = await tx.companyUser.create({
      data: { userId: novo.id, companyId: empresa.id, role: "OWNER" },
      include: { company: true },
    });
    // Fase 1b: o administrador da plataforma entra em toda empresa nova como
    // OWNER (regra definitiva de acesso), agora identificado pelo platformRole
    // no banco — não mais pelo e-mail fixo no código.
    const admins = await tx.user.findMany({
      where: { platformRole: "SUPER_ADMIN", active: true },
      select: { id: true },
    });
    for (const admin of admins) {
      if (admin.id === novo.id) continue;
      await tx.companyUser.upsert({
        where: { userId_companyId: { userId: admin.id, companyId: empresa.id } },
        update: { role: "OWNER" },
        create: { userId: admin.id, companyId: empresa.id, role: "OWNER" },
      });
    }
    return { user: novo, membership: vinculo };
  });

  // D2: com a verificação ligada, o cadastro entrega a mensagem e para aí. A
  // sessão nasce depois do clique no link, no login — não aqui.
  if (env.REQUIRE_EMAIL_VERIFICATION === "1") {
    await emitirTokenDeVerificacao({ userId: user.id, email: user.email, nome: user.name, ip });
    await audit({
      userId: user.id,
      companyId: membership.companyId,
      action: "auth.register_aguarda_verificacao",
      entity: "user",
      entityId: user.id,
      ip,
    });
    return { verificationRequired: true };
  }

  const tokens = await issueTokens(app, user.id, membership.companyId, membership.role, ip);
  await audit({ userId: user.id, companyId: membership.companyId, action: "auth.register", entity: "user", entityId: user.id, ip });
  return {
    tokens,
    user: toSessionUser(user, membership),
  };
}

// ---- O codigo que a recuperacao entrega (T3.1 e T3.2) ----
//
// O prompt diz duas coisas que precisam morar juntas na mesma tela: "a recuperacao
// por e-mail nao pode vazar o codigo" e "a pessoa digita o codigo que recebeu". A
// costura e esta:
//
// - a resposta HTTP nao traz o codigo. Ele aparece na mensagem entregue, na caixa
//   postal de quem pediu -- e so na resposta quando o .env local declara
//   AUTH_EXPOSE_RESET_TOKEN=1 fora de producao, para quem desenvolve sem SMTP na
//   mesa. Um cronometro na tela de recuperacao tambem nao diz nada: o pedido de
//   e-mail existente e o de e-mail inexistente fazem o mesmo trabalho.
// - no banco vai o HMAC do valor, nunca o valor. Quem ler a tabela nao abre porta
//   nenhuma com ela.
// - a tela aceita o codigo com a tolerancia de digitacao que a vida real exige:
//   espaco, traco e maiuscula sao ruido de teclado e de quebra de linha, nao
//   segredo. A forma canonica e a minuscula sem separadores, e e sobre ela que o
//   HMAC e calculado -- nos dois lados, o que cria e o que confere.
const MENSAGEM_DE_CODIGO_INVALIDO = "Código de recuperação inválido ou expirado";

/**
 * A forma canonica de um codigo de recuperacao: minusculo, sem espaco e sem traco.
 * Token hexadecimal nao tem traco nem letra maiuscula de proposito, entao a
 * normalizacao e inofensiva para o caminho do link clicado e indispensavel para o
 * caminho de quem copiou o codigo de um e-mail aberto no celular.
 */
export function formaCanonica(codigo: string): string {
  return codigo.trim().toLowerCase().replace(/[\s.-]/g, "");
}

// Solicitação de recuperação: SEMPRE responde ok genérico (não revela se o
// e-mail existe). O código só volta no HTTP quando o .env local pede
// explicitamente (AUTH_EXPOSE_RESET_TOKEN=1) E o ambiente não é produção. O flag
// sozinho já bastava para o dev, mas a fase A7 quis o par: NODE_ENV=production
// não entrega reset de ninguém, mesmo com o flag aceso por engano num deploy.
export async function forgotPassword(email: string, ip?: string): Promise<{ ok: true; devToken?: string }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    await audit({ userId: user?.id ?? null, action: "auth.forgot_password", entity: "user", ip, metadata: { email } });
    return { ok: true };
  }
  // Regra definitiva (Fase 2): a recuperação não toca o administrador da
  // plataforma. Nem token, nem revogação de sessões — a resposta continua o
  // mesmo ok genérico. A senha dessa conta se troca de dentro (troca de senha
  // autenticada) ou pelo seed local; um link de recuperação jamais pode ser
  // porta para assumir a conta que protege a plataforma inteira.
  if (user.platformRole === "SUPER_ADMIN") {
    await audit({
      userId: user.id,
      action: "auth.forgot_password_bloqueado",
      entity: "user",
      entityId: user.id,
      ip,
      metadata: { motivo: "administrador da plataforma não passa pela recuperação" },
    });
    return { ok: true };
  }
  const token = crypto.randomBytes(24).toString("hex");
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) },
  });
  // A7 do prompt de mercado: pedir recuperação NÃO derruba mais as sessões da
  // pessoa. Antes, qualquer um que soubesse o e-mail deslogava a vítima todas as
  // vezes que apertasse "esqueci a senha" — uma porta de negação de serviço
  // escancarada, sem nenhum roubo envolvido. A queda de sessões acontece no
  // momento em que a senha realmente muda (`resetPassword`), que é onde ela
  // protege alguém de verdade.
  await audit({ userId: user.id, action: "auth.forgot_password", entity: "user", entityId: user.id, ip });
  // D1: o código vai embora pela porta de entrega, sempre. Antes desta linha não
  // existia entrega nenhuma — o código aparecia no corpo da resposta quando o
  // `.env` pedia, e fora disso o pedido de recuperação era um formulário que
  // ninguém sabia o que fazia com ele. Manter as duas janelas (mensagem + o
  // desvio de desenvolvimento abaixo) é o que permite à prova conferir o texto
  // recebido sem depender do console de ninguém.
  //
  // N58 (T5.3): a entrega mudou de lado do balcão. O handler enfileira e devolve;
  // quem espera o SMTP é a fila do processo, e a auditoria de falha é carimbada
  // por ela depois da última tentativa — não mais dentro do request, que é o que
  // fazia uma tela de "esqueci a senha" pagar o tempo de um servidor de e-mail.
  enfileirarMail(
    mensagemDeRecuperacao({
      para: user.email,
      nome: user.name,
      codigo: token,
      validadeEmMinutos: Math.round(RESET_TTL_MS / 60_000),
    }),
    async (resultado) => {
      if (resultado.ok) return;
      // A entrega falhou, a pessoa não. A resposta HTTP continua a mesma
      // (genérica, sem código) para não denunciar o endereço, e o motivo técnico
      // vem para a auditoria, que é onde quem administra a instalação lê.
      await audit({
        userId: user.id,
        action: "auth.forgot_password_entrega_falhou",
        entity: "user",
        entityId: user.id,
        ip,
        metadata: { rotulo: "recuperacao-de-senha", tentativas: resultado.tentativas, motivo: resumoDaFalha(resultado.erro) },
      });
    },
  );
  // A7 do prompt de mercado: além do flag explícito do .env, o código de
  // recuperação nunca sai pelo HTTP quando o ambiente é produção. O zod de
  // `env.ts` já recusa a subida com AUTH_EXPOSE_RESET_TOKEN=1 em produção (A9);
  // esta é a segunda trava, para o caminho nunca depender só da configuração.
  return env.AUTH_EXPOSE_RESET_TOKEN === "1" && !isProd ? { ok: true, devToken: token } : { ok: true };
}

// Redefinição com token: valida, troca a senha e derruba todas as sessões.
export async function resetPassword(
  email: string,
  token: string,
  password: string,
  ip?: string,
): Promise<{ ok: true }> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(formaCanonica(token)) },
    include: { user: true },
  });
  if (!record || record.usedAt || record.expiresAt < new Date() || record.user.email !== email) {
    throw unauthorized(MENSAGEM_DE_CODIGO_INVALIDO);
  }
  // Cinto extra do gate da recuperação: um token perdido de código antigo
  // também não redefine senha de administrador de plataforma.
  if (record.user.platformRole === "SUPER_ADMIN") {
    throw unauthorized(MENSAGEM_DE_CODIGO_INVALIDO);
  }
  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.passwordResetToken.updateMany({ where: { userId: record.userId, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.refreshToken.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  await audit({ userId: record.userId, action: "auth.reset_password", entity: "user", entityId: record.userId, ip });
  // T3.2: quem passou por e-mail + código + senha nova é dono da conta, e não há
  // motivo para herdar o bloqueio de quem estava sendo atacado. Sem esta linha, a
  // recuperação bem-sucedida ainda devolveria "credenciais inválidas" por até
  // quinze minutos, e a primeira coisa que a pessoa faria seria pedir recuperação
  // de novo — exatamente o que a contagem pune.
  await zerarTentativas(email);
  return { ok: true };
}

// ---- Conta: perfil e troca de senha ----

// Nome e telefone da própria conta. Compara antes de gravar: sem diferença real,
// não escreve no banco nem polui a auditoria.
export async function updateProfile(
  userId: string,
  companyId: string,
  input: { name?: string; phone?: string | null },
  ip?: string,
): Promise<{ user: SessionUser; alterados: string[] }> {
  const atual = await prisma.user.findUnique({ where: { id: userId } });
  if (!atual) throw notFound("Usuário não encontrado");

  const dados: { name?: string; phone?: string | null } = {};
  if (input.name !== undefined) dados.name = input.name.trim();
  if (input.phone !== undefined) {
    const digitos = somenteDigitos(input.phone ?? "");
    dados.phone = digitos === "" ? null : digitos;
  }

  const alterados: string[] = [];
  const antes: Record<string, string | null> = {};
  const depois: Record<string, string | null> = {};
  for (const campo of ["name", "phone"] as const) {
    const novo = dados[campo];
    if (novo === undefined) continue;
    const anterior = atual[campo] ?? null;
    if (anterior === novo) continue;
    alterados.push(campo);
    antes[campo] = anterior;
    depois[campo] = novo;
  }
  if (alterados.length === 0) {
    return { user: await getMe(userId, companyId), alterados };
  }

  await prisma.user.update({ where: { id: userId }, data: dados });
  await audit({
    userId,
    companyId,
    action: "auth.profile_updated",
    entity: "user",
    entityId: userId,
    ip,
    metadata: { campos: alterados, antes, depois },
  });
  return { user: await getMe(userId, companyId), alterados };
}

// Trocar a senha pela própria conta: confere a atual, adota a nova e derruba todas as
// sessões ativas. Responder 400 (e não 401) evita que o app saia tentando renovar um
// token que ainda é válido.
export async function changePassword(
  userId: string,
  companyId: string,
  currentPassword: string,
  newPassword: string,
  ip?: string,
): Promise<{ ok: true; sessionsRevoked: number }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.active) throw notFound("Usuário não encontrado");

  const confere = await verifyPassword(currentPassword, user.passwordHash);
  if (!confere) {
    await audit({
      userId,
      companyId,
      action: "auth.password_change.failed",
      entity: "user",
      entityId: userId,
      ip,
    });
    throw badRequest("A senha atual não confere");
  }
  if (await verifyPassword(newPassword, user.passwordHash)) {
    throw conflict("A nova senha é igual à atual");
  }

  const passwordHash = await hashPassword(newPassword);
  const sessionsRevoked = await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { passwordHash } });
    const derrubadas = await tx.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return derrubadas.count;
  });

  await audit({
    userId,
    companyId,
    action: "auth.password_changed",
    entity: "user",
    entityId: userId,
    ip,
    metadata: { sessionsRevoked },
  });
  return { ok: true, sessionsRevoked };
}
