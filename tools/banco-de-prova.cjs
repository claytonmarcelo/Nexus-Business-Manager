// Banco de prova — a ponte entre as ferramentas de navegador e a decisão D6 do dono.
//
// O que ela garante, e o que nenhuma garantia antes garantia: `tools/verify-*.cjs`,
// `tools/shoot-*.cjs` e `tools/audit-*.cjs` escrevem dados pela API, e até aqui não
// havia nada que verificasse em qual banco aquela API estava. Se o servidor de
// desenvolvimento estivesse de pé, a prova escrevia no banco de quem está
// trabalhando — e a suíte de testes também. Medido nesta rodada, no banco de
// desenvolvimento: 45 empresas, 42 delas com o nome do padrão dos helpers de teste.
//
// A conferência é medida, não declarada. Ela faz duas coisas:
//
//   1. lê o `DATABASE_URL_TESTE` do `apps/api/.env` e exige o nome combinado
//      (`nexusbusinessmanager_teste`), diferente do banco de desenvolvimento;
//   2. entra na API que está respondendo com a conta de prova, pega o id que a API
//      devolveu e procura esse id dentro do banco de prova. Id de usuário é
//      aleatório: se o servidor estiver no banco de desenvolvimento, o id dele não
//      está no banco de prova, e a prova para antes de escrever no lugar errado.
//
// Nenhuma credencial é impressa: o que sai é o nome do banco, a porta e o motivo.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const NOME_DO_BANCO_DE_PROVA = "nexusbusinessmanager_teste";
const ARQUIVO_ENV = path.join(__dirname, "..", "apps", "api", ".env");
const ARQUIVO_CONTA = path.join(__dirname, "prova-admin.local.json");
const CONTA_DE_PROVA_PADRAO = "administrador@exemplo.test";

