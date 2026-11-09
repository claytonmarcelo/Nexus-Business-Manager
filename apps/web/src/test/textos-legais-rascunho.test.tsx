import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { api } from "../lib/api";
import { monteAdaptadorQueRegistra, type Rota } from "./fabrica-api";
import { LegaisPanel } from "../components/cms/LegaisPanel";
import { notify } from "../lib/notify";
import type { DocumentoLegal } from "../lib/cmsApi";

// T6.6 (F7) na tela: o rascunho legal marcado.
//
// O servidor é a autoridade — ele recusa publicar um documento vazio ou que ainda
// carrega o marcador inicial (provado em `apps/api/test/textos-legais-rascunho.test.ts`).
// A tela existe para a pessoa entender o motivo ANTES de clicar, e para não oferecer
// como normal um botão que vai ser recusado.
//
// O que este arquivo amarra:
//   1. documento em rascunho mostra o aviso, e o aviso diz o que falta (texto e
//      revisão de um advogado);
//   2. com o marcador inicial, o botão "Publicar no site" está apagado — clicar
//      nele não chama a API nenhuma vez;
//   3. com texto de verdade, o botão acende e o aviso some;
//   4. "Salvar rascunho" continua funcionando mesmo sem texto publicável: quem
//      escreve o documento precisa guardar o texto antes de publicá-lo;
//   5. a recusa do servidor (400) aparece com a frase dele, não com uma paráfrase;
//   6. sem permissão de escrita, nada é gravado.

