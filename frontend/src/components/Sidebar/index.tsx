import { useState, useCallback, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';

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
  { to: '/about', label: 'Sobre', icon: '?' },
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
    if (file.size > 2 * 1024 * 1024) {
      showToast('Arquivo muito grande. Maximo 2MB.', 'error');
      return;
    }
    setAvatarLoading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await api.post('/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const avatarUrl = res.data.data?.avatar_url;
      if (avatarUrl) {
        updateUser({ avatar_url: avatarUrl, avatarUrl });
      }
      showToast('Avatar atualizado com sucesso.');
    } catch {
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
              onClick={() => {}}
            >
              <span className="w-8 h-8 flex items-center justify-center bg-nexus-800 rounded-lg text-xs font-bold">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
      </nav>

      <div className="p-4 border-t border-nexus-700 space-y-2">
          <div className="flex items-center gap-3">
          <button
            onClick={handleAvatarClick}
            disabled={avatarLoading}
            className="w-9 h-9 rounded-full bg-nexus-600 flex items-center justify-center text-sm font-bold overflow-hidden flex-shrink-0 hover:opacity-80 transition-opacity cursor-pointer"
            title="Clique para alterar avatar"
          >
            {avatarLoading ? (
              <span className="animate-spin text-xs">{'\u21BB'}</span>
            ) : avatarSrc ? (
              <img src={avatarSrc} alt={user?.name} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarUpload}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-nexus-300 capitalize">{user?.role}</p>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-2 text-left text-sm text-nexus-300 hover:text-white py-1.5 transition-colors"
        >
          <span className="text-base">{theme === 'dark' ? '\u2600' : '\u263E'}</span>
          {theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
        </button>

        <button
          onClick={handleClearCache}
          disabled={cacheLoading}
          className="w-full flex items-center gap-2 text-left text-sm text-nexus-300 hover:text-white py-1.5 transition-colors disabled:opacity-50"
        >
          <span className={`text-base inline-block ${cacheLoading ? 'animate-spin' : ''}`}>
            {'\u21BB'}
          </span>
          {cacheLoading ? 'Limpando...' : 'Limpar Cache'}
        </button>

        <button
          onClick={() => navigate('/about')}
          className="w-full text-left text-sm text-nexus-300 hover:text-white py-1.5 transition-colors"
        >
          Sobre
        </button>

        <button
          onClick={signOut}
          className="w-full text-left text-sm text-nexus-300 hover:text-white py-1.5 transition-colors"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
