import { Link, useNavigate } from "react-router-dom";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

interface ErrorPageProps {
  code: number;
  title: string;
  message: string;
}

// Página de erro navegável com identidade da marca (seção 30).
export function ErrorPage({ code, title, message }: ErrorPageProps) {
  const navigate = useNavigate();
  return (
    <div className="app-bg error-page">
      <header className="error-page-top">
        <ThemeToggle />
      </header>
      <main className="error-page-body animate-fade">
        <Logo size={96} animated />
        <p className="error-code mono">{code}</p>
        <h1 className="error-title">{title}</h1>
        <p className="error-message">{message}</p>
        <div className="error-actions">
          <button type="button" className="btn btn-brand" onClick={() => navigate(-1)}>
            Voltar
          </button>
          <Link to="/" className="btn btn-ghost">
            Ir para o início
          </Link>
        </div>
      </main>
    </div>
  );
}