vi.mock("../lib/notify", () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

const MARCADOR = "[RASCUNHO — DOCUMENTO SEM TEXTO DEFINITIVO]";

const TEXTO_REVISADO = "Termos de uso — texto revisado por advogado em 2026.";

function documento(extra?: Partial<DocumentoLegal>): DocumentoLegal {
  return {
    id: "doc-1",
    kind: "TERMS",
    title: "Termos de uso",
    content: MARCADOR,
    published: false,
    rascunho: true,
    version: 1,
    updatedAt: "2026-11-08T12:00:00.000Z",
    ...extra,
  };
}

const LISTA_RASCUNHO: DocumentoLegal[] = [
  documento(),
  documento({ id: "doc-2", kind: "PRIVACY", title: "Política de privacidade", content: MARCADOR }),
  documento({ id: "doc-3", kind: "LGPD", title: "Tratamento de dados (LGPD)", content: MARCADOR }),
];

const LISTA_COM_TEXTO: DocumentoLegal[] = [
  documento({ content: TEXTO_REVISADO, rascunho: false, version: 2 }),
  documento({ id: "doc-2", kind: "PRIVACY", title: "Política de privacidade", content: TEXTO_REVISADO, rascunho: false }),
  documento({ id: "doc-3", kind: "LGPD", title: "Tratamento de dados (LGPD)", content: TEXTO_REVISADO, rascunho: false }),
];

function montePainel(rotas: Rota[]) {
  const registradas = monteAdaptadorQueRegistra(rotas);
  api.defaults.adapter = registradas.adaptador;
  render(
    <MemoryRouter>
      <LegaisPanel podeEscrever />
    </MemoryRouter>,
  );
  return registradas.chamadas;
}

function botao(rotulo: string): HTMLButtonElement {
  return screen.getByRole("button", { name: rotulo }) as HTMLButtonElement;
}

afterEach(() => {
  cleanup();
  delete api.defaults.adapter;
  vi.clearAllMocks();
});

describe("Textos legais na tela: o rascunho avisado antes do clique (T6.6)", () => {
  it("mostra o aviso de rascunho, e ele diz o que falta", async () => {
    montePainel([{ caminho: "/cms/legal", status: 200, data: { data: LISTA_RASCUNHO } }]);

    const aviso = await screen.findByText("Rascunho sem texto publicável");
    expect(aviso).toBeTruthy();
    // O aviso não é decorativo: ele diz as duas coisas que faltam.
    const texto = aviso.parentElement?.textContent ?? "";
    expect(texto).toMatch(/advogado/i);
    expect(texto).toMatch(/não existe/i);
  });

  it("com o marcador inicial, o botão de publicar está apagado e não chama a API", async () => {
    const chamadas = montePainel([{ caminho: "/cms/legal", status: 200, data: { data: LISTA_RASCUNHO } }]);

    await screen.findByText("Rascunho sem texto publicável");
    const publicar = botao("Publicar no site");
    expect(publicar.disabled).toBe(true);

    // Clicar num botão apagado não produz pedido nenhum: a chamada é o que
    // chegaria ao servidor, e o servidor recusaria.
    fireEvent.click(publicar);
    await waitFor(() => {
      expect(chamadas.filter((c) => c.caminho.includes("/cms/legal/"))).toHaveLength(0);
    });
  });

  it("com texto de verdade, o botão acende e o aviso some", async () => {
    montePainel([{ caminho: "/cms/legal", status: 200, data: { data: LISTA_COM_TEXTO } }]);

    await waitFor(() => {
      expect(screen.queryByText("Rascunho sem texto publicável")).toBeNull();
    });
    await waitFor(() => {
      expect(botao("Publicar no site").disabled).toBe(false);
    });
  });

  it("salvar rascunho funciona mesmo sem texto publicável", async () => {
    const chamadas = montePainel([
      { caminho: "/cms/legal", status: 200, data: { data: LISTA_RASCUNHO } },
      { caminho: "/cms/legal/TERMS", status: 200, data: documento() },
    ]);

    await screen.findByText("Rascunho sem texto publicável");
    fireEvent.click(botao("Salvar rascunho"));

    await waitFor(() => {
      expect(chamadas.filter((c) => c.caminho.includes("/cms/legal/TERMS"))).toHaveLength(1);
    });
    // Guardar rascunho não publica: o corpo leva `published` fora do caminho.
    const gravado = chamadas.find((c) => c.caminho.includes("/cms/legal/TERMS"));
    expect(gravado?.corpo.published).toBeUndefined();
  });

  it("publicar com texto chama a porta com o texto e published ligado", async () => {
    const chamadas = montePainel([
      { caminho: "/cms/legal", status: 200, data: { data: LISTA_COM_TEXTO } },
      {
        caminho: "/cms/legal/TERMS",
        status: 200,
        data: documento({ content: TEXTO_REVISADO, published: true, rascunho: false, version: 3 }),
      },
    ]);

    await waitFor(() => {
      expect(botao("Publicar no site").disabled).toBe(false);
    });
    fireEvent.click(botao("Publicar no site"));

    await waitFor(() => {
      const gravado = chamadas.find((c) => c.caminho.includes("/cms/legal/TERMS"));
      expect(gravado).toBeTruthy();
      expect(gravado?.corpo.published).toBe(true);
      expect(gravado?.corpo.content).toBe(TEXTO_REVISADO);
    });
    await waitFor(() => {
      expect(notify.success).toHaveBeenCalledWith("Texto publicado no site.");
    });
  });

  it("a recusa do servidor aparece com a frase dele", async () => {
    const recusa = "Este documento ainda não tem texto publicável: escreva o texto, submeta-o à revisão de um advogado e publique depois.";
    montePainel([
      { caminho: "/cms/legal", status: 200, data: { data: LISTA_COM_TEXTO } },
      { caminho: "/cms/legal/TERMS", status: 400, data: { message: recusa } },
    ]);

    await waitFor(() => {
      expect(botao("Publicar no site").disabled).toBe(false);
    });
    fireEvent.click(botao("Publicar no site"));

    await waitFor(() => {
      expect(notify.error).toHaveBeenCalledWith(recusa);
    });
  });

  it("sem permissão de escrever, os dois botões ficam apagados", async () => {
    const registradas = monteAdaptadorQueRegistra([
      { caminho: "/cms/legal", status: 200, data: { data: LISTA_COM_TEXTO } },
    ]);
    api.defaults.adapter = registradas.adaptador;
    render(
      <MemoryRouter>
        <LegaisPanel podeEscrever={false} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByText("Rascunho sem texto publicável")).toBeNull();
    });
    await waitFor(() => {
      expect(botao("Publicar no site").disabled).toBe(true);
      expect(botao("Salvar rascunho").disabled).toBe(true);
    });
  });
});
