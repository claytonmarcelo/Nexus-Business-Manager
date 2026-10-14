import { Link, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

interface ErrorPageProps {
  code: number;
  title: string;
  message: string;
  /** Botão de quem chegou aqui por um erro que tem conserto (F5, item 3). */
  acao?: ReactNode;
  /** Dentro do painel a página mora no conteúdo da rota, não no vazio do navegador. */
  embutida?: boolean;
}

// Página de erro navegável com identidade da marca (seção 30).
export function ErrorPage({ code, title, message, acao, embutida }: ErrorPageProps) {
  const navigate = useNavigate();
  return (
    <div className={embutida ? "error-page error-page-embutida" : "error-page"}>
      <header className="error-page-top">
        <ThemeToggle />
      </header>
      <main className="error-page-body animate-fade">
        <Logo size={96} animated />
        <p className="error-code mono">{code}</p>
        <h1 className="error-title">{title}</h1>
        <p className="error-message">{message}</p>
        <div className="error-actions">
          {acao}
          <button type="button" className="back-pill" onClick={() => navigate(-1)}>
            <span className="back-pill-arrow" aria-hidden="true">←</span>
            <span>Voltar</span>
          </button>
          <Link to="/" className="btn btn-ghost">
            Ir para o início
          </Link>
        </div>
      </main>
    </div>
  );
}
