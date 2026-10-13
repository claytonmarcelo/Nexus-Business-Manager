// Conta ficticia de captura.
//
// E ela que aparece nas telas de prova que mostram credencial ou identidade:
// login, cadastro, recuperacao, Usuarios, "Minha conta" e "Empresas da sua
// conta". A conta real do administrador da plataforma nunca e digitada nem
// fotografada — o que se ve no repositorio sao dados de demonstracao.
//
// Nenhum literal de credencial mora no repositorio:
//   e-mail -> NEXUS_CAPTURA_EMAIL (padrao "demo@exemplo.test", dominio que a
//              RFC 6761 reserva para teste, nao pertence a ninguem);
//   nome   -> NEXUS_CAPTURA_NOME (padrao "Demonstracao Ficticia");
//   senha  -> NEXUS_CAPTURA_SENHA; sem a variavel, uma senha de 24 caracteres
//              aleatorios e criada na primeira execucao e guardada em
//              tools/conta-de-captura.local.json, arquivo ignorado pelo git.
//
// A conta nasce pelo fluxo publico de cadastro (POST /auth/register), que da a
// ela uma empresa propria vazia. Assim as telas saem com o que a propria conta
// cadastrou, e a casa de demonstracao do administrador fica intacta.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { conferirServidorDeProva } = require("./banco-de-prova.cjs");

const API = (process.env.NEXUS_API || "http://localhost:3001") + "/api";
const ARQUIVO_LOCAL = path.join(__dirname, "conta-de-captura.local.json");

const EMAIL_PADRAO = "demo@exemplo.test";
const NOME_PADRAO = "Demonstracao Ficticia";
const TAMANHO_DA_SENHA = 24;

function emailDaCaptura() {
  return (process.env.NEXUS_CAPTURA_EMAIL || EMAIL_PADRAO).trim().toLowerCase();
}

function nomeDaCaptura() {
  return (process.env.NEXUS_CAPTURA_NOME || NOME_PADRAO).trim();
}

// Maiuscula e caractere especial garantidos, como pede a regra de acesso.
function gerarSenha() {
  const MAIUSCULAS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const MINUSCULAS = "abcdefghijkmnopqrstuvwxyz";
  const NUMEROS = "23456789";
  const ESPECIAIS = "!@#$%^&*_-+=?";
  const pecas = [
    MAIUSCULAS[crypto.randomInt(MAIUSCULAS.length)],
    ESPECIAIS[crypto.randomInt(ESPECIAIS.length)],
  ];
  const baralho = MAIUSCULAS + MINUSCULAS + NUMEROS + ESPECIAIS;
  while (pecas.length < TAMANHO_DA_SENHA) {
    pecas.push(baralho[crypto.randomInt(baralho.length)]);
  }
  // Embaralha (Fisher-Yates) para a maiuscula e o especial nao ficarem no comeco.
  for (let i = pecas.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [pecas[i], pecas[j]] = [pecas[j], pecas[i]];
  }
  return pecas.join("");
}

function leLocal() {
  if (!fs.existsSync(ARQUIVO_LOCAL)) return {};
  try {
    const dado = JSON.parse(fs.readFileSync(ARQUIVO_LOCAL, "utf8"));
    return dado && typeof dado === "object" ? dado : {};
  } catch {
    return {};
  }
}

// A senha fica guardada por e-mail: trocar NEXUS_CAPTURA_EMAIL cria outra conta
// de captura sem perder a senha da primeira.
function senhaDaCaptura() {
  if (process.env.NEXUS_CAPTURA_SENHA) return process.env.NEXUS_CAPTURA_SENHA;
  const email = emailDaCaptura();
  const guardadas = leLocal();
  const conta = guardadas[email];
  if (conta && conta.senha) return conta.senha;
  const nova = gerarSenha();
  guardadas[email] = { senha: nova, criadaEm: new Date().toISOString() };
  fs.writeFileSync(ARQUIVO_LOCAL, JSON.stringify(guardadas, null, 2) + "\n", "utf8");
  return nova;
}

function contaDeCaptura() {
  return { email: emailDaCaptura(), nome: nomeDaCaptura(), senha: senhaDaCaptura() };
}

async function chame(metodo, caminho, corpo) {
  const resposta = await fetch(API + caminho, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  const texto = await resposta.text();
  let dados;
  try {
    dados = JSON.parse(texto);
  } catch {
    dados = { texto };
  }
  return { status: resposta.status, dados };
}

// Sessao da conta de captura: entra se ela ja existe, cadastra se ainda nao.
// Devolve os tokens para quem quiser montar o navegador sem digitar nada.
//
// O cadastro e uma escrita: a conta nasce no banco que a API estiver usando. Por
// isso a conferencia da decisao D6 (tarefa T1) vem antes dela — sem o servidor de
// prova confirmado, a conta de captura sairia no banco de desenvolvimento.
async function sessaoDaCaptura() {
  await conferirServidorDeProva(API);
  const { email, nome, senha } = contaDeCaptura();
  const entrada = await chame("POST", "/auth/login", { email, password: senha });
  if (entrada.status === 200) return { email, nome, senha, tokens: entrada.dados };

  const cadastro = await chame("POST", "/auth/register", { name: nome, email, password: senha });
  if (cadastro.status === 201 || cadastro.status === 200) {
    console.log("  [captura] conta ficticia cadastrada pelo fluxo publico: " + email);
    return { email, nome, senha, tokens: cadastro.dados };
  }
  if (cadastro.status === 409) {
    throw new Error(
      "[captura] o e-mail " + email + " ja existe, mas a senha guardada nao confere. " +
        "Exporte NEXUS_CAPTURA_SENHA com a senha real da conta ou apague " +
        "tools/conta-de-captura.local.json e o usuario no banco para ela ser recriada.",
    );
  }
  throw new Error(
    "[captura] nao deu para abrir a sessao ficticia (" + cadastro.status + "): " +
      JSON.stringify(cadastro.dados).slice(0, 200),
  );
}

module.exports = {
  contaDeCaptura,
  sessaoDaCaptura,
  emailDaCaptura,
  nomeDaCaptura,
  senhaDaCaptura,
  ARQUIVO_LOCAL,
};
