import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  ChartBarIcon,
  UserGroupIcon,
  TruckIcon,
  CubeIcon,
  ClipboardDocumentListIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  CalendarDaysIcon,
  ChartPieIcon,
  BellIcon,
  ShieldCheckIcon,
  UsersIcon,
  Cog6ToothIcon,
  InformationCircleIcon,
  BuildingOfficeIcon,
  LightBulbIcon,
  SparklesIcon,
} from '@heroicons/react/24/solid';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: ChartBarIcon },
  { to: '/clients', label: 'Clientes', icon: UserGroupIcon },
  { to: '/suppliers', label: 'Fornecedores', icon: TruckIcon },
  { to: '/products', label: 'Produtos', icon: CubeIcon },
  { to: '/stock', label: 'Estoque', icon: ClipboardDocumentListIcon },
  { to: '/purchases', label: 'Compras', icon: ShoppingCartIcon },
  { to: '/sales', label: 'Vendas', icon: CurrencyDollarIcon },
  { to: '/financial', label: 'Financeiro', icon: CreditCardIcon },
  { to: '/crm', label: 'CRM', icon: BuildingOfficeIcon },
  { to: '/nexus-ai', label: 'Nexus AI', icon: SparklesIcon },
  { to: '/suggestions', label: 'Sugestoes', icon: LightBulbIcon },
  { to: '/appointments', label: 'Agenda', icon: CalendarDaysIcon },
  { to: '/reports', label: 'Relatorios', icon: ChartPieIcon },
  { to: '/notifications', label: 'Notificacoes', icon: BellIcon },
  { to: '/audit', label: 'Auditoria', icon: ShieldCheckIcon, roles: ['admin', 'manager'] },
  { to: '/users', label: 'Usuarios', icon: UsersIcon, roles: ['admin', 'manager'] },
  { to: '/companies', label: 'Configuracoes', icon: Cog6ToothIcon, roles: ['admin'] },
  { to: '/about', label: 'Sobre', icon: InformationCircleIcon },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth();

  const sidebarContent = (
    <>
      <div className="p-6 flex items-center justify-center border-b" style={{ borderColor: 'var(--nexus-border)' }}>
        <img
          src="/logo.png"
          alt="Nexus Business Manager"
          className="sidebar-logo"
        />
      </div>

      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {navItems
          .filter((item) => !item.roles || item.roles.includes((user?.role || '').toLowerCase()))
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `nexus-sidebar-item ${isActive ? 'active' : ''}`
                }
              >
                <span className="nexus-sidebar-icon">
                  <Icon className="w-5 h-5" />
                </span>
                <span className="text-sm font-medium">{item.label}</span>
              </NavLink>
            );
          })}
      </nav>
    </>
  );

  return (
    <>
      {/* Desktop sidebar - always visible on md+ screens */}
      <aside className="nexus-sidebar w-64 min-h-screen flex-col hidden md:flex">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar - overlay, only shown when toggled */}
      {open !== undefined && (
        <>
          {open && (
            <div className="nexus-sidebar-overlay" onClick={onClose} />
          )}
          <aside
            className={`nexus-sidebar w-64 min-h-screen flex flex-col md:hidden ${open ? 'nexus-sidebar-mobile open' : 'nexus-sidebar-mobile'}`}
          >
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
