// Sobe a PILHA DE PROVA: a API apontada no banco de prova (decisao D6 do dono) e o
// Vite que fala com ela, nas portas 3002 e 5174.
//
// Por que nao na 3001/5173 de sempre: porque essa e a porta de quem trabalha. Medido
// duas vezes nesta rodada (achado N65, docs/AUDITORIA.md): com o servidor de prova
// na 3001, o navegador real (5173) mandava o /api para o banco de prova, a conta de
// administracao daquela maquina nao existe la, e o login devolvia 401 sem nenhuma
// pista na tela. A regra que ficou e esta: a pilha de prova nunca pega a porta do dono.
//
// O endereco que as ferramentas de navegador devem usar vai sendo publicado em
// tools/ponteiro-de-prova.local.json (arquivo local, ignorado pelo git) enquanto esta
// janela estiver de pe; tools/pilha-de-prova.cjs le esse ponteiro e o desconsidera se
// o processo que o escreveu nao estiver mais aqui. Sem esta janela, as ferramentas
// voltam sozinhas para 5173/3001, que e o produto de verdade.
//
// Uso: npm run dev:prova   (ou npm run dev:api:teste, o nome antigo, da D6)
const fs = require("fs");
const net = require("net");
const path = require("path");
const { spawn } = require("child_process");
// Esta janela e quem publica o ponteiro, entao a linha de topologia que o helper imprime
// ao nascer diria o contrario do que esta prestes a acontecer: ela e desligada aqui e o
// que este arquivo imprime e o proprio anuncio das portas da prova, logo abaixo.
process.env.NEXUS_QUIETO = "1";
const { CASA, PROVA, ARQUIVO_PONTEIRO } = require("./pilha-de-prova.cjs");

const REPO = path.join(__dirname, "..");
const API = path.join(REPO, "apps", "api");
const WEB = path.join(REPO, "apps", "web");
const NOME_DO_BANCO_DE_PROVA = "nexusbusinessmanager_teste";
const PORTA_API = Number(new URL(PROVA.api).port || "3002");
const PORTA_WEB = Number(new URL(PROVA.web).port || "5174");

