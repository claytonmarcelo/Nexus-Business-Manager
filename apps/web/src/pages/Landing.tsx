import { Link } from "react-router-dom";
import { Logo } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";
import { currentYear } from "../lib/format";

// Página pública de boas-vindas (seção 17). Botão "Acessar" leva ao login real.
export function Landing() {
  return (
    <div className="app-bg landing">
      <header className="landing-header">
        <div className="landing-brand">
          <Logo size={40} />
          <span className="landing-brand-name">Nexus Business Manager</span>
        </div>
        <nav className="landing-actions">
          <ThemeToggle />
          <Link to="/login" className="btn btn-brand">
            Acessar
          </Link>
        </nav>
      </header>

      <main className="landing-hero animate-fade">
        <div className="landing-hero-inner">
          <Logo size={120} animated className="landing-logo" />
          <p className="landing-eyebrow">ERP SaaS · Multiempresa</p>
          <h1 className="landing-title">Gestão empresarial com precisão e elegância</h1>
          <p className="landing-subtitle">
            O Nexus Business Manager reúne cadastro, usuários, controle de acesso por papel e
            auditoria em um ambiente seguro, responsivo e com identidade própria — do balcão à nuvem.
          </p>
          <div className="landing-cta">
            <Link to="/login" className="btn btn-brand btn-lg">Acessar o sistema</Link>
            <a href="#recursos" className="btn btn-ghost btn-lg">Conhecer recursos</a>
          </div>
        </div>
      </main>

      <section id="recursos" className="landing-features">
        <div className="feature-card card-surface">
          <h3>Segurança em primeiro lugar</h3>
          <p>Autenticação JWT, RBAC aplicado no backend e isolamento de dados por empresa.</p>
        </div>
        <div className="feature-card card-surface">
          <h3>Multiempresa real</h3>
          <p>Cada tenant opera em seu próprio contexto, com auditoria e permissões dedicadas.</p>
        </div>
        <div className="feature-card card-surface">
          <h3>Experiência refinada</h3>
          <p>Interface Premium Gourmet com temas claro e escuro, responsiva de smartphones a 5K.</p>
        </div>
      </section>

      <footer className="landing-footer">
        <Logo size={28} />
        <span>© {currentYear()} Nexus Business Manager</span>
        <span className="landing-footer-dev">Desenvolvido por Clayton Marcelo</span>
      </footer>
    </div>
  );
}
