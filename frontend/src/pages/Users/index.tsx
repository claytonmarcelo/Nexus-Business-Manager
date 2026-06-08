import { useState, useEffect, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { UserGroupIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { User } from '../../types';
import { StatsCard } from '../../components/ui/StatsCard';
import { PremiumTable, Column } from '../../components/ui/PremiumTable';
import { PremiumBadge } from '../../components/ui/PremiumBadge';
import { GradientButton } from '../../components/ui/GradientButton';

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  operator: 'Operador',
  viewer: 'Visualizador',
};

export function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'operator' as User['role'],
  });
  const [error, setError] = useState('');

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try {
      const res = await api.get('/users');
      setUsers(res.data?.data || []);
    } catch { console.error('Erro ao carregar usuarios'); }
    finally { setLoading(false); }
  }

  function openCreate() {
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: 'operator' });
    setError('');
    setShowModal(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setFormData({ name: user.name, email: user.email, password: '', role: user.role });
    setError('');
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    try {
      if (editingUser) {
        const payload: any = { name: formData.name, email: formData.email, role: formData.role };
        if (formData.password) payload.password = formData.password;
        await api.put(`/users/${editingUser.id}`, payload);
      } else {
        await api.post('/users', formData);
      }
      setShowModal(false);
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar usuario');
    }
  }

  async function handleToggleActive(user: User) {
    try {
      await api.put(`/users/${user.id}`, { active: !user.active });
      loadUsers();
    } catch { console.error('Erro ao alternar status do usuario'); }
  }

  function getRoleBadgeStyle(role: string) {
    const styles: Record<string, React.CSSProperties> = {
      admin: { display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500, background: 'rgba(var(--nexus-danger-rgb), 0.12)', color: 'var(--nexus-danger)', border: '1px solid rgba(var(--nexus-danger-rgb), 0.2)' },
      manager: { display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500, background: 'rgba(var(--nexus-gold-rgb), 0.12)', color: 'var(--nexus-gold)', border: '1px solid rgba(var(--nexus-gold-rgb), 0.2)' },
      operator: { display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500, background: 'rgba(var(--nexus-blue-rgb), 0.12)', color: 'var(--nexus-chart-blue)', border: '1px solid rgba(var(--nexus-blue-rgb), 0.2)' },
      viewer: { display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500, background: 'rgba(var(--nexus-muted-rgb), 0.12)', color: 'var(--nexus-muted)', border: '1px solid rgba(var(--nexus-muted-rgb), 0.2)' },
    };
    return styles[role] || styles.viewer;
  }


  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Nome',
      render: (user) => (
        <span className="font-medium" style={{ color: 'var(--nexus-text)' }}>{user.name}</span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (user) => (
        <span style={{ color: 'var(--nexus-muted-2)' }}>{user.email}</span>
      ),
    },
    {
      key: 'role',
      header: 'Perfil',
      render: (user) => {
        const roleColors: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
          admin: 'danger',
          manager: 'warning',
          operator: 'success',
          viewer: 'default',
        };
        return <PremiumBadge variant={roleColors[user.role] || 'default'}>{roleLabels[user.role]}</PremiumBadge>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (user) => (
        <PremiumBadge variant={user.active ? 'success' : 'danger'}>
          {user.active ? 'Ativo' : 'Inativo'}
        </PremiumBadge>
      ),
    },
    {
      key: 'actions',
      header: 'Acoes',
      render: (user) => (
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={() => openEdit(user)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
            style={{
              color: 'var(--nexus-gold)',
              background: 'rgba(var(--nexus-gold-rgb), 0.1)',
              border: '1px solid rgba(var(--nexus-gold-rgb), 0.2)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(var(--nexus-gold-rgb), 0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(var(--nexus-gold-rgb), 0.1)'; }}
          >
            Editar
          </button>
          <button
            onClick={() => handleToggleActive(user)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
            style={{
              color: user.active ? 'var(--nexus-danger)' : '#22C55E',
              background: user.active ? 'rgba(var(--nexus-danger-rgb), 0.1)' : 'rgba(var(--nexus-success-rgb), 0.1)',
              border: user.active ? '1px solid rgba(var(--nexus-danger-rgb), 0.2)' : '1px solid rgba(var(--nexus-success-rgb), 0.2)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = user.active ? 'rgba(var(--nexus-danger-rgb), 0.2)' : 'rgba(var(--nexus-success-rgb), 0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = user.active ? 'rgba(var(--nexus-danger-rgb), 0.1)' : 'rgba(var(--nexus-success-rgb), 0.1)'; }}
          >
            {user.active ? 'Desativar' : 'Ativar'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--nexus-text)' }}>Usuarios</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--nexus-muted-2)' }}>Gerenciar usuarios do sistema</p>
        </div>
        <GradientButton onClick={openCreate} icon={<UserPlusIcon className="w-5 h-5" />}>
          Novo Usuario
        </GradientButton>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          label="Total Usuarios"
          value={String(users.length)}
          icon={<UserGroupIcon className="w-5 h-5" />}
          color="gold"
        />
        <StatsCard
          label="Usuarios Ativos"
          value={String(users.filter(u => u.active).length)}
          icon={<UserGroupIcon className="w-5 h-5" />}
          color="green"
          trend={users.length > 0 ? { value: `${Math.round((users.filter(u => u.active).length / users.length) * 100)}%`, direction: 'up' } : undefined}
        />
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
        <PremiumTable columns={columns} data={users} loading={loading} emptyMessage="Nenhum usuario encontrado." />
      </div>

      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'var(--nexus-overlay)' }}
          onClick={() => setShowModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-xl p-6"
            style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: 'var(--nexus-text)' }}>
                {editingUser ? 'Editar Usuario' : 'Novo Usuario'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                style={{ color: 'var(--nexus-muted-2)', background: 'var(--nexus-card-soft)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-lg mb-4 text-sm" style={{ background: 'rgba(var(--nexus-danger-rgb), 0.12)', color: 'var(--nexus-danger)', border: '1px solid rgba(var(--nexus-danger-rgb), 0.2)' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-muted-2)' }}>Nome *</label>
                <input
                  type="text" required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all duration-200"
                  style={{ background: 'var(--nexus-input-bg)', border: '1px solid rgba(var(--nexus-gold-rgb),0.15)', color: 'var(--nexus-text)' }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.4)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-muted-2)' }}>Email *</label>
                <input
                  type="email" required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all duration-200"
                  style={{ background: 'var(--nexus-input-bg)', border: '1px solid rgba(var(--nexus-gold-rgb),0.15)', color: 'var(--nexus-text)' }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.4)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-muted-2)' }}>
                  {editingUser ? 'Nova Senha (opcional)' : 'Senha *'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all duration-200"
                  style={{ background: 'var(--nexus-input-bg)', border: '1px solid rgba(var(--nexus-gold-rgb),0.15)', color: 'var(--nexus-text)' }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.4)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-muted-2)' }}>Perfil *</label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })}
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all duration-200"
                  style={{ background: 'var(--nexus-input-bg)', border: '1px solid rgba(var(--nexus-gold-rgb),0.15)', color: 'var(--nexus-text)' }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.4)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'}
                >
                  <option value="admin">Administrador</option>
                  <option value="manager">Gerente</option>
                  <option value="operator">Operador</option>
                  <option value="viewer">Visualizador</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <GradientButton variant="secondary" type="button" onClick={() => setShowModal(false)}>
                  Cancelar
                </GradientButton>
                <GradientButton type="submit">
                  Salvar
                </GradientButton>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