function valorDaChave(chave) {
  if (!fs.existsSync(ARQUIVO_ENV)) return "";
  const texto = fs.readFileSync(ARQUIVO_ENV, "utf8").replace(/\r\n/g, "\n");
  for (const linha of texto.split("\n")) {
    if (linha.trim().startsWith("#")) continue;
    const m = linha.match(new RegExp("^\\s*" + chave + "\\s*=\\s*(.+?)\\s*$"));
    if (m) return m[1].replace(/^["']|["']$/g, "").trim();
  }
  return "";
}

function nomeDoBanco(url) {
  try {
    return new URL(url).pathname.replace(/^\//, "");
  } catch {
    return "";
  }
}

// A URL do banco de prova, com as três recusas que a D6 pede: sem variável, com
// nome errado, ou apontando para o mesmo banco do desenvolvimento.
function urlDoBancoDeProva() {
  const url = process.env.DATABASE_URL_TESTE || valorDaChave("DATABASE_URL_TESTE");
  if (!url) {
    throw new Error(
      "[banco de prova] DATABASE_URL_TESTE não está no apps/api/.env — sem ela a prova se recusa a escrever, " +
        "porque o único banco que sobraria seria o de desenvolvimento (decisão D6 do dono, tarefa T1).",
    );
  }
  if (nomeDoBanco(url) !== NOME_DO_BANCO_DE_PROVA) {
    throw new Error(
      '[banco de prova] DATABASE_URL_TESTE aponta para "' + nomeDoBanco(url) + '", e o nome combinado é ' + NOME_DO_BANCO_DE_PROVA,
    );
  }
  if (nomeDoBanco(valorDaChave("DATABASE_URL")) === NOME_DO_BANCO_DE_PROVA) {
    throw new Error("[banco de prova] o DATABASE_URL do .env também aponta para o banco de prova: separar os dois é a condição da D6");
  }
  return url;
}

function clienteDoBancoDeProva() {
  return new PrismaClient({ datasources: { db: { url: urlDoBancoDeProva() } } });
}

// A conta de prova é fictícia e nasce com o banco: `npm run db:prova` cria o
// administrador de plataforma do banco de prova e grava a senha gerada neste
// arquivo local, ignorado pelo git. Domínio @exemplo.test, que a RFC 6761 reserva
// para teste — nenhuma prova usa o endereço de uma pessoa.
function contaDeProva() {
  const email = (process.env.NEXUS_PROVA_ADMIN_EMAIL || valorDaChave("NEXUS_PROVA_ADMIN_EMAIL") || "").trim().toLowerCase();
  const senha = process.env.NEXUS_PROVA_ADMIN_SENHA || "";
  if (email && senha) return { email, senha };
  if (!fs.existsSync(ARQUIVO_CONTA)) {
    throw new Error(
      "[banco de prova] a conta de prova não está nesta máquina: falta o arquivo " +
        path.relative(path.join(__dirname, ".."), ARQUIVO_CONTA) +
        " . Prepare o banco com `npm run db:prova` (decisão D6).",
    );
  }
  const lida = JSON.parse(fs.readFileSync(ARQUIVO_CONTA, "utf8"));
  return {
    email: (email || lida.email || CONTA_DE_PROVA_PADRAO).trim().toLowerCase(),
    senha: senha || lida.senha || "",
  };
}

// Aceita tanto a raiz ("http://localhost:3001") quanto a base com "/api", porque
// as ferramentas foram escritas nas duas formas.
function raizDaApi(api) {
  return String(api || "").replace(/\/api\/?$/, "").replace(/\/$/, "");
}

// A rota /auth/login tem limitador de 10 por minuto por endereço. Uma rodada de
// provas passa por muitas ferramentas, e cada uma delas conferindo o servidor
// pelo login consumiria a janela — por isso a conferência vale cinco minutos em
// disco, vira cache. O que fica guardado é o id conferido e o banco, nunca
// credencial, e uma nova rodada depois da janela mede de novo.
const ARQUIVO_CONFERENCIA = path.join(os.tmpdir(), "nexus-conferencia-prova.json");
const VALOR_DA_CONFERENCIA_MS = 5 * 60 * 1000;

function conferenciaRecente(raiz) {
  try {
    const lida = JSON.parse(fs.readFileSync(ARQUIVO_CONFERENCIA, "utf8"));
    if (lida && lida.raiz === raiz && Date.now() - lida.quando < VALOR_DA_CONFERENCIA_MS) return lida;
  } catch {
    // sem arquivo ou arquivo quebrado é o mesmo caso: medir de novo.
  }
  return null;
}

// Confere o servidor que está respondendo na API e devolve o id de quem logou.
// `quem` é opcional: sem ele a conferência usa a conta de prova.
async function conferirServidorDeProva(api, quem) {
  const url = urlDoBancoDeProva();
  const conta = quem || contaDeProva();
  const raiz = raizDaApi(api || (require("./pilha-de-prova.cjs").raizDaApi()) + "/api");
  if (!conta.email || !conta.senha) {
    throw new Error("[banco de prova] falta e-mail ou senha da conta de prova — rode `npm run db:prova`");
  }
  const emCache = conta.id ? null : conferenciaRecente(raiz);
  if (emCache) {
    console.log("[banco de prova] servidor conferido há " + Math.round((Date.now() - emCache.quando) / 1000) + "s — a API de " + raiz + " responde pelo banco " + NOME_DO_BANCO_DE_PROVA);
    return emCache.usuarioId;
  }
  let usuarioId = conta.id || null;
  if (!usuarioId) {
    let resposta;
    try {
      resposta = await fetch(raiz + "/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: conta.email, password: conta.senha }),
      });
    } catch (e) {
      throw new Error(
        "[banco de prova] a API de " + raiz + " não respondeu (" + String((e && e.message) || e).split("\n")[0] +
          ") — suba o servidor de prova com `npm run dev:api:teste`.",
      );
    }
    if (!resposta.ok) {
      throw new Error(
        "[banco de prova] quem logou em " + raiz + " não é conhecido pela API (HTTP " + resposta.status +
          "). Se a conta de prova existe no banco de prova e mesmo assim o login falha, o servidor está no " +
          "banco de desenvolvimento — suba a API com `npm run dev:api:teste` e prepare o banco com `npm run db:prova`.",
      );
    }
    const corpo = await resposta.json();
    usuarioId = corpo.user && corpo.user.id;
    if (!usuarioId) throw new Error("[banco de prova] a resposta de login não trouxe o id de quem logou");
  }
  const cliente = new PrismaClient({ datasources: { db: { url } } });
  try {
    const encontrado = await cliente.user.findUnique({ where: { id: usuarioId }, select: { id: true } });
    if (!encontrado) {
      throw new Error(
        "[banco de prova] o id que a API de " + raiz + " devolveu no login não existe em " + NOME_DO_BANCO_DE_PROVA +
          ". O servidor está escrevendo em outro banco — suba a API com `npm run dev:api:teste` " +
          "e prepare o banco com `npm run db:prova`.",
      );
    }
    console.log("[banco de prova] servidor conferido — a API de " + raiz + " responde pelo banco " + NOME_DO_BANCO_DE_PROVA);
    try {
      fs.writeFileSync(
        ARQUIVO_CONFERENCIA,
        JSON.stringify({ raiz, usuarioId, banco: NOME_DO_BANCO_DE_PROVA, quando: Date.now() }, null, 2) + "\n",
        { encoding: "utf8" }
      );
    } catch {
      // a conferência já aconteceu; guardar o resultado é só a economia da próxima.
    }
  } finally {
    await cliente.$disconnect();
  }
  return usuarioId;
}

module.exports = {
  NOME_DO_BANCO_DE_PROVA,
  urlDoBancoDeProva,
  clienteDoBancoDeProva,
  contaDeProva,
  raizDaApi,
  conferirServidorDeProva,
};
