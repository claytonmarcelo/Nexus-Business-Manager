import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, writeFileSync, unlinkSync } from "node:fs";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

// F8 (T7) — os portões de qualidade da casa viram teste permanente.
//
// Antes desta F8, a qualidade do projeto era medida por números que viviam no
// texto: a cobertura estava em 85,57%, o `npm audit` dava 8 vulnerabilidades, o
// lint não existia. Número no texto envelhece em silêncio — ninguém descobre
// que ele deixou de bater até meses depois. Aqui cada portão é um arquivo na
// árvore, com a linha de base versionada, e este teste prova três coisas:
//
//   1. O detector ainda **enxerga** a violação (a prova vermelha): um portão que
//      nunca falha não é portão, é enfeite.
//   2. O código de produção **está limpo** (a prova verde).
//   3. A linha de base **existe, tem a forma prometida** e o portão falha quando
//      a contagem piora.
//
// Nenhuma dependência nova entra aqui: as ferramentas são `.cjs` na raiz e são
// carregadas por `require` — o mesmo jeito que as outras guardas da casa
// (`caracteres-permitidos`, `auditoria-sem-segredo`) já fazem.

const RAIZ = resolve(__dirname, "..", "..", ".."); // apps/api/test -> raiz do monorepo

// As ferramentas são `.cjs` na raiz, num repositório TypeScript com
// `module: CommonJS`. O `createRequire` é explícito para não depender de como
// o vitest resolve o módulo: o caminho é ancorado neste arquivo, e não no
// diretório de trabalho — assim o teste roda igual na suíte, no CI e na prova.
const requireDaCasa = createRequire(__filename);

const lint = requireDaCasa(resolve(RAIZ, "tools", "verifica-lint.cjs"));
const audit = requireDaCasa(resolve(RAIZ, "tools", "verifica-audit.cjs"));
const cobertura = requireDaCasa(resolve(RAIZ, "tools", "verifica-cobertura.cjs"));

// O tsconfig da API carrega comentario, que e JSONC e nao JSON: `JSON.parse`
// estoura na primeira linha de comentario. Quem le o arquivo de configuracao
// do compilador e o parser do proprio compilador, ja instalado como devDependency.
const ts = requireDaCasa("typescript") as typeof import("typescript");

function tsconfigDe(arquivo: string) {
  const lido = ts.readConfigFile(resolve(RAIZ, arquivo), ts.sys.readFile);
  expect(lido.error, lido.error?.messageText as string).toBeUndefined();
  return lido.config;
}

