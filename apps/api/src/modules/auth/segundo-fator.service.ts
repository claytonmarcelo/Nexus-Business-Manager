import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { badRequest, conflict, forbidden, unauthorized } from "../../lib/errors";
import { audit } from "../../lib/audit";
import { resumoDaFalha } from "../../lib/mail";
import { enfileirarMail } from "../../lib/mail/fila";
import { avisoDeSegundoFator } from "../../lib/mail/mensagens";
import { cifraDisponivel, decifrar } from "../../lib/criptografia";
import { hashDeCodigoDeRecuperacao, codigoConfere, cifrarSegredo, gerarCodigosDeRecuperacao, novoSegredo, uriDeConfiguracao, doisFatorObrigatorio } from "../../lib/segundo-fator";
import type { EscopoPayload } from "../../plugins/auth";
// Os dois helpers de sessão vêm do serviço de auth, que já sabe montar token de
// refresh com empresa, permissões e moeda da casa. Não há ciclo: `auth.service`
// não conhece este arquivo — quem junta os dois são as rotas.
import { getMe, issueTokens, type AuthTokens, type SessionUser } from "./auth.service";

// F4 (decisão D3): o segundo fator, do lado do servidor.
//
// Três estados, e cada um tem uma rota que só ele atravessa:
//
//   - sem segundo fator e não obrigatório  ->  sessão normal;
//   - obrigatório e ainda não ligado       ->  token de configuração (15 min), que
//     só abre `configurar`/`ativar`;
//   - ligado                               ->  token de desafio (5 min), que só
//     abre a rota de entrada.
//
// O segredo cifrado com `totpSecretCiphertext` SEM um `totpEnabledAt` é um segredo
// pendente: nenhuma das três rotas de entrada o aceita, e o login continua
// pedindo a configuração. É isso que permite gerar o segredo, mostrar na tela e só
// ligar de verdade quando a pessoa provar que tem o aplicativo em mãos — sem
// precisar de uma tabela nova nem de uma coluna de estado a mais.

/** Quantos códigos de recuperação são emitidos na ativação. */
const QUANTIDADE_DE_CODIGOS_DE_RECUPERACAO = 10;

const FASE_EXPIROU = "A etapa expirou. Faça login novamente.";
const CODIGO_INVALIDO = "Código inválido. Confira o horário do aparelho e tente de novo.";

/**
 * O segredo só pode ser gerado onde ele pode ser lido de volta. Sem chave de
 * cifraçao no ambiente, a resposta é esta — nunca um segredo em claro no banco, e
 * nunca uma promessa de 2FA que quebra no primeiro restart.
 */
function exigeChaveDeCriptografia(): void {
  if (!cifraDisponivel()) {
    throw conflict("O segundo fator está indisponível neste ambiente: falta a chave TOTP_ENCRYPTION_KEY");
  }
}

/** Conta viva, do ponto de vista desta área. */
async function contaViva(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { memberships: { include: { company: true } } },
  });
  if (!user || !user.active) throw unauthorized(FASE_EXPIROU);
  return user;
}

/**
 * O segredo gravado por outra chave é uma porta que não abre — e a resposta não
 * pode ser um erro de 500 com texto criptográfico, nem um "código inválido" que
 * esconde o problema de quem administra a instalação.
 *
 * A regra é fechar: sem envelope legível não há segunda etapa nenhuma, e ninguém
 * entra. O que diferencia esta função do silêncio é o evento de auditoria, que diz
 * qual conta está impossibilitada, e a frase, que nomeia a causa técnica sem
 * imprimir chave, segredo ou pedaço de envelope.
 */
async function exigeSegredoLegivel(input: {
  userId: string;
  segredoCifrado: string;
  ip?: string;
}): Promise<void> {
  try {
    decifrar(input.segredoCifrado);
  } catch {
    await audit({
      userId: input.userId,
      action: "auth.2fa_segredo_ilegivel",
      entity: "user",
      entityId: input.userId,
      ip: input.ip,
    });
    throw conflict(
      "O segundo fator não pode ser verificado neste ambiente: a chave de cifrações não é a que gravou este segredo.",
    );
  }
}

