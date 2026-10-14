import crypto from "node:crypto";
import { prisma } from "../../lib/prisma";
import { hashToken } from "../../lib/tokens";
import { env } from "../../config/env";
import { badRequest } from "../../lib/errors";
import { audit } from "../../lib/audit";
import { mailer, mascaraEndereco } from "../../lib/mail";
import { mensagemDeVerificacao } from "../../lib/mail/mensagens";

// F4 (decisão D2): verificação de e-mail do cadastro.
//
// O token de verificação obedece a mesma régua dos tokens de sessão e do de
// recuperação: 24 bytes aleatórios, apresentados uma vez, guardados só como HMAC
// (`hashToken`), com prazo. Um dump da tabela `email_verification_tokens` não dá
// a ninguém a capacidade de confirmar caixa postal alheia.
//
// O que a decisão D2 cobra do produto é "conta não confirmada não entra no
// painel", e a flag `REQUIRE_EMAIL_VERIFICATION` é o que separa o ambiente de
// produção do local: desligada, o cadastro emite sessão como sempre (nenhum teste
// nem a vitrine de desenvolvimento dependem de ler caixa de e-mail); ligada, o
// cadastro devolve "falta confirmar" e a mensagem vai embora. A barreira de
// verdade está em `login()`, que confere a coluna `emailVerifiedAt` a cada
// entrada — não só no caminho do cadastro, porque a flag pode ter sido ligada
// depois de a conta existir.

/** Prazo do link/código de verificação: sete dias. */
const TTL_DA_VERIFICACAO_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Cria o token e envia a mensagem. Chamado pelo cadastro e pelo reenvio, e usado
 * por quem administra a instalação para non-entrega: a resposta do HTTP é sempre
 * a mesma, então nenhum dos dois caminhos denuncia se o endereço está ou não
 * cadastrado.
 */
export async function emitirTokenDeVerificacao(input: {
  userId: string;
  email: string;
  nome: string;
  ip?: string;
}): Promise<void> {
  const token = crypto.randomBytes(24).toString("hex");
  await prisma.emailVerificationToken.create({
    data: {
      userId: input.userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TTL_DA_VERIFICACAO_MS),
    },
  });
  // O link vai com o token na query; o mesmo token serve de código para quem
  // prefere digitar. A tela de confirmação é pública e não pede sessão.
  const link = env.WEB_BASE_URL.replace(/\/+$/, "") + "/verificar-e-mail?token=" + token;
  try {
    await mailer().enviar(
      mensagemDeVerificacao({
        para: input.email,
        nome: input.nome,
        link,
        codigo: token,
        validadeEmDias: Math.round(TTL_DA_VERIFICACAO_MS / 86_400_000),
      }),
    );
  } catch (erro) {
    // Mesma regra da recuperação: a entrega falhou, a pessoa não. O cadastro já
    // existe e o token já está gravado, então o reenvio continua sendo a saída —
    // mas quem administra a instalação precisa saber que o SMTP não respondeu, e é
    // na auditoria que isso fica. O `return` é o ponto: sem ele a linha de abaixo
    // carimbaria "enviada" numa mensagem que não saiu, e a auditoria de entrega
    // deixaria de ser o lugar onde se confia.
    await audit({
      userId: input.userId,
      action: "auth.verificacao_entrega_falhou",
      entity: "user",
      entityId: input.userId,
      ip: input.ip,
      metadata: { rotulo: "verificacao-de-email", motivo: resumoDaFalha(erro) },
    });
    return;
  }
  await audit({
    userId: input.userId,
    action: "auth.verificacao_enviada",
    entity: "user",
    entityId: input.userId,
    ip: input.ip,
    metadata: { para: mascaraEndereco(input.email) },
  });
}

// Resumo de um erro de entrega para a auditoria: texto livre de sequência longa
// (token nenhum passa) e sem quebra de linha.
function resumoDaFalha(erro: unknown): string {
  const texto = erro instanceof Error ? erro.message : String(erro);
  return texto.replace(/[0-9a-zA-Z+/]{24,}/g, "redigido").replace(/[\r\n]+/g, " ").slice(0, 140);
}

/**
 * Confirma o endereço. Token válido, seu dono está ativo e a conta ainda não foi
 * confirmada: marca `emailVerifiedAt`, gasta o token e invalida os outros daquela
 * conta (não há motivo para sete links viverem ao mesmo tempo).
 *
 * Resposta para token velho, usado ou de endereço inexistente é a mesma frase, com
 * o mesmo 400: a tela de confirmação é pública e um cronômetro ali também é um
 * canal de informação.
 */
export async function confirmarEmail(
  token: string,
  ip?: string,
): Promise<{ ok: true; email: string }> {
  const registro = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!registro || registro.usedAt || registro.expiresAt < new Date()) {
    throw badRequest("Este link de confirmação não é mais válido. Reenvie a mensagem.");
  }
  const agora = new Date();
  await prisma.$transaction([
    prisma.user.update({ where: { id: registro.userId }, data: { emailVerifiedAt: agora } }),
    prisma.emailVerificationToken.update({ where: { id: registro.id }, data: { usedAt: agora } }),
    prisma.emailVerificationToken.updateMany({
      where: { userId: registro.userId, usedAt: null },
      data: { usedAt: agora },
    }),
  ]);
  await audit({
    userId: registro.userId,
    action: "auth.email_confirmado",
    entity: "user",
    entityId: registro.userId,
    ip,
    metadata: { para: mascaraEndereco(registro.user.email) },
  });
  return { ok: true, email: registro.user.email };
}

/**
 * Reenvio: sempre 200 genérico, nunca diz se o endereço existe. Só manda mensagem
 * para conta ativa, sem confirmação e que não seja o administrador da plataforma
 * — mesma trava da recuperação de senha, pela mesma razão: não existe caixa postal
 * de verdade atrás daquela conta, e um botão que dispara e-mail para ela é só
 * superfície de ataque.
 */
export async function reenviarVerificacao(email: string, ip?: string): Promise<{ ok: true }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active || user.emailVerifiedAt || user.platformRole === "SUPER_ADMIN") {
    await audit({
      userId: user?.id ?? null,
      action: "auth.verificacao_reenvio_solicitado",
      entity: "user",
      entityId: user?.id ?? null,
      ip,
      metadata: { para: mascaraEndereco(email) },
    });
    return { ok: true };
  }
  await emitirTokenDeVerificacao({ userId: user.id, email: user.email, nome: user.name, ip });
  return { ok: true };
}
