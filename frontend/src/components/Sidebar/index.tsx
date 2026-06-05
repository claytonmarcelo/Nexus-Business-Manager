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
    <aside className="w-64 bg-nexus-black text-nexus-text min-h-screen flex flex-col">
      <div className="p-8 flex items-center justify-center">
        <img 
          src="/logo.png" 
          alt="Nexus Business Manager" 
          className="sidebar-logo"
        />
      </div>

      <nav className="flex-1 px-4 pb-4 space-y-2 overflow-y-auto">
        {navItems
          .filter((item) => !item.roles || item.roles.includes(user?.role || ''))
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${
                    isActive
                      ? 'text-nexus-tealLight'
                      : 'text-nexus-textSecondary hover:text-nexus-text'
                  }`
                }
                style={({ isActive }: { isActive: boolean }) => 
                  isActive 
                    ? { 
                        backgroundColor: 'rgba(62, 149, 143, 0.16)',
                        border: '1px solid rgba(62, 149, 143, 0.28)'
                      } 
                    : { border: '1px solid transparent' }
                }
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  if (!el.classList.contains('text-nexus-tealLight')) {
                    el.style.backgroundColor = 'rgba(62, 149, 143, 0.12)';
                  }
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  if (!el.classList.contains('text-nexus-tealLight')) {
                    el.style.backgroundColor = '';
                  }
                }}
              >
                <span 
                  className="w-9 h-9 min-w-[34px] flex items-center justify-center rounded-xl"
                  style={{
                    background: 'linear-gradient(145deg, rgba(62, 149, 143, 0.22), rgba(133, 213, 210, 0.18))',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.12), 0 6px 14px rgba(0,0,0,0.25)'
                  }}
                >
                  <Icon className="w-5 h-5" />
                </span>
                <span className="font-semibold">{item.label}</span>
              </NavLink>
            );
          })}
      </nav>
    </aside>
  );
}
