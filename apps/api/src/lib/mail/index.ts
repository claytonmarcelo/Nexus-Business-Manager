// D1: a escolha de quem entrega a mensagem é decisão de ambiente, não de módulo.
//
// `criarMailer` é pura — recebe um mapa de variáveis e devolve a implementação —,
// então o teste cobre cada ramo sem tocar em `process.env`. `mailer()` é o ponto
// único que o negócio chama, e `definirMailer()` permite ao teste subir uma caixa
// em memória sem trocar o import de cada serviço.

import type { FonteDeMail, MailerPort } from "./porta";
import { consoleMailer } from "./console";
import { fakeMailer } from "./fake";
import { smtpMailer } from "./smtp";

export type { MailerPort, MensagemDeMail, RotuloDeMail } from "./porta";
export { mascaraEndereco } from "./porta";
export { consoleMailer } from "./console";
export { fakeMailer } from "./fake";
export { smtpMailer } from "./smtp";

/**
 * Devolve o entregador adequado ao ambiente.
 *
 * - SMTP declarado (host + porta + remetente) → entrega de verdade;
 * - `MAIL_TRANSPORT=memory` → caixa em memória, para teste automatizado;
 * - qualquer outra configuração → console, que é o comportamento de dev.
 *
 * Não lança: uma configuração incompleta de SMTP derruba o boot pela regra de
 * produção (`producao.ts`), que é o lugar de cobrar credencial — aqui o pior
 * cenário possível continua sendo o console, que nunca quebra uma request.
 */
export function criarMailer(fonte: FonteDeMail): MailerPort {
  const transporte = (fonte.MAIL_TRANSPORT ?? "").trim().toLowerCase();
  if (transporte === "memory") return fakeMailer();
  const host = (fonte.SMTP_HOST ?? "").trim();
  const porta = Number.parseInt(fonte.SMTP_PORT ?? "", 10);
  const remetente = (fonte.MAIL_FROM ?? "").trim();
  if (host && Number.isInteger(porta) && porta > 0 && remetente) {
    return smtpMailer({
      host,
      port: porta,
      usuario: fonte.SMTP_USER?.trim() || undefined,
      senha: fonte.SMTP_PASS ?? undefined,
      seguro: fonte.SMTP_SECURE?.trim() || undefined,
      remetente,
    });
  }
  return consoleMailer();
}

let instancia: MailerPort | undefined;

/** O entregador do processo. Criado sob demanda a partir do ambiente real. */
export function mailer(): MailerPort {
  instancia ??= criarMailer(process.env as FonteDeMail);
  return instancia;
}

/** Injeção para teste: troca o entregador; `undefined` devolve a criação preguiçosa. */
export function definirMailer(novo: MailerPort | undefined): void {
  instancia = novo;
}
