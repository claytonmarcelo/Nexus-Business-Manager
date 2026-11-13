// O portão de cobertura — por arquivo, com a linha de base versionada.
//
// A cobertura da API é medida pelo vitest (com o v8), e o relatório em JSON
// fica em `apps/api/coverage/coverage-summary.json`. Este script é o portão:
// ele lê o resumo e falha quando algum arquivo de produção cai abaixo do piso.
//
// Por que um script e não o `thresholds` do vitest: o threshold do vitest sabe
// dizer que algo quebrou, e só isso. O script sabe dizer **qual** arquivo
// quebrou, e cada arquivo exceptuado tem um **motivo escrito** no arquivo de
// linha de base (`tools/cobertura-base.json`). Exceção sem motivo é dívida
// escondida; aqui o motivo fica ao lado do número.
//
// O que é o piso, exatamente: o número que a cobertura do arquivo tinha quando
// a linha de base foi escrita. O portão não exige que o arquivo chegue a um
// número ideal — exige que ele **não piore**. É a mesma philosophy do portão do
// `npm audit`: um piso que a casa ainda não alcança reprovaria o build desde o
// primeiro dia, e um build vermelho todo dia é um build que ninguém lê.
//
//   node tools/verifica-cobertura.cjs            compara com a linha de base
//   node tools/verifica-cobertura.cjs --base     escreve a linha de base
//
// O caminho do resumo e o da linha de base podem ser trocados por variável de
// ambiente, que é o que permite ao teste permanente provar o portão sem
// esperar a suíte inteira rodar.

const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.resolve(__dirname, "..");
const RESUMO = process.env.COBERTURA_RESUMO || path.join(RAIZ, "apps", "api", "coverage", "coverage-summary.json");
const BASE = process.env.COBERTURA_BASE || path.join(__dirname, "cobertura-base.json");

const MEDIDAS = ["statements", "branches", "functions", "lines"];

function lerJson(caminho) {
  return JSON.parse(fs.readFileSync(caminho, "utf8"));
}

function percentual(medida) {
  if (!medida || typeof medida.pct !== "number") return 0;
  return medida.pct;
}

// O relatório usa caminho absoluto; a linha de base usa caminho relativo ao
// pacote da API. Comparar os dois exige o mesmo formato — aqui o caminho é
// normalizado para `src/...`.
function chaveRelativa(caminho) {
  const normalizado = caminho.split(path.sep).join("/");
  const marcador = "/apps/api/";
  const posicao = normalizado.lastIndexOf(marcador);
  if (posicao !== -1) return normalizado.slice(posicao + marcador.length);
  const marcador2 = "apps/api/";
  const posicao2 = normalizado.lastIndexOf(marcador2);
  if (posicao2 !== -1) return normalizado.slice(posicao2 + marcador2.length);
  return normalizado;
}

function medir() {
  const resumo = lerJson(RESUMO);
  const total = resumo.total || {};
  const arquivos = [];
  for (const [caminho, medidas] of Object.entries(resumo)) {
    if (caminho === "total") continue;
    arquivos.push({ chave: chaveRelativa(caminho), medidas });
  }
  arquivos.sort((a, b) => a.chave.localeCompare(b.chave));
  return { global: total, arquivos };
}

function avaliar(base, medido) {
  const abaixoDoPiso = [];
  const exceptuados = [];
  const semLinhaDeBase = [];
  const presentes = new Set(medido.arquivos.map((arquivo) => arquivo.chave));
  for (const chave of Object.keys(base.porArquivo || {})) {
    if (!presentes.has(chave)) abaixoDoPiso.push(`${chave} — ausente do resumo de cobertura`);
  }

  for (const arquivo of medido.arquivos) {
    const excecao = base.exceptuados && base.exceptuados[arquivo.chave];
    const pisoPorArquivo = base.porArquivo && base.porArquivo[arquivo.chave];
    if (excecao && excecao.semPiso) {
      if (typeof excecao.motivo !== "string" || !excecao.motivo.trim()) {
        abaixoDoPiso.push(`${arquivo.chave} — excecao sem motivo`);
      } else {
        exceptuados.push({ arquivo: arquivo.chave, motivo: excecao.motivo });
        continue;
      }
    }
    if (!pisoPorArquivo) {
      // Arquivo novo, sem número na linha de base: não reprova (a casa ainda
      // não mediu o que ele valia), mas é nomeado — arquivo que entra no
      // código sem cobertura e sem registro na base é dívida que ninguém viu.
      semLinhaDeBase.push(arquivo.chave);
      continue;
    }
    for (const medida of MEDIDAS) {
      const piso = pisoPorArquivo[medida];
      if (piso === undefined) continue;
      const pct = percentual(arquivo.medidas[medida]);
      if (pct < piso) {
        abaixoDoPiso.push(`${arquivo.chave} — ${medida} ${pct.toFixed(2)}% abaixo do piso ${piso}%`);
      }
    }
  }

  for (const medida of MEDIDAS) {
    const piso = base.global && base.global[medida];
    if (piso === undefined) continue;
    const pct = percentual(medido.global[medida]);
    if (pct < piso) {
      abaixoDoPiso.push(`total — ${medida} ${pct.toFixed(2)}% abaixo do piso ${piso}%`);
    }
  }

  return { abaixoDoPiso, exceptuados, semLinhaDeBase };
}

