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
  | "segundo-fator-desativado";

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
  enviar(mensagem: MensagemDeMail): Promise<void>;
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
