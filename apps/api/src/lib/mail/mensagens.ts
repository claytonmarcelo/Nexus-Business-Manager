import type { MensagemDeMail } from "./porta";

// As quatro mensagens que o produto sabe mandar. O texto é de produto, não de
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

/**
 * Escapa texto que vem de dado de usuário antes de entrar no HTML. A mensagem de
 * aviso (N59) carrega nome de produto, de cliente e de fornecedor digitados na
 * tela, e um `<` escrito por quem cadastra viraria markup na mensagem de outra
 * pessoa. Desde o N76 as outras três também passam por aqui: elas só interpolam o
 * primeiro nome de quem pediu, mas esse nome é digitado na tela — no cadastro pela
 * própria pessoa e na tela de equipe por quem cadastra um usuário — e o HTML é
 * lido fora do produto, no cliente de e-mail de quem abre a mensagem.
 */
function textoSeguro(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Valor de atributo de link (N76). Aqui não se usa entidade HTML como no texto:
 * dentro de `href` o que precisa sumir é a aspa, que fecharia o atributo e abriria
 * um atributo novo ao lado, e o `<`/`>`, que quebram o parser da mensagem. Os três
 * saem na codificação de URL, que é o que um endereço já deveria carregar — e um
 * endereço montado por `WEB_BASE_URL` + código, o caso de sempre, passa por aqui
 * byte por byte igual.
 */
function linkSeguro(valor: string): string {
  return valor
    .replace(/"/g, "%22")
    .replace(/</g, "%3C")
    .replace(/>/g, "%3E");
}

/**
 * As mensagens interpõem só o primeiro nome de quem pediu (recortado no espaço), e
 * é esse recorte que o N76 deixava cru. A função devolve o texto puro: o escape é
 * regra de HTML e acontece na hora de montar o HTML, não aqui, porque a versão
 * `text/plain` da mesma mensagem precisa continuar mostrando o nome como ele foi
 * digitado.
 */
function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] || "você";
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
  const saudacao = primeiroNome(input.nome);
  const texto = [
    "Olá, " + saudacao + ".",
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
      "Olá, " + textoSeguro(saudacao) + ".",
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
  const saudacao = primeiroNome(input.nome);
  const texto = [
    "Olá, " + saudacao + ".",
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
      "Olá, " + textoSeguro(saudacao) + ".",
      "Falta um passo para a sua conta do " + NOME_DO_PRODUTO + " entrar no painel.",
      '<a href="' + linkSeguro(input.link) + '">Confirmar o meu e-mail</a>',
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
  const saudacao = primeiroNome(input.nome);
  const verbo = input.acao === "ativado" ? "ativada" : "desativada";
  const texto = [
    "Olá, " + saudacao + ".",
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
      "Olá, " + textoSeguro(saudacao) + ".",
      "A verificação em duas etapas da sua conta do " + NOME_DO_PRODUTO + " foi " + verbo + " agora.",
      input.acao === "ativado"
        ? "Guarde os códigos de recuperação em um lugar fora do e-mail."
        : "Se não foi você, troque a sua senha e reative a verificação em duas etapas imediatamente.",
    ]),
    rotulo: input.acao === "ativado" ? "segundo-fator-ativado" : "segundo-fator-desativado",
  };
}

/**
 * Cópia por e-mail de um aviso do sino (N59, seção 44).
 *
 * A mensagem não inventa conteúdo: o assunto é exatamente o título gravado na
 * linha do sino, e o corpo é o corpo daquela linha — sino, tela e e-mail descrevem
 * o mesmo aviso com as mesmas palavras. É por isso também que o e-mail é cópia e
 * não canal próprio: quem desligou o sino não recebe mensagem, porque o aviso não
 * chega a nascer (a chave antiduplicação mora na linha do sino, e sem ela a
 * varredura de contas vencidas viraria spam diário).
 *
 * O `link` chega absoluto, montado pelo serviço com `WEB_BASE_URL`: dentro do
 * painel o clique é numa rota relativa, numa caixa de e-mail precisa do endereço
 * do produto — a mesma base do link de verificação de cadastro.
 */
export function avisoDeNotificacao(input: {
  para: string;
  nome: string;
  empresa: string;
  titulo: string;
  corpo?: string | null;
  link?: string | null;
}): MensagemDeMail {
  const saudacao = primeiroNome(input.nome);
  const corpo = input.corpo?.trim() || "";
  const link = input.link?.trim() || "";
  const texto = [
    "Olá, " + saudacao + ".",
    "",
    "Um aviso novo chegou para você na empresa " + input.empresa + " do " + NOME_DO_PRODUTO + ":",
    "",
    input.titulo,
    ...(corpo ? ["", corpo] : []),
    ...(link ? ["", "Abra o painel para ver: " + link] : []),
    "",
    "Você recebe esta mensagem porque ligou o canal de e-mail nas preferências de aviso desta empresa." +
      " Para parar de receber, desligue o canal na tela Notificações, na aba Preferências.",
  ].join("\n");

  const paragrafos = [
    "Olá, " + textoSeguro(saudacao) + ".",
    "Um aviso novo chegou para você na empresa <strong>" + textoSeguro(input.empresa) + "</strong> do " +
      NOME_DO_PRODUTO + ":",
    "<strong>" + textoSeguro(input.titulo) + "</strong>",
    ...(corpo ? [textoSeguro(corpo)] : []),
    ...(link ? ['<a href="' + linkSeguro(link) + '">Abrir o painel</a>'] : []),
    "Você recebe esta mensagem porque ligou o canal de e-mail nas preferências de aviso desta empresa. " +
      "Para parar de receber, desligue o canal na tela Notificações, na aba Preferências.",
  ];

  return {
    para: input.para,
    assunto: input.titulo,
    texto,
    // O mesmo escape do corpo vale para o título que vira cabeçalho: ele é a frase
    // do sino, e essa frase carrega nome de produto, de cliente e de fornecedor.
    html: html(textoSeguro(input.titulo), paragrafos),
    rotulo: "aviso-de-notificacao",
  };
}
