// Lint da casa — o que o compilador não cobra.
//
// O porquê de existir: o TypeScript já cobra tipo, e o `tsconfig` do painel já
// cobra variável e import não usados (`noUnusedLocals`). O que sobra — e é o que
// a casa já escreveu como regra em outros lugares — é o conjunto de deslizes que
// o compilador aceita e que aqui não passam:
//
//   1. `console.log` / `console.debug` esquecidos no código de produção. A API
//      tem logger estruturado; um `console.log` solto na rota é ruído que
//      ninguém lê e que vaza dado no log do provedor.
//   2. `debugger` — nobody debugging in production.
//   3. `@ts-ignore` / `@ts-expect-error` **sem justificativa**: silenciar o
//      compilador é uma decisão, e decisão sem texto escrito é decisão que o
//      próximo não entende e não consegue reverter.
//   4. `any` explícito: é a porta por onde o tipo do produto se perde.
//
// Por que a casa tem o seu próprio em vez de instalar o ESLint: instalar
// dependência nova pede aval do dono (regra permanente deste projeto), e o que
// este arquivo faz é pequeno, testável e usa o compilador que já está no
// projeto — o `typescript` é devDependency da API e do painel, então a
// ferramenta não acrescenta nada ao `package-lock.json`.
//
// Como roda: `node tools/verifica-lint.cjs` varre o código de produção e sai
// com código 1 se achar alguma violação. `--prova` processa uma amostra com
// violações de propósito e serve para provar que o detector ainda enxerga.

const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const RAIZ = path.resolve(__dirname, "..");

// Só código de produção. Teste e ferramenta têm regras próprias (e a régua de
// placeholder, a de links e a de caracteres já são testes separados).
const ALVOS = [
  path.join("apps", "api", "src"),
  path.join("apps", "web", "src"),
  path.join("api"),
];

const EXTENSOES = new Set([".ts", ".tsx"]);

// `console.error` e `console.warn` são permitidos: no painel, `console.error` é
// como o erro chega ao console do navegador quando não há quem o trate. O que
// não passa é o log de debug, que não tem consumidor.
const CONSOLES_PROIBIDOS = new Set(["log", "debug"]);
const DIRETIVAS_DE_SILENCIO = ["@ts-ignore", "@ts-expect-error"];

function arquivosDe(alvo) {
  const absoluto = path.join(RAIZ, alvo);
  if (!fs.existsSync(absoluto)) return [];
  if (fs.statSync(absoluto).isFile()) {
    return EXTENSOES.has(path.extname(absoluto)) ? [absoluto] : [];
  }
  const encontrados = [];
  const pilha = [absoluto];
  while (pilha.length > 0) {
    const atual = pilha.pop();
    for (const entrada of fs.readdirSync(atual, { withFileTypes: true })) {
      const completo = path.join(atual, entrada.name);
      if (entrada.isDirectory()) {
        if (entrada.name === "node_modules" || entrada.name === "dist" || entrada.name === "coverage") {
          continue;
        }
        pilha.push(completo);
      } else if (EXTENSOES.has(path.extname(completo))) {
        encontrados.push(completo);
      }
    }
  }
  return encontrados.sort();
}

// Devolve "arquivo:linha regra" — sem o trecho do código, porque a saída do
// lint vai para o console do CI e para o relatório, e um trecho de código com
// dado dentro é exatamente o que a casa não quer espalhar.
// Diretiva de silenciamento: precisa de justificativa escrita. A justificativa
// é o resto da linha depois da diretiva, ou a linha seguinte.
function diretivasSemJustificativa(linhas) {
  const achados = [];
  for (let i = 0; i < linhas.length; i++) {
    const linhaAtual = linhas[i] ?? "";
    for (const diretiva of DIRETIVAS_DE_SILENCIO) {
      const posicao = linhaAtual.indexOf(diretiva);
      if (posicao === -1) continue;
      const resto = linhaAtual.slice(posicao + diretiva.length).replace(/^[^\w]*/, "").trim();
      // A justificativa pode ser o resto da propria linha ou um comentario na
      // linha seguinte. Codigo na linha seguinte nao justifica nada: e a
      // proxima declaracao, nao a razao do silenciamento.
      const seguinte = (linhas[i + 1] ?? "").trim();
      const seguinteEComentario = seguinte.startsWith("//") || seguinte.startsWith("/*");
      const motivoSeguinte = seguinteEComentario ? seguinte.replace(/^\/\/|^\/\*|\*\/$/g, "").trim() : "";
      if (resto.length === 0 && motivoSeguinte.length === 0) {
        achados.push({ linha: i + 1, diretiva });
      }
    }
  }
  return achados;
}

