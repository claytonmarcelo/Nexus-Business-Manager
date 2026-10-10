import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";

export interface TabItem {
  id: string;
  label: string;
  hint?: string;
  badge?: number | string;
}

interface TabsProps {
  tabs: TabItem[];
  active: string;
  onSelect: (id: string) => void;
  ariaLabel: string;
}

// Abas horizontais reutilizaveis de todo o sistema.
// Decisoes de projeto:
//  - a aba ativa fica na URL (?aba=) em vez de só no estado: compartilhar link,
//    voltar do navegador e recarregar mantém a pessoa no mesmo lugar;
//  - a troca de aba nunca navega de verdade (replace), entao nao ha
//    recarregamento de pagina;
//  - a barra rola horizontalmente no celular (css) e as setas do teclado
//    percorrem as abas, como num tablist nativo.
export function Tabs({ tabs, active, onSelect, ariaLabel }: TabsProps) {
  const lista = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  function mover(tecla: string) {
    const atual = tabs.findIndex((t) => t.id === active);
    if (atual < 0) return;
    let prox = atual;
    if (tecla === "ArrowRight") prox = (atual + 1) % tabs.length;
    else if (tecla === "ArrowLeft") prox = (atual - 1 + tabs.length) % tabs.length;
    else if (tecla === "Home") prox = 0;
    else if (tecla === "End") prox = tabs.length - 1;
    else return;
    onSelect(tabs[prox].id);
    const nodo = lista.current?.querySelector('[data-tab="' + tabs[prox].id + '"]') as HTMLElement | null;
    nodo?.focus();
  }

  return (
    <div
      ref={lista}
      className="nx-tabs"
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={(e) => mover(e.key)}
    >
      {tabs.map((t) => {
        const ativa = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            data-tab={t.id}
            id={"aba-" + t.id}
            className={"nx-tab" + (ativa ? " is-active" : "")}
            aria-selected={ativa}
            aria-controls={"painel-" + t.id}
            tabIndex={ativa ? 0 : -1}
            title={t.hint}
            onClick={() => onSelect(t.id)}
          >
            <span className="nx-tab-label">{t.label}</span>
            {t.badge !== undefined && t.badge !== "" ? (
              <span className="nx-tab-badge">{mounted ? t.badge : ""}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ id, active, children }: { id: string; active: string; children: ReactNode }) {
  if (id !== active) return null;
  return (
    <div
      className="nx-tabpanel"
      role="tabpanel"
      id={"painel-" + id}
      aria-labelledby={"aba-" + id}
      tabIndex={0}
    >
      {children}
    </div>
  );
}

// Estado da aba sincronizado com a URL. O padrao nao polui o endereco:
// so escreve ?aba= quando a pessoa sai da primeira aba.
export function useTabState(tabs: TabItem[], padrao: string) {
  const [params, setParams] = useSearchParams();
  const pedida = params.get("aba");
  const active = tabs.some((t) => t.id === pedida) ? (pedida as string) : padrao;

  const onSelect = useCallback(
    (id: string) => {
      const proximos = new URLSearchParams(params);
      if (id === padrao) proximos.delete("aba");
      else proximos.set("aba", id);
      setParams(proximos, { replace: true });
    },
    [params, padrao, setParams],
  );

  return { active, onSelect };
}
