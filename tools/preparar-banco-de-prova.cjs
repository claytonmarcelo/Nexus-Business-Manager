// Prepara o banco de prova separado (decisao D6 do dono, tarefa T1).
//
// O que esta ferramenta garante, e o que nenhuma garantia antes: a suíte de testes
// e as provas de navegador escrevem num banco proprio, `nexusbusinessmanager_teste`,
// e o banco do servidor de desenvolvimento passa a ser escrito só por quem sobe o
// servidor. Sem isso, cada `npm test` de 317 segundos deixava empresa e usuario no
// banco de quem esta trabalhando — foi assim que o banco de desenvolvimento chegou
// a 45 empresas, 43 delas criadas pela propria suíte.
//
// Passos, tudo lido do apps/api/.env da maquina (nenhuma credencial e impressa
// aqui; o endereco sai do arquivo e para ele volta):
//   1. DATABASE_URL_TESTE precisa existir, ter o nome combinado e nao pode ser o
//      banco de desenvolvimento;
//   2. o banco e criado se nao existir (cliente mysql do WAMP, ou o caminho em
//      NEXUS_MYSQL_BIN; em CI o servico do MySQL ja cria o banco);
//   3. `prisma migrate deploy` aplica a cadeia versionada. Desde a C1 (2026-10-15) o
//      baseline N54 esta fechado e o caminho e unico: se o deploy falhar, a ferramenta
//      sai com codigo 1 sem tentar alternativa (docs/adr/0024-baseline-de-migrations.md);
//   4. sem `--sem-semente`, o seed sobe com SEED_DEV_ACCOUNT=1 e
//      SEED_DEMO_COMPANY=1: a conta de desenvolvimento e a casa de demonstracao
//      fixa que as capturas mostram, com administrador de plataforma de endereco
//      ficticio (NEXUS_PROVA_ADMIN_EMAIL, padrao `administrador@exemplo.test`,
//      dominio que a RFC 6761 reserva para teste) — o endereco real do dono nao
//      entra num banco de prova;
//   5. a senha desse administrador de prova e gerada aqui (ou vem de
//      NEXUS_PROVA_ADMIN_SENHA), aplicada direto no banco de prova e gravada em
//      `tools/prova-admin.local.json`, arquivo local ignorado pelo git. E essa
//      conta que as ferramentas de navegador usam: `tools/senha-admin.cjs` a
//      resolve antes da conta de desenvolvimento, e `tools/banco-de-prova.cjs`
//      confere pelo id que a API devolve se o servidor responde mesmo pelo banco
//      de prova. Nenhuma senha e impressa nestas ferramentas.
//
// Uso: npm run db:prova        (ou: node tools/preparar-banco-de-prova.cjs --sem-semente)
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");
const path = require("path");
const { spawnSync } = require("child_process");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const REPO = path.join(__dirname, "..");
const API = path.join(REPO, "apps", "api");
const NOME_DO_BANCO_DE_PROVA = "nexusbusinessmanager_teste";
const ADMIN_DE_PROVA_PADRAO = "administrador@exemplo.test";
const ARQUIVO_CONTA_DE_PROVA = path.join(__dirname, "prova-admin.local.json");
const MYSQL_PADRAO = "C:/wamp64/bin/mysql/mysql8.4.7/bin/mysql.exe";

function linhasDoEnv() {
  const arquivo = path.join(API, ".env");
  if (!fs.existsSync(arquivo)) return [];
  return fs.readFileSync(arquivo, "utf8").replace(/\r\n/g, "\n").split("\n");
}

