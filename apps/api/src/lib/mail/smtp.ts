import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type { MailerPort, MensagemDeMail } from "./porta";
import { mascaraEndereco } from "./porta";

export interface ConfiguracaoSmtp {
  host: string;
  port: number;
  usuario?: string;
  senha?: string;
  /** "1" = TLS explícito; "0" = nunca; ausente = TLS quando a porta é 465. */
  seguro?: string;
  remetente: string;
}

/**
 * Adaptador SMTP genérico (D1). Genérico de propósito: o produto não conhece
 * provedor de e-mail nenhum — conhece host, porta, credencial e remetente, que é
 * o que qualquer servidor SMTP conversa. Por isso a decisão do dono não exige
 * credencial real para ser implementada e testada: o que se prova aqui é a porta
 * e o contrato, e a entrega de verdade depende só de apontar as variáveis.
 *
 * O erro que sai daqui nomeia o código do protocolo e o endereço mascarado. Nada
 * de credencial, nada de caixa postal inteira: a mensagem de erro de um servidor
 * SMTP costuma carregar o usuário que autenticou.
 */
export function smtpMailer(config: ConfiguracaoSmtp): MailerPort {
  let transporte: Transporter | undefined;

  function criar(): Transporter {
    const usaTls =
      config.seguro === "1" ? true : config.seguro === "0" ? false : config.port === 465;
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: usaTls,
      auth: config.usuario ? { user: config.usuario, pass: config.senha ?? "" } : undefined,
    });
  }

  return {
    nome: "smtp",
    async enviar(mensagem: MensagemDeMail): Promise<void> {
      transporte ??= criar();
      try {
        await transporte.sendMail({
          from: config.remetente,
          to: mensagem.para,
          subject: mensagem.assunto,
          text: mensagem.texto,
          html: mensagem.html,
        });
      } catch (erro) {
        const codigo =
          erro && typeof erro === "object" && "code" in erro ? String((erro as { code: unknown }).code) : "desconhecido";
        throw new Error(
          "a entrega de e-mail falhou (" + codigo + ") em " + mascaraEndereco(mensagem.para) + " — rótulo " + mensagem.rotulo,
        );
      }
    },
  };
}
