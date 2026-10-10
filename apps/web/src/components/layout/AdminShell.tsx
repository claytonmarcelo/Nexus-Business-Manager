import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Logo } from "../Logo";
import { ThemeToggle } from "../ThemeToggle";
import { useAuth } from "../../context/AuthContext";
import { currentYear } from "../../lib/format";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  permission?: string;
}

const NAV: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: "▦" },
  { to: "/app/clientes", label: "Clientes", icon: "◈", permission: "client:read" },
  { to: "/app/produtos", label: "Produtos", icon: "▣", permission: "product:read" },
  { to: "/app/vendas", label: "Vendas", icon: "＄", permission: "sale:read" },
  { to: "/app/compras", label: "Compras", icon: "⛁", permission: "purchase:read" },
  { to: "/app/usuarios", label: "Usuários", icon: "◉", permission: "user:read" },
  { to: "/app/auditoria", label: "Auditoria", icon: "❐", permission: "audit:read" },
  { to: "/app/configuracoes", label: "Configurações", icon: "⚙" },
];

export function AdminShell() {
  const { user, can, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const items = NAV.filter((n) => !n.permission || can(n.permission));

  // Regra do projeto: ao deslogar, o usuario volta SEMPRE para a
  // pagina de boas-vindas (landing). replace() impede o voltar do navegador
  // de reabrir o painel com sessao morta.
  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  return (
    <div className={`admin-shell ${sidebarOpen ? "is-sidebar-open" : ""}`}>
      {sidebarOpen && (
        <div className="admin-scrim" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      <aside className="admin-sidebar" aria-label="Navegação principal">
        <div className="admin-brand">
          <Link to="/app" className="admin-brand-link" onClick={() => setSidebarOpen(false)}>
            <Logo size={30} />
            <span className="admin-brand-text">Nexus Business Manager</span>
          </Link>
        </div>
        <nav className="admin-nav">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/app"}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `admin-nav-item ${isActive ? "is-active" : ""}`}
            >
              <span className="admin-nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-header">
          <button
            type="button"
            className="admin-hamburger"
            aria-label={sidebarOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((v) => !v)}
          >
            <span /><span /><span />
          </button>
          <div className="admin-header-title">Business Manager</div>
          <div className="admin-header-actions">
            <ThemeToggle />
            <div className="admin-user" title={user?.email}>
              <span className="admin-user-name">{user?.name}</span>
              <span className="admin-user-company">{user?.companyName}</span>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>

        <footer className="admin-footer">
          <span>© {currentYear()} Nexus Business Manager</span>
          <span className="admin-footer-dev">Desenvolvido por Clayton Marcelo</span>
        </footer>
      </div>
    </div>
  );
}
