import { useEffect, useId, useRef, type ReactNode } from "react";
import { confirmAction } from "../lib/confirm";
import { ACTIONS, MODAL_COPY } from "../lib/uiCopy";

export type ModalSize = "sm" | "md" | "lg" | "xl";

export interface ModalProps {
  /** Titulo visivel. Use string simples; se houver badges, informe tambem o label. */
  title: ReactNode;
  /** Nome acessivel do dialogo (aria-label) quando o titulo tem HTML/badges. */
  label?: string;
  subtitle?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  size?: ModalSize;
  onSubmit?: () => void;
  submitLabel?: string;
  /** Rotulo enquanto grava; padrao vem de uiCopy (ex. "Salvando…"). */
  busyLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  tone?: "brand" | "danger";
  /** Impede fechamento acidental (Esc/overlay/X) quando ha edicoes nao gravadas. */
  dirty?: boolean;
  /** Nota discreta alinhada a esquerda no rodape (dica de preenchimento). */
  hint?: ReactNode;
  footer?: ReactNode;
  hideFooter?: boolean;
  /** Empilha acima de outro modal (Fornecedores abre cadastro por cima). */
  zIndex?: number;
}

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

// Contador global: o primeiro modal abre trava o scroll da pagina e o ultimo a
// fechar devolve. Assim modais empilhados nao deixam o body congelado.
let openModals = 0;
let savedOverflow = "";

// Pilha dos modais abertos (do fundo para o topo). So o do topo recebe Esc/Tab.
let stack: number[] = [];
let seq = 0;

// Modal compartilhado do design system Nexus (substitui o markup solto de
// .nx-dialog em todas as paginas): mesma anatomia cabecalho/conteudo/rodape,
// fechamento por Esc/overlay/botao, armadilha de foco, trava de scroll,
// rotulos padrao em pt-BR vindos de uiCopy e guardia de alteracoes nao salvas.
export function Modal(props: ModalProps) {
  const {
    title, label, subtitle, children, onClose, size = "md",
    onSubmit, submitLabel = ACTIONS.save, busyLabel, cancelLabel = ACTIONS.cancel,
    busy = false, tone = "brand", dirty = false, hint, footer, hideFooter = false, zIndex,
  } = props;

  const titleId = useId();
  const idRef = useRef<number | null>(null);
  if (idRef.current === null) idRef.current = ++seq;
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const hadFocus = useRef<HTMLElement | null>(null);

  // Fecha com protecao: gravando nada fecha; com edicao pendente pergunta antes.
  function requestClose(): void {
    if (busy) return;
    if (dirty) {
      void confirmAction({
        title: MODAL_COPY.discardTitle,
        text: MODAL_COPY.discardText,
        confirmLabel: ACTIONS.discard,
        danger: true,
      }).then((ok) => {
        if (ok) onClose();
      });
      return;
    }
    onClose();
  }

  useEffect(() => {
    if (openModals === 0) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    openModals += 1;
    stack.push(idRef.current!);
    hadFocus.current = document.activeElement as HTMLElement | null;
    const raf = window.requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      // Respeita autoFocus de um campo; senao leva o foco para o dialogo.
      if (panel.contains(document.activeElement)) return;
      (panel.querySelector<HTMLElement>("[data-autofocus]") ?? panel).focus();
    });
    return () => {
      window.cancelAnimationFrame(raf);
      stack = stack.filter((x) => x !== idRef.current);
      openModals = Math.max(0, openModals - 1);
      if (openModals === 0) document.body.style.overflow = savedOverflow;
      hadFocus.current?.focus?.();
    };
  }, []);

  // Sem lista de dependencias: o listener sempre enxerga o state atual.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const topo = stack[stack.length - 1] === idRef.current;
      if (!topo) return;
      if (event.key === "Escape") {
        event.stopPropagation();
        requestClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && (active === first || active === panelRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  const showingFooter = !hideFooter;
  const actions = footer !== undefined ? footer : (
    <>
      {onSubmit ? (
        <button type="button" className="btn btn-ghost" onClick={requestClose} disabled={busy}>
          {cancelLabel}
        </button>
      ) : null}
      {onSubmit ? (
        <button
          type="button"
          className={"btn " + (tone === "danger" ? "btn-danger" : "btn-brand")}
          onClick={onSubmit}
          disabled={busy}
          aria-busy={busy}
        >
          {busy ? (busyLabel ?? busyFor(submitLabel)) : submitLabel}
        </button>
      ) : (
        <button type="button" className="btn btn-ghost" onClick={onClose}>{ACTIONS.close}</button>
      )}
    </>
  );

  return (
    <div
      ref={overlayRef}
      className="nx-modal-overlay"
      style={zIndex === undefined ? undefined : { zIndex }}
      onMouseDown={(event) => {
        if (event.target === overlayRef.current) requestClose();
      }}
    >
      <div
        ref={panelRef}
        className={"nx-modal nx-modal--" + size}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-labelledby={label ? undefined : titleId}
        tabIndex={-1}
      >
        <header className="nx-modal-head">
          <div className="nx-modal-headings">
            <h2 className="nx-modal-title" id={titleId}>{title}</h2>
            {subtitle ? <p className="nx-modal-sub">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className="nx-modal-close"
            onClick={requestClose}
            aria-label={MODAL_COPY.closeButton}
            disabled={busy}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </header>

        <div className="nx-modal-body">{children}</div>

        {showingFooter ? (
          <footer className="nx-modal-foot">
            {hint ? <span className="nx-modal-hint">{hint}</span> : null}
            <div className="nx-modal-actions">{actions}</div>
          </footer>
        ) : null}
      </div>
    </div>
  );
}

// "Salvar" -> "Salvando…", "Cadastrar" -> "Cadastrando…" (textos de uiCopy).
function busyFor(label: string): string {
  if (label === ACTIONS.save) return ACTIONS.saving;
  if (label === ACTIONS.create) return ACTIONS.creating;
  if (label === ACTIONS.send) return ACTIONS.sending;
  if (label === ACTIONS.confirm) return ACTIONS.sending;
  return label + "…";
}

/**
 * Marca um formulario como alterado a partir da primeira mudanca real.
 * O ponto de referencia e o estado do primeiro render, entao o modal so pede
 * confirmacao de descarte se o usuario mexeu em alguma coisa.
 */
export function useDirty(current: unknown): boolean {
  const snapshot = useRef<string | null>(null);
  const json = JSON.stringify(current);
  if (snapshot.current === null) snapshot.current = json;
  return snapshot.current !== json;
}
