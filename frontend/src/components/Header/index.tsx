import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const STORAGE_KEYS_TO_KEEP = ['@nexus:token', '@nexus:user', '@nexus:theme'];

export function Header() {
  const { user, signOut, updateUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
    <header className="header">
      <div className="flex items-center justify-end">
        {/* Right Side */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center p-2 rounded-lg hover:bg-nexus-softGray transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-nexus-teal flex items-center justify-center text-sm font-bold overflow-hidden">
                {avatarLoading ? (
                  <span className="animate-spin text-xs">{'\u21BB'}</span>
                ) : avatarSrc ? (
                  <img src={avatarSrc} alt={user?.name} className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-48 bg-nexus-graphite border border-nexus-teal rounded-lg shadow-xl z-20 overflow-hidden">
                  <button
                    onClick={handleAvatarClick}
                    className="w-full text-left px-4 py-3 text-sm text-nexus-text hover:bg-nexus-darkGray transition-colors"
                  >
                    Alterar Avatar
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <button
                    onClick={() => {
                      navigate('/profile');
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-nexus-text hover:bg-nexus-darkGray transition-colors"
                  >
                    Perfil
                  </button>
                  <hr className="border-nexus-teal" />
                  <button
                    onClick={() => {
                      signOut();
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-nexus-darkGray transition-colors"
                  >
                    Sair
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