function achadosNoTexto(caminhoAbsoluto, texto) {
  const relativo = path.relative(RAIZ, caminhoAbsoluto).split(path.sep).join("/");
  const achados = [];

  const fonte = ts.createSourceFile(caminhoAbsoluto, texto, ts.ScriptTarget.ES2022, true);
  const linha = (pos) => fonte.getLineAndCharacterOfPosition(pos).line + 1;

  const visitar = (no) => {
    if (ts.isCallExpression(no) && (ts.isPropertyAccessExpression(no.expression) || ts.isElementAccessExpression(no.expression))) {
      const acesso = no.expression;
      const alvo = acesso.expression;
      const metodo = ts.isPropertyAccessExpression(acesso)
        ? acesso.name.text
        : ts.isStringLiteralLike(acesso.argumentExpression) ? acesso.argumentExpression.text : null;
      if (
        ts.isIdentifier(alvo) &&
        alvo.text === "console" &&
        CONSOLES_PROIBIDOS.has(metodo)
      ) {
        achados.push(`${relativo}:${linha(no.getStart(fonte))} console.${metodo}`);
      }
    }
    if (ts.isDebuggerStatement(no)) {
      achados.push(`${relativo}:${linha(no.getStart(fonte))} debugger`);
    }
    if (ts.isTypeNode(no) && no.kind === ts.SyntaxKind.AnyKeyword) {
      achados.push(`${relativo}:${linha(no.getStart(fonte))} any`);
    }
    ts.forEachChild(no, visitar);
  };
  visitar(fonte);

  // Diretiva de silenciamento: precisa de justificativa escrita. A justificativa
  // é o resto da linha depois da diretiva, ou a linha seguinte.
  const linhas = texto.split(/\r?\n/);
  for (const achado of diretivasSemJustificativa(linhas)) {
    achados.push(`${relativo}:${achado.linha} ${achado.diretiva} sem justificativa`);
  }

  return achados;
}

function achadosNoArquivo(caminhoAbsoluto) {
  return achadosNoTexto(caminhoAbsoluto, fs.readFileSync(caminhoAbsoluto, "utf8"));
}

function achadosDaArvore() {
  const achados = [];
  let lidos = 0;
  for (const alvo of ALVOS) {
    for (const arquivo of arquivosDe(alvo)) {
      lidos += 1;
      achados.push(...achadosNoArquivo(arquivo));
    }
  }
  return { lidos, achados };
}

// Amostra de prova: violações de propósito, escritas de um jeito que a varredura
// do código de produção não pega — as linhas ficam em string, não em código.
function prova() {
  const fonte = [
    "const x = 1;",
    "console.log('x');",
    "console.debug('x');",
    "console.error('erro');",
    "const y: any = 2;",
    "function f(): any { return 3; }",
    "// @ts-ignore",
    "const z = 4;",
  ].join("\n");
  return achadosNoTexto(path.join(RAIZ, "prova.ts"), fonte).map((achado) => achado.replace(/^prova\.ts:\d+ /, ""));
}

module.exports = { achadosNoArquivo, achadosDaArvore, prova };

if (require.main === module) {
  if (process.argv.includes("--prova")) {
    const achados = prova();
    console.log(`amostra de prova: ${achados.length} achados -> ${achados.join(", ")}`);
    // A prova só passa se o detector enxergar tudo que ela plantou.
    const esperado = ["console.log", "console.debug", "any", "any", "@ts-ignore sem justificativa"];
    const faltando = esperado.filter((e) => !achados.includes(e));
    if (faltando.length > 0) {
      console.error(`prova falhou: o detector nao viu ${faltando.join(", ")}`);
      process.exit(1);
    }
    console.log("ok: o detector enxerga console.log, console.debug, any e ts-ignore sem justificativa");
    process.exit(0);
  }

  const { lidos, achados } = achadosDaArvore();
  console.log(`arquivos de producao lidos: ${lidos}`);
  if (achados.length === 0) {
    console.log("ok: nenhuma violacao de lint no codigo de producao");
    process.exit(0);
  }
  for (const achado of achados) console.log(achado);
  console.error(`lint: ${achados.length} violacao(oes) no codigo de producao`);
  process.exit(1);
}
