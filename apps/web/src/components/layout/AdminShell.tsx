import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Logo } from "../Logo";
import { ThemeToggle } from "../ThemeToggle";
import { NotificationBell } from "./NotificationBell";
import { useAuth } from "../../context/AuthContext";
import { AppFooter } from "./AppFooter";

interface NavItem {
  label: string;
  icon: string;
  permission?: string;
  /** Rota do modulo. Item de camada ainda em obra nao tem rota nenhuma. */
  to?: string;
  /** Justifica o item sem rota: vira dica no icone e rotulo "em breve". */
  emBreve?: string;
  /** Área da plataforma (Fase 1b): só o administrador da plataforma vê e abre. */
  plataforma?: boolean;
}

// Camadas do menu lateral (group headers). A ordem daqui e a ordem da barra.
// Cada camada so aparece se houver pelo menos um item liberado para o papel da
// pessoa: titulo sem item embaixo e lixo na tela de quem nao tem acesso.
interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Visão Geral",
    items: [
      { to: "/app", label: "Dashboard", icon: "▦" },
      // Avisos não têm permissão própria: cada pessoa vê só os seus, na empresa
      // ativa, então a linha aparece para qualquer papel que entre no painel.
      { to: "/app/notificacoes", label: "Notificações", icon: "❖" },
    ],
  },
  {
    title: "Comercial & CRM",
    items: [
      { to: "/app/crm", label: "CRM", icon: "⬡", permission: "crm:read" },
      { to: "/app/clientes", label: "Clientes", icon: "◈", permission: "client:read" },
      { to: "/app/vendas", label: "Vendas", icon: "＄", permission: "sale:read" },
    ],
  },
  {
    title: "Estoque & Suprimentos",
    items: [
      { to: "/app/produtos", label: "Produtos", icon: "▣", permission: "product:read" },
      { to: "/app/compras", label: "Compras", icon: "⛁", permission: "purchase:read" },
    ],
  },
  {
    title: "Serviços & Atendimentos",
    items: [
      { label: "Ordens de Serviço", icon: "✦", emBreve: "Ordens de serviço: módulo ainda em construção." },
      { to: "/app/agenda", label: "Agenda", icon: "▤", permission: "agenda:read" },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { to: "/app/financeiro", label: "Financeiro", icon: "◫", permission: "finance:read" },
      { label: "Gateways & Cobranças", icon: "▭", permission: "settings:read", emBreve: "Gateways e cobranças: área ainda em construção." },
    ],
  },
  {
    title: "Administração & Sistema",
    items: [
      { to: "/app/usuarios", label: "Usuários", icon: "◉", permission: "user:read" },
      { to: "/app/auditoria", label: "Auditoria", icon: "❐", permission: "audit:read" },
      { to: "/app/cms", label: "CMS & Site Público", icon: "▩", plataforma: true },
      { to: "/app/rotinas", label: "Rotinas agendadas", icon: "◷", plataforma: true },
      { to: "/app/configuracoes", label: "Configurações", icon: "⚙" },
    ],
  },
];

