import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// F1.1 do PROMPT MESTRE: o projeto inteiro — código, teste, ferramenta, documentação e
// mensagem de commit — é escrito em português do Brasil e inglês técnico, em alfabeto
// latino. Este arquivo é a porta permanente: varre a árvore rastreada pelo git e falha
// se aparecer caractere de script não latino.
//
// A lista é montada com propriedades Unicode (\p{Script=...}) de propósito, do mesmo
// jeito que o teste de identificadores monta o segredo por fragmentos: um guarda que
// caça caractere proibido não pode escrever o caractere proibido no próprio fonte,
// senão ele seria a primeira violação da varredura que deveria pegar.
//
// O que fica fora, de propósito: sinais de Script=Common (travessão, seta, mais-menos,
// ordinais, moeda, números, símbolos matemáticos). Eles não são alfabeto, são pontuação
// e notação, e o texto do projeto usa vários. Grego e copta entram porque são alfabetos
// não latinos, ainda que pareçam inocentes: o caractere que quebra a regra costuma ser
// justamente o que ninguém pensou que estava ali.

const RAIZ = resolve(process.cwd(), "..", ".."); // apps/api -> raiz do monorepo

// Arquivos que não são texto: varredura de caractere só faz sentido em texto. Binário
// aqui é imagem, fonte, pacote e mídia — nunca fonte de código ou documento.
const BINARIO =
  /\.(png|jpe?g|webp|avif|jxl|gif|ico|bmp|woff2?|ttf|otf|eot|zip|gz|tgz|pdf|mp3|mp4|webm)$/i;

const SCRIPTS_NAO_LATINOS =
  "[\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Hangul}" +
  "\\p{Script=Cyrillic}\\p{Script=Arabic}\\p{Script=Hebrew}\\p{Script=Thai}" +
  "\\p{Script=Devanagari}\\p{Script=Armenian}\\p{Script=Georgian}\\p{Script=Tibetan}" +
  "\\p{Script=Ethiopic}\\p{Script=Cherokee}\\p{Script=Syriac}\\p{Script=Khmer}" +
  "\\p{Script=Lao}\\p{Script=Myanmar}\\p{Script=Mongolian}\\p{Script=Sinhala}" +
  "\\p{Script=Thaana}\\p{Script=Nko}\\p{Script=Ogham}\\p{Script=Runic}" +
  "\\p{Script=Bengali}\\p{Script=Gujarati}\\p{Script=Gurmukhi}\\p{Script=Telugu}" +
  "\\p{Script=Kannada}\\p{Script=Malayalam}\\p{Script=Tamil}\\p{Script=Greek}" +
  "\\p{Script=Coptic}\\p{Script=Old_Italic}\\p{Script=Gothic}]";

function proibidos(): RegExp {
  return new RegExp(SCRIPTS_NAO_LATINOS, "gu");
}

// Devolve "onde:linha U+XXXX" para cada caractere proibido. Nunca devolve o caractere:
// a saída vai para o console do vitest e para o relatório, e se a regra é não espalhar
// o caractere, o teste que aplica a regra é o primeiro que tem de respeitar isso.
function violacoesDe(texto: string, onde: string, mostrarLinha: boolean): string[] {
  const achados: string[] = [];
  const linhas = texto.split(/\r?\n/);
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i] ?? "";
    for (const m of linha.matchAll(proibidos())) {
      const cp = (m[0].codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0");
      achados.push(`${onde}${mostrarLinha ? ":" + (i + 1) : ""} U+${cp}`);
    }
  }
  return achados;
}

function arquivosRastreados(): string[] {
  // --cached (o que o git já acompanha) + --others --exclude-standard (arquivo novo,
  // ainda não indexado, que não esteja no .gitignore). Sem a segunda metade, um
  // caractere proibido entraria no commit seguinte sem ser pego: a varredura olharia
  // só para a lista de antes dele existir.
  const saida = execFileSync(
    "git",
    ["-C", RAIZ, "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { maxBuffer: 64e6 },
  );
  return saida.toString("utf8").split("\0").filter(Boolean);
}

// A lista é montada uma vez e reaproveitada: varrer 393 arquivos a cada asserção
// custaria tempo e não acrescentaria garantia nenhuma.
const ARVORE = arquivosRastreados();

function varreduraDaArvore(): { lidos: number; violacoes: string[] } {
  const violacoes: string[] = [];
  let lidos = 0;
  for (const arquivo of ARVORE) {
    if (BINARIO.test(arquivo)) continue;
    let texto: string;
    try {
      texto = readFileSync(resolve(RAIZ, arquivo), "utf8");
    } catch {
      continue; // listado pelo git e ausente no disco: problema de checkout, não de caractere
    }
    if (texto.includes("\u0000")) continue; // binário sem extensão também não é texto
    lidos += 1;
    violacoes.push(...violacoesDe(texto, arquivo, true));
  }
  return { lidos, violacoes };
}

describe("Caracteres permitidos: só alfabeto latino (F1.1)", () => {
  it("o detector funciona: encontra script proibido e não encontra texto latino", () => {
    // O caractere de prova nasce de code point, nunca de literal escrito no fonte.
    const amostraProibida = "total " + String.fromCodePoint(0x4e00) + " 100";
    const amostraLatina = "total R$ 1.234,56 — soma das linhas x = 10";
    expect(violacoesDe(amostraProibida, "amostra", false)).toEqual(["amostra U+4E00"]);
    expect(violacoesDe(amostraLatina, "amostra", false)).toEqual([]);
  });

  it("nenhum arquivo rastreado tem caractere de alfabeto não latino", () => {
    const { lidos, violacoes } = varreduraDaArvore();
    // Prova de que a varredura percorreu a árvore inteira, e não um subconjunto.
    expect(lidos).toBeGreaterThan(250);
    expect(violacoes, violacoes.slice(0, 30).join(" | ")).toEqual([]);
  });

  it("a mensagem do commit no topo da árvore é escrita em alfabeto latino", () => {
    const mensagem = execFileSync("git", ["-C", RAIZ, "log", "-1", "--format=%B"], {
      encoding: "utf8",
      maxBuffer: 8e6,
    });
    expect(violacoesDe(mensagem, "HEAD", false)).toEqual([]);
  });

  it("o próprio guarda não escreve caractere proibido no fonte", () => {
    const fonte = readFileSync(resolve(RAIZ, "apps/api/test/caracteres-permitidos.test.ts"), "utf8");
    expect(violacoesDe(fonte, "caracteres-permitidos.test.ts", true)).toEqual([]);
    // A lista de scripts é escrita com \p{...}. Se alguém trocar por faixa literal, a
    // primeira asserção continua válida, mas o fonte passaria a carregar o proibido.
    expect(fonte).toContain("\\p{Script=Han}");
  });
});
