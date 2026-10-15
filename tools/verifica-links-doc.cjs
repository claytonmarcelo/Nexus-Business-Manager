#!/usr/bin/env node
// Guarda de links da documentação de entrada.
//
// O README e o docs/README.md sao as duas portas de quem chega ao repositório sem
// conhecer a casa: um link quebrado ali nao e detalhe de formatacao, e a pessoa
// parando na frente de uma porta que nao abre. Este arquivo percorre os dois e
// falha (codigo de saida 1) em dois casos:
//
//   1. link ou imagem relativa apontando para arquivo que nao existe na arvore;
//   2. marcador de rascunho `[[` que sobrou do texto proposto pelo dono.
//
// Link externo (http, https, mailto) e ancora sozinha (#...) nao sao conferidos:
// aqui a pergunta e "a casa esta inteira?", e a resposta esta no disco. O que fica
// dentro de bloco de codigo tambem nao e link — e exemplo de terminal.
//
// Uso: node tools/verifica-links-doc.cjs   (saida: contagem e a lista do que quebrou)
const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const ARQUIVOS = ["README.md", path.join("docs", "README.md")];

// `[...]` antes do `(``): o `!` inicial marca imagem, o resto e link. A aspa opcional
// e o formato que alguns editores geram; o espaco depois do parente fecha e tolerated.
const MARCA = /!?\[[^\]]*\]\(\s*<?([^\s)>]+)>?[^)]*\)/g;

function linksDe(texto) {
  const linhas = texto.split(/\r?\n/);
  const achados = [];
  let emBloco = false;
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    if (/^\s*(```|~~~)/.test(linha)) {
      emBloco = !emBloco;
      continue;
    }
    if (emBloco) continue;
    for (const m of linha.matchAll(MARCA)) {
      achados.push({ alvo: m[1], linha: i + 1 });
    }
  }
  return achados;
}

function externo(alvo) {
  return /^[a-z][a-z0-9+.-]*:/i.test(alvo) || alvo.startsWith("#");
}

let quebrados = 0;
let conferidos = 0;
let marcadores = 0;

for (const relativo of ARQUIVOS) {
  const caminho = path.join(RAIZ, relativo);
  if (!fs.existsSync(caminho)) {
    console.error(relativo + ": nao existe na raiz");
    quebrados += 1;
    continue;
  }
  const texto = fs.readFileSync(caminho, "utf8");
  const pasta = path.dirname(caminho);

  for (const alvo of linksDe(texto)) {
    if (externo(alvo.alvo)) continue;
    const semAncora = alvo.alvo.split("#")[0];
    if (semAncora === "") continue;
    conferidos += 1;
    const destino = path.resolve(pasta, decodeURI(semAncora));
    if (!fs.existsSync(destino)) {
      console.error(relativo + ":" + alvo.linha + " aponta para " + alvo.alvo + ", que nao existe");
      quebrados += 1;
    }
  }

  const linhas = texto.split(/\r?\n/);
  for (let i = 0; i < linhas.length; i++) {
    if (linhas[i].includes("[[")) {
      console.error(relativo + ":" + (i + 1) + " tem marcador de rascunho: " + linhas[i].trim().slice(0, 80));
      marcadores += 1;
    }
  }
}

console.log("links relativos conferidos: " + conferidos + " | quebrados: " + quebrados + " | marcadores [[ : " + marcadores);
if (quebrados > 0 || marcadores > 0) {
  console.error("falhou: a documentacao de entrada esta com porta que nao abre");
  process.exit(1);
}
console.log("ok: toda porta da documentacao de entrada existe, e nenhum rascunho sobrou");
