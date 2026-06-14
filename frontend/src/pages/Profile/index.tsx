import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { ArrowLeftOnRectangleIcon, PhotoIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { GradientButton } from '../../components/ui/GradientButton';

export function Profile() {
  const { user, updateUser, signOut } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const handleAvatarClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const uploadAvatar = useCallback(async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Tipo de arquivo não permitido. Use jpg, png ou webp.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Arquivo muito grande. Máximo 5MB.', 'error');
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
      showToast('Foto de perfil atualizada com sucesso.');
    } catch (error) {
      console.error('Erro ao atualizar avatar:', error);
      showToast('Erro ao atualizar foto de perfil.', 'error');
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [showToast, updateUser]);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadAvatar(file);
  }, [uploadAvatar]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await uploadAvatar(file);
  }, [uploadAvatar]);

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
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '??';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Meu Perfil</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
            Informações da sua conta
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Avatar Card */}
        <div className="nexus-card p-6">
          <div className="flex flex-col items-center">
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleAvatarClick}
              className={`relative w-32 h-32 rounded-full flex items-center justify-center overflow-hidden cursor-pointer transition-all duration-200 ${
                isDragging ? 'scale-105' : 'hover:scale-105'
              }`}
              style={{
                background: isDragging ? 'rgba(var(--nexus-gold-rgb), 0.2)' : 'var(--nexus-gold)',
                border: isDragging ? '2px dashed var(--nexus-gold)' : '2px solid transparent',
              }}
              title="Clique ou arraste uma imagem para alterar a foto"
            >
              {avatarLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-medium">Enviando...</span>
                </div>
              ) : avatarSrc ? (
                <img src={avatarSrc} alt={user?.name} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-black">
                  <PhotoIcon className="w-8 h-8" />
                  <span className="text-xs font-medium">{initials}</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            
            <div className="mt-4 text-center">
              <p className="text-sm font-semibold" style={{ color: 'var(--nexus-text)' }}>
                {user?.name}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--nexus-muted)' }}>
                {user?.email}
              </p>
              <p className="text-xs mt-1 capitalize" style={{ color: 'var(--nexus-muted)' }}>
                {user?.role}
              </p>
            </div>

            <div className="mt-4 p-3 rounded-lg text-center" style={{ background: 'var(--nexus-bg-soft)' }}>
              <CloudArrowUpIcon className="w-5 h-5 mx-auto mb-1" style={{ color: 'var(--nexus-gold)' }} />
              <p className="text-xs" style={{ color: 'var(--nexus-muted)' }}>
                Arraste e solte uma imagem ou clique para selecionar
              </p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--nexus-muted-2)' }}>
                JPG, PNG ou WEBP (máx. 5MB)
              </p>
            </div>
          </div>
        </div>

        {/* Profile Info Card */}
        <div className="nexus-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold" style={{ color: 'var(--nexus-text)' }}>
              Informações do Perfil
            </h2>
            {!editing && (
              <GradientButton onClick={() => setEditing(true)} className="text-sm py-2 px-4">
                Editar
              </GradientButton>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted-2)' }}>
                Nome
              </label>
              {editing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                  style={{ background: 'var(--nexus-input-bg)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-text)' }}
                />
              ) : (
                <p className="text-sm" style={{ color: 'var(--nexus-text)' }}>{user?.name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted-2)' }}>
                Email
              </label>
              {editing ? (
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                  style={{ background: 'var(--nexus-input-bg)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-text)' }}
                />
              ) : (
                <p className="text-sm" style={{ color: 'var(--nexus-text)' }}>{user?.email}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted-2)' }}>
                Função
              </label>
              <p className="text-sm capitalize" style={{ color: 'var(--nexus-muted)' }}>{user?.role}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted-2)' }}>
                ID da Empresa
              </label>
              <p className="text-sm" style={{ color: 'var(--nexus-muted)' }}>{user?.company_id}</p>
            </div>
          </div>

          {editing && (
            <div className="flex gap-3 mt-6 pt-4" style={{ borderTop: '1px solid var(--nexus-border)' }}>
              <GradientButton onClick={handleSave} className="flex-1">
                Salvar Alterações
              </GradientButton>
              <GradientButton
                variant="secondary"
                onClick={handleCancel}
                className="flex-1"
              >
                Cancelar
              </GradientButton>
            </div>
          )}
        </div>
      </div>

      {/* Logout Card */}
      <div className="nexus-card p-6 mt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--nexus-text)' }}>
              Sair do Sistema
            </h3>
            <p className="text-xs mt-1" style={{ color: 'var(--nexus-muted)' }}>
              Você precisará fazer login novamente para acessar sua conta.
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              color: 'var(--nexus-danger)',
              background: 'rgba(var(--nexus-danger-rgb), 0.1)',
              border: '1px solid rgba(var(--nexus-danger-rgb), 0.2)',
            }}
          >
            <ArrowLeftOnRectangleIcon className="w-4 h-4" />
            Sair
          </button>
        </div>
      </div>
    </motion.div>
  );
}
