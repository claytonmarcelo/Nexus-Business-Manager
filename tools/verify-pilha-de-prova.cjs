// Prova do N65: a pilha de prova nao pega a porta de quem trabalha.
//
// Sao duas metades, e as duas tem saida real:
//
//   A) a resolucao de endereco em si — ambiente vence ponteiro, ponteiro vence a casa,
//      e um ponteiro escrito por um servidor que ja morreu nao vale nada;
//   B) a varredura das ferramentas: nenhuma tools/verify-*.cjs, tools/shoot-*.cjs ou
//      tools/audit-*.cjs pode carregar a porta escrita a mao, porque foi exatamente
//      isso que fez a prova de navegador escrever no banco errado.
//
// O script nao abre navegador nem toca banco: ele mede a topologia, que e o que o
// achado pede. Uso: node tools/verify-pilha-de-prova.cjs
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const TOOLS = __dirname;
const PONTEIRO = path.join(TOOLS, "ponteiro-de-prova.local.json");
const CASA = { web: "http://localhost:5173", api: "http://localhost:3001" };
const PROVA = { web: "http://localhost:5174", api: "http://localhost:3002" };

let falhas = 0;
let feitas = 0;
function confere(ok, rotulo, detalhe) {
  if (ok) {
    feitas++;
  } else {
    falhas++;
    console.log("  FALHA: " + rotulo + (detalhe ? " — " + detalhe : ""));
  }
}

// Cada caso roda num processo proprio, com um ponteiro de mentirinha no lugar do real:
// resolucao de endereco le `process.env` e o disco na hora de responder, entao medir
// dentro deste processo exigiria sujar o ambiente (ou o arquivo) da corrida inteira.
const CASO = path.join(os.tmpdir(), "nexus-caso-pilha-de-prova.cjs");
fs.writeFileSync(
  CASO,
  [
    'const fs = require("fs");',
    "const PONTEIRO = " + JSON.stringify(PONTEIRO) + ";",
    // O ponteiro do caso chega por variavel de ambiente e e lido NA HORA que o caso
    // roda. Gravar o conteudo no arquivo do caso seria pior do que parece: os quatro
    // casos compartilham o mesmo arquivo, e o primeiro conteudo congelaria os outros tres.
    "const CONTEUDO = String(process.env.NEXUS_CASO_PONTEIRO || \"\");",
    "const backup = fs.existsSync(PONTEIRO) ? fs.readFileSync(PONTEIRO, \"utf8\") : null;",
    "function devolve() {",
    "  if (backup === null) { try { fs.unlinkSync(PONTEIRO); } catch {} }",
    "  else fs.writeFileSync(PONTEIRO, backup);",
    "}",
    "if (CONTEUDO === \"__sem_arquivo__\") { try { fs.unlinkSync(PONTEIRO); } catch {} }",
    "else fs.writeFileSync(PONTEIRO, CONTEUDO);",
    "const p = require(" + JSON.stringify(path.join(TOOLS, "pilha-de-prova.cjs")) + ");",
    "try {",
    "  console.log(p.baseDoNavegador() + \"|\" + p.raizDaApi() + \"|\" + p.pilhaDeProvaNoAr());",
    "} finally {",
    "  devolve();",
    "}",
    "",
  ].join("\n"),
  "utf8"
);

function caso(nome, ponteiro, ambiente) {
  const rodado = spawnSync(process.execPath, [CASO], {
    encoding: "utf8",
    // NEXUS_QUIETO: a linha de topology que o helper imprime ao nascer e justamente o
    // que estamos medindo aqui, entao ela nao pode entrar na saida do caso.
    env: { ...process.env, NEXUS_QUIETO: "1", NEXUS_CASO_PONTEIRO: ponteiro, ...ambiente },
  });
  if (rodado.status !== 0) {
    throw new Error("o caso \"" + nome + "\" nao rodou: " + String(rodado.stderr).split("\n").filter(Boolean)[0]);
  }
  return rodado.stdout.trim();
}

console.log("A) resolucao de endereco (tools/pilha-de-prova.cjs)");

// O proprio arquivo de estado desta medicao: se a pilha estiver de pe agora, os casos
// com ponteiro de mentirinha tem que devolver o ponteiro verdadeiro no final, e a
// assercao "leitura de ponteiro morto limpa o disco" nao pode ser cobrada — ela so vale
// quando nao ha pilha nenhuma no ar.
const self = require(path.join(TOOLS, "pilha-de-prova.cjs"));
const tinhaPonteiroVivo = !!self.lePonteiro();
if (tinhaPonteiroVivo) console.log("  nota: a pilha de prova esta de pe durante esta medicao; o caso de limpeza fica de fora.");

const semNada = caso("sem ponteiro", "__sem_arquivo__", { NEXUS_WEB: "", NEXUS_API: "" });
confere(semNada === CASA.web + "|" + CASA.api + "|false", "sem ponteiro e sem variavel, aparecem as portas do dono (5173/3001)", semNada);

