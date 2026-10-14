// F6 (T5.2) — a restauração do dump feito por `deploy/backup-mysql.cjs`, com as guardas que impedem um
// comando distraído de apagar uma instalação.
//
// A regra que manda neste arquivo: restaurar é a única operação do ciclo de backup que destrói dado. Por
// isso toda proteção abaixo acontece **antes** de a primeira linha do dump tocar no servidor, e cada recusa
// sai com código 1 e uma frase que diz o motivo:
//
//  1. o arquivo precisa existir e o `.sha256` que a ferramenta de backup escreveu precisa conferir;
//  2. o banco de destino não pode ser um schema reservado do servidor (`mysql`, `information_schema`,
//     `performance_schema`, `sys`) nem um nome que não caia em `[A-Za-z0-9_]+`;
//  3. se o destino já tem tabela, a recusa vem antes do despejo — só `--aceito-sobrepor` passa por cima,
//     e é uma flag que um script de rotina nenhuma vai usar por engano;
//  4. o `mysql` roda dentro do container do MySQL da pilha e lê a senha do ambiente da própria imagem.
//     Nenhum valor de segredo aparece em linha de comando, em log ou neste arquivo.
//
// O dump é lido sem `CREATE DATABASE` nem `USE` (é como o backup o escreve), então o destino é decidido
// aqui, e é por isso que a prova de restauração consegue despejar o mesmo arquivo num banco de outro nome.

