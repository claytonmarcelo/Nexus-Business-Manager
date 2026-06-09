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
  BuildingOfficeIcon,
  CreditCardIcon,
  CalendarDaysIcon,
  ChartPieIcon,
  BellIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  LightBulbIcon,
  InformationCircleIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/solid';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: ChartBarIcon },
  { to: '/clients', label: 'Clientes', icon: UserGroupIcon },
  { to: '/suppliers', label: 'Fornecedores', icon: TruckIcon },
  { to: '/products', label: 'Produtos', icon: CubeIcon },
  { to: '/stock', label: 'Estoque', icon: ClipboardDocumentListIcon },
  { to: '/purchases', label: 'Compras', icon: ShoppingCartIcon },
  { to: '/sales', label: 'Vendas', icon: CurrencyDollarIcon },
  { to: '/crm', label: 'CRM', icon: BuildingOfficeIcon },
  { to: '/financial', label: 'Financeiro', icon: CreditCardIcon },
  { to: '/appointments', label: 'Agenda', icon: CalendarDaysIcon },
  { to: '/reports', label: 'Relatórios', icon: ChartPieIcon },
  { to: '/notifications', label: 'Notificações', icon: BellIcon },
  { to: '/audit', label: 'Auditoria', icon: ShieldCheckIcon, roles: ['admin', 'manager'] },
  { to: '/companies', label: 'Configurações', icon: Cog6ToothIcon, roles: ['admin'] },
  { to: '/suggestions', label: 'Sugestões', icon: LightBulbIcon },
  { to: '/about', label: 'Sobre', icon: InformationCircleIcon },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user, signOut } = useAuth();

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-6 flex items-center justify-center border-b" style={{ borderColor: 'var(--nexus-border)' }}>
        <img
          src="/logo.png"
          alt="Nexus Business Manager"
          className="sidebar-logo"
        />
      </div>

      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto custom-scrollbar">
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
                <span className="text-sm font-medium flex-1">{item.label}</span>
                {item.to === '/notifications' && (
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'var(--nexus-danger)', color: '#fff', minWidth: 18, textAlign: 'center' }}>
                    3
                  </span>
                )}
              </NavLink>
            );
          })}
      </nav>

      <div className="p-4 border-t" style={{ borderColor: 'var(--nexus-border)' }}>
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium transition-colors rounded-lg hover:bg-nexus-bg"
          style={{ color: 'var(--nexus-gold)' }}
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          Sair do sistema
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar - always visible on md+ screens */}
      <aside className="nexus-sidebar w-64 min-h-screen flex flex-col hidden md:flex border-r" style={{ borderColor: 'var(--nexus-border)', background: 'var(--nexus-sidebar)' }}>
        {sidebarContent}
      </aside>

      {/* Mobile sidebar - overlay, only shown when toggled */}
      {open !== undefined && (
        <>
          {open && (
            <div className="nexus-sidebar-overlay fixed inset-0 z-40 bg-black/50" onClick={onClose} />
          )}
          <aside
            className={`nexus-sidebar w-64 h-full fixed top-0 left-0 z-50 flex flex-col md:hidden transition-transform transform ${open ? 'translate-x-0' : '-translate-x-full'}`}
            style={{ borderRight: '1px solid var(--nexus-border)', background: 'var(--nexus-sidebar)' }}
          >
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
