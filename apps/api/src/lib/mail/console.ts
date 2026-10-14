import type { MailerPort, MensagemDeMail } from "./porta";
import { mascaraEndereco } from "./porta";

type LinhaDeLog = (mensagem: string) => void;

/**
 * Entrega de desenvolvimento (D1): a mensagem é escrita no log do processo, com o
 * endereço mascarado e o corpo junto — em dev o corpo É o código, e é assim que
 * quem programa testa o fluxo sem servidor de e-mail.
 *
 * Não é um simulacro silencioso: se alguém apontar produção para este mailer sem
 * querer, a mensagem também não vai embora, então a escolha dele é sempre
 * explícita (`SMTP_HOST` ausente fora de produção) e a produção recusa subir sem
 * SMTP configurado (`config/producao.ts`).
 */
export function consoleMailer(log: LinhaDeLog = (m) => process.stdout.write(m + "\n")): MailerPort {
  return {
    nome: "console",
    // N59: escreve no log, não na caixa postal de ninguém. É o entregador desta
    // máquina enquanto não há SMTP, e por isso o canal de e-mail do produto fica
    // desligado na tela de preferências — a frase da tela passou a vir daqui.
    entregaDeVerdade: false,
    motivoDaIndisponibilidade:
      "não há servidor de e-mail (SMTP) configurado nesta instalação: as mensagens são escritas no log do servidor",
    async enviar(mensagem: MensagemDeMail): Promise<void> {
      log(
        `[mail:console] ${mensagem.rotulo} para ${mascaraEndereco(mensagem.para)} — assunto: ${mensagem.assunto}\n` +
          mensagem.texto
            .split("\n")
            .map((l) => "  | " + l)
            .join("\n"),
      );
    },
  };
}
