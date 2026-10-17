// @vitest-environment node
import { describe, expect, it } from "vitest";
import { api } from "../lib/api";
import { PREFIXO_DA_API, urlBaseDaApi } from "../lib/apiBase";

// Regressão medida num painel publicado: `VITE_API_URL` foi escrito como a origem
// da API sem o `/api`, e o painel passou a chamar `/health` e `/public/landing`
// num host que não tem essas rotas. A origem nua agora é completada, e as três
// formas legítimas de escrever o valor continuam valendo.
describe("o endereço da API que o painel usa", () => {
  it("completa a origem nua com o prefixo que o backend monta", () => {
    expect(urlBaseDaApi("https://api.exemplo.test")).toBe("https://api.exemplo.test/api");
    expect(urlBaseDaApi("http://localhost:3001")).toBe("http://localhost:3001/api");
  });

  it("deixa passar quem já escreveu o caminho inteiro, com ou sem barra final", () => {
    expect(urlBaseDaApi("https://api.exemplo.test/api")).toBe("https://api.exemplo.test/api");
    expect(urlBaseDaApi("https://api.exemplo.test/api/")).toBe("https://api.exemplo.test/api");
  });

  it("caiu no padrão quando a variável não existe, está vazia ou é só a barra", () => {
    expect(urlBaseDaApi(undefined)).toBe(PREFIXO_DA_API);
    expect(urlBaseDaApi("")).toBe(PREFIXO_DA_API);
    expect(urlBaseDaApi("/")).toBe(PREFIXO_DA_API);
    expect(urlBaseDaApi("  ")).toBe(PREFIXO_DA_API);
  });

  it("respeita um caminho próprio que não seja origem absoluta", () => {
    expect(urlBaseDaApi("/back/api")).toBe("/back/api");
  });

  it("a instância do painel nasce no endereço conferido acima", () => {
    // No teste a variável não é definida, então o esperado é o padrão da casa.
    expect(api.defaults.baseURL).toBe(PREFIXO_DA_API);
  });
});