// A base degenerada é a forma silenciosa de o portão não existir: um piso zero
// para todo arquivo nunca reprova, e a linha de base parece gate e não é. A
// base degenerada é recusada com a instrução de escrever o piso de verdade.
function baseDegenerada(base) {
  // Os dois niveis da base guardam numero puro indexado por medida: o `global`
  // diretamente, e o `porArquivo` um nivel abaixo da chave de caminho. Ler as
  // medidas do mapa de caminhos - que e indexado por arquivo, nao por medida -
  // nao acha piso nenhum, e a base medida parecia degenerada.
  const pisos = [];
  for (const medida of MEDIDAS) {
    const valor = base.global && base.global[medida];
    if (typeof valor === "number") pisos.push(valor);
  }
  for (const medidas of Object.values(base.porArquivo || {})) {
    for (const medida of MEDIDAS) {
      const valor = medidas && medidas[medida];
      if (typeof valor === "number") pisos.push(valor);
    }
  }
  if (pisos.length === 0) return true;
  return pisos.every((piso) => piso <= 0);
}

function main() {
  const argumentos = process.argv.slice(2);
  if (!fs.existsSync(RESUMO)) {
    console.error(`cobertura: o resumo nao existe (${RESUMO}). Rode a suite com cobertura antes.`);
    return 1;
  }
  const medido = medir();

  if (argumentos.includes("--base")) {
    // A linha de base guarda o número que cada arquivo tinha no momento da
    // medição. É ela que o portão compara: o arquivo pode melhorar (e o
    // portão não diz nada), mas não pode piorar.
    const porArquivo = {};
    for (const arquivo of medido.arquivos) {
      porArquivo[arquivo.chave] = Object.fromEntries(
        MEDIDAS.map((medida) => [medida, Number(percentual(arquivo.medidas[medida]).toFixed(2))]),
      );
    }
    const conteudo = {
      medidoEm: new Date().toISOString().slice(0, 10),
      global: Object.fromEntries(
        MEDIDAS.map((medida) => [medida, Number(percentual(medido.global[medida]).toFixed(2))]),
      ),
      porArquivo,
      exceptuados: {},
      nota: "Numero de medicao da cobertura por arquivo. O portao falha quando algum arquivo cai abaixo do que valia aqui.",
    };
    fs.writeFileSync(BASE, JSON.stringify(conteudo, null, 2) + "\n", "utf8");
    console.log(
      `linha de base de cobertura escrita: ${JSON.stringify(conteudo.global)} | ${medido.arquivos.length} arquivos`,
    );
    return 0;
  }

  const base = lerJson(BASE);
  if (baseDegenerada(base)) {
    console.error("cobertura: a linha de base esta degenerada (piso zero em tudo) — ela nao reprovaria nada.");
    console.error("Regrave com `node tools/verifica-cobertura.cjs --base`.");
    return 1;
  }

  const { abaixoDoPiso, exceptuados, semLinhaDeBase } = avaliar(base, medido);

  console.log(`global: ${MEDIDAS.map((m) => `${m} ${percentual(medido.global[m]).toFixed(2)}%`).join(", ")}`);
  console.log(`arquivos medidos: ${medido.arquivos.length} | exceptuados com motivo: ${exceptuados.length}`);
  for (const item of exceptuados) {
    console.log(`  exceptuado: ${item.arquivo} — ${item.motivo}`);
  }
  if (semLinhaDeBase.length > 0) {
    console.log(`  sem linha de base (novos, nao reprovam): ${semLinhaDeBase.join(", ")}`);
  }

  if (abaixoDoPiso.length > 0) {
    console.error("cobertura: arquivos abaixo do piso");
    for (const achado of abaixoDoPiso) console.error(`  ${achado}`);
    return 1;
  }

  console.log("ok: nenhum arquivo de produção ficou abaixo do piso de cobertura.");
  return 0;
}

module.exports = { avaliar, baseDegenerada, medir, percentual };

if (require.main === module) {
  process.exit(main());
}