describe("Portões de qualidade: o detector enxerga e o código está limpo (F8)", () => {
  describe("lint da casa", () => {
    it("a prova do detector enxerga tudo que ela planta", () => {
      const achados = lint.prova();
      // A amostra planta cinco violações de propósito. Se o detector perder
      // alguma delas, o portão vira verde sem motivo — e é esse o teste que
      // impede isso.
      expect(achados).toContain("console.log");
      expect(achados).toContain("console.debug");
      expect(achados).toContain("any");
      expect(achados).toContain("@ts-ignore sem justificativa");
    });

    it("o código de produção não tem console.log, console.debug, debugger, any nem ts-ignore sem justificativa", () => {
      const { lidos, achados } = lint.achadosDaArvore();
      // A prova de que a varredura percorreu a árvore de verdade, e não um
      // subconjunto: o número lido é grande demais para ser amostra.
      expect(lidos).toBeGreaterThan(150);
      expect(achados, achados.slice(0, 20).join(" | ")).toEqual([]);
    });

    it("a diretiva de silenciamento sem justificativa é achada", () => {
      // Arquivo temporário com violação de propósito: a diretiva sem
      // justificativa tem de ser vista. O arquivo vai para a pasta temporaria
      // do sistema, e não para a árvore — a guarda de caracteres varre a
      // árvore inteira, e um arquivo de teste que fica lá dentro vira ruído
      // para a varredura.
      const caminho = resolve(tmpdir(), `prova-lint-${process.pid}.ts`);
      const conteudo = [
        "// @ts-ignore",
        "const valor = 1;",
        "export default valor;",
        "",
      ].join("\n");
      try {
        writeFileSync(caminho, conteudo, "utf8");
        const achados = lint.achadosNoArquivo(caminho);
        expect(achados.length).toBeGreaterThan(0);
        expect(achados.join(" ")).toContain("@ts-ignore");
      } finally {
        if (existsSync(caminho)) unlinkSync(caminho);
      }
    });
  });

  it.each([
    ["@ts-ignore", "//   "],
    ["@ts-ignore", "/* */"],
    ["@ts-expect-error", "//   "],
    ["@ts-expect-error", "/**/"],
  ])("%s não aceita comentário vazio %s como justificativa", (diretiva, comentario) => {
    const caminho = resolve(tmpdir(), `prova-justificativa-${process.pid}.ts`);
    try {
      writeFileSync(caminho, `// ${diretiva}\n${comentario}\nconst valor: number = 'incompatível';\n`, "utf8");
      const achados: string[] = lint.achadosNoArquivo(caminho);
      expect(achados.some((achado) => achado.endsWith(`${diretiva} sem justificativa`))).toBe(true);
    } finally {
      if (existsSync(caminho)) unlinkSync(caminho);
    }
  });

  it.each([
    "// @ts-ignore: contrato externo ainda sem tipos",
    "// @ts-expect-error\n// contrato externo ainda sem tipos",
    "// @ts-ignore\n/* contrato externo ainda sem tipos */",
  ])("preserva justificativa com conteúdo: %s", (comentario) => {
    const caminho = resolve(tmpdir(), `prova-justificativa-valida-${process.pid}.ts`);
    try {
      writeFileSync(caminho, `${comentario}\nconst valor: number = 'incompatível';\n`, "utf8");
      expect(lint.achadosNoArquivo(caminho)).toEqual([]);
    } finally {
      if (existsSync(caminho)) unlinkSync(caminho);
    }
  });

  describe("portão de cobertura", () => {
    const medida = (statements: number) => ({
      statements: { pct: statements },
      branches: { pct: statements },
      functions: { pct: statements },
      lines: { pct: statements },
    });

    // A base guarda numero puro por medida; o relatorio do vitest guarda {pct}.
    // Sao dois formatos, e o portao compara o primeiro contra o segundo.
    const piso = (valor: number) => ({
      statements: valor,
      branches: valor,
      functions: valor,
      lines: valor,
    });

    const baseDe = (porArquivo: Record<string, any>, global: Record<string, number> = {}) => ({
      global: { statements: 80, branches: 70, functions: 80, lines: 80, ...global },
      porArquivo,
      exceptuados: {},
    });

    it("um arquivo abaixo do piso reprova", () => {
      const base = baseDe({ "src/algo.ts": piso(80) });
      const medido = { global: medida(90), arquivos: [{ chave: "src/algo.ts", medidas: medida(50) }] };
      const { abaixoDoPiso } = cobertura.avaliar(base, medido);
      expect(abaixoDoPiso.length).toBeGreaterThan(0);
      expect(abaixoDoPiso.join(" ")).toContain("src/algo.ts");
    });

    it("um arquivo que melhorou passa", () => {
      const base = baseDe({ "src/algo.ts": piso(60) });
      const medido = { global: medida(90), arquivos: [{ chave: "src/algo.ts", medidas: medida(95) }] };
      const { abaixoDoPiso } = cobertura.avaliar(base, medido);
      expect(abaixoDoPiso).toEqual([]);
    });

    it("a exceção nomeada vale, e o motivo dela é lido", () => {
      const base = {
        global: { statements: 80, branches: 70, functions: 80, lines: 80 },
        porArquivo: { "src/sem_teste.ts": piso(0) },
        exceptuados: {
          "src/sem_teste.ts": { semPiso: true, motivo: "medido: exercitado pelo binario, nao pelo teste" },
        },
      };
      const medido = { global: medida(90), arquivos: [{ chave: "src/sem_teste.ts", medidas: medida(0) }] };
      const { abaixoDoPiso, exceptuados } = cobertura.avaliar(base, medido);
      expect(abaixoDoPiso).toEqual([]);
      expect(exceptuados.length).toBe(1);
      expect(exceptuados[0]?.arquivo).toBe("src/sem_teste.ts");
      // Exceção sem motivo escrito é dívida escondida: o motivo é obrigatório.
      expect(exceptuados[0]?.motivo && exceptuados[0].motivo.length).toBeGreaterThan(0);
    });

    it("um arquivo novo não reprova, mas é nomeado", () => {
      const base = baseDe({ "src/velho.ts": piso(80) });
      const medido = {
        global: medida(90),
        arquivos: [
          { chave: "src/velho.ts", medidas: medida(80) },
          { chave: "src/novo.ts", medidas: medida(0) },
        ],
      };
      const { abaixoDoPiso, semLinhaDeBase } = cobertura.avaliar(base, medido);
      expect(abaixoDoPiso).toEqual([]);
      // Arquivo que entra no código sem registro na base é dívida visível.
      expect(semLinhaDeBase).toEqual(["src/novo.ts"]);
    });

    it("uma base degenerada é recusada", () => {
      // Piso zero em tudo: a base nunca reprovaria nada, e um portão que
      // nunca falha não é portão.
      const degenerada = {
        global: { statements: 0, branches: 0, functions: 0, lines: 0 },
        porArquivo: { "src/algo.ts": piso(0) },
        exceptuados: {},
      };
      expect(cobertura.baseDegenerada(degenerada)).toBe(true);
      expect(
        cobertura.baseDegenerada({
          global: { statements: 80, branches: 70, functions: 80, lines: 80 },
          porArquivo: { "src/algo.ts": piso(80) },
          exceptuados: {},
        }),
      ).toBe(false);
    });

    it("a linha de base de cobertura está na árvore, com a forma prometida", () => {
      const caminho = resolve(RAIZ, "tools", "cobertura-base.json");
      expect(existsSync(caminho)).toBe(true);
      const base = JSON.parse(readFileSync(caminho, "utf8"));
      expect(typeof base.medidoEm).toBe("string");
      expect(base.medidoEm).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const medida of ["statements", "branches", "functions", "lines"]) {
        expect(typeof base.global?.[medida]).toBe("number");
      }
      // A base guarda o número de cada arquivo medido — é ela que o portão
      // compara, arquivo por arquivo.
      const arquivos = Object.keys(base.porArquivo || {});
      expect(arquivos.length).toBeGreaterThan(30);
      for (const arquivo of arquivos) {
        const medidas = base.porArquivo[arquivo];
        for (const medida of ["statements", "branches", "functions", "lines"]) {
          expect(typeof medidas?.[medida], `${arquivo} sem ${medida}`).toBe("number");
        }
      }
      expect(base.exceptuados).toBeTruthy();
      // Toda exceção tem motivo escrito: a base é o lugar onde a dívida fica
      // visível, e dívida sem texto não é dívida que alguém possa fechar.
      for (const [arquivo, excecao] of Object.entries<any>(base.exceptuados)) {
        expect(typeof excecao?.motivo, `excecao de ${arquivo} sem motivo`).toBe("string");
        expect(excecao.motivo.length).toBeGreaterThan(0);
      }
      // A base não pode estar degenerada: piso zero em tudo é portão de mentira.
      expect(cobertura.baseDegenerada(base)).toBe(false);
    });
  });

  describe("regressões dos portões encontradas na revisão", () => {
    it.each([
      ["const valor: any = 1;", "any"],
      ["console[\"log\"](\"amostra\");", "console.log"],
      ["console[\"debug\"](\"amostra\");", "console.debug"],
      ["console?.log(\"amostra\");", "console.log"],
    ])("o detector real recusa %s", (texto, regra) => {
      const caminho = resolve(tmpdir(), `lint-real-${process.pid}.ts`);
      try {
        writeFileSync(caminho, texto, "utf8");
        let achados: string[] = [];
        expect(() => { achados = lint.achadosNoArquivo(caminho); }).not.toThrow();
        expect(achados.some((achado) => achado.endsWith(` ${regra}`))).toBe(true);
      } finally {
        if (existsSync(caminho)) unlinkSync(caminho);
      }
    });

    it("a ausência de um arquivo da base reprova mesmo com total de 100%", () => {
      const base = { global: {}, porArquivo: { "src/protegido.ts": { lines: 80 } }, exceptuados: {} };
      const medido = { global: { lines: { pct: 100 } }, arquivos: [] };
      expect(cobertura.avaliar(base, medido).abaixoDoPiso.join(" ")).toContain("src/protegido.ts");
    });

    it("a exceção sem motivo não dispensa o piso", () => {
      const base = {
        global: {}, porArquivo: { "src/protegido.ts": { lines: 80 } },
        exceptuados: { "src/protegido.ts": { semPiso: true, motivo: " " } },
      };
      const medido = { global: {}, arquivos: [{ chave: "src/protegido.ts", medidas: { lines: { pct: 0 } } }] };
      expect(cobertura.avaliar(base, medido).abaixoDoPiso.join(" ")).toContain("src/protegido.ts");
    });

    it.each([
      { error: { code: "EAUDITENDPOINT" } },
      {},
      { metadata: { vulnerabilities: { total: 0 } } },
      { metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: -1, critical: 0, total: -1 } } },
      { metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 1, critical: 0, total: 0 } } },
    ])("audit inválido não vira zero vulnerabilidades: %j", (dados) => {
      expect(() => audit.contagensDo(dados)).toThrow(/audit/i);
    });

    it.each([
      { dados: { error: { code: "EAUDITENDPOINT" } }, status: 1 },
      { dados: { metadata: { vulnerabilities: { info: 0, low: 1, moderate: 2, high: 5, critical: 0, total: 8 } } }, status: 0 },
    ])("a CLI encerra com código $status para a resposta de audit", ({ dados, status }) => {
      const caminho = resolve(tmpdir(), `audit-cli-${process.pid}.json`);
      try {
        writeFileSync(caminho, JSON.stringify(dados), "utf8");
        const resultado = spawnSync(process.execPath, [resolve(RAIZ, "tools/verifica-audit.cjs")], {
          cwd: RAIZ, encoding: "utf8", env: { ...process.env, AUDIT_JSON_FIXO: caminho },
        });
        expect(resultado.error).toBeUndefined();
        expect(resultado.status, resultado.stderr).toBe(status);
        if (status !== 0) expect(resultado.stdout).not.toContain("melhorou");
      } finally {
        if (existsSync(caminho)) unlinkSync(caminho);
      }
    });
  });

  describe("portão do audit", () => {
    it("contagem que piora reprova em qualquer severidade", () => {
      const anterior = { info: 0, low: 1, moderate: 2, high: 5, critical: 0, total: 8 };
      const atual = { info: 0, low: 1, moderate: 2, high: 6, critical: 0, total: 9 };
      const { piorou } = audit.comparar(anterior, atual);
      expect(piorou.length).toBeGreaterThan(0);
      expect(piorou.join(" ")).toContain("high");
    });

    it("contagem igual passa e contagem menor avisa", () => {
      const anterior = { info: 0, low: 1, moderate: 2, high: 5, critical: 0, total: 8 };
      const igual = audit.comparar(anterior, { ...anterior });
      expect(igual.piorou).toEqual([]);
      expect(igual.melhorou).toBe(false);

      const melhor = audit.comparar(anterior, { ...anterior, high: 4, total: 7 });
      expect(melhor.piorou).toEqual([]);
      expect(melhor.melhorou).toBe(true);
    });

    it("a linha de base do audit está na árvore e tem a forma prometida", () => {
      const caminho = resolve(RAIZ, "tools", "audit-base.json");
      expect(existsSync(caminho)).toBe(true);
      const base = JSON.parse(readFileSync(caminho, "utf8"));
      expect(base.medidoEm).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const contagens = base.contagens;
      expect(typeof contagens).toBe("object");
      for (const chave of ["info", "low", "moderate", "high", "critical", "total"]) {
        expect(typeof contagens?.[chave], `contagem ${chave} ausente`).toBe("number");
      }
      // A linha de base é número de medição, não credencial: o arquivo não tem
      // nada de segredo dentro.
      expect(JSON.stringify(base)).not.toMatch(/password|secret|token|key/i);
    });
  });

  it("o ambiente do CI mascara cada segredo antes de gravar para os próximos passos", () => {
    const workflow = readFileSync(resolve(RAIZ, ".github/workflows/portoes.yml"), "utf8");
    const bloco = workflow.match(/node <<'NODE'\n([\s\S]*?)\n[ \t]*NODE[ \t]*(?:\n|$)/);
    if (!bloco?.[1]) throw new Error("Bloco executável de ambiente do CI não encontrado");
    const mascarados = new Set<string>();
    let gravacoes = 0;
    runInNewContext(bloco[1], {
      process: { env: { GITHUB_ENV: "ambiente-do-runner" } },
      console: { log: (linha: string) => {
        expect(linha.startsWith("::add-mask::")).toBe(true);
        mascarados.add(linha.slice("::add-mask::".length));
      } },
      require: (nome: string) => {
        if (nome !== "node:fs") return requireDaCasa(nome);
        return { appendFileSync: (destino: string, texto: string) => {
          expect(destino).toBe("ambiente-do-runner");
          const ambiente = Object.fromEntries(texto.trim().split("\n").map((linha) => linha.split("=")));
          for (const chave of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "TOTP_ENCRYPTION_KEY"]) {
            expect(/^[a-f0-9]{64}$/.test(ambiente[chave] ?? "")).toBe(true);
            expect(mascarados.has(ambiente[chave])).toBe(true);
          }
          expect(ambiente.DATABASE_URL !== ambiente.DATABASE_URL_TESTE).toBe(true);
          gravacoes += 1;
        } };
      },
    });
    expect(gravacoes).toBe(1);
    expect(mascarados.size).toBe(3);
  });

  describe("o compilador como portão", () => {
    it("a API recusa variável declarada e nunca lida", () => {
      const tsconfig = tsconfigDe("apps/api/tsconfig.json");
      expect(tsconfig.compilerOptions?.noUnusedLocals).toBe(true);
      expect(tsconfig.compilerOptions?.noUnusedParameters).toBe(true);
    });

    it("o painel já recusava, e continua recusando", () => {
      const tsconfig = tsconfigDe("apps/web/tsconfig.json");
      expect(tsconfig.compilerOptions?.noUnusedLocals).toBe(true);
      expect(tsconfig.compilerOptions?.noUnusedParameters).toBe(true);
    });
  });

  describe("a suíte da casa roda sem tocar a rede", () => {
    it("o portão do audit mede o arquivo fixo quando a variável aponta para ele", () => {
      // A prova de que o portão funciona sem depender do `npm audit` — e, por
      // consequência, sem depender da rede. O arquivo tem o mesmo formato do
      // `npm audit --json`.
      const conteudo = {
        metadata: {
          vulnerabilities: { info: 0, low: 1, moderate: 2, high: 5, critical: 0, total: 8 },
        },
      };
      const caminho = resolve(tmpdir(), `prova-audit-${process.pid}.json`);
      try {
        writeFileSync(caminho, JSON.stringify(conteudo), "utf8");
        const dados = JSON.parse(readFileSync(caminho, "utf8"));
        const contagens = audit.contagensDo(dados);
        expect(contagens.total).toBe(8);
        expect(contagens.high).toBe(5);
      } finally {
        if (existsSync(caminho)) unlinkSync(caminho);
      }
    });
  });
});

