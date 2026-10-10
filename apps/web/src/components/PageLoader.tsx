import { Logo } from "./Logo";

// Tela de carregamento global com a logo (seção 31). Usada só quando bloqueia a UI.
export function PageLoader({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="page-loader" role="status" aria-live="polite" aria-busy="true">
      <div className="page-loader-inner">
        <div className="page-loader-logo">
          <Logo size={72} />
          <span className="page-loader-ring" aria-hidden="true" />
        </div>
        <p className="page-loader-label">{label}</p>
      </div>
    </div>
  );
}
