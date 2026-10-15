import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

// Guarda de links da documentacao de entrada (prompt do README, tarefa 7).
//
// O README e o docs/README.md sao as duas portas de quem chega ao repositorio sem
// conhecer a casa. Um link quebrado ali nao e formatacao: e pessoa parada na frente
// de uma porta que nao abre. A varredura mora em `tools/verifica-links-doc.cjs`, que
// qualquer um pode rodar na maquina; este arquivo e o que impede a porta de quebrar
// sem ninguem perceber — a corrida para antes do commit chegar ao `main`.
//
// As duas perguntas que a ferramenta faz:
//   1. todo link e toda imagem relativos apontam para arquivo que existe na arvore;
//   2. nenhum marcador de rascunho `[[` sobrou no texto (a forma do pedido do dono,
//      que so vale enquanto o arquivo esta sendo escrito).
//
// Link externo e ancora sozinha ficam de fora de proposito: aqui a pergunta e "a casa
// esta inteira?", e a resposta esta no disco, nao na rede. Um teste que dependesse de
// site externo cairia sem ninguem ter mexido em nada.

const RAIZ = resolve(process.cwd(), "..", ".."); // apps/api -> raiz do monorepo
const FERRAMENTA = resolve(RAIZ, "tools", "verifica-links-doc.cjs");

describe("Links da documentacao de entrada (README e docs/README)", () => {
  it("a ferramenta existe na arvore", () => {
    expect(() => execFileSync(process.execPath, ["--check", FERRAMENTA])).not.toThrow();
  });

  it("nenhum link relativo quebra e nenhum rascunho sobrou", () => {
    let saida = "";
    try {
      saida = execFileSync(process.execPath, [FERRAMENTA], { encoding: "utf8", cwd: RAIZ });
    } catch (erro) {
      // O codigo de saida 1 e a lista do que quebrou vao na mensagem: quem corre
      // precisa ver o arquivo e a linha sem abrir a ferramenta.
      const e = erro as { stdout?: string; stderr?: string };
      throw new Error(
        "links quebrados na documentacao de entrada:\n" + (e.stdout ?? "") + (e.stderr ?? "")
      );
    }
    expect(saida).toContain("ok:");
    expect(saida).toMatch(/quebrados: 0/);
    expect(saida).toMatch(/marcadores \[\[ : 0/);
  });
});
