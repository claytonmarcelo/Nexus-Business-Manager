import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: 'D' },
  { to: '/users', label: 'Usuarios', icon: 'U', roles: ['admin', 'manager'] },
  { to: '/clients', label: 'Clientes', icon: 'C' },
  { to: '/suppliers', label: 'Fornecedores', icon: 'F' },
  { to: '/products', label: 'Produtos', icon: 'P' },
  { to: '/stock', label: 'Estoque', icon: 'E' },
  { to: '/purchases', label: 'Compras', icon: 'C' },
  { to: '/sales', label: 'Vendas', icon: 'V' },
  { to: '/financial', label: 'Financeiro', icon: '$' },
  { to: '/appointments', label: 'Agenda', icon: 'A' },
  { to: '/reports', label: 'Relatorios', icon: 'R' },
  { to: '/notifications', label: 'Notificacoes', icon: 'N' },
  { to: '/audit', label: 'Auditoria', icon: 'L', roles: ['admin', 'manager'] },
  { to: '/companies', label: 'Empresas', icon: 'M', roles: ['admin'] },
];

export function Sidebar() {
  const { user, signOut } = useAuth();

  return (
    <aside className="w-64 bg-nexus-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-nexus-700">
        <h1 className="text-xl font-bold tracking-tight">Nexus</h1>
        <p className="text-nexus-300 text-sm mt-1">Business Manager</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems
          .filter((item) => !item.roles || item.roles.includes(user?.role || ''))
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-nexus-700 text-white'
                    : 'text-nexus-200 hover:bg-nexus-800 hover:text-white'
                }`
              }
            >
              <span className="w-8 h-8 flex items-center justify-center bg-nexus-800 rounded-lg text-xs font-bold">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
      </nav>

      <div className="p-4 border-t border-nexus-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-nexus-600 flex items-center justify-center text-sm font-bold">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-nexus-300 capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full text-left text-sm text-nexus-300 hover:text-white py-2 transition-colors"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
