// D1: a escolha de quem entrega a mensagem é decisão de ambiente, não de módulo.
//
// `criarMailer` é pura — recebe um mapa de variáveis e devolve a implementação —,
// então o teste cobre cada ramo sem tocar em `process.env`. `mailer()` é o ponto
// único que o negócio chama, e `definirMailer()` permite ao teste subir uma caixa
// em memória sem trocar o import de cada serviço.

import type { EstadoDoCanal, FonteDeMail, MailerPort } from "./porta";
import { env } from "../../config/env";
import { consoleMailer } from "./console";
import { fakeMailer } from "./fake";
import { smtpMailer } from "./smtp";

export type { MailerPort, MensagemDeMail, RotuloDeMail, EstadoDoCanal } from "./porta";
export { mascaraEndereco, resumoDaFalha } from "./porta";
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
    const teto = Number.parseInt(fonte.MAIL_TIMEOUT_MS ?? "", 10);
    return smtpMailer({
      host,
      port: porta,
      usuario: fonte.SMTP_USER?.trim() || undefined,
      senha: fonte.SMTP_PASS ?? undefined,
      seguro: fonte.SMTP_SECURE?.trim() || undefined,
      remetente,
      // O mesmo número que a fila usa para cortar a espera (N58) vai para o
      // transporte, para que o socket também tenha teto. Lido do mapa, não do
      // `process.env`: a fábrica continua pura.
      timeoutMs: Number.isInteger(teto) && teto > 0 ? teto : undefined,
    });
  }
  return consoleMailer();
}

let instancia: MailerPort | undefined;

/**
 * O entregador do processo. Criado sob demanda a partir do ambiente real.
 *
 * A chave de tempo da entrega vem do `env` validado, não do `process.env` cru: a
 * fila (`fila.ts`) e o transporte SMTP têm que enxergar o mesmo teto, e o padrão
 * de 15 segundos mora no zod de `config/env.ts` — um processo sem a chave no
 * ambiente não pode ter fila com teto e socket sem ele (N58).
 */
export function mailer(): MailerPort {
  instancia ??= criarMailer({ ...(process.env as FonteDeMail), MAIL_TIMEOUT_MS: String(env.MAIL_TIMEOUT_MS) });
  return instancia;
}

/** Injeção para teste: troca o entregador; `undefined` devolve a criação preguiçosa. */
export function definirMailer(novo: MailerPort | undefined): void {
  instancia = novo;
}

/**
 * O estado do canal de e-mail desta instalação (N59).
 *
 * É a leitura que a rota de preferências devolve e que a tela usa para decidir se
 * a caixa "E-mail" está editável. Antes, a frase "Indisponível: não há servidor de
 * e-mail (SMTP) configurado nesta instalação" estava escrita no JSX, ao lado de um
 * `disabled` fixo: dizia a verdade no desenvolvimento e mentiria numa produção com
 * SMTP ligado, porque não dependia do entregador nenhum. Aqui depende: quem
 * responde é a capacidade declarada pelo `MailerPort` em uso, lida no instante da
 * pergunta — por isso a função lê `mailer()` em vez de receber o entregador por
 * parâmetro, e é por isso que um entregador que não declara capacidade é lido como
 * indisponível.
 */
export function estadoDoCanalDeEmail(): EstadoDoCanal {
  const entregador = mailer();
  if (entregador.entregaDeVerdade) return { disponivel: true, transporte: entregador.nome, motivo: null };
  return {
    disponivel: false,
    transporte: entregador.nome,
    motivo:
      entregador.motivoDaIndisponibilidade ??
      "o entregador desta instalação não declara que entrega de verdade",
  };
}
