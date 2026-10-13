import { useRef, useState, useId, type ReactNode } from "react";
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

/**
 * Diálogo de confirmação que não aceita um "sim" mudo (P11 / N36, decisão D4).
 *
 * Superfície NOVA e aditiva: `confirmAction` continua exatamente como era, com o
 * mesmo contrato sim/não. Aqui muda uma coisa só — o botão de confirmar não dispara
 * requisição nenhuma enquanto o campo de motivo estiver vazio, porque cancelar uma
 * ordem, estornar uma concluída e riscar uma cobrança do carnê são decisões que
 * seis meses depois ninguém lembra por que aconteceram. O motivo escrito vai no
 * histórico da empresa (nota da OS, `reason` da cobrança) e a tela deixa de ser o
 * único lugar onde a explicação existiu.
 */
export interface ConfirmMotivoOptions extends Omit<ConfirmActionOptions, "action"> {
  /** Rótulo do campo: "Motivo do cancelamento", "Motivo do estorno". */
  rotuloMotivo: string;
  /** Ajuda discreta abaixo do campo, dizendo onde o motivo vai aparecer depois. */
  ajudaMotivo?: string;
  placeholder?: string;
  /** Espelho do `max` da rota: a tela não deixa escrever o que o servidor rejeita. */
  maxLength?: number;
  /** A ação recebe o motivo já aparado. */
  action: (motivo: string) => Promise<unknown>;
}

/** O aviso de campo vazio, montado a partir do próprio rótulo: "Diga o motivo do estorno." */
function digaOMotivo(rotulo: string): string {
  const minusculo = rotulo.charAt(0).toLowerCase() + rotulo.slice(1);
  return "Diga o " + minusculo + ".";
}

export function ConfirmationMotivoDialog({
  opts, onResolve,
}: {
  opts: ConfirmMotivoOptions;
  onResolve: (confirmado: boolean) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [faltouMotivo, setFaltouMotivo] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  // Id do campo vem do React: a página embaixo do diálogo tem os seus próprios
  // inputs, e um id fixo colaria com o de outra tela aberta por cima.
  const campoId = useId();
  // Mesma trava síncrona do diálogo comum, pelo mesmo motivo: o `disabled` só
  // chega ao DOM depois do re-render, e dois cliques colados chamariam a rota duas vezes.
  const emExecucao = useRef(false);
  const rotulo = opts.confirmLabel ?? ACTIONS.confirm;

  async function confirmar(): Promise<void> {
    if (emExecucao.current) return;
    const aparado = motivo.trim();
    if (!aparado) {
      // O pedido não sai da tela, e a explicação aparece dentro do próprio
      // diálogo: um aviso que some em três segundos não ensina nada a ninguém.
      setFaltouMotivo(true);
      campo.current?.focus();
      return;
    }
    emExecucao.current = true;
    setFaltouMotivo(false);
    setGravando(true);
    setErro(null);
    try {
      await opts.action(aparado);
      onResolve(true);
    } catch (err) {
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
          >
            {opts.cancelLabel ?? ACTIONS.back}
          </button>
          <button
            type="button"
            className={"btn " + (opts.danger ? "btn-risk" : "btn-brand")}
            onClick={() => void confirmar()}
            disabled={gravando}
            aria-busy={gravando}
          >
            {gravando ? <span className="nx-confirm-spin" aria-hidden="true" /> : null}
            <span>{gravando ? rotulo + "…" : rotulo}</span>
          </button>
        </>
      }
    >
      <p className="nx-confirm-texto">{frase(opts.text, opts.nome)}</p>
      {opts.detalhe ? <p className="nx-confirm-detalhe">{opts.detalhe}</p> : null}

      <div className="field nx-confirm-motivo">
        <label className="field-label" htmlFor={campoId}>{opts.rotuloMotivo}</label>
        <textarea
          id={campoId}
          ref={campo}
          className="input"
          rows={3}
          value={motivo}
          placeholder={opts.placeholder}
          maxLength={opts.maxLength}
          disabled={gravando}
          data-autofocus=""
          aria-invalid={faltouMotivo ? true : undefined}
          onChange={(event) => {
            setMotivo(event.target.value);
            // A pessoa escreveu: o aviso perde o sentido e sai da frente.
            if (faltouMotivo) setFaltouMotivo(false);
          }}
        />
        {faltouMotivo ? (
          <span className="field-error" role="alert">{digaOMotivo(opts.rotuloMotivo)}</span>
        ) : null}
        {opts.ajudaMotivo ? <span className="field-hint">{opts.ajudaMotivo}</span> : null}
      </div>

      {erro ? (
        <p className="nx-confirm-erro" role="alert">
          {erro}
        </p>
      ) : null}
    </Modal>
  );
}

/**
 * O mesmo contrato do `abrirConfirmacao`, com o motivo como condição: resolve
 * `true` depois que a ação passou, `false` em qualquer saída sem escrita.
 */
export function abrirConfirmacaoComMotivo(opts: ConfirmMotivoOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const raizAtiva = montar();
    seq += 1;
    raizAtiva.render(
      <ConfirmationMotivoDialog
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
