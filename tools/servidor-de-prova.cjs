// Sobe a API de desenvolvimento no banco de prova (decisao D6 do dono).
//
// O codigo e o mesmo `src/server.ts` de sempre; o que muda e o endereco do banco,
// injetado antes do dotenv — que nao sobrescreve o que ja existe no ambiente. Sem
// esta janela, as provas de navegador (tools/verify-*.cjs, tools/shoot-*.cjs)
// escreviam no banco de quem esta trabalhando, porque o servidor delas era o
// servidor do desenvolvimento.
//
// Uso: npm run dev:api:teste   (porta 3001, como esperam as ferramentas)
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const REPO = path.join(__dirname, "..");
const API = path.join(REPO, "apps", "api");
const NOME_DO_BANCO_DE_PROVA = "nexusbusinessmanager_teste";

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

const alvo = new URL(URL_PROVA);
console.log("[servidor de prova] API no banco " + NOME_DO_BANCO_DE_PROVA + " (" + alvo.hostname + ":" + (alvo.port || "3306") + ") — o banco de desenvolvimento fica de fora");

const filho = spawn(
  process.execPath,
  [path.join(REPO, "node_modules", "tsx", "dist", "cli.mjs"), "watch", "src/server.ts"],
  { cwd: API, stdio: "inherit", env: { ...process.env, DATABASE_URL: URL_PROVA } }
);
filho.on("exit", (codigo) => process.exit(codigo === null ? 1 : codigo));
process.on("SIGINT", () => filho.kill("SIGINT"));
process.on("SIGTERM", () => filho.kill("SIGTERM"));