function valorDaChave(chave) {
  for (const linha of linhasDoEnv()) {
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

function falhar(mensagem) {
  console.error("[banco de prova] " + mensagem);
  process.exit(1);
}

const URL_DESENVOLVIMENTO = valorDaChave("DATABASE_URL");
const URL_PROVA = valorDaChave("DATABASE_URL_TESTE");
if (!URL_DESENVOLVIMENTO) falhar("DATABASE_URL nao esta no apps/api/.env");
if (!URL_PROVA) {
  falhar("DATABASE_URL_TESTE nao esta no apps/api/.env — copie a linha do .env.example e aponte para o banco de prova");
}
if (nomeDoBanco(URL_PROVA) !== NOME_DO_BANCO_DE_PROVA) {
  falhar(`DATABASE_URL_TESTE aponta para "${nomeDoBanco(URL_PROVA)}", e o nome combinado e ${NOME_DO_BANCO_DE_PROVA}`);
}
if (nomeDoBanco(URL_PROVA) === nomeDoBanco(URL_DESENVOLVIMENTO)) {
  falhar("o banco de prova e o mesmo banco de desenvolvimento — separar os dois e a condicao desta ferramenta");
}

const alvo = new URL(URL_PROVA);
const EMAIL_ADMIN_DE_PROVA = (process.env.NEXUS_PROVA_ADMIN_EMAIL || valorDaChave("NEXUS_PROVA_ADMIN_EMAIL") || ADMIN_DE_PROVA_PADRAO)
  .trim()
  .toLowerCase();

// A senha da conta de prova: vem declarada, ou é gerada aqui. O política de senha
// do produto (8+, maiúscula, caractere especial) vale também para ela, porque a
// conta entra pela API real.
function senhaDeProva() {
  const declarada = (process.env.NEXUS_PROVA_ADMIN_SENHA || "").trim();
  if (declarada) return declarada;
  if (fs.existsSync(ARQUIVO_CONTA_DE_PROVA)) {
    try {
      const lida = JSON.parse(fs.readFileSync(ARQUIVO_CONTA_DE_PROVA, "utf8"));
      if (lida && lida.senha) return lida.senha;
    } catch {
      // arquivo ilegível é o mesmo caso de uma conta sem senha: gerar de novo.
    }
  }
  return "Prova-" + crypto.randomBytes(9).toString("hex") + "!";
}

const SENHA_ADMIN_DE_PROVA = senhaDeProva();

console.log("[banco de prova] alvo: " + alvo.hostname + ":" + (alvo.port || "3306") + "/" + NOME_DO_BANCO_DE_PROVA + " | usuario: " + alvo.username);

function clienteDoBancoDeProva() {
  return new PrismaClient({ datasources: { db: { url: URL_PROVA } } });
}

function executarPrisma(args, ambienteExtra) {
  const r = spawnSync(process.execPath, [path.join(REPO, "node_modules", "prisma", "build", "index.js"), ...args], {
    cwd: API,
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: URL_PROVA, ...ambienteExtra },
    maxBuffer: 1024 * 1024 * 64,
  });
  return { status: r.status, saida: (r.stdout || "") + (r.stderr || "") };
}

function executarTsx(ambienteExtra) {
  const r = spawnSync(
    process.execPath,
    [path.join(REPO, "node_modules", "tsx", "dist", "cli.mjs"), path.join("prisma", "seed.ts")],
    {
      cwd: API,
      encoding: "utf8",
      env: { ...process.env, DATABASE_URL: URL_PROVA, ...ambienteExtra },
      maxBuffer: 1024 * 1024 * 64,
    }
  );
  return { status: r.status, saida: (r.stdout || "") + (r.stderr || "") };
}

const arquivoDeOpcoes = path.join(os.tmpdir(), "nexus-prova-my-" + process.pid + ".cnf");
function escreverArquivoDeOpcoes() {
  fs.writeFileSync(
    arquivoDeOpcoes,
    "[client]\nhost=" + alvo.hostname + "\nport=" + (alvo.port || "3306") + "\nuser=" + alvo.username +
      "\npassword=" + decodeURIComponent(alvo.password) + "\n",
    { encoding: "utf8" }
  );
}

function caminhoDoMysql() {
  const binario = process.env.NEXUS_MYSQL_BIN || MYSQL_PADRAO;
  if (!fs.existsSync(binario)) {
    falhar("o cliente mysql nao foi encontrado em " + binario + " — aponte NEXUS_MYSQL_BIN ou crie o banco " + NOME_DO_BANCO_DE_PROVA + " a mao");
  }
  return binario;
}

async function responder() {
  const c = clienteDoBancoDeProva();
  try {
    await c.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  } finally {
    await c.$disconnect().catch(() => {});
  }
}

// O banco de prova esta vazio de verdade? Só as tabelas de controle e nenhuma
// linha de conta ou casa: descarte seguro. Com linha dentro, nao se descarta sem
// a pessoa pedir com --recriar.
async function estarVazio() {
  const c = clienteDoBancoDeProva();
  try {
    const tabelas = await c.$queryRaw`SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = ${NOME_DO_BANCO_DE_PROVA} AND table_name <> '_prisma_migrations'`;
    const total = Number(tabelas[0].c);
    if (total === 0) return true;
    const [usuarios, empresas] = await Promise.all([c.user.count().catch(() => 0), c.company.count().catch(() => 0)]);
    return usuarios === 0 && empresas === 0;
  } finally {
    await c.$disconnect().catch(() => {});
  }
}

(async () => {
  escreverArquivoDeOpcoes();
  try {
    // 2. existe?
    if (await responder()) {
      console.log("[banco de prova] o banco ja existe");
    } else {
      const binario = caminhoDoMysql();
      const criado = spawnSync(
        binario,
        ["--defaults-file=" + arquivoDeOpcoes, "-e", "CREATE DATABASE IF NOT EXISTS `" + NOME_DO_BANCO_DE_PROVA + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci"],
        { encoding: "utf8" }
      );
      if (criado.status !== 0) falhar("CREATE DATABASE falhou: " + String(criado.stderr || "").split("\n")[0]);
      console.log("[banco de prova] banco criado");
      if (!(await responder())) falhar("o banco foi criado mas nao responde");
    }

    // 3. estrutura pela cadeia versionada — caminho único desde a C1 (baseline N54 fechado).
    const deploy = executarPrisma(["migrate", "deploy"]);
    if (deploy.status === 0) {
      const nadaPendente = deploy.saida.includes("No pending migrations to apply");
      const aplicadas = (deploy.saida.match(/Applying migration/gi) || []).length;
      console.log("[banco de prova] migrate deploy: " + (nadaPendente ? "nenhuma migracao pendente" : aplicadas + " aplicada(s)"));
    } else {
      falhar(
        "migrate deploy falhou no banco de prova: " +
          deploy.saida.split("\n").filter((l) => /error|fail|duplicate/i.test(l))[0]
      );
    }

    // 4. semente com a casa de demonstracao fixa.
    if (!process.argv.includes("--sem-semente")) {
      const semente = executarTsx({
        SEED_DEV_ACCOUNT: "1",
        SEED_DEMO_COMPANY: "1",
        SUPER_ADMIN_EMAIL: EMAIL_ADMIN_DE_PROVA,
        SEED_ADMIN_PASSWORD: SENHA_ADMIN_DE_PROVA,
      });
      if (semente.status !== 0) falhar("a semente falhou: " + semente.saida.split("\n").slice(-4).join(" / "));
      console.log("[banco de prova] semente aplicada — conta de desenvolvimento, casa nexus-demo e administrador de plataforma " + EMAIL_ADMIN_DE_PROVA);
    }

    // 5. a conta de prova, escrita direto no banco de prova. O seed faz um `upsert`
    // que nao toca na senha de quem ja existe, entao aplicar o hash aqui e o que
    // deixa o arquivo local e o banco sempre dizendo a mesma senha — inclusive
    // quando a semente foi pedida com --sem-semente.
    if (!process.argv.includes("--sem-conta-de-prova")) {
      const dono = clienteDoBancoDeProva();
      try {
        const passwordHash = await bcrypt.hash(SENHA_ADMIN_DE_PROVA, 12);
        const existente = await dono.user.findUnique({ where: { email: EMAIL_ADMIN_DE_PROVA }, select: { id: true } });
        if (existente) {
          await dono.user.update({ where: { id: existente.id }, data: { passwordHash, platformRole: "SUPER_ADMIN" } });
        } else {
          await dono.user.create({
            data: { email: EMAIL_ADMIN_DE_PROVA, name: "Administrador Nexus", passwordHash, platformRole: "SUPER_ADMIN" },
          });
        }
        fs.writeFileSync(
          ARQUIVO_CONTA_DE_PROVA,
          JSON.stringify({ email: EMAIL_ADMIN_DE_PROVA, senha: SENHA_ADMIN_DE_PROVA }, null, 2) + "\n",
          { encoding: "utf8" }
        );
        console.log(
          "[banco de prova] conta de prova aplicada e gravada em tools/" + path.basename(ARQUIVO_CONTA_DE_PROVA) +
            " (arquivo local, ignorado pelo git; nenhuma senha e impressa aqui)"
        );
      } finally {
        await dono.$disconnect();
      }
    }

    const conferido = clienteDoBancoDeProva();
    try {
      const tabelas = await conferido.$queryRaw`SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = ${NOME_DO_BANCO_DE_PROVA}`;
      const [empresas, usuarios, vinculos, casas] = await Promise.all([
        conferido.company.count(),
        conferido.user.count(),
        conferido.companyUser.count(),
        conferido.company.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
      ]);
      console.log(
        "[banco de prova] pronto — " + Number(tabelas[0].c) + " tabelas, " + usuarios + " usuarios, " +
          empresas + " empresas, " + vinculos + " vinculos"
      );
      console.log("[banco de prova] casas: " + casas.map((c) => c.name).join(", "));
    } finally {
      await conferido.$disconnect();
    }
  } finally {
    fs.rmSync(arquivoDeOpcoes, { force: true });
  }
})().catch((e) => falhar(String((e && e.message) || e).split("\n")[0]));