function valorDaChave(chave) {
  const arquivo = path.join(API, ".env");
  if (!fs.existsSync(arquivo)) return "";
  const texto = fs.readFileSync(arquivo, "utf8").replace(/\r\n/g, "\n");
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

const URL_PROVA = (process.env.DATABASE_URL_TESTE || valorDaChave("DATABASE_URL_TESTE")).trim();
if (!URL_PROVA) {
  console.error("[servidor de prova] DATABASE_URL_TESTE nao esta no apps/api/.env — rode `npm run db:prova` depois de declarar a variavel");
  process.exit(1);
}
if (nomeDoBanco(URL_PROVA) !== NOME_DO_BANCO_DE_PROVA) {
  console.error('[servidor de prova] DATABASE_URL_TESTE aponta para "' + nomeDoBanco(URL_PROVA) + '", nome combinado e ' + NOME_DO_BANCO_DE_PROVA);
  process.exit(1);
}
if (nomeDoBanco(valorDaChave("DATABASE_URL")) === NOME_DO_BANCO_DE_PROVA) {
  console.error("[servidor de prova] o DATABASE_URL do .env ja e o banco de prova: desenvolvimento e prova nao podem ser o mesmo banco");
  process.exit(1);
}

function binario(pacote, entrada) {
  const candidatos = [
    path.join(REPO, "node_modules", pacote, entrada),
    path.join(API, "node_modules", pacote, entrada),
    path.join(WEB, "node_modules", pacote, entrada),
  ];
  const achado = candidatos.find((c) => fs.existsSync(c));
  if (!achado) {
    console.error("[servidor de prova] binario " + pacote + " nao encontrado. Rode `npm install` na raiz antes.");
    process.exit(2);
  }
  return achado;
}

// Porta livre e conferida antes de subir qualquer coisa: ponteiro apontando para uma
// pilha que nao existe, ou um Vite que subiu em 5175 porque a 5174 estava ocupada, sao
// as duas maneiras de a prova escrever no lugar errado de novo.
function portaOcupada(porta) {
  return new Promise((resolve) => {
    const teste = net.connect({ host: "127.0.0.1", port: porta });
    const termina = (livre) => {
      teste.destroy();
      resolve(livre);
    };
    teste.setTimeout(800);
    teste.once("connect", () => termina(false));
    teste.once("timeout", () => termina(true));
    teste.once("error", () => termina(true));
  });
}

let fechando = false;
const filhos = [];

function apagaPonteiro() {
  try {
    const lido = JSON.parse(fs.readFileSync(ARQUIVO_PONTEIRO, "utf8"));
    // So apaga o ponteiro desta janela: se houver outro (outro processo), nao e nosso.
    if (lido && lido.pid === process.pid) fs.unlinkSync(ARQUIVO_PONTEIRO);
  } catch {
    // sem ponteiro nosso e o estado esperado de saida.
  }
}

function derruba(codigo) {
  if (fechando) return;
  fechando = true;
  apagaPonteiro();
  for (const f of filhos) {
    try {
      f.proc.kill("SIGINT");
    } catch {
      // processo ja se foi; nao ha o que limpar.
    }
  }
  setTimeout(() => {
    for (const f of filhos) {
      if (f.proc.exitCode === null && !f.proc.killed) {
        try {
          f.proc.kill();
        } catch {
          // ja era.
        }
      }
    }
    process.exit(codigo);
  }, 1200).unref();
}

(async () => {
  const apiLivre = await portaOcupada(PORTA_API);
  const webLivre = await portaOcupada(PORTA_WEB);
  if (!apiLivre || !webLivre) {
    const ocupadas = [!apiLivre ? String(PORTA_API) : null, !webLivre ? String(PORTA_WEB) : null].filter(Boolean).join(" e ");
    console.error(
      "[servidor de prova] a pilha de prova precisa das portas " + PORTA_API + " (api) e " + PORTA_WEB +
        " (navegador) livres, e " + ocupadas + " esta(o) ocupada(s). " +
        "Veja quem segura com `netstat -ano | findstr :" + ocupadas.split(" e ")[0] +
        "`. As portas do produto (" + new URL(CASA.api).port + "/" + new URL(CASA.web).port + ") nao sao tocadas por esta janela.",
    );
    process.exit(1);
  }

  const alvo = new URL(URL_PROVA);
  console.log("[servidor de prova] api na " + PORTA_API + " e navegador de prova na " + PORTA_WEB + ", banco " + NOME_DO_BANCO_DE_PROVA + " (" + alvo.hostname + ":" + (alvo.port || "3306") + ")");
  console.log(
    "[servidor de prova] as portas de quem trabalha seguem intactas: api " + new URL(CASA.api).port +
      " e painel " + new URL(CASA.web).port + " continuam sendo do banco de desenvolvimento desta maquina.",
  );

  const LADOS = [
    {
      nome: "api",
      endereco: PROVA.api,
      cwd: API,
      argv: [binario("tsx", path.join("dist", "cli.mjs")), "watch", "src/server.ts"],
      env: { DATABASE_URL: URL_PROVA, PORT: String(PORTA_API) },
    },
    {
      nome: "web",
      endereco: PROVA.web,
      cwd: WEB,
      argv: [binario("vite", path.join("bin", "vite.js"))],
      env: { NEXUS_WEB_PORT: String(PORTA_WEB), NEXUS_PROXY_TARGET: PROVA.api },
    },
  ];

  for (const lado of LADOS) {
    const proc = spawn(process.execPath, lado.argv, {
      cwd: lado.cwd,
      stdio: ["inherit", "pipe", "pipe"],
      env: { ...process.env, ...lado.env },
    });
    const prefixo = "[" + lado.nome + "] ";
    const grava = (fluxo) => (pedaco) => {
      const texto = pedaco.toString();
      for (const linha of texto.replace(/\r/g, "").split("\n")) {
        if (linha.trim()) process[fluxo].write(prefixo + linha + "\n");
      }
    };
    proc.stdout.on("data", grava("stdout"));
    proc.stderr.on("data", grava("stderr"));
    proc.on("exit", (codigo) => {
      console.log(prefixo + "parou (codigo " + codigo + ")");
      derruba(codigo === 0 ? 0 : 1);
    });
    filhos.push({ proc, lado });
  }

  // O ponteiro e escrito depois de lancar os dois lados: janela que nem chegou a subir
  // nao pode deixar endereco no disco. A vida util dele e o pid desta janela.
  fs.writeFileSync(
    ARQUIVO_PONTEIRO,
    JSON.stringify({ web: PROVA.web, api: PROVA.api, pid: process.pid, banco: NOME_DO_BANCO_DE_PROVA, quando: Date.now() }, null, 2) + "\n",
    { encoding: "utf8" }
  );
  console.log("[servidor de prova] ponteiro publicado em tools/ponteiro-de-prova.local.json — as provas de navegador passam a falar com " + PROVA.web);
  console.log("[servidor de prova] para rodar uma prova: node tools/verify-<algo>.cjs (ela mesma diz em qual banco esta); para voltar ao produto: Ctrl+C aqui, e o `npm run dev` continua onde sempre esteve.");

  for (const sinal of ["SIGINT", "SIGTERM"]) {
    process.on(sinal, () => {
      console.log("\n" + sinal + " recebido: derrubando api e web de prova, apagando o ponteiro");
      derruba(0);
    });
  }
  process.on("exit", apagaPonteiro);
})();
