// D1 do prompt de continuação: nada no produto sabe o que é SMTP.
//
// Antes desta pasta, "enviar e-mail" significava devolver o código de recuperação
// no corpo da resposta HTTP quando o `.env` pedia — o que funciona em dev e é
// inexistente em produção. A decisão do dono foi trocar isso por uma porta: o
// módulo de negócio monta a mensagem e chama `MailerPort.enviar`; quem entrega o
// mensagem é decidido pelo ambiente, e o teste usa uma caixa em memória.
//
// Três implementações, e só três:
//   - `console` (desenvolvimento): imprime no log local, com o endereço mascarado;
//   - `smtp` (produção): adaptador genérico de SMTP, configurado por variáveis;
//   - `fake` (teste): guarda na caixa, sem rede nenhuma.
//
// Regra permanente do projeto: nenhum endereço real, token ou senha aparece em
// log, teste ou mensagem de erro. O que sai daqui é o domínio e a etiqueta da
// mensagem — nunca a caixa postal inteira de uma pessoa.

export type RotuloDeMail =
  | "recuperacao-de-senha"
  | "verificacao-de-email"
  | "segundo-fator-ativado"
  | "segundo-fator-desativado"
  | "aviso-de-notificacao";

export interface MensagemDeMail {
  /** Caixa postal de entrega. Vive só em memória e na conexão SMTP. */
  para: string;
  assunto: string;
  /** Versão em texto puro: é o que o cliente de e-mail mostra sem liberar HTML. */
  texto: string;
  /** HTML opcional, sempre derivado do mesmo corpo — nunca conteúdo diferente. */
  html?: string;
  rotulo: RotuloDeMail;
}

export interface MailerPort {
  readonly nome: string;
  /**
   * Capacidade de entrega (N59). O padrão é a ausência, e a ausência significa
   * "não afirma que entrega": um entregador novo que esqueça de declarar a
   * capacidade é lido como indisponível, nunca como disponível. É o sentido
   * seguro do erro — o achado N59 existe justamente porque a tela de
   * preferências afirmava que o canal de e-mail não funcionava sem depender de
   * nada, e passou a depender desta leitura.
   */
  readonly entregaDeVerdade?: boolean;
  /**
   * Por que este entregador não chama ninguém de verdade, em uma frase de
   * produto. Usada pela rota de preferências e pelo quadro "E-mail" da tela;
   * ignorada quando `entregaDeVerdade` é verdadeiro.
   */
  readonly motivoDaIndisponibilidade?: string;
  enviar(mensagem: MensagemDeMail): Promise<void>;
}

/**
 * O que a instalação sabe sobre o próprio canal de e-mail agora (N59). É a
 * resposta de `estadoDoCanalDeEmail()`, e o formato que a tela de preferências
 * usa para decidir se a caixa "E-mail" está editável — nunca um `disabled` fixo.
 */
export interface EstadoDoCanal {
  disponivel: boolean;
  transporte: string;
  motivo: string | null;
}

/**
 * O mapa de variáveis que decide o entregador. Tipo próprio em vez de
 * `process.env` porque a fábrica é uma função pura: o teste passa um objeto
 * literal e cobre o ramo SMTP sem ter uma credencial no meio.
 */
export interface FonteDeMail {
  MAIL_TRANSPORT?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_SECURE?: string;
  MAIL_FROM?: string;
  /** Teto de cada tentativa de entrega (N58) — o mesmo número que a fila usa. */
  MAIL_TIMEOUT_MS?: string;
}

/**
 * Máscara de endereço para log e auditoria: `nome.sobrenome@dominio.com` vira
 * `n***@dominio.com`. O domínio continua legível porque é ele que diz se a
 * mensagem foi para o cliente certo; a caixa postal não precisa aparecer em log.
 */
export function mascaraEndereco(endereco: string): string {
  const [caixa, dominio] = endereco.split("@");
  if (!dominio) return "***";
  const inicial = (caixa ?? "").slice(0, 1).toLowerCase();
  return (inicial || "*") + "***@" + dominio.toLowerCase();
}

/**
 * Redação de um erro de entrega para a auditoria — uma função só, porque a regra
 * é de segurança e existia em três cópias parecidas (T5.3, achado N58).
 *
 * O objeto de erro do nodemailer costuma carregar o usuário que autenticou no
 * SMTP, a URL do servidor e pedaços da própria mensagem. Daqui sai texto livre de
 * sequência longa — nenhum código de recuperação ou de verificação passa —, sem
 * quebra de linha e cortado em 140 caracteres. As três cópias antigas não
 * batiam: uma delas não tirava a quebra de linha, que em log de auditoria vira
 * duas linhas onde se procurava uma.
 */
export function resumoDaFalha(erro: unknown): string {
  const texto = erro instanceof Error ? erro.message : String(erro);
  return texto
    .replace(/[0-9a-zA-Z+/]{24,}/g, "redigido")
    .replace(/[\r\n]+/g, " ")
    .slice(0, 140);
}
