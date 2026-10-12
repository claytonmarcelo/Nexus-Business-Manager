// @vitest-environment node
// A vitrine mostra o número que o dono cadastrou, escrito do jeito do produto.
// Os quatro formatos aceitos pela API (`formato` em apps/api/src/modules/cms/
// cms.schemas.ts) mais os dois casos que ninguém deve ver na tela: valor
// ausente e formato desconhecido. A prova de navegador só consegue
// cadastrar número, porque é o que a API aceita em `valor` — então moeda,
// porcentagem e texto são provados aqui, e não com cifra inventada na página.
import { describe, expect, it } from "vitest";
import { valorDaMetrica } from "../lib/metricaVitrine";
import type { ItemMetrica } from "../lib/landingTypes";

function metrica(meta: Record<string, unknown> | null): ItemMetrica {
  return { id: "mede-1", title: "Medida", body: null, meta };
}

// O Intl do navegador separa o símbolo do valor com espaço indivisível; o teste
// normaliza as duas variantes de espaço que aparecem entre as versões de ICU.
function espacoNormal(texto: string): string {
  return texto.replace(/[\u00a0\u202f]/g, " ");
}

describe("Métrica cadastrada no CMS chega à vitrine escrita certo", () => {
  it("número vem com a pontuação brasileira", () => {
    expect(valorDaMetrica(metrica({ valor: 12500, formato: "numero" }))).toBe("12.500");
  });
  it("moeda usa o padrão brasileiro enquanto a empresa não escolhe outra", () => {
    const saida = espacoNormal(valorDaMetrica(metrica({ valor: 1234.5, formato: "moeda" })));
    expect(saida).toBe("R$ 1.234,50");
  });
  it("porcentagem ganha o sinal depois do número", () => {
    expect(valorDaMetrica(metrica({ valor: 42.5, formato: "porcentagem" }))).toBe("42,5%");
  });
  it("unidade cadastrada vem atrás do número", () => {
    expect(valorDaMetrica(metrica({ valor: 7, formato: "numero", unidade: "módulos" }))).toBe("7 módulos");
  });
  it("texto é mostrado como foi escrito, sem formatação de número", () => {
    expect(valorDaMetrica(metrica({ valor: "Um só lugar", formato: "texto" }))).toBe("Um só lugar");
  });
  it("sem valor numérico a linha fica vazia em vez de mostrar zero", () => {
    expect(valorDaMetrica(metrica({ formato: "moeda" }))).toBe("");
    expect(valorDaMetrica(metrica(null))).toBe("");
  });
  it("formato desconhecido cai em número e nunca em moeda", () => {
    expect(valorDaMetrica(metrica({ valor: 10, formato: "arbitrario" }))).toBe("10");
    expect(valorDaMetrica(metrica({ valor: 10 }))).toBe("10");
  });
});
