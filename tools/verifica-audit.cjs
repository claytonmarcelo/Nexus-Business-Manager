// O audit das dependências como portão — e não como número esquecido.
//
// O que a casa mediu em 2026-11-08 (achado N86 na auditoria): `npm audit` devolve
// 8 vulnerabilidades na árvore — 1 baixa, 2 moderadas, 5 altas, 0 críticas — e
// nenhuma delas foi introduzida pelo trabalho da F7. O conserto depende do dono:
// `zod` e `prisma` só saem com quebra de major, e `npm audit fix --force` está
// proibido nesta casa.
//
// Se o portão fosse "zero vulnerabilidades", ele ficaria vermelho desde o primeiro
// dia e ninguém ia saber se a contagem piorou ou melhorou. Por isso este script
// compara com uma **linha de base** versionada: ele falha quando a contagem
// **piora** em qualquer severidade, avisa quando melhora, e nunca instala nada.
//
//   node tools/verifica-audit.cjs           compara com a linha de base
//   node tools/verifica-audit.cjs --json    devolve o JSON do audit
//   node tools/verifica-audit.cjs --base    escreve a linha de base atual
//
// A linha de base mora em `tools/audit-base.json`. Ela é número de medição, não
// credencial: quem lê o arquivo vê quantas vulnerabilidades a casa carrega.

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const RAIZ = path.resolve(__dirname, "..");
const ARQUIVO_DE_BASE = path.join(__dirname, "audit-base.json");

function lerBase() {
  const caminho = process.env.AUDIT_BASE_PATH || ARQUIVO_DE_BASE;
  return JSON.parse(fs.readFileSync(caminho, "utf8"));
}

function hojeLocal() {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

function audit() {
  // `AUDIT_JSON_FIXO` aponta para um arquivo JSON no mesmo formato do
  // `npm audit --json`. É o que permite ao teste permanente provar o portão sem
  // depender da rede — e sem instalar nada.
  if (process.env.AUDIT_JSON_FIXO) {
    return JSON.parse(fs.readFileSync(process.env.AUDIT_JSON_FIXO, "utf8"));
  }

  // `npm audit --json` sai com código 1 quando encontra vulnerabilidade — esse
  // código é o resultado, não uma falha do comando. Por isso o `stdio` ignora o
  // erro e o JSON é lido da saída.
  //
  // No Windows o executável do npm é `npm.cmd`, e o Node moderno recusa
  // `spawn` de arquivo `.cmd` sem shell (medido: EINVAL). No CI (Linux) é
  // `npm`. A lista de argumentos é fixa e não vem de entrada de ninguém, então
  // o shell não abre espaço para injeção.
  const executavel = process.platform === "win32" ? "npm.cmd" : "npm";
  let texto = "";
  try {
    texto = execFileSync(executavel, ["audit", "--json"], {
      cwd: RAIZ,
      encoding: "utf8",
      maxBuffer: 64e6,
      stdio: ["ignore", "pipe", "ignore"],
      shell: true,
    });
  } catch (erro) {
    if (erro?.status === 1 && typeof erro.stdout === "string" && erro.stdout.trim().length > 0) {
      texto = erro.stdout;
    } else {
      throw erro;
    }
  }
  return JSON.parse(texto);
}

function contagensDo(dados) {
  const meta = dados?.metadata?.vulnerabilities;
  const severidades = ["info", "low", "moderate", "high", "critical"];
  if (dados?.error || !meta || [...severidades, "total"].some((chave) => !Number.isSafeInteger(meta[chave]) || meta[chave] < 0)) {
    throw new Error("audit: resposta ausente ou invalida; nenhuma contagem foi aprovada.");
  }
  if (severidades.reduce((soma, chave) => soma + meta[chave], 0) !== meta.total) {
    throw new Error("audit: total inconsistente; nenhuma contagem foi aprovada.");
  }
  return Object.fromEntries([...severidades, "total"].map((chave) => [chave, meta[chave]]));
}

// A comparação é a parte que decide: falha quando piora em qualquer severidade
// ou no total, avisa quando melhora, e fica quieta quando é o mesmo número.
function comparar(anterior, atual) {
  const piorou = [];
  for (const chave of ["critical", "high", "moderate", "low", "info"]) {
    const agora = atual[chave] ?? 0;
    const antes = anterior[chave] ?? 0;
    if (agora > antes) piorou.push(`${chave}: ${antes} -> ${agora}`);
  }
  if ((atual.total ?? 0) > (anterior.total ?? 0)) {
    piorou.push(`total: ${anterior.total} -> ${atual.total}`);
  }
  const melhorou = (atual.total ?? 0) < (anterior.total ?? 0);
  return { piorou, melhorou };
}

function main() {
  const argumentos = process.argv.slice(2);
  const dados = audit();
  const atual = contagensDo(dados);

  if (argumentos.includes("--json")) {
    console.log(JSON.stringify({ metadata: dados.metadata, vulnerabilities: dados.vulnerabilities }, null, 2));
    return 0;
  }

  if (argumentos.includes("--base")) {
    fs.writeFileSync(
      ARQUIVO_DE_BASE,
      JSON.stringify(
        {
          medidoEm: hojeLocal(),
          contagens: atual,
          nota: "Numero de medicao do npm audit. O portao falha quando a contagem piora.",
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
    console.log(`linha de base escrita: ${JSON.stringify(atual)}`);
    return 0;
  }

  const base = lerBase();
  const anterior = base.contagens;
  console.log(`linha de base (${base.medidoEm}): ${JSON.stringify(anterior)}`);
  console.log(`medido agora:            ${JSON.stringify(atual)}`);

  const { piorou, melhorou } = comparar(anterior, atual);

  if (piorou.length > 0) {
    console.error(`audit: a contagem de vulnerabilidades PIOROU (${piorou.join("; ")})`);
    console.error("O conserto de dependencia depende do dono: ver achado N86 em docs/AUDITORIA.md.");
    return 1;
  }

  if (melhorou) {
    console.log("aviso: a contagem melhorou. Rode `node tools/verifica-audit.cjs --base` para baixar a linha de base.");
    return 0;
  }

  console.log("ok: a contagem de vulnerabilidades nao piorou.");
  return 0;
}

module.exports = { comparar, contagensDo, lerBase };

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch {
    console.error("audit: falha ao obter ou validar a medicao; nenhuma contagem foi aprovada.");
    process.exitCode = 1;
  }
}