const { spawn, spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const RAIZ = path.resolve(__dirname, "..");
const RESERVADOS = ["mysql", "information_schema", "performance_schema", "sys"];

function falhar(mensagem) {
  console.error("[restaurar] " + mensagem);
  process.exit(1);
}

function rodaDocker(args, opc) {
  return spawnSync("docker", args, Object.assign({ cwd: RAIZ, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }, opc || {}));
}

function leSQL(texto) {
  const r = rodaDocker(["compose", "exec", "-T", "mysql", "sh", "-c", 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -u root -N'], { input: texto });
  if (r.status !== 0) throw new Error("mysql dentro do container respondeu " + r.status + ": " + String(r.stderr || "").split(/\r?\n/).filter(Boolean)[0]);
  return String(r.stdout || "");
}

function argumentos(argv) {
  const out = { arquivo: "", banco: "", criar: false, sobrepor: false, simulacao: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--arquivo") out.arquivo = path.resolve(argv[++i] || "");
    else if (a === "--banco") out.banco = String(argv[++i] || "");
    else if (a === "--criar") out.criar = true;
    else if (a === "--aceito-sobrepor") out.sobrepor = true;
    else if (a === "--simulacao" || a === "--seco") out.simulacao = true;
    else if (a === "--ajuda" || a === "-h") out.ajuda = true;
    else falhar("argumento nao reconhecido: " + a + " — use --arquivo, --banco, --criar, --aceito-sobrepor ou --simulacao");
  }
  return out;
}

function ajuda() {
  console.log(
    [
      "node deploy/restaurar-mysql.cjs --arquivo <pasta>/nexus-mysql--AAAA-MM-DD--HHMMSS.sql.gz [--banco <nome>] [--criar] [--aceito-sobrepor]",
      "",
      "Confere o .sha256 que o backup escreveu, recusa schema reservado do MySQL e recusa banco de destino",
      "que ja tem tabela (sem --aceito-sobrepor). Sem --banco, restaura no banco registrado no .meta.json",
      "do proprio dump. O mysql roda dentro do container da pilha; nenhuma senha aparece aqui.",
    ].join("\n")
  );
}

function despejaNoContainer(banco, arquivo) {
  return new Promise((resolve, reject) => {
    const dentro =
      'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -h 127.0.0.1 -u root --default-character-set=utf8mb4 ' + banco;
    const filho = spawn("docker", ["compose", "exec", "-T", "mysql", "sh", "-c", dentro], { cwd: RAIZ, stdio: ["pipe", "pipe", "pipe"] });
    let erro = "";
    let stdout = "";
    filho.stderr.on("data", (b) => {
      erro += b.toString("utf8");
      if (erro.length > 8000) erro = erro.slice(0, 8000);
    });
    filho.stdout.on("data", (b) => {
      stdout += b.toString("utf8");
      if (stdout.length > 8000) stdout = stdout.slice(0, 8000);
    });
    filho.on("error", reject);
    const origem = fs.createReadStream(arquivo);
    const gunzip = zlib.createGunzip();
    origem.on("error", reject);
    gunzip.on("error", reject);
    gunzip.on("close", () => {});
    origem.pipe(gunzip).pipe(filho.stdin);
    filho.stdin.on("error", () => {});
    filho.on("close", (codigo) => {
      if (codigo !== 0) return reject(new Error("mysql saiu com " + codigo + ": " + (erro.split(/\r?\n/).filter(Boolean)[0] || stdout.slice(0, 120))));
      resolve(erro);
    });
  });
}

async function main() {
  const opt = argumentos(process.argv.slice(2));
  if (opt.ajuda) {
    ajuda();
    return;
  }
  if (!opt.arquivo) falhar("falta --arquivo <caminho.sql.gz> (veja `node deploy/restaurar-mysql.cjs --ajuda`)");
  if (!fs.existsSync(opt.arquivo) || !fs.statSync(opt.arquivo).isFile()) falhar("o arquivo nao existe: " + opt.arquivo);

  const sidecar = opt.arquivo.replace(/\.sql\.gz$/, ".sha256");
  const metaPath = opt.arquivo.replace(/\.sql\.gz$/, ".meta.json");
  const medido = crypto.createHash("sha256").update(fs.readFileSync(opt.arquivo)).digest("hex");
  if (fs.existsSync(sidecar)) {
    const esperado = fs.readFileSync(sidecar, "utf8").trim().split(/\s+/)[0].toLowerCase();
    if (esperado !== medido) {
      falhar("o hash nao confere com o sidecar — o dump esta truncado ou foi alterado, e a restauracao nao comeca. Esperado " + String(esperado).slice(0, 12) + "..., medido " + medido.slice(0, 12) + "...");
    }
    console.log("[restaurar] hash conferido com o sidecar (" + medido.slice(0, 12) + "...)");
  } else {
    console.warn("[restaurar] ATENCAO: nao ha .sha256 ao lado do dump — integridade nao conferida, prosseguindo por decisao explicita de quem rodou o comando");
  }

  let meta = null;
  if (fs.existsSync(metaPath)) {
    try {
      meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    } catch {
      meta = null;
    }
  }
  if (meta && meta.sha256 && meta.sha256 !== medido) {
    falhar("o hash nao confere com o .meta.json do dump — restauracao interrompida antes de tocar no servidor");
  }

  const banco = opt.banco || (meta && meta.banco) || "";
  if (!banco) falhar("falta --banco: o dump nao tem .meta.json registrando o banco de origem");
  if (!/^[A-Za-z0-9_]+$/.test(banco)) falhar("nome de banco invalido: use letras, numeros e underline (medido: " + banco.slice(0, 40) + ")");
  if (RESERVADOS.includes(banco.toLowerCase())) falhar("o schema \"" + banco + "\" e reservado do MySQL e nao e alvo de restauracao");

  let existe = "0";
  try {
    existe = leSQL("SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='" + banco + "';").trim().split(/\r?\n/).pop();
  } catch (e) {
    falhar("o container `mysql` da pilha nao respondeu — a pilha esta de pe? (`npm run docker:subir`). " + String(e.message).slice(0, 120));
  }
  if (existe !== "1" && !opt.criar) {
    falhar("o banco \"" + banco + "\" nao existe no servidor; passe --criar para cria-lo ou escolha o banco da instalacao");
  }

  let tabelasNoDestino = 0;
  if (existe === "1") {
    tabelasNoDestino = Number(leSQL("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='" + banco + "' AND table_type='BASE TABLE';").trim().split(/\r?\n/).pop() || "0");
    if (tabelasNoDestino > 0 && !opt.sobrepor) {
      falhar("o banco \"" + banco + "\" ja tem " + tabelasNoDestino + " tabela(s) e nao esta vazio — restaurar por cima apagaria o que esta la. Revenda com --aceito-sobrepor se isso e intencional");
    }
  }

  if (opt.simulacao) {
    console.log("[restaurar] simulacao: despejaria " + path.basename(opt.arquivo) + " no banco \"" + banco + "\"" + (opt.criar ? " (criando)" : "") + (opt.sobrepor ? " (com aceite de sobreposicao)" : ""));
    return;
  }

  const inicio = Date.now();
  if (opt.criar) {
    leSQL("CREATE DATABASE IF NOT EXISTS `" + banco + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
    console.log("[restaurar] banco \"" + banco + "\" criado (utf8mb4 / utf8mb4_unicode_ci)");
  } else if (opt.sobrepor) {
    // Sobrepor um banco cheio é reconstruir: derruba as tabelas antes, senão o dump chega em
    // `table already exists` no meio e deixa a restauração pela metade.
    const nomes = leSQL("SELECT table_name FROM information_schema.tables WHERE table_schema='" + banco + "' AND table_type='BASE TABLE';")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((t) => /^[A-Za-z0-9_]+$/.test(t));
    if (nomes.length) {
      leSQL("SET FOREIGN_KEY_CHECKS=0;\n" + nomes.map((t) => "DROP TABLE IF EXISTS `" + banco + "`.`" + t + "`;").join("\n") + "\nSET FOREIGN_KEY_CHECKS=1;\n");
      console.log("[restaurar] " + nomes.length + " tabela(s) derrubada(s) por --aceito-sobrepor, antes do despejo");
    }
  }

  console.log("[restaurar] despejando " + path.basename(opt.arquivo) + " no banco \"" + banco + "\" pelo mysql do container");
  const avisos = await despejaNoContainer(banco, opt.arquivo);
  const depois = Number(leSQL("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='" + banco + "' AND table_type='BASE TABLE';").trim().split(/\r?\n/).pop() || "0");
  const linhas = depois > 0 ? leSQL("SELECT table_name FROM information_schema.tables WHERE table_schema='" + banco + "' AND table_type='BASE TABLE';") : "";
  const nomes = linhas
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((t) => /^[A-Za-z0-9_]+$/.test(t));
  let total = 0;
  if (nomes.length) {
    const uniao = nomes.map((t) => "SELECT '" + t + "' AS t, COUNT(*) AS n FROM `" + banco + "`.`" + t + "`").join(" UNION ALL ");
    for (const l of leSQL(uniao + ";").split(/\r?\n/)) {
      const m = l.trim().match(/^([A-Za-z0-9_]+)\s+(\d+)$/);
      if (m) total += Number(m[2]);
    }
  }
  console.log(
    "[restaurar] ok: " + banco + " tem " + depois + " tabela(s) e " + total + " linha(s), restaurado em " + (Date.now() - inicio) + " ms a partir de " + path.basename(opt.arquivo)
  );
  const avisoReal = String(avisos || "")
    .split(/\r?\n/)
    .filter((l) => /Warning|error/i.test(l))
    .slice(0, 3);
  if (avisoReal.length) console.log("[restaurar] avisos do mysql: " + avisoReal.join(" / ").slice(0, 200));
}

main().catch((e) => falhar(String((e && e.message) || e).slice(0, 300)));

module.exports = { argumentos, RESERVADOS };
