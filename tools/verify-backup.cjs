// F6 (T5.2) — régua do backup: o dump existe, o hash confere, a retenção corta exatamente o que a
// política manda, e a restauração devolve o banco igual — conferido tabela por tabela, não declarado.
//
// Por que uma régua e não só um script: `docs/decisoes/G5-hospedagem-e-backup.md` escreveu a regra 1
// assim — "backup que nunca foi restaurado é desejo, não plano". Então metade desta ferramenta mede o
// arquivo que a ferramenta de backup produz e a outra metade restaura esse arquivo num banco separado,
// dentro do MySQL da própria pilha, e compara as contagens. O banco de desenvolvimento da casa não entra
// aqui (D6): quem é lido e escrito é o MySQL do container.
//
// As recusas são medidas, não descritas: destino dentro do repositório, schema reservado do MySQL,
// arquivo que não existe, hash que não bate, restauração por cima de banco com tabela. Cada uma tem de
// sair com código 1 e frase própria — é isso que impede um `restaurar` distraído de apagar uma instalação.
//
// Nenhum segredo é impresso. A senha nunca sai do ambiente do container: o `mysqldump` e o `mysql` rodam
// dentro dele lendo `MYSQL_PWD` de `MYSQL_ROOT_PASSWORD`, e esta ferramenta só vê nomes de banco, de
// tabela, de arquivo e contagens.

const { spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const zlib = require("node:zlib");
const { CASA, PROVA } = require("./pilha-de-prova.cjs");

const RAIZ = path.resolve(__dirname, "..");
const BACKUP = path.join(RAIZ, "deploy", "backup-mysql.cjs");
const RESTAURAR = path.join(RAIZ, "deploy", "restaurar-mysql.cjs");
const BANCO_DE_TESTE = "nexusbm_restauracao";

let feitas = 0;
let falhas = 0;

function confere(sim, oQueDeVeria, detalhe) {
  if (sim) {
    feitas++;
    console.log("  ok  " + oQueDeVeria);
    return;
  }
  falhas++;
  console.log("  FALHA  " + oQueDeVeria + (detalhe === undefined ? "" : " | medido: " + String(detalhe).replace(/\r?\n/g, " / ").slice(0, 160)));
}

function rodaNode(args) {
  return spawnSync(process.execPath, args, { cwd: RAIZ, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

// SQL dentro do MySQL da pilha, sem senha na linha de comando: o `sh -c` do container monta MYSQL_PWD a
// partir do ambiente que a imagem já tem, e o texto chega por stdin.
function sql(texto) {
  return spawnSync(
    "docker",
    ["compose", "exec", "-T", "mysql", "sh", "-c", 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -u root -N'],
    { cwd: RAIZ, encoding: "utf8", input: texto, maxBuffer: 64 * 1024 * 1024 }
  );
}

function le(sqlTexto) {
  const r = sql(sqlTexto);
  return String(r.stdout || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function nomeDoBancoDaPilha() {
  const r = spawnSync("docker", ["compose", "exec", "-T", "mysql", "printenv", "MYSQL_DATABASE"], { cwd: RAIZ, encoding: "utf8" });
  return r.status === 0 ? String(r.stdout || "").trim() : "";
}

function pilhaDePe() {
  const r = sql("SELECT 1;");
  return r.status === 0 && String(r.stdout || "").trim() === "1";
}

function sha256De(arquivo) {
  return crypto.createHash("sha256").update(fs.readFileSync(arquivo)).digest("hex");
}

function pastaDe(destino) {
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), destino)), "backups");
  fs.mkdirSync(p, { recursive: true });
  return p;
}

function dataDe(diasAtras) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - diasAtras);
  return d;
}

// O nome que a ferramenta produz, a partir de "quantos dias atrás" — é assim que a retenção é medida sem
// depender de relógio: a data entra no próprio nome do arquivo.
function arquivoDe(diasAtras, horas) {
  const d = dataDe(diasAtras);
  const p = (n) => String(n).padStart(2, "0");
  const h = horas === undefined ? 12 : horas;
  d.setHours(h, 30 - Math.min(h, 30), 0, 0);
  return "nexus-mysql--" + d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "--" + p(d.getHours()) + p(d.getMinutes()) + "00.sql.gz";
}

function main() {
  let backup = null;
  try {
    backup = require(BACKUP);
  } catch {
    backup = null;
  }

  console.log("A) as duas ferramentas existem e recusam antes de escrever");
  confere(fs.existsSync(BACKUP), "deploy/backup-mysql.cjs existe");
  confere(fs.existsSync(RESTAURAR), "deploy/restaurar-mysql.cjs existe");
  confere(!!backup && typeof backup.planejarRetencao === "function", "o modulo de backup expoe planejarRetencao() para a regua conferir");
  confere(!!backup && typeof backup.nomeDoArquivo === "function" && backup.PADRAO instanceof RegExp, "o modulo de backup expoe nomeDoArquivo() e PADRAO");

  if (!fs.existsSync(BACKUP) || !fs.existsSync(RESTAURAR)) {
    console.log("");
    console.log("FALHOU: " + falhas + " falha(s) em " + (feitas + falhas) + " verificacoes — sem as ferramentas nao ha o que medir");
    process.exit(1);
  }

  // Destino dentro do repositório nunca é lugar de backup: seria a primeira coisa a entrar num `git add`.
  const destinoProibido = path.join(RAIZ, "backups-de-teste");
  let r = rodaNode([BACKUP, "--dest", destinoProibido, "--simulacao"]);
  const saidaRecusa = String(r.stdout || "") + String(r.stderr || "");
  confere(r.status === 1, "backup com destino dentro do repositorio sai com codigo 1", "codigo " + r.status + " | " + saidaRecusa.replace(/\r?\n/g, " / ").slice(0, 140));
  confere(/fora do repositorio/i.test(saidaRecusa), "a recusa diz que o destino tem de ficar fora do repositorio", saidaRecusa.slice(0, 140));
  confere(!fs.existsSync(destinoProibido), "a recusa nao cria o diretorio proibido");

  r = rodaNode([RESTAURAR, "--arquivo", path.join(os.tmpdir(), "nao-existe-9e1f2c.sql.gz")]);
  confere(r.status === 1, "restaurar um arquivo que nao existe sai com codigo 1", "codigo " + r.status);

  const pastaLadoDeFora = pastaDe("nexus-reservado");
  const falsoGz = path.join(pastaLadoDeFora, "nexus-mysql--2026-01-01--000000.sql.gz");
  fs.writeFileSync(falsoGz, zlib.gzipSync(Buffer.from("-- MySQL dump 10.13\nCREATE TABLE t (a int);\n", "utf8")));
  fs.writeFileSync(falsoGz.replace(/\.sql\.gz$/, ".sha256"), sha256De(falsoGz) + "  " + path.basename(falsoGz) + "\n");

  r = rodaNode([RESTAURAR, "--arquivo", falsoGz, "--banco", "mysql"]);
  const saidaReservado = String(r.stdout || "") + String(r.stderr || "");
  confere(r.status === 1, "restaurar dentro de um schema reservado do MySQL sai com codigo 1", "codigo " + r.status + " | " + saidaReservado.replace(/\r?\n/g, " / ").slice(0, 140));
  confere(/reservado/i.test(saidaReservado), "a recusa fala do schema reservado", saidaReservado.slice(0, 140));

  fs.writeFileSync(falsoGz.replace(/\.sql\.gz$/, ".sha256"), crypto.randomBytes(32).toString("hex") + "  " + path.basename(falsoGz) + "\n");
  r = rodaNode([RESTAURAR, "--arquivo", falsoGz, "--banco", "nexusbm_qualquercoisa"]);
  const saidaHash = String(r.stdout || "") + String(r.stderr || "");
  confere(r.status === 1, "restaurar com hash divergente sai com codigo 1 antes de tocar em banco", "codigo " + r.status + " | " + saidaHash.replace(/\r?\n/g, " / ").slice(0, 140));
  confere(/hash/i.test(saidaHash), "a recusa fala do hash que nao confere", saidaHash.slice(0, 140));
  fs.rmSync(pastaLadoDeFora, { recursive: true, force: true });

  console.log("");
  console.log("B) a retencao corta o que a politica manda (7 diarios, 4 semanais, 12 mensais)");
  if (typeof backup.planejarRetencao !== "function") {
    confere(false, "planejarRetencao() existe para ser medida");
  } else {
    const planejar = backup.planejarRetencao;
    const serie = [];
    for (let d = 0; d <= 44; d++) serie.push(arquivoDe(d));
    const plano = planejar(serie, new Date());
    const mantem = new Set(plano.manter.map((i) => i.arquivo));
    const apaga = new Set(plano.apagar.map((i) => i.arquivo));

    confere(
      [0, 1, 2, 3, 4, 5, 6].every((d) => mantem.has(arquivoDe(d))),
      "os sete diarios mais recentes ficam",
      "mantidos " + mantem.size + " de " + serie.length
    );
    confere(
      mantem.size + apaga.size === serie.length && [...mantem].every((a) => !apaga.has(a)),
      "todo arquivo tem exatamente um veredito, sem sobra nem duplicata",
      mantem.size + " + " + apaga.size + " de " + serie.length
    );
    const chaves = plano.manter.map((i) => i.motivo + "/" + i.chave);
    confere(new Set(chaves).size === chaves.length, "em cada nivel e cada bucket fica no maximo um arquivo", chaves.length - new Set(chaves).size + " repetido(s)");
    confere(
      plano.manter.every((i) => ["diario", "semanal", "mensal"].includes(i.motivo) && typeof i.chave === "string" && i.chave !== ""),
      "cada arquivo mantido traz o motivo e a chave do bucket em que coube",
      plano.manter.slice(0, 2).map((i) => i.motivo + "/" + i.chave).join(",")
    );
    confere(
      plano.apagar.every((i) => typeof i.motivo === "string" && i.motivo !== ""),
      "cada arquivo que a retencao apaga tambem traz um motivo escrito, nunca undefined",
      JSON.stringify(plano.apagar.slice(0, 3).map((i) => i.motivo))
    );

    const tres = planejar([arquivoDe(9), arquivoDe(10), arquivoDe(11)], new Date());
    confere(tres.apagar.length >= 1 && tres.manter.length <= 2, "tres arquivos em onze dias nao viram tres backups guardados", "mantem " + tres.manter.length + " / apaga " + tres.apagar.length);
    confere(
      tres.manter.every((i) => i.motivo === "semanal" || i.motivo === "mensal"),
      "o que passa de sete dias so fica como semanal ou mensal",
      tres.manter.map((i) => i.motivo).join(",")
    );

    const dentroDoAno = planejar([arquivoDe(0), arquivoDe(300)], new Date());
    confere(dentroDoAno.manter.some((i) => i.arquivo === arquivoDe(300)), "um arquivo de 300 dias fica como mensal", dentroDoAno.manter.map((i) => i.motivo).join(","));
    const foraDoAno = planejar([arquivoDe(0), arquivoDe(400)], new Date());
    confere(foraDoAno.apagar.some((i) => i.arquivo === arquivoDe(400)), "um arquivo de 400 dias sai, junto com o diario mais novo", foraDoAno.apagar.map((i) => i.arquivo).join(","));

    const soVelhos = planejar([arquivoDe(801), arquivoDe(802)], new Date());
    confere(soVelhos.manter.length === 1, "a retencao nunca deixa a pasta sem nenhum backup", "mantem " + soVelhos.manter.length);

    const estranhos = planejar(["README.txt", "backup-antigo.sql.gz", "nexus-mysql--2026-13-45--99.sql.gz"], new Date());
    confere(
      estranhos.manter.length === 0 && estranhos.apagar.length === 0,
      "arquivo fora do padrao nao e mantido nem apagado pela retencao",
      JSON.stringify({ m: estranhos.manter.length, a: estranhos.apagar.length })
    );

    confere(backup.PADRAO.test(arquivoDe(3)) && !backup.PADRAO.test("backup-antigo.sql.gz"), "o PADRAO reconhece o nome que o proprio nomeDoArquivo() gera", arquivoDe(3));
    confere(backup.nomeDoArquivo(new Date(2026, 9, 14, 8, 5, 0)) === "nexus-mysql--2026-10-14--080500.sql.gz", "nomeDoArquivo() escreve data e hora com dois digitos", backup.nomeDoArquivo(new Date(2026, 9, 14, 8, 5, 0)));
  }

  console.log("");
  console.log("C) a pilha de pe: dump real, hash, restauracao conferida tabela por tabela");

  if (!pilhaDePe()) {
    console.log("  NAO VERIFICADO: o MySQL da pilha nao respondeu. Rode `npm run docker:subir` e reexecute esta ferramenta.");
    console.log("");
    console.log(falhas === 0 ? "partes A e B: " + feitas + " verificacoes, 0 falhas" : "FALHOU: " + falhas + " falha(s) em " + (feitas + falhas) + " verificacoes");
    process.exit(2);
  }

  // De onde vem este dump? Se o MySQL da pilha publicasse uma porta no host, um cliente distraído
  // leria o MySQL da casa — e é exatamente o banco de desenvolvimento que o §4 do contrato proíbe de
  // tocar. A régua mede o container que está de pé (o `docker inspect` mostra a porta publicada de
  // verdade, não a que o compose declara): sem socket no host, o único caminho do dump é o
  // `docker compose exec`, e nenhuma das janelas da casa — produto e pilha de prova, lidas do helper,
  // nunca escritas aqui — pode ser esse caminho.
  const idDoMysql = String(spawnSync("docker", ["compose", "ps", "-q", "mysql"], { cwd: RAIZ, encoding: "utf8" }).stdout || "").trim().split(/\r?\n/)[0];
  const inspecao = spawnSync("docker", ["inspect", "--format", "{{json .NetworkSettings.Ports}}", idDoMysql], { cwd: RAIZ, encoding: "utf8" });
  const publicadasDoMysql = [];
  try {
    const mapa = JSON.parse(String(inspecao.stdout || "{}").trim());
    for (const vinculos of Object.values(mapa || {})) for (const v of vinculos || []) publicadasDoMysql.push(Number(v.HostPort));
  } catch {}
  confere(
    idDoMysql.length > 0 && publicadasDoMysql.length === 0,
    "o mysql da pilha nao publica porta nenhuma no host: o dump so pode vir do container",
    JSON.stringify(publicadasDoMysql)
  );
  const janelasDaCasa = [CASA.web, CASA.api, PROVA.web, PROVA.api].map((u) => Number(new URL(u).port));
  confere(
    janelasDaCasa.every((p) => !publicadasDoMysql.includes(p)),
    "nenhuma janela da casa (produto e pilha de prova) pode ser o caminho deste dump",
    janelasDaCasa.join(",") + " | publicadas: " + JSON.stringify(publicadasDoMysql)
  );

  const bancoOrigem = nomeDoBancoDaPilha();

  confere(/^[A-Za-z0-9_]+$/.test(bancoOrigem), "o nome do banco da pilha foi lido do container, sem credencial no caminho", bancoOrigem || "vazio");

  const tabelaDe = (schema) =>
    le("SELECT table_name FROM information_schema.tables WHERE table_schema='" + schema + "' AND table_type='BASE TABLE' ORDER BY table_name;").filter((t) => /^[A-Za-z0-9_]+$/.test(t));

  const contagensDe = (schema, tabelas) => {
    const saida = {};
    if (!tabelas.length) return saida;
    const uniao = tabelas.map((t) => "SELECT '" + t + "' AS t, COUNT(*) AS n FROM `" + schema + "`.`" + t + "`").join(" UNION ALL ");
    for (const linha of le(uniao + ";")) {
      const m = linha.match(/^([A-Za-z0-9_]+)\s+(\d+)$/);
      if (m) saida[m[1]] = Number(m[2]);
    }
    return saida;
  };

  const pasta = pastaDe("nexus-backup");
  try {
    r = rodaNode([BACKUP, "--dest", pasta]);
    confere(r.status === 0, "o backup de verdade saiu com codigo 0", "codigo " + r.status + " | " + String(r.stdout || r.stderr).replace(/\r?\n/g, " / ").slice(0, 200));

    const dumps = fs.readdirSync(pasta).filter((n) => /\.sql\.gz$/.test(n)).sort();
    confere(dumps.length === 1, "a pasta tem exatamente um dump", dumps.join(","));
    const caminho = path.join(pasta, dumps[0]);
    const lado = caminho.replace(/\.sql\.gz$/, ".sha256");
    const metaPath = caminho.replace(/\.sql\.gz$/, ".meta.json");
    confere(fs.existsSync(lado), "o sidecar .sha256 existe junto do dump");
    confere(fs.existsSync(metaPath), "o .meta.json existe junto do dump");

    let meta = {};
    try {
      meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    } catch {
      meta = {};
    }
    confere(meta.banco === bancoOrigem, "o meta registra o banco de onde o dump saiu", String(meta.banco) + " vs " + bancoOrigem);
    confere(Number(meta.tabelas) > 0, "o meta conta tabelas", "tabelas=" + meta.tabelas);
    confere(Number.isFinite(Number(meta.linhas)), "o meta conta linhas, e o zero quando existe e dito como zero", "linhas=" + meta.linhas);
    confere(Number(meta.bytes) === fs.statSync(caminho).size, "o meta registra o tamanho real do gzip", meta.bytes + " vs " + fs.statSync(caminho).size);
    confere(/^[0-9a-f]{64}$/.test(String(meta.sha256 || "")), "o meta traz o sha256 do dump");
    confere(sha256De(caminho) === fs.readFileSync(lado, "utf8").trim().split(/\s+/)[0], "o hash do dump confere com o sidecar");

    const texto = zlib.gunzipSync(fs.readFileSync(caminho)).toString("utf8");
    confere(/^-- MySQL dump/.test(texto), "o dump descompactado comeca com o cabecalho do mysqldump", texto.slice(0, 40));
    confere(/CREATE TABLE/.test(texto) && !/CREATE DATABASE/.test(texto), "o dump cria tabelas sem criar banco, que e o que permite restaurar em outro nome", "tem CREATE DATABASE? " + /CREATE DATABASE/.test(texto));
    confere(/INSERT INTO/.test(texto) || Number(meta.linhas) === 0, "o dump traz os dados, ou o meta declara que nao havia linha nenhuma", "linhas=" + meta.linhas);

    const tabelas = tabelaDe(bancoOrigem);
    confere(tabelas.length > 0 && tabelas.length === Number(meta.tabelas), "a pilha responde o mesmo numero de tabelas que o meta conta", tabelas.length + " vs " + meta.tabelas);
    const origem = contagensDe(bancoOrigem, tabelas);
    confere(Object.keys(origem).length === tabelas.length, "a contagem de origem veio para toda tabela", Object.keys(origem).length + " de " + tabelas.length);

    const antes = sql("DROP DATABASE IF EXISTS `" + BANCO_DE_TESTE + "`;");
    confere(antes.status === 0, "o banco de teste de restauracao comeca limpo", antes.status + " | " + String(antes.stderr || "").slice(0, 80));

    r = rodaNode([RESTAURAR, "--arquivo", caminho, "--banco", BANCO_DE_TESTE, "--criar"]);
    confere(r.status === 0, "a restauracao no banco separado saiu com codigo 0", "codigo " + r.status + " | " + String(r.stdout || r.stderr).replace(/\r?\n/g, " / ").slice(0, 200));

    const restauradas = tabelaDe(BANCO_DE_TESTE);
    confere(restauradas.length === tabelas.length, "a restauracao devolve o mesmo numero de tabelas", restauradas.length + " vs " + tabelas.length);
    const destino = contagensDe(BANCO_DE_TESTE, restauradas);
    const divergentes = tabelas.filter((t) => origem[t] !== destino[t]);
    confere(
      divergentes.length === 0,
      "tabela por tabela, a restauracao tem o mesmo numero de linhas da origem",
      divergentes.slice(0, 4).map((t) => t + ": " + origem[t] + " vs " + destino[t]).join(" | ")
    );

    r = rodaNode([RESTAURAR, "--arquivo", caminho, "--banco", BANCO_DE_TESTE]);
    const saidaCheio = String(r.stdout || "") + String(r.stderr || "");
    confere(r.status === 1, "restaurar por cima de banco com tabela, sem o aceite explicito, sai com codigo 1", "codigo " + r.status);
    confere(/tem tabela|nao esta vazio/i.test(saidaCheio), "a recusa explica que o banco alvo ja tem tabelas", saidaCheio.replace(/\r?\n/g, " / ").slice(0, 140));

    r = rodaNode([RESTAURAR, "--arquivo", caminho, "--banco", bancoOrigem]);
    confere(r.status === 1, "restaurar por cima do banco da instalacao, sem o aceite explicito, sai com codigo 1", "codigo " + r.status);

    // A retencao em pasta real, e ela corta de verdade: dois dumps no mesmo dia sao um bucket só, entao o
    // segundo apaga o primeiro. O que nao segue o padrao da ferramenta fica onde estava, intocado.
    fs.writeFileSync(path.join(pasta, "README.txt"), "nao sou eu " + String.fromCharCode(10));
    fs.writeFileSync(path.join(pasta, "backup-de-outra-epoca.sql.gz"), "x");
    r = rodaNode([BACKUP, "--dest", pasta]);
    confere(r.status === 0, "o segundo backup saiu com codigo 0", "codigo " + r.status + " | " + String(r.stdout || r.stderr).split(/\r?\n/).join(" / ").slice(0, 160));
    confere(fs.existsSync(path.join(pasta, "README.txt")) && fs.existsSync(path.join(pasta, "backup-de-outra-epoca.sql.gz")), "a retencao nao toca arquivo que nao segue o padrao da ferramenta");
    const legitimos = fs.readdirSync(pasta).filter((n) => backup.PADRAO.test(n));
    confere(legitimos.length === 1, "dois dumps no mesmo dia viram um bucket: ficou o mais novo, o do mesmo dia saiu", legitimos.join(","));
    confere(!fs.existsSync(caminho), "o dump mais velho do mesmo dia foi apagado junto do sidecar e do meta");
    confere(fs.readdirSync(pasta).filter((n) => /.meta.json$/.test(n)).length === 1, "o dump mantido tem exatamente um meta", fs.readdirSync(pasta).filter((n) => /.meta.json$/.test(n)).join(","));
  } finally {
    sql("DROP DATABASE IF EXISTS `" + BANCO_DE_TESTE + "`;");
    fs.rmSync(pasta, { recursive: true, force: true });
    confere(le("SHOW DATABASES LIKE '" + BANCO_DE_TESTE + "';").length === 0, "o banco de teste de restauracao nao sobra depois da regua");
  }

  console.log("");
  console.log(falhas === 0 ? "ok: " + feitas + " verificacoes, 0 falhas" : "FALHOU: " + falhas + " falha(s) em " + (feitas + falhas) + " verificacoes");
  process.exit(falhas === 0 ? 0 : 1);
}

main();
