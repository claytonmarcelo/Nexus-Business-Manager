import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  message?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon,
  title = "Nenhum registro encontrado",
  message = "Nao ha dados para exibir no momento.",
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {icon && <div className="text-brand-graphiteWine/40 mb-4">{icon}</div>}
      {!icon && (
        <svg className="w-16 h-16 text-brand-graphiteWine/40 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      )}
      <h3 className="text-lg font-medium text-brand-blackCherry mb-1">{title}</h3>
      <p className="text-sm text-brand-graphiteWine/50 mb-6 text-center max-w-sm">{message}</p>
      {action}
    </div>
  );
}
