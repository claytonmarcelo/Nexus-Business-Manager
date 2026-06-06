import { useState, useCallback, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { ArrowLeftOnRectangleIcon } from '@heroicons/react/24/solid';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
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
  const { user, signOut, updateUser } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const handleAvatarClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Tipo de arquivo nao permitido. Use jpg, png ou webp.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Arquivo muito grande. Maximo 5MB.', 'error');
      return;
    }
    setAvatarLoading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await api.post('/users/avatar', formData);
      const avatarUrl = res.data.data?.avatar_url;
      if (avatarUrl) {
        updateUser({ avatar_url: avatarUrl, avatarUrl });
      }
      showToast('Avatar atualizado com sucesso.');
    } catch (error) {
      console.error('Erro ao atualizar avatar:', error);
      showToast('Erro ao atualizar avatar.', 'error');
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [showToast, updateUser]);

  const handleLogout = () => signOut();

  const avatarSrc = user?.avatar_url || user?.avatarUrl || null;
  const initials = user?.name?.charAt(0).toUpperCase() || '?';

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

      <div className="px-3 pb-4">
        {confirmLogout ? (
          <div className="nexus-sidebar-item flex-col items-stretch gap-2">
            <p className="text-xs text-nexus-muted text-center">Sair do sistema?</p>
            <div className="flex gap-2">
              <button
                onClick={handleLogout}
                className="flex-1 text-xs font-medium py-1.5 px-3 rounded-lg transition-colors"
                style={{ background: 'rgba(216, 75, 95, 0.2)', color: '#D84B5F' }}
              >
                Sim, sair
              </button>
              <button
                onClick={() => setConfirmLogout(false)}
                className="flex-1 text-xs font-medium py-1.5 px-3 rounded-lg transition-colors"
                style={{ background: 'var(--nexus-card)', color: 'var(--nexus-muted)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmLogout(true)}
            className="sidebar-logout-btn w-full"
          >
            <span className="w-[42px] h-[42px] flex items-center justify-center rounded-lg flex-shrink-0" style={{ background: 'rgba(216, 75, 95, 0.1)', border: '1px solid rgba(216, 75, 95, 0.2)' }}>
              <ArrowLeftOnRectangleIcon className="w-5 h-5" />
            </span>
            <span className="text-sm font-medium">Sair do sistema</span>
          </button>
        )}
      </div>
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