/**
 * Gera o segredo pendente e devolve o que a tela precisa mostrar: a chave em
 * base32 e a URI `otpauth://`. Não há QR aqui de propósito — a mesma informação
 * lida em texto funciona em qualquer aplicativo, e um gerador de imagem a mais no
 * projeto seria dependência por nada (registrado no ADR da decisão D3).
 */
export async function configurarSegundoFator(
  userId: string,
): Promise<{ segredoBase32: string; uri: string; obrigatorio: boolean }> {
  const user = await contaViva(userId);
  exigeChaveDeCriptografia();
  if (user.totpEnabledAt) {
    throw conflict("O segundo fator já está ligado nesta conta. Desligue-o para gerar um novo segredo.");
  }
  const segredoBase32 = novoSegredo();
  await prisma.user.update({
    where: { id: userId },
    data: { totpSecretCiphertext: cifrarSegredo(segredoBase32) },
  });
  await audit({ userId, action: "auth.2fa_configurado", entity: "user", entityId: userId });
  return {
    segredoBase32,
    uri: uriDeConfiguracao({ conta: user.email, segredoBase32 }),
    obrigatorio: doisFatorObrigatorio({
      platformRole: user.platformRole,
      papeis: user.memberships.map((m) => m.role),
      nodeEnv: env.NODE_ENV,
    }),
  };
}

/**
 * Confere um código gerado agora e liga o segundo fator de fato. É o único ponto
 * do projeto que escreve `totpEnabledAt`, e é por isso que a coluna significa o
 * que significa: alguém, neste instante, provou ter o aplicativo.
 */
export async function ativarSegundoFator(input: {
  app: FastifyInstance;
  userId: string;
  codigo: string;
  /** Presente só no caminho do login obrigatório: é a casa que a pessoa escolheu. */
  empresa?: { companyId: string; role: string };
  ip?: string;
}): Promise<{ codigosDeRecuperacao: string[]; tokens?: AuthTokens; user?: SessionUser }> {
  const user = await contaViva(input.userId);
  if (!user.totpSecretCiphertext) throw badRequest("Gere o segredo antes de confirmar o código.");
  if (user.totpEnabledAt) throw conflict("O segundo fator já está ligado nesta conta.");
  await exigeSegredoLegivel({ userId: user.id, segredoCifrado: user.totpSecretCiphertext, ip: input.ip });
  if (!codigoConfere({ segredoCifrado: user.totpSecretCiphertext, codigo: input.codigo })) {
    await audit({
      userId: user.id,
      action: "auth.2fa_ativacao_falhou",
      entity: "user",
      entityId: user.id,
      ip: input.ip,
    });
    throw unauthorized(CODIGO_INVALIDO);
  }

  const lote = gerarCodigosDeRecuperacao(QUANTIDADE_DE_CODIGOS_DE_RECUPERACAO);
  const agora = new Date();
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { totpEnabledAt: agora } }),
    prisma.recoveryCode.deleteMany({ where: { userId: user.id } }),
    prisma.recoveryCode.createMany({ data: lote.hashes.map((codeHash) => ({ userId: user.id, codeHash })) }),
  ]);

  // Os códigos de recuperação existem uma única vez: saem aqui, e o banco fica só
  // com o HMAC de cada um. A tela precisa obrigatoriamente mostrá-los nesta
  // resposta — não há segunda vez, e é assim que tem de ser.
  enviarAviso(user.id, user.email, user.name, "ativado", input.ip);
  await audit({
    userId: user.id,
    action: "auth.2fa_ativado",
    entity: "user",
    entityId: user.id,
    ip: input.ip,
    metadata: { codigosEmitidos: lote.visiveis.length },
  });

  if (!input.empresa) return { codigosDeRecuperacao: lote.visiveis };
  // Capturado em constante: a estreitamento do parâmetro opcional não sobrevive
  // dentro do closure do `find`, e o compilador tem razão em desconfiar.
  const empresaPedida = input.empresa;
  // Login obrigatório: a pessoa ainda não tem sessão, e o segundo fator acabou de
  // nascer. A sessão é emitida agora, com a casa que o token de configuração carregou.
  const membership = user.memberships.find((m) => m.companyId === empresaPedida.companyId);
  if (!membership) throw forbidden("Você não pertence a esta empresa");
  if (!membership.company.active) throw conflict("Empresa inativa");
  const tokens = await issueTokens(input.app, user.id, membership.companyId, membership.role, input.ip);
  return {
    codigosDeRecuperacao: lote.visiveis,
    tokens,
    user: await getMe(user.id, membership.companyId),
  };
}

