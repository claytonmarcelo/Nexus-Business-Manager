// @vitest-environment node
// T3.5 (F4): para onde o login manda a pessoa depois de entrar.
//
// A rota de origem chega pelo `location.state` que o ProtectedRoute escreveu, e
// um estado de histórico é texto: um link colado na barra pode trazer
// `//dominio.com` ou `javascript:` ali dentro, e `navigate(texto)` aceita os dois
// como saída do site. A régua é uma só: só volta para onde a pessoa queria se
// "onde" for um caminho deste aplicativo. O resto é a página inicial do painel.
import { describe, expect, it } from "vitest";
import { DESTINO_PADRAO, destinoSeguro } from "../lib/destino";

describe("Destino depois do login sozinha e um caminho deste aplicativo", () => {
  it("devolve o caminho interno que a pessoa queria abrir", () => {
    expect(destinoSeguro("/app/vendas")).toBe("/app/vendas");
    expect(destinoSeguro("/app/clientes/123?aba=financeiro")).toBe("/app/clientes/123?aba=financeiro");
    expect(destinoSeguro("/app")).toBe("/app");
  });

  it("trata barra dupla como saida do site e cai no padrao", () => {
    // `//dominio.com` e o mesmo protocolo com outro host; `/\dominio.com` e o
    // mesmo truque com barra invertida, que o navegador normaliza antes de navegar.
    expect(destinoSeguro("//dominio.com/painel")).toBe(DESTINO_PADRAO);
    expect(destinoSeguro("\\\\dominio.com")).toBe(DESTINO_PADRAO);
    expect(destinoSeguro("/\\dominio.com")).toBe(DESTINO_PADRAO);
    expect(destinoSeguro(" //dominio.com")).toBe(DESTINO_PADRAO);
  });

  it("recusa esquema explicito, inclusive javascript", () => {
    expect(destinoSeguro("https://dominio.com/#//app")).toBe(DESTINO_PADRAO);
    expect(destinoSeguro("http://localhost:5173/app")).toBe(DESTINO_PADRAO);
    expect(destinoSeguro("javascript:alert(1)")).toBe(DESTINO_PADRAO);
    expect(destinoSeguro("/javascript:alert(1)")).toBe(DESTINO_PADRAO);
    expect(destinoSeguro("/data:text/html,<script>1</script>")).toBe(DESTINO_PADRAO);
  });

  it("recusa o que nao e texto de caminho", () => {
    expect(destinoSeguro(undefined)).toBe(DESTINO_PADRAO);
    expect(destinoSeguro(null)).toBe(DESTINO_PADRAO);
    expect(destinoSeguro("app/vendas")).toBe(DESTINO_PADRAO);
    expect(destinoSeguro("")).toBe(DESTINO_PADRAO);
    expect(destinoSeguro("   ")).toBe(DESTINO_PADRAO);
    expect(destinoSeguro(42)).toBe(DESTINO_PADRAO);
    expect(destinoSeguro({ from: "//dominio.com" })).toBe(DESTINO_PADRAO);
  });
});