// Abaixo disto a sidebar vira gaveta lateral (off-canvas); acima ela fica
// fixa e o mesmo botao apenas recolhe os rotulos (modo trilha).
const DESKTOP_QUERY = "(min-width: 821px)";
const COLLAPSE_KEY = "nexus.sidebar.collapsed";
// Tempos do hover peek: uma espera curta para abrir (o ponteiro atravessa a
// trilha a caminho de outro lugar o tempo todo) e uma um pouco maior para
// fechar (dar chance de pular do rotulo para o item sem o menu sumir no meio).
const PEEK_ABRE_MS = 70;
const PEEK_FECHA_MS = 140;

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

  // Estado da gaveta (mobile/tablet).
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Estado do modo trilha (desktop), persistido entre visitas. So o clique no
  // botao altera isto: o ponteiro nunca fixa nem solta a barra.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "true";
    } catch {
      return false;
    }
  });
  // Hover peek: revelo temporario dos rotulos quando a barra esta na trilha.
  const [peek, setPeek] = useState(false);
  const peekTimer = useRef<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, String(collapsed));
    } catch {
      /* modo privado do navegador: segue sem persistir */
    }
  }, [collapsed]);

  // Timer unico: abrir cancela o fechamento pendurado e vice-versa, entao o
  // menu nunca fica piscando quando o mouse passa raspando na volta.
  const agendarPeek = useCallback((ligar: boolean) => {
    if (peekTimer.current) window.clearTimeout(peekTimer.current);
    peekTimer.current = window.setTimeout(
      () => setPeek(ligar),
      ligar ? PEEK_ABRE_MS : PEEK_FECHA_MS,
    );
  }, []);

  // Com qualquer dialogo aberto (modal de formulario ou de confirmacao) a barra
  // lateral fica congelada: ela nao expande nem se recolhe enquanto a pessoa esta
  // lendo e confirmando. A deteccao usa o proprio DOM do modal, sem estado
  // compartilhado entre componentes.
  const ponteiroNaBarra = useRef(false);
  const haDialogoAberto = () => document.querySelector(".nx-modal-overlay") !== null;

  const abrirPeek = useCallback(() => {
    ponteiroNaBarra.current = true;
    if (!collapsed || drawerOpen || haDialogoAberto()) return;
    agendarPeek(true);
  }, [collapsed, drawerOpen, agendarPeek]);

  const fecharPeek = useCallback(() => {
    ponteiroNaBarra.current = false;
    if (haDialogoAberto()) return;
    agendarPeek(false);
  }, [agendarPeek]);

  // Ao fechar o dialogo, se o ponteiro ja foi embora da barra, o peek se desfaz
  // sozinho: a interface volta ao estado estavel sem piscar.
  useEffect(() => {
    if (!peek) return undefined;
    const observer = new MutationObserver(() => {
      if (!haDialogoAberto() && !ponteiroNaBarra.current) fecharPeek();
    });
    observer.observe(document.body, { childList: true });
    return () => observer.disconnect();
  }, [peek, fecharPeek]);

  // Fora do modo trilha (barra fixa por clique, ou gaveta no celular) o peek
  // nao tem o que revelar: desliga na hora, sem esperar o timer.
  useEffect(() => {
    if (!collapsed || drawerOpen) {
      if (peekTimer.current) window.clearTimeout(peekTimer.current);
      setPeek(false);
    }
  }, [collapsed, drawerOpen]);

  useEffect(() => () => {
    if (peekTimer.current) window.clearTimeout(peekTimer.current);
  }, []);

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
  const visivel = isDesktop() ? !collapsed : drawerOpen;
  // A trilha com o ponteiro por cima vale como barra larga para a dica visual
  // do estado, mas NAO altera o aria-expanded do botao: o botão controla a
  // fixacao, e fixado ou nao e o que a pessoa precisa saber pelo leitor de tela.
  const peekAtivo = collapsed && peek && !drawerOpen;

  const toggleSidebar = useCallback(() => {
    if (isDesktop()) setCollapsed((v) => !v);
    else setDrawerOpen((v) => !v);
  }, []);

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
  // pagina de boas-vindas (landing). Quem garante o destino e o ProtectedRoute,
  // a partir do motivo que o AuthContext registrou, e replace() de la impede o
  // voltar do navegador de reabrir o painel com sessao morta. Um navigate()
  // aqui seria uma corrida com o estado: perdia quando a sessao ainda constava.
  async function handleLogout() {
    await logout();
  }

  // Camadas visiveis: primeiro corta os itens sem permissao (e as áreas da
  // plataforma, que pedem o administrador da plataforma — Fase 1b), depois
  // descarta a camada inteira que ficou vazia.
  const grupos = NAV_GROUPS
    .map((grupo) => ({
      title: grupo.title,
      items: grupo.items.filter(
        (n) => (!n.plataforma || user?.platform) && (!n.permission || can(n.permission)),
      ),
    }))
    .filter((grupo) => grupo.items.length > 0);

  const rotuloBotao = isDesktop()
    ? (collapsed ? "Expandir menu lateral" : "Recolher menu lateral")
    : (drawerOpen ? "Fechar menu" : "Abrir menu");

  return (
    <div
      className={
        "admin-shell" +
        (collapsed ? " is-collapsed" : "") +
        (peekAtivo ? " is-peek" : "") +
        (drawerOpen ? " is-sidebar-open" : "")
      }
    >
      {drawerOpen && (
        <div className="admin-scrim" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
      )}

      <aside
        id="admin-sidebar"
        className="admin-sidebar"
        aria-label="Navegação principal"
        onMouseEnter={abrirPeek}
        onMouseLeave={fecharPeek}
        onFocus={abrirPeek}
        onBlur={(e) => {
          // So recolhe quando o foco realmente saiu da barra (mudar de item
          // para item nao pode fechar o menu no meio da navegacao por teclado).
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) fecharPeek();
        }}
      >
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
          {grupos.map((grupo) => (
            <div className="admin-nav-group" key={grupo.title}>
              <p className="admin-nav-group-title">{grupo.title}</p>
              <div className="admin-nav-items">
                {grupo.items.map((item) => (item.to ? (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/app"}
                    onClick={() => setDrawerOpen(false)}
                    aria-label={item.label}
                    className={({ isActive }) => `admin-nav-item ${isActive ? "is-active" : ""}`}
                  >
                    <span className="admin-nav-icon" aria-hidden="true">{item.icon}</span>
                    <span className="admin-nav-label">{item.label}</span>
                  </NavLink>
                ) : (
                  // Modulo anunciado na camada, mas ainda sem pagina: nao vira
                  // link (link quebrado seria pior) e diz o porquê na dica.
                  <span
                    key={item.label}
                    className="admin-nav-item is-soon"
                    aria-disabled="true"
                    title={item.emBreve}
                  >
                    <span className="admin-nav-icon" aria-hidden="true">{item.icon}</span>
                    <span className="admin-nav-label">{item.label}</span>
                    <span className="admin-nav-soon">em breve</span>
                  </span>
                )))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-header">
          <button
            type="button"
            className={"admin-toggle" + (visivel ? " is-on" : "")}
            aria-label={rotuloBotao}
            title={rotuloBotao}
            aria-expanded={visivel}
            aria-controls="admin-sidebar"
            aria-pressed={!collapsed}
            onClick={toggleSidebar}
          >
            <PanelLeftIcon />
          </button>
          <div className="admin-header-actions">
            {/* Atalho para a vitrine: desde a Fase 1b a vitrine é área da
                plataforma, e só quem responde por ela abre o editor. */}
            {user?.platform ? (
              <a
                className="btn btn-ghost btn-sm admin-open-site"
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                title="Visualizar a landing page em outra aba"
              >
                <span className="admin-open-site-icone" aria-hidden="true">{"↗"}</span>
                <span className="admin-open-site-rotulo">Visualizar landing page</span>
              </a>
            ) : null}
            <NotificationBell />
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

        <AppFooter legais={[]} contexto="painel" />
      </div>
    </div>
  );
}
