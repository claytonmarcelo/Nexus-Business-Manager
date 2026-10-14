import type { MailerPort, MensagemDeMail } from "./porta";

/**
 * Entrega de teste (D1 + regra 4 do contrato): a caixa fica em memória, nenhuma
 * conexão de rede é aberta, e o teste lê exatamente o que a aplicação mandou.
 *
 * `falharApos(n)` existe de propósito: a porta de e-mail é chamada em fluxo
 * crítico (recuperação de senha), e o caminho em que a entrega falha precisa ser
 * provado — a resposta continua genérica, o código não aparece, e a auditoria
 * registra a falha de entrega.
 */
export interface MailerDeTeste extends MailerPort {
  caixa: MensagemDeMail[];
  /** A partir da próxima `falharApos`-ésima entrega, lança erro em vez de enviar. */
  falharApos(quantas: number): void;
  limpar(): void;
  /** Mensagens com o rótulo dado, na ordem em que saíram. */
  porRotulo(rotulo: MensagemDeMail["rotulo"]): MensagemDeMail[];
}

export function fakeMailer(): MailerDeTeste {
  const caixa: MensagemDeMail[] = [];
  let falharDepoisDe = Number.POSITIVE_INFINITY;
  let enviadas = 0;
  return {
    nome: "fake",
    caixa,
    falharApos(quantas: number) {
      falharDepoisDe = quantas;
    },
    limpar() {
      caixa.length = 0;
      enviadas = 0;
      falharDepoisDe = Number.POSITIVE_INFINITY;
    },
    porRotulo(rotulo) {
      return caixa.filter((m) => m.rotulo === rotulo);
    },
    async enviar(mensagem: MensagemDeMail): Promise<void> {
      enviadas += 1;
      if (enviadas > falharDepoisDe) throw new Error("a entrega de e-mail falhou (caixa de teste)");
      caixa.push(mensagem);
    },
  };
}