/**
 * Segunda etapa do login: senha já conferida, falta o código. Aceita o código do
 * aplicativo e, como saída de emergência, um código de recuperação ainda não usado
 * — que se gasta no mesmo instante em que abre a porta.
 */
export async function entrarComSegundoFator(
  app: FastifyInstance,
  challengeToken: string,
  codigo: string,
  ip?: string,
): Promise<{ tokens: AuthTokens; user: SessionUser }> {
  let payload: EscopoPayload;
  try {
    payload = (await app.jwt.verify(challengeToken)) as EscopoPayload;
  } catch {
    throw unauthorized(FASE_EXPIROU);
  }
  if (payload.escopo !== "2fa-desafio" || typeof payload.sub !== "string") throw unauthorized(FASE_EXPIROU);

  const user = await contaViva(payload.sub);
  if (!user.totpEnabledAt || !user.totpSecretCiphertext) throw unauthorized(FASE_EXPIROU);
  if (env.REQUIRE_EMAIL_VERIFICATION === "1" && !user.emailVerifiedAt) {
    throw forbidden("Confirme o seu e-mail para entrar. Reenvie a mensagem se ela não chegou.");
  }
  const membership = user.memberships.find((m) => m.companyId === payload.cid && m.company.active);
  if (!membership) throw forbidden("Você não pertence a esta empresa");

  await exigeSegredoLegivel({ userId: user.id, segredoCifrado: user.totpSecretCiphertext, ip });
  const usado = await conferirCodigo({
    userId: user.id,
    segredoCifrado: user.totpSecretCiphertext,
    codigo,
  });
  if (!usado) {
    // O motivo de não dizer "qual metade estava errada" é o mesmo do login: a
    // resposta genérica não distingue segredo trocado de código chutado. O
    // rate-limit da rota (5 por minuto por endereço) é o que fecha a conta de
    // tentativas sobre um código de seis dígitos, junto do prazo curto do desafio.
    await audit({
      userId: user.id,
      companyId: membership.companyId,
      action: "auth.2fa_desafio_falhou",
      entity: "user",
      entityId: user.id,
      ip,
    });
    throw unauthorized(CODIGO_INVALIDO);
  }

  const tokens = await issueTokens(app, user.id, membership.companyId, membership.role, ip);
  await audit({
    userId: user.id,
    companyId: membership.companyId,
    action: "auth.login",
    entity: "user",
    entityId: user.id,
    ip,
    metadata: { segundoFator: usado === "recuperacao" ? "codigo de recuperacao" : "totp" },
  });
  return { tokens, user: await getMe(user.id, membership.companyId) };
}

/**
 * Desligar o segundo fator exige um código válido, não a senha. O ataque típico ao
 * 2FA não é chutar o código de seis dígitos — é ter a senha (vazada em outro
 * site) e ir desligar o que falta. Se a senha bastasse para desligar, o segundo
 * fator protegeria só até a primeira senha vazada.
 */