const comPonteiro = caso(
  "ponteiro vivo",
  JSON.stringify({ ...PROVA, pid: process.pid }),
  { NEXUS_WEB: "", NEXUS_API: "" }
);
confere(comPonteiro === PROVA.web + "|" + PROVA.api + "|true", "ponteiro do servidor de prova vivo muda as duas pontas para 5174/3002", comPonteiro);

const pidMorto = caso(
  "ponteiro morto",
  JSON.stringify({ web: "http://localhost:59999", api: "http://localhost:59998", pid: 2147483000 }),
  { NEXUS_WEB: "", NEXUS_API: "" }
);
confere(pidMorto === CASA.web + "|" + CASA.api + "|false", "ponteiro escrito por um servidor que ja morreu nao leva ninguem para lugar nenhum", pidMorto);

// O caso do ponteiro morto deixa o arquivo atras? Nao pode: quem leu ja sabe que a
// pilha caiu, e um endereco zombie no disco e exatamente a armadilha do N65.
if (!tinhaPonteiroVivo) {
  confere(!fs.existsSync(PONTEIRO), "a leitura de um ponteiro morto limpa o arquivo do disco", fs.existsSync(PONTEIRO) ? "ainda existe" : "nao existe");
}

const comEnv = caso(
  "variavel de ambiente",
  JSON.stringify({ ...PROVA, pid: process.pid }),
  { NEXUS_WEB: "http://localhost:4321", NEXUS_API: "http://localhost:4322" }
);
confere(comEnv === "http://localhost:4321|http://localhost:4322|true", "NEXUS_WEB/NEXUS_API definidos por quem roda a prova tem a ultima palavra", comEnv);

console.log("B) nenhuma ferramenta de navegador carrega a porta escrita a mao");
// Exceção declarada, e ela é estreita de propósito: este próprio arquivo precisa escrever
// "http://localhost:5173" para poder conferir que a casa continua nas portas do dono. As
// outras duas são as pontas que definem a topologia (o helper e o servidor de prova).
const FORA_DA_REGUA = new Set(["verify-pilha-de-prova.cjs"]);
const ferramentas = fs
  .readdirSync(TOOLS)
  .filter((n) => /^(verify|shoot|audit)-.*\.cjs$/.test(n) && !FORA_DA_REGUA.has(n))
  .sort();
confere(ferramentas.length >= 34, "a lista de ferramentas sob a regua esta completa (medido nesta rodada: 34)", ferramentas.length + " arquivos");

const quebradas = [];
for (const nome of ferramentas) {
  // Sem filtrar comentario: "http://..." dentro de uma string contem "//", e apagar
  // o resto da linha a partir dai apagaria justamente a porta que estamos caçando.
  const texto = fs.readFileSync(path.join(TOOLS, nome), "utf8");
  const usaHelper = /pilha-de-prova/.test(texto);
  const portaMao = /localhost:(5173|3001)/.test(texto);
  if (!usaHelper || portaMao) quebradas.push(nome + (!usaHelper ? " (sem helper)" : "") + (portaMao ? " (porta a mao)" : ""));
}
for (const nome of quebradas) confere(false, "a ferramenta resolve as duas pontas pela pilha-de-prova", nome);
if (quebradas.length === 0) feitas++;

console.log("C) nenhuma prova reescreve a captura canonica por cima");
// `docs/screenshots/` e o entregavel: as seis telas do README e as capturas de prova
// revisadas pixel a pixel. Rodar uma prova contra a pilha de prova mostra outros
// numeros e outros nomes naquela mesma tela, e isso nao pode virar commit. A saida da
// prova vai para o lado (docs/screenshots-prova/, ignorada pelo git), entao toda
// ferramenta que grava imagem tem que gravar por `pastaDeCaptura`.
const gravadores = [];
for (const nome of ferramentas) {
  const texto = fs.readFileSync(path.join(TOOLS, nome), "utf8");
  const grava = /page\.screenshot\(/.test(texto) || /screenshot\(\{\s*path:/.test(texto);
  if (!grava) continue;
  const usaPasta = /pastaDeCaptura\(/.test(texto);
  const caminhoCru = /"(?:\.\.[/\\], )?"?docs[/\\]screenshots"/.test(texto.replace(/pastaDeCaptura\("docs\/screenshots"\)/g, ""));
  const joinCru = /path\.join\([^)]*"docs",\s*"screenshots"/.test(texto);
  if (!usaPasta || caminhoCru || joinCru) {
    gravadores.push(nome + (!usaPasta ? " (grava em docs/screenshots direto)" : "") + (joinCru ? " (path.join canonico)" : ""));
  }
}
for (const nome of gravadores) confere(false, "a ferramenta grava captura pela pasta da pilha", nome);
if (gravadores.length === 0) {
  feitas++;
  console.log("  (" + ferramentas.filter((n) => /page\.screenshot\(/.test(fs.readFileSync(path.join(TOOLS, n), "utf8"))).length + " ferramentas gravam captura, todas pela pasta certa)");
}

fs.unlinkSync(CASO);

console.log("");
console.log(falhas === 0 ? "ok: " + feitas + " verificacoes, 0 falhas" : "FALHOU: " + falhas + " falha(s) em " + (feitas + falhas) + " verificacoes");
process.exit(falhas === 0 ? 0 : 1);
