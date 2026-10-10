import { useCallback, useEffect, useState } from "react";
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
  { to: "/app/financeiro", label: "Financeiro", icon: "◈", permission: "finance:read" },
  { to: "/app/crm", label: "CRM", icon: "⬡", permission: "crm:read" },
  { to: "/app/agenda", label: "Agenda", icon: "▤", permission: "agenda:read" },
  { to: "/app/usuarios", label: "Usuários", icon: "◉", permission: "user:read" },
  { to: "/app/auditoria", label: "Auditoria", icon: "❐", permission: "audit:read" },
  { to: "/app/configuracoes", label: "Configurações", icon: "⚙" },
];

// Abaixo disto a sidebar vira gaveta lateral (off-canvas); acima ela fica
// fixa e o mesmo botao apenas recolhe os rotulos (modo trilha).
const DESKTOP_QUERY = "(min-width: 821px)";
const COLLAPSE_KEY = "nexus.sidebar.collapsed";

// Icone "painel a esquerda" (familia Lucide/Heroicons): contorno do painel
// com a divisoria marcando a area da sidebar. A divisoria troca de lado quando
// o estado muda, dando o feedback de abrir/fechar sem usar hamburguer.
function PanelLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <rect x="3" y="4" width="18" height="16" rx="3.2" />
      <path d="M9.6 4.4v15.2" />
      <path d="M13.4 9.6h3.2" opacity="0.55" />
      <path d="M13.4 13.2h2.2" opacity="0.35" />
    </svg>
  );
}

export function AdminShell() {
  const { user, can, logout } = useAuth();
  const navigate = useNavigate();

  // Estado da gaveta (mobile/tablet).
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Dica de nome no modo trilha. Vive fora da <aside> porque a barra rola
  // internamente: um tooltip absoluto dentro dela alargaria o conteudo e
  // abriria uma barra de rolagem horizontal no rodape do menu.
  const [dica, setDica] = useState<{ texto: string; top: number; left: number } | null>(null);
  // Estado do modo trilha (desktop), persistido entre visitas.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, String(collapsed));
    } catch {
      /* modo privado do navegador: segue sem persistir */
    }
  }, [collapsed]);

  // Ao girar o tablet / redimensionar a janela, os dois modos nao podem
  // ficar abertos ao mesmo tempo.
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => {
      if (mq.matches) setDrawerOpen(false);
      else setCollapsed(false);
    };
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const isDesktop = () => window.matchMedia(DESKTOP_QUERY).matches;
  const visible = isDesktop() ? !collapsed : drawerOpen;

  const toggleSidebar = useCallback(() => {
    if (isDesktop()) setCollapsed((v) => !v);
    else setDrawerOpen((v) => !v);
  }, []);

  function mostrarDica(el: HTMLElement, texto: string) {
    if (!collapsed || !window.matchMedia(DESKTOP_QUERY).matches) return;
    const r = el.getBoundingClientRect();
    setDica({ texto, top: r.top + r.height / 2, left: r.right + 10 });
  }

  // Esc fecha a gaveta no celular (no desktop nao ha o que fechar: a barra
  // fixa continua visivel, apenas sem rotulos).
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  // Regra do projeto: ao deslogar, o usuario volta SEMPRE para a
  // pagina de boas-vindas (landing). replace() impede o voltar do navegador
  // de reabrir o painel com sessao morta.
  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  const items = NAV.filter((n) => !n.permission || can(n.permission));
  const rotuloBotao = isDesktop()
    ? (collapsed ? "Expandir menu lateral" : "Recolher menu lateral")
    : (drawerOpen ? "Fechar menu" : "Abrir menu");

  return (
    <div className={"admin-shell" + (collapsed ? " is-collapsed" : "") + (drawerOpen ? " is-sidebar-open" : "")}>
      {drawerOpen && (
        <div className="admin-scrim" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
      )}

      <aside id="admin-sidebar" className="admin-sidebar" aria-label="Navegação principal">
        <div className="admin-brand">
          <Link to="/app" className="admin-brand-link" title="Nexus Business Manager" onClick={() => setDrawerOpen(false)}>
            <Logo size={30} />
            <span className="admin-brand-text">Nexus Business Manager</span>
          </Link>
          <button
            type="button"
            className="admin-drawer-close"
            aria-label="Fechar menu"
            title="Fechar menu"
            onClick={() => setDrawerOpen(false)}
          >
            <span aria-hidden="true">{"✕"}</span>
          </button>
        </div>
        <nav className="admin-nav">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/app"}
              onClick={() => { setDrawerOpen(false); setDica(null); }}
              onMouseEnter={(e) => mostrarDica(e.currentTarget, item.label)}
              onMouseLeave={() => setDica(null)}
              onFocus={(e) => mostrarDica(e.currentTarget, item.label)}
              onBlur={() => setDica(null)}
              aria-label={item.label}
              className={({ isActive }) => `admin-nav-item ${isActive ? "is-active" : ""}`}
            >
              <span className="admin-nav-icon" aria-hidden="true">{item.icon}</span>
              <span className="admin-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {dica && (
        <span className="admin-rail-tip" role="tooltip" style={{ top: dica.top, left: dica.left }}>
          {dica.texto}
        </span>
      )}

      <div className="admin-main">
        <header className="admin-header">
          <button
            type="button"
            className={"admin-toggle" + (visible ? " is-on" : "")}
            aria-label={rotuloBotao}
            title={rotuloBotao}
            aria-expanded={visible}
            aria-controls="admin-sidebar"
            aria-pressed={!collapsed}
            onClick={toggleSidebar}
          >
            <PanelLeftIcon />
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
