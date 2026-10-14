import type { MensagemDeMail } from "./porta";

// As três mensagens que o produto sabe mandar. O texto é de produto, não de
// desenvolvedor: quem lê um e-mail de recuperação não precisa saber o que é
// token, hash ou TTL — precisa saber o que fazer e até quando dá tempo.
//
// Nada aqui carrega dado de outra pessoa além do primeiro nome de quem pediu, e
// nenhum segredo de servidor entra na mensagem: o que vai é o código que a própria
// pessoa precisa digitar, entregue para a caixa postal dela.
//
// Os textos têm acento igual ao resto do produto. O projeto proíbe BOM e alfabetos
// não latinos — o português corretamente acentuado é a língua do sistema, e um
// e-mail escrito "Ola" denunciaria uma mensagem gerada por programa.

const NOME_DO_PRODUTO = "Nexus Business Manager";

function paragrafo(texto: string): string {
  return "<p>" + texto + "</p>";
}

function html(titulo: string, paragrafos: string[]): string {
  return (
    '<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto">' +
    "<h2>" + titulo + "</h2>" +
    paragrafos.map(paragrafo).join("") +
    '<p style="color:#8a8a8a;font-size:12px">' + NOME_DO_PRODUTO + "</p></div>"
  );
}

export function mensagemDeRecuperacao(input: {
  para: string;
  nome: string;
  codigo: string;
  validadeEmMinutos: number;
}): MensagemDeMail {
  const primeiroNome = input.nome.trim().split(/\s+/)[0] || "você";
  const texto = [
    "Olá, " + primeiroNome + ".",
    "",
    "Recebemos um pedido para redefinir a senha da sua conta no " + NOME_DO_PRODUTO + ".",
    "Use o código abaixo na tela de recuperação:",
    "",
    input.codigo,
    "",
    "Ele vale por " + input.validadeEmMinutos + " minutos e só pode ser usado uma vez.",
    "Se não foi você, ignore esta mensagem: sua senha continua a mesma.",
  ].join("\n");
  return {
    para: input.para,
    assunto: "Código de recuperação de senha",
    texto,
    html: html("Recuperação de senha", [
      "Olá, " + primeiroNome + ".",
      "Recebemos um pedido para redefinir a senha da sua conta no " + NOME_DO_PRODUTO + ".",
      'Use o código abaixo na tela de recuperação: <code style="font-size:16px;letter-spacing:1px">' + input.codigo + "</code>",
      "Ele vale por " + input.validadeEmMinutos + " minutos e só pode ser usado uma vez.",
      "Se não foi você, ignore esta mensagem: sua senha continua a mesma.",
    ]),
    rotulo: "recuperacao-de-senha",
  };
}

/**
 * Verificação de cadastro. O link e o código vão juntos porque nem todo cliente
 * de e-mail deixa clicar, e nem toda tela de verificação pede o link — a pessoa
 * escolhe. O código vem como argumento próprio: extraí-lo do link (recortar a
 * parte de `token=`) quebraria no dia em que a rota mudar de nome.
 */
export function mensagemDeVerificacao(input: {
  para: string;
  nome: string;
  link: string;
  codigo: string;
  validadeEmDias: number;
}): MensagemDeMail {
  const primeiroNome = input.nome.trim().split(/\s+/)[0] || "você";
  const texto = [
    "Olá, " + primeiroNome + ".",
    "",
    "Falta um passo para a sua conta do " + NOME_DO_PRODUTO + " entrar no painel.",
    "Abra o link abaixo para confirmar o seu e-mail:",
    "",
    input.link,
    "",
    "Se o link não abrir, digite este código na tela de confirmação: " + input.codigo,
    "Ele vale por " + input.validadeEmDias + " dias e só pode ser usado uma vez.",
    "Se não foi você que criou a conta, ignore esta mensagem.",
  ].join("\n");
  return {
    para: input.para,
    assunto: "Confirme o seu e-mail",
    texto,
    html: html("Confirme o seu e-mail", [
      "Olá, " + primeiroNome + ".",
      "Falta um passo para a sua conta do " + NOME_DO_PRODUTO + " entrar no painel.",
      '<a href="' + input.link + '">Confirmar o meu e-mail</a>',
      "Se o link não abrir, digite este código na tela de confirmação: <code>" + input.codigo + "</code>",
      "Se não foi você que criou a conta, ignore esta mensagem.",
    ]),
    rotulo: "verificacao-de-email",
  };
}

/**
 * Aviso de segurança do segundo fator. A mensagem NÃO carrega segredo nenhum:
 * quem ativou já viu o código de configuração na tela, e quem não ativou precisa
 * saber que algo mudou — não precisa saber o quê, em detalhe.
 */
export function avisoDeSegundoFator(input: {
  para: string;
  nome: string;
  acao: "ativado" | "desativado";
}): MensagemDeMail {
  const primeiroNome = input.nome.trim().split(/\s+/)[0] || "você";
  const verbo = input.acao === "ativado" ? "ativada" : "desativada";
  const texto = [
    "Olá, " + primeiroNome + ".",
    "",
    "A verificação em duas etapas da sua conta do " + NOME_DO_PRODUTO + " foi " + verbo + " agora.",
    input.acao === "ativado"
      ? "Guarde os códigos de recuperação em um lugar fora do e-mail: eles são a saída se o aplicativo de códigos sumir."
      : "Se não foi você, troque a sua senha e reative a verificação em duas etapas imediatamente.",
  ].join("\n");
  return {
    para: input.para,
    assunto: "Verificação em duas etapas " + verbo,
    texto,
    html: html("Verificação em duas etapas " + verbo, [
      "Olá, " + primeiroNome + ".",
      "A verificação em duas etapas da sua conta do " + NOME_DO_PRODUTO + " foi " + verbo + " agora.",
      input.acao === "ativado"
        ? "Guarde os códigos de recuperação em um lugar fora do e-mail."
        : "Se não foi você, troque a sua senha e reative a verificação em duas etapas imediatamente.",
    ]),
    rotulo: input.acao === "ativado" ? "segundo-fator-ativado" : "segundo-fator-desativado",
  };
}