export async function desativarSegundoFator(
  userId: string,
  codigo: string,
  ip?: string,
): Promise<{ ok: true }> {
  const user = await contaViva(userId);
  if (!user.totpEnabledAt || !user.totpSecretCiphertext) {
    throw conflict("O segundo fator nem está ligado nesta conta.");
  }
  if (
    doisFatorObrigatorio({
      platformRole: user.platformRole,
      papeis: user.memberships.map((m) => m.role),
      nodeEnv: env.NODE_ENV,
    })
  ) {
    throw conflict("Neste ambiente o segundo fator é obrigatório para o seu papel e não pode ser desligado.");
  }
  await exigeSegredoLegivel({ userId: user.id, segredoCifrado: user.totpSecretCiphertext, ip });
  const usado = await conferirCodigo({ userId: user.id, segredoCifrado: user.totpSecretCiphertext, codigo });
  if (!usado) {
    await audit({ userId: user.id, action: "auth.2fa_desativacao_falhou", entity: "user", entityId: user.id, ip });
    throw unauthorized(CODIGO_INVALIDO);
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { totpEnabledAt: null, totpSecretCiphertext: null } }),
    prisma.recoveryCode.deleteMany({ where: { userId: user.id } }),
  ]);
  enviarAviso(user.id, user.email, user.name, "desativado", ip);
  await audit({ userId: user.id, action: "auth.2fa_desativado", entity: "user", entityId: user.id, ip });
  return { ok: true };
}

/** O que a tela da conta mostra: ligado ou não, e quantos códigos ainda restam. */
export async function statusSegundoFator(userId: string): Promise<{
  ligado: boolean;
  pendente: boolean;
  obrigatorio: boolean;
  codigosRestantes: number;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { memberships: { select: { role: true } } },
  });
  if (!user) throw unauthorized(FASE_EXPIROU);
  return {
    ligado: Boolean(user.totpEnabledAt),
    pendente: !user.totpEnabledAt && Boolean(user.totpSecretCiphertext),
    obrigatorio: doisFatorObrigatorio({
      platformRole: user.platformRole,
      papeis: user.memberships.map((m) => m.role),
      nodeEnv: env.NODE_ENV,
    }),
    codigosRestantes: await prisma.recoveryCode.count({ where: { userId, usedAt: null } }),
  };
}

// ---- internos ----

/**
 * Confere código do aplicativo OU código de recuperação. Quando o de recuperação
 * abre, ele é gasto na hora, dentro da mesma transação de leitura: um código
 * desses usado duas vezes não é segunda chance, é sinal de que alguém o copiou.
 */
async function conferirCodigo(input: {
  userId: string;
  segredoCifrado: string;
  codigo: string;
}): Promise<"totp" | "recuperacao" | null> {
  const bruto = input.codigo.trim();
  if (/^\d{6}$/.test(bruto) && codigoConfere({ segredoCifrado: input.segredoCifrado, codigo: bruto })) {
    return "totp";
  }
  // Formato do código de recuperação: dez caracteres do alfabeto sem símbolos
  // ambíguos, com ou sem o traço que a tela mostra. O traço é legibilidade, não
  // parte do segredo -- a forma canônica é a minúscula sem separadores, e é sobre
  // ela que o hash do banco foi calculado.
  const canonico = bruto.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!/^[a-z0-9]{10}$/.test(canonico)) return null;
  const registro = await prisma.recoveryCode.findUnique({
    where: { codeHash: hashDeCodigoDeRecuperacao(canonico) },
  });
  if (!registro || registro.userId !== input.userId || registro.usedAt) return null;
  await prisma.recoveryCode.update({ where: { id: registro.id }, data: { usedAt: new Date() } });
  await audit({
    userId: input.userId,
    action: "auth.2fa_codigo_de_recuperacao_usado",
    entity: "user",
    entityId: input.userId,
    metadata: { restantes: await prisma.recoveryCode.count({ where: { userId: input.userId, usedAt: null } }) },
  });
  return "recuperacao";
}

// N58 (T5.3): o aviso sai pela fila. Ligar o segundo fator é uma tela que a pessoa
// está preenchendo com o celular na mão; o aviso de segurança vai atrás, com as
// três tentativas da fila, e só a última tentativa falha chega à auditoria.
function enviarAviso(
  userId: string,
  email: string,
  nome: string,
  acao: "ativado" | "desativado",
  ip?: string,
): void {
  enfileirarMail(avisoDeSegundoFator({ para: email, nome, acao }), async (resultado) => {
    if (resultado.ok) return;
    await audit({
      userId,
      action: "auth.2fa_aviso_entrega_falhou",
      entity: "user",
      entityId: userId,
      ip,
      metadata: { tentativas: resultado.tentativas, motivo: resumoDaFalha(resultado.erro) },
    });
  });
}