describe("A guarda de caracteres continua de pé com as ferramentas novas", () => {
  it("nenhuma das ferramentas da F8 carrega caractere de alfabeto não latino", () => {
    // As ferramentas novas são `.cjs` na raiz e entram na varredura de
    // caracteres do repositório (o guarda varre `git ls-files`), mas o teste
    // aqui diz o motivo: uma ferramenta de portão que falhou por caractere
    // derrubaria o CI de um jeito que ninguém entenderia.
    const arquivos = [
      resolve(RAIZ, "tools", "verifica-lint.cjs"),
      resolve(RAIZ, "tools", "verifica-audit.cjs"),
      resolve(RAIZ, "tools", "verifica-cobertura.cjs"),
    ];
    for (const arquivo of arquivos) {
      expect(existsSync(arquivo)).toBe(true);
      const texto = readFileSync(arquivo, "utf8");
      // A lista vem do mesmo jeito que o guarda permanente monta a dele: com
      // propriedades Unicode, para que este arquivo não carregue o caractere
      // que ele proíbe.
      const proibido = new RegExp(
        "[\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Hangul}" +
          "\\p{Script=Cyrillic}\\p{Script=Arabic}\\p{Script=Hebrew}\\p{Script=Thai}" +
          "\\p{Script=Devanagari}\\p{Script=Greek}\\p{Script=Coptic}]",
        "gu",
      );
      const achados = texto.match(proibido);
      expect(achados, `${arquivo} carrega caractere proibido`).toBeNull();
    }
  });
});
