import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// F5, item 5: varredura de zero placeholders.
//
// O produto chegou ao ponto em que nenhuma tela precisa mais de "aqui vai depois
// entrar o dado real". Este arquivo e a porta que nao deixa o contrario acontecer: se
// alguem deixar um TODO no meio de um servico, um console.log de depuracao dentro de
// um handler, um Lorem no meio da copia de vitrine ou um dado de exemplo disfarcado de
// resposta, a corrida de testes para.
//
// As cinco marcas sao exatamente as do PROMPT MESTRE: TODO, FIXME, console.log de
// depuracao, "Lorem" e dados mockados fora de teste. O escopo e o codigo de producao
// dos dois apps (apps/web/src e apps/api/src). Teste e o lugar declarado de dado
// fingido -- vi.mock, fabrica de API, fixture de landing -- e por isso fica fora.
//
// Uma decisao que vale registro: "todo" minusculo e palavra do portugues ("em todo o
// produto"), entao o marcador e reconhecido so em caixa alta, como a convencao manda.
// O mesmo raciocinio deixa de fora o placeholder legitimo de input HTML: ali a palavra
// e atributo do framework, nao texto de enchimento. E deixa o mailer nome: "fake"
// (lib/mail/fake.ts), que e a caixa de memoria pre-autorizada em D1, nao um mock: ele
// entrega mensagem de verdade para quem programa, so que na RAM.
//
// O console.log tinha uma excecao que virou regra: os dois sinks de log injetados
// (consoleMailer e iniciarAgendador) escreviam no stdout por parametro padrao, e o
// texto de producao citava um comando de geracao de chave. Os tres foram trocados na
// mesma rodada, entao a regra aqui e absoluta -- nao existe lista de permitidos para
// apodrecer daqui a seis meses.

const RAIZ = resolve(process.cwd(), "..", ".."); // apps/api -> raiz do monorepo

const ESCOPO = /^apps\/(web|api)\/src\//;

// Arquivo de teste: lugar legtimo de mock, fixture e log de diagnostico.
const TESTE = /(\.test\.tsx?|\.spec\.tsx?|[\\/]src[\\/]test[\\/])/;

const REGRAS: { nome: string; padrao: RegExp }[] = [
  { nome: "TODO", padrao: /\bTODO\b/ },
  { nome: "FIXME", padrao: /\bFIXME\b/ },
  { nome: "console.log de depuracao", padrao: /console\.log\s*\(/ },
  { nome: "Lorem", padrao: /\blorem\b/i },
  { nome: "dado mockado", padrao: /\bmock\w*\b|\bdummy\b/i },
];

// Devolve "arquivo:linha [regra] texto" para cada marca proibida. A linha vai cortada:
// quem corre o teste precisa ver onde esta sem abrir o arquivo.
function violacoesDe(texto: string, onde: string): string[] {
  const achados: string[] = [];
  const linhas = texto.split(/\r?\n/);
  for (let i = 0; i < linhas.length; i++) {
    const linha = (linhas[i] ?? "").trim();
    for (const regra of REGRAS) {
      if (regra.padrao.test(linha)) {
        achados.push(`${onde}:${i + 1} [${regra.nome}] ${linha.slice(0, 120)}`);
      }
    }
  }
  return achados;
}

function arquivosDoEscopo(): string[] {
  // --cached + --others --exclude-standard: a mesma formula do guarda de caracteres.
  // Sem a segunda metade, um placeholder novo entraria no commit seguinte sem ser pego.
  const saida = execFileSync(
    "git",
    ["-C", RAIZ, "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { maxBuffer: 64e6 },
  );
  return saida
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .filter((arquivo) => ESCOPO.test(arquivo) && !TESTE.test(arquivo));
}

// A lista e montada uma vez e reaproveitada.
const ARVORE = arquivosDoEscopo();

function varreduraDaArvore(): { lidos: number; violacoes: string[] } {
  const violacoes: string[] = [];
  let lidos = 0;
  for (const arquivo of ARVORE) {
    let texto: string;
    try {
      texto = readFileSync(resolve(RAIZ, arquivo), "utf8");
    } catch {
      continue; // listado pelo git e ausente no disco: problema de checkout, de marca
    }
    lidos += 1;
    violacoes.push(...violacoesDe(texto, arquivo));
  }
  return { lidos, violacoes };
}

describe("Zero placeholders na arvore de producao (F5, item 5)", () => {
  it("o detector funciona: encontra as cinco marcas e nao encontra o portugues", () => {
    const amostraProibida = [
      "// TODO: ligar no gateway",
      "// FIXME: isso estourou em producao",
      "console.log('veja o que chegou', payload);",
      "<p>Lorem ipsum dolor sit amet</p>",
      "const usuarios = mockUsers;",
    ].join("\n");
    const achados = violacoesDe(amostraProibida, "amostra");
    expect(achados.map((v) => v.match(/\[(.*?)\]/)?.[1])).toEqual([
      "TODO",
      "FIXME",
      "console.log de depuracao",
      "Lorem",
      "dado mockado",
    ]);

    // O portugues comum nao pode disparar: "todo" e palavra, "placeholder" e atributo,
    // "caixa-fake" e o nome de um adaptador pre-autorizado.
    const amostraLimpa = [
      "// percorre todo o menu e devolve as rotas que a pessoa pode ver",
      '<input placeholder="Busque o cliente pelo nome" />',
      'nome: "fake",',
      "await process.stdout.write(mensagem + '\\n');",
    ].join("\n");
    expect(violacoesDe(amostraLimpa, "amostra")).toEqual([]);
  });

  it("a varredura percorre a arvore inteira, e nao um subconjunto", () => {
    // 193 arquivos entre apps/web/src e apps/api/src fora de teste na data desta rodada.
    expect(ARVORE.length).toBeGreaterThan(180);
    expect(ARVORE.filter((a) => a.startsWith("apps/web/src/")).length).toBeGreaterThan(70);
    expect(ARVORE.filter((a) => a.startsWith("apps/api/src/")).length).toBeGreaterThan(70);
    // Nada de teste passa: o guarda teria de falhar em si mesmo se passasse.
    expect(ARVORE.filter((a) => TESTE.test(a))).toEqual([]);
  });

  it("nenhum arquivo de producao tem marca de placeholder", () => {
    const { lidos, violacoes } = varreduraDaArvore();
    expect(lidos).toBe(ARVORE.length);
    expect(violacoes, violacoes.slice(0, 40).join("\n")).toEqual([]);
  });
});
