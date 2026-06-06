import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../services/api';
import { ArrowLeftOnRectangleIcon, MoonIcon, SunIcon, ComputerDesktopIcon } from '@heroicons/react/24/solid';

export function Profile() {
  const { user, updateUser, signOut } = useAuth();
  const { showToast } = useToast();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

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

  const handleSave = useCallback(async () => {
    try {
      await api.put('/users/profile', formData);
      updateUser({ name: formData.name, email: formData.email });
      showToast('Perfil atualizado com sucesso.');
      setEditing(false);
    } catch {
      showToast('Erro ao atualizar perfil.', 'error');
    }
  }, [formData, showToast, updateUser]);

  const handleCancel = useCallback(() => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
    });
    setEditing(false);
  }, [user]);

  const avatarSrc = user?.avatar_url || user?.avatarUrl || null;
  const initials = user?.name?.charAt(0).toUpperCase() || '?';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-nexus-text mb-2">Meu Perfil</h1>
        <p className="text-nexus-textSecondary">Informações da sua conta</p>
      </div>

      <div className="card space-y-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            <button
              onClick={handleAvatarClick}
              disabled={avatarLoading}
              className="w-24 h-24 rounded-full bg-nexus-teal flex items-center justify-center text-3xl font-bold overflow-hidden hover:opacity-80 transition-opacity cursor-pointer"
              title="Clique para alterar avatar"
            >
              {avatarLoading ? (
                <span className="animate-spin text-xl">{'\u21BB'}</span>
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
          </div>
          <div>
            <h2 className="text-xl font-semibold text-nexus-text">
              {user?.name}
            </h2>
            <p className="text-sm text-nexus-textSecondary capitalize">
              {user?.role}
            </p>
            <p className="text-sm text-nexus-textSecondary">
              {user?.email}
            </p>
          </div>
        </div>

        <hr className="border-nexus-border" />

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-nexus-text mb-2">
              Nome
            </label>
            {editing ? (
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-nexus-border bg-nexus-graphite text-nexus-text focus:outline-none focus:ring-2 focus:ring-nexus-teal"
              />
            ) : (
              <p className="text-nexus-textSecondary">{user?.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-nexus-text mb-2">
              Email
            </label>
            {editing ? (
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-nexus-border bg-nexus-graphite text-nexus-text focus:outline-none focus:ring-2 focus:ring-nexus-teal"
              />
            ) : (
              <p className="text-nexus-textSecondary">{user?.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-nexus-text mb-2">
              Função
            </label>
            <p className="text-nexus-textSecondary capitalize">{user?.role}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-nexus-text mb-2">
              ID da Empresa
            </label>
            <p className="text-nexus-textSecondary">{user?.company_id}</p>
          </div>
        </div>

        <div className="flex gap-3">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-nexus-teal text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
              >
                Salvar
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-nexus-border text-nexus-text rounded-lg hover:bg-nexus-softGray transition-colors font-medium"
              >
                Cancelar
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 bg-nexus-teal text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
            >
              Editar Perfil
            </button>
          )}
        </div>

        <hr className="border-nexus-border" />

        <div>
          <label className="block text-sm font-medium text-nexus-text mb-3">
            Aparência
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setTheme('dark')}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                theme === 'dark'
                  ? 'border-nexus-gold bg-nexus-gold/10'
                  : 'border-nexus-border hover:border-nexus-gold/50'
              }`}
            >
              <MoonIcon className="w-6 h-6 text-nexus-gold" />
              <span className="text-sm text-nexus-text">Escuro</span>
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                theme === 'light'
                  ? 'border-nexus-gold bg-nexus-gold/10'
                  : 'border-nexus-border hover:border-nexus-gold/50'
              }`}
            >
              <SunIcon className="w-6 h-6 text-nexus-gold" />
              <span className="text-sm text-nexus-text">Claro</span>
            </button>
            <button
              onClick={() => setTheme('auto')}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                theme === 'auto'
                  ? 'border-nexus-gold bg-nexus-gold/10'
                  : 'border-nexus-border hover:border-nexus-gold/50'
              }`}
            >
              <ComputerDesktopIcon className="w-6 h-6 text-nexus-gold" />
              <span className="text-sm text-nexus-text">Automático</span>
            </button>
          </div>
        </div>

        <hr className="border-nexus-border" />

        <div>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 px-4 py-2 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors font-medium"
          >
            <ArrowLeftOnRectangleIcon className="w-5 h-5" />
            Sair do sistema
          </button>
        </div>
      </div>
    </div>
  );
}
