// @vitest-environment node
// Varredura de arquivo: não precisa de DOM, e é só em node que o import.meta.url
// aponta para o disco e dá para ler os estilos da vitrine.
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

// Regressão de tema: a vitrine só troca de cor com o alternador se ela vestir
// os tokens. Cor fixa num CSS de landing é o jeito silencioso de quebrar um dos
// dois temas, então a varredura abaixo falha se uma aparecer.
//
// Duas coisas ficam de fora, por decisão registrada em docs/AUDITORIA.md:
//   . o véu do WhatsApp, que é a identidade do canal (verde da marca), e não
//     uma cor do tema;
//   . sombras e gradientes em rgba(), que são camada de transparência sobre o
//     que já vem do token, não superfície pintada.

const FIXA = /#[0-9a-fA-F]{3,8}\b|rgba?\(/;
const PROPRIEDADES_QUE_VESTEM = ["color", "background", "background-color", "border-color", "fill"];
const PERMITIDAS: [arquivo: string, seletor: string, motivo: string][] = [
  ["landing.css", ".landing-whatsapp", "cor do canal WhatsApp, que não pertence ao tema"],
];

function arquivosDaVitrine(): string[] {
  const pastaComponentes = fileURLToPath(new URL("../components/landing", import.meta.url));
  const css = fileURLToPath(new URL("../styles/landing.css", import.meta.url));
  const pagina = fileURLToPath(new URL("../pages/Landing.tsx", import.meta.url));
  const tsx = readdirSync(pastaComponentes)
    .filter((a) => a.endsWith(".tsx"))
    .map((a) => join(pastaComponentes, a));
  return [css, pagina, ...tsx];
}

function regrasDeCss(texto: string): { seletor: string; corpo: string }[] {
  const semComentarios = texto.replace(/\/\*[\s\S]*?\*\//g, "");
  const saida: { seletor: string; corpo: string }[] = [];
  const cortador = /([^{}]+)\{([^{}]*)\}/g;
  let pega = cortador.exec(semComentarios);
  while (pega) {
    saida.push({ seletor: pega[1].trim().replace(/\s+/g, " "), corpo: pega[2] });
    pega = cortador.exec(semComentarios);
  }
  return saida;
}

function permitido(arquivo: string, seletor: string): boolean {
  const nome = arquivo.split(/[\\/]/).pop() ?? arquivo;
  return PERMITIDAS.some(([a, sel]) => nome.endsWith(a) && seletor.includes(sel));
}

describe("Nenhuma cor fixa vestindo a vitrine", () => {
  const culpadas: string[] = [];

  for (const arquivo of arquivosDaVitrine()) {
    const texto = readFileSync(arquivo, "utf8");
    const nome = arquivo.split(/[\\/]/).pop() ?? arquivo;
    if (nome.endsWith(".css")) {
      for (const regra of regrasDeCss(texto)) {
        if (permitido(arquivo, regra.seletor)) continue;
        for (const linha of regra.corpo.split(";")) {
          const declaracao = linha.trim();
          const propriedade = declaracao.split(":")[0]?.trim().toLowerCase() ?? "";
          const valor = declaracao.slice(propriedade.length + 1);
          if (PROPRIEDADES_QUE_VESTEM.includes(propriedade) && FIXA.test(valor)) {
            culpadas.push(`${nome} :: ${regra.seletor} { ${propriedade}: ${valor.trim()} }`);
          }
        }
      }
    } else if (FIXA.test(texto)) {
      const linha = texto.split("\n").find((l) => FIXA.test(l)) ?? "";
      culpadas.push(`${nome}: ${linha.trim()}`);
    }
  }

  it("os estilos da landing só usam tokens do tema", () => {
    expect(culpadas).toEqual([]);
  });
});
