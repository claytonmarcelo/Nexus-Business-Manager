// F6 (T5.2) — o backup do banco de uma instalação: dump lógico, gzip, hash e retenção.
//
// Por que este arquivo existe: `docs/decisoes/G5-hospedagem-e-backup.md` já tinha escrito a regra 1 —
// backup automático diário com retenção (7 diários, 4 semanais, 12 mensais) e restauração testada em
// ambiente separado. Antes desta tarefa o dump era feito à mão, sem rotina, sem política de idade e sem
// prova de que restaura. O `docs/PRODUCAO.md` mandava rodar `mysqldump` num parágrafo e parava ali.
//
// O que este arquivo faz, e o que ele se recusa a fazer:
//
//  1. Lê o banco pelo `mysqldump` **dentro do container** do MySQL. A senha nunca cruza para o host: o
//     `sh -c` do container monta `MYSQL_PWD` a partir do `MYSQL_ROOT_PASSWORD` que a própria imagem já
//     tem, e nenhum valor é impresso — só nomes de banco, de arquivo, contagens e tamanho.
//  2. Escreve gzip fora do repositório. Se o destino resolver dentro da árvore do projeto a ferramenta
//     recusa com código 1: pasta de backup dentro do repositório é a primeira coisa que entra num
//     `git add` desavisado, e dump de banco com dado de cliente não é material de git.
//  3. Grava três arquivos por execução: `*.sql.gz`, `*.sha256` e `*.meta.json`. O hash existe porque um
//     backup sem integridade conferível é um arquivo com sorte; o meta existe porque a restauração
//     precisa saber de qual banco aquele dump saiu, e porque "quantas tabelas e quantas linhas tinha" é
//     a única forma de conferir o `restaurar` depois.
//  4. Aplica a retenção depois de escrever, e só apaga arquivos que seguem o seu próprio padrão de nome.
//     Um `README.txt` ou um dump de outra época que estejam na pasta não entram em nenhuma lista.
//
// A contagem de linhas é feita com `SELECT COUNT(*)` tabela por tabela, pelo mesmo motivo da guarda do
// job de migrations (N54): `information_schema.table_rows` no InnoDB é estimativa, e um meta que registra
// estimativa não serve para conferir restauração.

const { spawn, spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const zlib = require("node:zlib");

const RAIZ = path.resolve(__dirname, "..");
const PREFIXO = "nexus-mysql";
const PADRAO = /^nexus-mysql--(\d{4})-(\d{2})-(\d{2})--(\d{2})(\d{2})(\d{2})\.sql\.gz$/;
const LIMITES_PADRAO = Object.freeze({ diarios: 7, semanais: 4, mensais: 12 });

const dois = (n) => String(n).padStart(2, "0");

function nomeDoArquivo(data) {
  const d = data || new Date();
  return PREFIXO + "--" + d.getFullYear() + "-" + dois(d.getMonth() + 1) + "-" + dois(d.getDate()) + "--" + dois(d.getHours()) + dois(d.getMinutes()) + dois(d.getSeconds()) + ".sql.gz";
}

// parseiaNome devolve a data embutida no nome, ou null para qualquer nome que não seja nosso. A validação
// é dupla: o PADRAO exige seis dígitos e o teste de ida e volta rejeita `2026-13-45`, que o Date aceita
// silenciosamente virando abril de 2027.
function parseiaNome(nome) {
  const m = PADRAO.exec(String(nome));
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6]));
  const bate =
    d.getFullYear() === Number(m[1]) &&
    d.getMonth() === Number(m[2]) - 1 &&
    d.getDate() === Number(m[3]) &&
    d.getHours() === Number(m[4]) &&
    d.getMinutes() === Number(m[5]) &&
    d.getSeconds() === Number(m[6]);
  return bate ? d : null;
}

