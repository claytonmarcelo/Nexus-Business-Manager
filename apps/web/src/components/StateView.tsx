import type { ReactNode } from "react";

// Estados globais padronizados (seção 32): loading, empty, error, no-permission.
export function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="state-skeleton" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="state-skeleton-row" />
      ))}
    </div>
  );
}

export function LoadingInline({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="state-inline" role="status" aria-live="polite">
      <span className="state-spinner" aria-hidden="true" /> {label}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="state-box">
      <div className="state-emoji" aria-hidden="true">◇</div>
      <h3 className="state-title">{title}</h3>
      {description && <p className="state-desc">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state-box state-box--error">
      <div className="state-emoji" aria-hidden="true">⚠</div>
      <h3 className="state-title">Não foi possível concluir</h3>
      <p className="state-desc">{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-brand" onClick={onRetry}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}
