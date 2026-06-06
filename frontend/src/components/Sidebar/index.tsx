import { useState, useCallback, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
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
  { to: '/appointments', label: 'Agenda', icon: CalendarDaysIcon },
  { to: '/reports', label: 'Relatórios', icon: ChartPieIcon },
  { to: '/notifications', label: 'Notificações', icon: BellIcon },
  { to: '/audit', label: 'Auditoria', icon: ShieldCheckIcon, roles: ['admin', 'manager'] },
  { to: '/users', label: 'Usuários', icon: UsersIcon, roles: ['admin', 'manager'] },
  { to: '/companies', label: 'Empresas', icon: Cog6ToothIcon, roles: ['admin'] },
  { to: '/about', label: 'Sobre', icon: InformationCircleIcon },
];

const STORAGE_KEYS_TO_KEEP = ['@nexus:token', '@nexus:user', '@nexus:theme'];

export function Sidebar() {
  const { user, signOut, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

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

  const handleClearCache = useCallback(async () => {
    setCacheLoading(true);
    await new Promise(r => setTimeout(r, 300));
    try {
      const kept: Record<string, string | null> = {};
      for (const key of STORAGE_KEYS_TO_KEEP) {
        kept[key] = localStorage.getItem(key);
      }
      localStorage.clear();
      for (const key of STORAGE_KEYS_TO_KEEP) {
        if (kept[key] !== null) {
          localStorage.setItem(key, kept[key]!);
        }
      }
      showToast('Cache limpo com sucesso.');
    } catch {
      showToast('Nao foi possivel limpar o cache. O sistema continuara funcionando normalmente.', 'error');
    } finally {
      setCacheLoading(false);
    }
  }, [showToast]);

  const avatarSrc = user?.avatar_url || user?.avatarUrl || null;
  const initials = user?.name?.charAt(0).toUpperCase() || '?';

  return (
    <aside className="nexus-sidebar w-64 min-h-screen flex flex-col">
      <div className="p-6 flex items-center justify-center border-b" style={{ borderColor: 'rgba(214, 168, 93, 0.15)' }}>
        <img 
          src="/logo.png" 
          alt="Nexus Business Manager" 
          className="sidebar-logo"
        />
      </div>

      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {navItems
          .filter((item) => !item.roles || item.roles.includes(user?.role || ''))
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
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
    </aside>
  );
}
