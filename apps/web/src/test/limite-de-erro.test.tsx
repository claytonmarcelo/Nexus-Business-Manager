import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ThemeProvider } from "../context/ThemeContext";
import { limparErros, registraErroDeRenderizacao, ultimosErros } from "../lib/registro-erros";

// F5, item 3: limite de erro na raiz e por rota.
//
// O contrato deste componente é negativo: a pessoa nunca pode ver a tela branca.
// Uma exceção de renderização em qualquer página tem de virar a página de erro
// personalizada da casa, sem despejar pilha de chamada na frente de quem trabalha
// com o produto, e com um caminho de volta (tentar de novo, ou sair da rota).
//
// O segundo lado é o registro: sem anotar o que quebrou, o time só descobre o
// estrago por reclamação. A anotação acontece neste navegador, e o que ela grava
// passa por um filtro — endereço com consulta e fragmento não vão para o registro,
// porque a rota de verificação de e-mail leva token na consulta.

// A pagina quebra enquanto o teste quiser. Um contador nao serviria: o React
// chama a funcao do componente mais de uma vez na mesma montagem, e a segunda
// chamada ja estaria do lado de la.
let deveQuebrar = true;

function Bomba() {
  if (deveQuebrar) {
    throw new Error("quebrou o cabecalho da tabela");
  }
  return <p data-testid="conteudo">A tela montou.</p>;
}

function monta(filho: ReactNode, props?: { escopo?: string; chave?: string }) {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <ErrorBoundary escopo={props?.escopo ?? "teste"} chave={props?.chave}>
          {filho}
        </ErrorBoundary>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

let espiaConsole: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  deveQuebrar = true;
  limparErros();
  // O React imprime no console o erro que um limite capturou. Nada aqui depende
  // disso, e o ruido atrapalharia a leitura desta saida.
  espiaConsole = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  espiaConsole.mockRestore();
});

describe("A tela branca não é uma opção", () => {
  it("a exceção de renderização vira a página de erro da casa", () => {
    monta(<Bomba />);
    expect(screen.getByText("500")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Algo quebrou nesta tela" })).toBeTruthy();
    expect(screen.queryByTestId("conteudo")).toBeNull();
  });

  it("a pilha do erro não aparece na tela", () => {
    const { container } = monta(<Bomba />);
    expect(container.textContent).not.toMatch(/at\s+\w/);
    expect(container.textContent).not.toContain("Bomba");
    expect(container.textContent).not.toContain("quebrou o cabecalho da tabela");
  });

  it("oferece tentar de novo e ir para o início", () => {
    monta(<Bomba />);
    expect(screen.getByRole("button", { name: /tentar de novo/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /ir para o in/i })).toBeTruthy();
  });

  it("tentar de novo remonta a página e ela volta a existir", () => {
    monta(<Bomba />);
    expect(screen.queryByTestId("conteudo")).toBeNull();
    deveQuebrar = false;
    fireEvent.click(screen.getByRole("button", { name: /tentar de novo/i }));
    expect(screen.getByTestId("conteudo").textContent).toBe("A tela montou.");
    expect(screen.queryByText("500")).toBeNull();
  });

  it("sair da rota limpa o erro da página anterior", () => {
    const primeira = monta(<Bomba />, { chave: "/app/clientes" });
    expect(screen.getByText("500")).toBeTruthy();
    primeira.rerender(
      <ThemeProvider>
        <MemoryRouter>
          <ErrorBoundary escopo="teste" chave="/app/vendas">
            <p data-testid="conteudo">A tela montou.</p>
          </ErrorBoundary>
        </MemoryRouter>
      </ThemeProvider>,
    );
    expect(screen.queryByText("500")).toBeNull();
    expect(screen.getByTestId("conteudo")).toBeTruthy();
  });
});

describe("O erro fica anotado para o time", () => {
  it("o registro guarda o escopo onde a página quebrou", () => {
    monta(<Bomba />, { escopo: "painel" });
    const [erro] = ultimosErros();
    expect(erro.escopo).toBe("painel");
    expect(erro.mensagem).toContain("quebrou o cabecalho da tabela");
  });

  it("o endereço gravado no registro perde a consulta e o fragmento", () => {
    registraErroDeRenderizacao(
      new Error("falha em https://app.exemplo.test/verificar-e-mail?token=segredo-que-nao-pode-vazar#fim"),
      { componentStack: "\n    at Pagina (src/Pagina.tsx:1:1)" },
      "vitrine",
    );
    const [erro] = ultimosErros();
    expect(erro.mensagem).toContain("https://app.exemplo.test/verificar-e-mail");
    expect(erro.mensagem).not.toContain("segredo-que-nao-pode-vazar");
    expect(erro.mensagem).not.toContain("#fim");
    expect(erro.pilha).not.toContain("segredo-que-nao-pode-vazar");
  });

  it("a anotação sobrevive no navegador e não passa de cinco páginas quebradas", () => {
    for (let n = 0; n < 7; n++) {
      registraErroDeRenderizacao(new Error("falha numero " + n), {}, "painel");
    }
    const guardados = ultimosErros();
    expect(guardados).toHaveLength(5);
    expect(guardados[0].mensagem).toBe("falha numero 6");
    const noNavegador = JSON.parse(sessionStorage.getItem("nexus.erro") || "[]");
    expect(noNavegador).toHaveLength(5);
    expect(noNavegador[0].mensagem).toBe("falha numero 6");
  });

  it("o conserto não apaga o registro do que quebrou", () => {
    monta(<Bomba />);
    expect(ultimosErros()).toHaveLength(1);
    deveQuebrar = false;
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /tentar de novo/i }));
    });
    expect(screen.getByTestId("conteudo")).toBeTruthy();
    expect(ultimosErros()).toHaveLength(1);
  });
});