function meiaNoite(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function diasAtras(d, agora) {
  return Math.floor((meiaNoite(agora) - meiaNoite(d)) / 86400000);
}

// Semana ISO-8601: segunda a domingo, e o ano é o da quinta-feira da semana — é o que faz um backup de
// 28 de dezembro pertencer à semana de janeiro e não morrer como "semana 1" do ano errado.
function semanaISO(d) {
  const tmp = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diaDaSemana = (tmp.getDay() + 6) % 7;
  tmp.setDate(tmp.getDate() - diaDaSemana + 3);
  const primeiraQuinta = new Date(tmp.getFullYear(), 0, 4);
  const pqs = (primeiraQuinta.getDay() + 6) % 7;
  primeiraQuinta.setDate(primeiraQuinta.getDate() - pqs + 3);
  const numero = 1 + Math.round((tmp.getTime() - primeiraQuinta.getTime()) / (7 * 86400000));
  return tmp.getFullYear() + "-W" + dois(numero);
}

const chaveDia = (d) => d.getFullYear() + "-" + dois(d.getMonth() + 1) + "-" + dois(d.getDate());
const chaveMes = (d) => d.getFullYear() + "-" + dois(d.getMonth() + 1);
function mesesAtras(d, agora) {
  return (agora.getFullYear() - d.getFullYear()) * 12 + (agora.getMonth() - d.getMonth());
}

// planejarRetencao é uma função pura de propósito: é a única parte do backup que dá para medir sem
// Docker, sem banco e sem relógio, e é a parte que decide o que desaparece. `regua` = lista de nomes de
// arquivo (ou caminhos); ela devolve o que fica, com o nível que o segurou, e o que sai.
function planejarRetencao(nomes, agora, limites) {
  const L = Object.assign({}, LIMITES_PADRAO, limites || {});
  const referencia = agora instanceof Date ? agora : new Date(agora || Date.now());
  const itens = (nomes || [])
    .map((n) => {
      const bruto = typeof n === "string" ? n : String((n && n.arquivo) || "");
      const d = parseiaNome(path.basename(bruto.replace(/\.meta\.json$|\.sha256$/, ".sql.gz")));
      return d ? { arquivo: path.basename(bruto), data: d } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.data - a.data);

  const levels = [
    { motivo: "diario", chave: chaveDia, dentro: (d) => diasAtras(d, referencia) < L.diarios },
    { motivo: "semanal", chave: semanaISO, dentro: (d) => Math.floor(diasAtras(d, referencia) / 7) < L.semanais },
    { motivo: "mensal", chave: chaveMes, dentro: (d) => mesesAtras(d, referencia) < L.mensais },
  ];

  const escolhido = new Map();
  // Um arquivo pode perder o bucket sem estar fora de janela nenhuma: e o segundo dump do mesmo dia,
  // ou o segundo da mesma semana ISO. Dizer a esse arquivo 'mais velho que a janela' e mentir, e o
  // operador leria um motivo que nao aconteceu. A politica escolhe um por bucket - isso tem nome.
  const perdeuOBucket = new Set();
  for (const level of levels) {
    const bucketQueJaTemDono = new Set();
    for (const i of itens) {
      if (!level.dentro(i.data)) continue;
      const chave = level.chave(i.data);
      if (bucketQueJaTemDono.has(chave)) {
        perdeuOBucket.add(i.arquivo);
        continue;
      }
      bucketQueJaTemDono.add(chave);
      if (!escolhido.has(i.arquivo)) escolhido.set(i.arquivo, { motivo: level.motivo, chave });
    }
  }

  let manter = itens.filter((i) => escolhido.has(i.arquivo)).map((i) => Object.assign({}, i, escolhido.get(i.arquivo)));
  let apagar = itens
    .filter((i) => !escolhido.has(i.arquivo))
    .map((i) => Object.assign({}, i, { chave: "", motivo: perdeuOBucket.has(i.arquivo) ? "repetido-no-bucket" : "fora-da-janela" }));

  // Última linha de defesa: uma janela mal calibrada (ou um relógio que passou à frente do disco) não tem
  // o direito de deixar a instalação sem backup nenhum. Se nada coubesse em janela alguma, o mais recente
  // fica, e fica dito por quê.
  if (manter.length === 0 && itens.length > 0) {
    const maisRecente = Object.assign({}, itens[0], { motivo: "ultimo", chave: chaveMes(itens[0].data) });
    manter = [maisRecente];
    apagar = itens.slice(1).map((i) => Object.assign({}, i, { chave: "", motivo: "fora-da-janela" }));
  }

  return { manter, apagar, limites: L, total: itens.length };
}

function falhar(mensagem) {
  console.error("[backup] " + mensagem);
  process.exit(1);
}

function rodaDocker(args, opc) {
  return spawnSync("docker", args, Object.assign({ cwd: RAIZ, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }, opc || {}));
}

function leNomeDoBanco() {
  const r = rodaDocker(["compose", "exec", "-T", "mysql", "printenv", "MYSQL_DATABASE"]);
  if (r.status !== 0) return "";
  return String(r.stdout || "").trim();
}

function leSQL(texto) {
  const r = rodaDocker(
    ["compose", "exec", "-T", "mysql", "sh", "-c", 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -u root -N'],
    { input: texto }
  );
  if (r.status !== 0) throw new Error("mysql dentro do container respondeu " + r.status + ": " + String(r.stderr || "").split(/\r?\n/).filter(Boolean)[0]);
  return String(r.stdout || "");
}

function destinoPadrao() {
  if (process.env.NEXUS_BACKUP_DIR) return path.resolve(process.env.NEXUS_BACKUP_DIR);
  return path.join(os.homedir(), "nexus-business-manager", "backups");
}

// dentroDoRepositório compara caminhos resolvidos. Um destino relativo (`--dest backups`) cai na raiz e
// é recusado pela mesma regra.
function dentroDoRepositorio(p) {
  const rel = path.relative(RAIZ, p);
  return rel === "" || (rel && !rel.startsWith("..") && !path.isAbsolute(rel));
}

function sha256DoArquivo(p) {
  return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}

function argumentos(argv) {
  const out = { dest: destinoPadrao(), simulacao: false, retencao: true, limites: Object.assign({}, LIMITES_PADRAO) };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dest") out.dest = path.resolve(argv[++i] || "");
    else if (a === "--simulacao" || a === "--seco") out.simulacao = true;
    else if (a === "--sem-retencao") out.retencao = false;
    else if (a === "--limite-diarios") out.limites.diarios = Number(argv[++i]);
    else if (a === "--limite-semanais") out.limites.semanais = Number(argv[++i]);
    else if (a === "--limite-mensais") out.limites.mensais = Number(argv[++i]);
    else if (a === "--ajuda" || a === "-h") out.ajuda = true;
    else falhar("argumento nao reconhecido: " + a + " — use --dest, --simulacao, --sem-retencao ou --limite-{diarios,semanais,mensais}");
  }
  for (const k of ["diarios", "semanais", "mensais"]) {
    if (!Number.isInteger(out.limites[k]) || out.limites[k] < 0) falhar("limite " + k + " tem de ser inteiro e >= 0 (medido: " + out.limites[k] + ")");
  }
  return out;
}

function ajuda() {
  console.log(
    [
      "node deploy/backup-mysql.cjs [--dest <pasta-fora-do-repositorio>] [--simulacao] [--sem-retencao]",
      "",
      "Faz o dump do banco do container `mysql` da pilha, comprime em gzip e escreve na pasta de backup",
      "(padrao: " + destinoPadrao() + ", ou NEXUS_BACKUP_DIR). Cada execuçao escreve <nome>.sql.gz,",
      "<nome>.sha256 e <nome>.meta.json. Depois aplica a retençao: " + JSON.stringify(LIMITES_PADRAO) + ".",
      "A senha nunca sai do ambiente do container e nenhum valor de segredo e impresso.",
    ].join("\n")
  );
}

function despejaNoGz(banco, caminho) {
  return new Promise((resolve, reject) => {
    // `mysqldump` sem `--databases`: o dump não emite CREATE DATABASE nem USE, e é exatamente isso que
    // permite restaurar o mesmo arquivo num banco de outro nome — a prova de restauração depende disso.
    const dentro =
      'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump -h 127.0.0.1 -u root --single-transaction --routines --triggers --events --set-gtid-purged=OFF --default-character-set=utf8mb4 --skip-lock-tables "$MYSQL_DATABASE"';
    const filho = spawn("docker", ["compose", "exec", "-T", "mysql", "sh", "-c", dentro], { cwd: RAIZ, stdio: ["ignore", "pipe", "pipe"] });
    let erro = "";
    const gzip = zlib.createGzip({ level: 9 });
    const saida = fs.createWriteStream(caminho);
    let bytes = 0;
    filho.stdout.on("data", (b) => {
      bytes += b.length;
    });
    filho.stderr.on("data", (b) => {
      erro += b.toString("utf8");
      if (erro.length > 4000) erro = erro.slice(0, 4000);
    });
    gzip.on("error", reject);
    saida.on("error", reject);
    filho.stdout.pipe(gzip).pipe(saida);
    filho.on("error", reject);
    filho.on("close", (codigo) => {
      saida.end(() => {
        if (codigo !== 0) return reject(new Error("mysqldump saiu com " + codigo + ": " + erro.split(/\r?\n/).filter(Boolean)[0]));
        // O hash é do arquivo que fica em disco (.sql.gz), não do texto descompactado: é o arquivo que a
        // restauração lê e é contra ele que o `.sha256` precisa conferir.
        resolve({ bytesDump: bytes, aviso: erro.split(/\r?\n/).filter((l) => /Warning|error/i.test(l)).slice(0, 3) });
      });
    });
  });
}

async function main() {
  const opt = argumentos(process.argv.slice(2));
  if (opt.ajuda) {
    ajuda();
    return;
  }
  if (dentroDoRepositorio(opt.dest)) {
    falhar("o destino do backup tem de ficar fora do repositorio — pasta de dump dentro da arvore vai para o git no primeiro add. Medido: " + opt.dest);
  }

  const banco = leNomeDoBanco();
  if (!banco || !/^[A-Za-z0-9_]+$/.test(banco)) {
    falhar("o container `mysql` da pilha nao respondeu o MYSQL_DATABASE — a pilha esta de pe? (`npm run docker:subir`)");
  }

  fs.mkdirSync(opt.dest, { recursive: true });
  const agora = new Date();
  const nome = nomeDoArquivo(agora);
  const caminho = path.join(opt.dest, nome);

  if (opt.simulacao) {
    console.log("[backup] simulacao: destino " + opt.dest + ", banco " + banco + ", arquivo que seria escrito " + nome);
    console.log("[backup] simulacao: retencao " + JSON.stringify(opt.limites) + (opt.retencao ? " (aplicaria)" : " (desligada por --sem-retencao)"));
    return;
  }

  console.log("[backup] dump de " + banco + " pelo mysqldump do container, para " + caminho);
  const inicio = Date.now();
  let despejo;
  try {
    despejo = await despejaNoGz(banco, caminho);
  } catch (e) {
    fs.rmSync(caminho, { force: true });
    falhar("o dump falhou e o arquivo parcial foi apagado: " + String(e.message).slice(0, 240));
  }

  let tabelas = [];
  try {
    const lista = leSQL(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='" + banco + "' AND table_type='BASE TABLE' ORDER BY table_name;"
    );
    tabelas = lista
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((t) => /^[A-Za-z0-9_]+$/.test(t));
  } catch (e) {
    falhar("o dump foi escrito, mas a contagem de tabelas falhou: " + String(e.message).slice(0, 160));
  }

  let linhas = 0;
  if (tabelas.length > 0) {
    const uniao = tabelas.map((t) => "SELECT '" + t + "' AS t, COUNT(*) AS n FROM `" + banco + "`.`" + t + "`").join(" UNION ALL ");
    const contagem = leSQL(uniao + ";");
    for (const l of contagem.split(/\r?\n/)) {
      const m = l.trim().match(/^([A-Za-z0-9_]+)\s+(\d+)$/);
      if (m) linhas += Number(m[2]);
    }
  }

  const stat = fs.statSync(caminho);
  const sha256 = sha256DoArquivo(caminho);
  const meta = {
    ferramenta: "deploy/backup-mysql.cjs",
    banco,
    arquivo: nome,
    criadoEm: agora.toISOString(),
    duracaoMs: Date.now() - inicio,
    bytesDump: despejo.bytesDump,
    bytes: stat.size,
    tabelas: tabelas.length,
    linhas,
    sha256,
    mysqldump: (function () {
      const r = rodaDocker(["compose", "exec", "-T", "mysql", "mysqldump", "--version"]);
      return r.status === 0 ? String(r.stdout || "").trim() : "desconhecido";
    })(),
  };
  fs.writeFileSync(caminho.replace(/\.sql\.gz$/, ".sha256"), sha256 + "  " + nome + "\n", "utf8");
  fs.writeFileSync(caminho.replace(/\.sql\.gz$/, ".meta.json"), JSON.stringify(meta, null, 2) + "\n", "utf8");

  console.log(
    "[backup] dump pronto: " + nome + " — " + tabelas.length + " tabela(s), " + linhas + " linha(s), " + Math.round(stat.size / 1024) + " kB gzip em " + meta.duracaoMs + " ms"
  );
  if (despejo.aviso.length) console.log("[backup] avisos do mysqldump: " + despejo.aviso.join(" / ").slice(0, 200));

  if (!opt.retencao) {
    console.log("[backup] retencao desligada por --sem-retencao");
    return;
  }

  const nomes = fs.readdirSync(opt.dest).filter((n) => PADRAO.test(n));
  const plano = planejarRetencao(nomes, agora, opt.limites);
  let apagados = 0;
  for (const item of plano.apagar) {
    for (const sufixo of [".sql.gz", ".sha256", ".meta.json"]) {
      fs.rmSync(path.join(opt.dest, item.arquivo.replace(/\.sql\.gz$/, sufixo)), { force: true });
    }
    apagados++;
    console.log("[backup] retencao apagou " + item.arquivo + " (" + item.motivo + ")");
  }
  console.log(
    "[backup] retencao " + JSON.stringify(opt.limites) + ": " + plano.manter.length + " mantido(s), " + apagados + " apagado(s) de " + plano.total + " dump(s) na pasta"
  );
  const maisVelho = plano.manter.map((i) => i.data).sort((a, b) => a - b)[0];
  if (maisVelho) console.log("[backup] backup mantido mais antigo na janela: " + nomeDoArquivo(maisVelho));
}

module.exports = { PADRAO, PREFIXO, LIMITES_PADRAO, nomeDoArquivo, parseiaNome, planejarRetencao, dentroDoRepositorio, destinoPadrao };

if (require.main === module) {
  main().catch((e) => falhar(String((e && e.message) || e).slice(0, 240)));
}
