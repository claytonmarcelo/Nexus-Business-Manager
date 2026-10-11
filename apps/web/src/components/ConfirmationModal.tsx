import { useRef, useState, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Modal } from "./Modal";
import { ACTIONS } from "../lib/uiCopy";
import { extractErrorMessage } from "../lib/api";

// ===== Diálogo central de confirmação (o mesmo container modal do sistema) =====
// Todo "tem certeza?" do Nexus passa por aqui: mesmo Portal no fim do <body>,
// mesmo scrim com blur, mesma animação de entrada, mesma armadilha de foco, o
// mesmo bloqueio de Esc/overlay enquanto a requisição acontece. Nada de
// alert/confirm nativo e nada de modal inventado por página.
//
// Semântica de cor, decidida uma vez só (docs: section 29 do PROMPT MESTRE):
//   danger: true   -> destrói, desativa ou desfaz (Excluir, Inativar, Cancelar,
//                     Encerrar sessão) -> botão vermelho, foco inicial no "Voltar".
//   danger: false  -> confirma, paga, recebe ou reativa -> dourado da marca.

export interface ConfirmActionOptions {
  /** Título curto no infinitivo: "Desativar cliente". */
  title: string;
  /** Corpo da mensagem. Escreva {nome} onde o registro afetado deve aparecer. */
  text: string;
  /** O registro afetado. Entra em negrito no lugar de {nome}. */
  nome?: string;
  /** Segundo parágrafo: exatamente o que acontece com esse registro. */
  detalhe?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /**
   * Chamada à API. Enquanto ela dura o diálogo continua aberto com spinner no
   * botão e nenhum clique registrado — é isso que impede o duplo clique em
   * "Excluir". Se a chamada falhar, a mensagem aparece dentro do próprio diálogo
   * e a pessoa pode tentar de novo.
   */
  action?: () => Promise<unknown>;
}

/** Divide a frase no {nome} e devolve React nodes (sem HTML cru). */
function frase(text: string, nome?: string): ReactNode {
  const pedacos = text.split("{nome}");
  if (pedacos.length === 1) return text;
  const alvo = <strong className="nx-confirm-nome">{nome ?? "este registro"}</strong>;
  const saida: ReactNode[] = [];
  pedacos.forEach((pedaco, i) => {
    if (i > 0) saida.push(<span key={"a" + i}>{alvo}</span>);
    saida.push(<span key={"t" + i}>{pedaco}</span>);
  });
  return saida;
}

export function ConfirmationDialog({
  opts, onResolve,
}: {
  opts: ConfirmActionOptions;
  onResolve: (confirmado: boolean) => void;
}) {
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Trava sincrona, alfa e omega do duplo clique: o atributo disabled so chega
  // ao DOM depois do re-render do React, entao dois cliques colados no mesmo
  // tick chamariam a API duas vezes. O ref corta na primeira linha.
  const emExecucao = useRef(false);
  const rotulo = opts.confirmLabel ?? ACTIONS.confirm;

  async function confirmar(): Promise<void> {
    if (emExecucao.current) return;
    if (!opts.action) {
      onResolve(true);
      return;
    }
    // Spinner no botão de confirmação: nada de apagar a mensagem enquanto a API responde.
    emExecucao.current = true;
    setGravando(true);
    setErro(null);
    try {
      await opts.action();
      onResolve(true);
    } catch (err) {
      // Deu errado: devolve o botao para a pessoa tentar de novo, com a
      // mensagem dentro do proprio dialogo.
      emExecucao.current = false;
      setErro(extractErrorMessage(err));
      setGravando(false);
    }
  }

  function fechar(): void {
    if (emExecucao.current) return;
    onResolve(false);
  }

  return (
    <Modal
      title={opts.title}
      size="sm"
      // Acima da barra lateral (45) e de qualquer formulário aberto (70).
      zIndex={90}
      busy={gravando}
      onClose={fechar}
      footer={
        <>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={fechar}
            disabled={gravando}
            data-autofocus={opts.danger ? "" : undefined}
          >
            {opts.cancelLabel ?? ACTIONS.back}
          </button>
          <button
            type="button"
            className={"btn " + (opts.danger ? "btn-risk" : "btn-brand")}
            onClick={() => void confirmar()}
            disabled={gravando}
            aria-busy={gravando}
            data-autofocus={opts.danger ? undefined : ""}
          >
            {gravando ? <span className="nx-confirm-spin" aria-hidden="true" /> : null}
            <span>{gravando ? rotulo + "…" : rotulo}</span>
          </button>
        </>
      }
    >
      <p className="nx-confirm-texto">{frase(opts.text, opts.nome)}</p>
      {opts.detalhe ? <p className="nx-confirm-detalhe">{opts.detalhe}</p> : null}
      {erro ? (
        <p className="nx-confirm-erro" role="alert">
          {erro}
        </p>
      ) : null}
    </Modal>
  );
}

/** Aviso informativo de um botão só, no mesmo visual (substitui o alert nativo). */
export function InfoDialog({
  title, text, onResolve,
}: {
  title: string;
  text: string;
  onResolve: () => void;
}) {
  return (
    <Modal
      title={title}
      size="sm"
      zIndex={90}
      onClose={onResolve}
      footer={
        <button type="button" className="btn btn-brand" onClick={onResolve} data-autofocus="">
          <span>Entendi</span>
        </button>
      }
    >
      <p className="nx-confirm-texto">{text}</p>
    </Modal>
  );
}

// Uma raiz React própria no fim do body: o diálogo é montado por comando a
// partir de qualquer página, sem precisar de provider no meio da árvore.
let container: HTMLDivElement | null = null;
let raiz: Root | null = null;
let seq = 0;

function montar(): Root {
  if (!raiz) {
    container = document.createElement("div");
    container.setAttribute("data-nx-confirm-root", "");
    document.body.appendChild(container);
    raiz = createRoot(container);
  }
  return raiz;
}

export function abrirConfirmacao(opts: ConfirmActionOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const raizAtiva = montar();
    seq += 1;
    // key nova a cada pedido: o estado de "gravando"/erro nunca herda do anterior.
    raizAtiva.render(
      <ConfirmationDialog
        key={seq}
        opts={opts}
        onResolve={(ok) => {
          raizAtiva.render(null);
          resolve(ok);
        }}
      />,
    );
  });
}

export function abrirAviso(title: string, text: string): Promise<void> {
  return new Promise((resolve) => {
    const raizAtiva = montar();
    seq += 1;
    raizAtiva.render(
      <InfoDialog
        key={seq}
        title={title}
        text={text}
        onResolve={() => {
          raizAtiva.render(null);
          resolve();
        }}
      />,
    );
  });
}
