import { useState, useEffect, FormEvent } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { User } from '../../types';

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
      setUsers(res.data);
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

  function getRoleBadge(role: string) {
    const classes: Record<string, string> = {
      admin: 'badge-admin',
      manager: 'badge-manager',
      operator: 'badge-operator',
      viewer: 'badge-viewer',
    };
    return classes[role] || 'badge';
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.625rem 1rem', background: 'rgba(0,0,0,0.5)', color: 'var(--nexus-text)',
    border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem', outline: 'none',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--nexus-text)' }}>Usuarios</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--nexus-muted-2)', marginTop: '0.25rem' }}>Gerenciar usuarios do sistema</p>
        </div>
        <button
          onClick={openCreate}
          style={{
            background: 'linear-gradient(135deg, #C65A71, #9d4e58)', color: '#fff', border: 'none',
            borderRadius: '10px', padding: '0.625rem 1.25rem', fontWeight: 500, cursor: 'pointer',
          }}
        >
          Novo Usuario
        </button>
      </div>

      <div style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)', borderRadius: '14px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--nexus-muted-2)' }}>Carregando...</div>
        ) : users.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--nexus-muted-2)' }}>Nenhum usuario encontrado</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nexus-muted-2)', borderBottom: '1px solid rgba(212, 149, 86, 0.1)' }}>Nome</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nexus-muted-2)', borderBottom: '1px solid rgba(212, 149, 86, 0.1)' }}>Email</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nexus-muted-2)', borderBottom: '1px solid rgba(212, 149, 86, 0.1)' }}>Perfil</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nexus-muted-2)', borderBottom: '1px solid rgba(212, 149, 86, 0.1)' }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nexus-muted-2)', borderBottom: '1px solid rgba(212, 149, 86, 0.1)' }}>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212,149,86,0.04)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(212,149,86,0.05)', color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500 }}>{user.name}</td>
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(212,149,86,0.05)', color: 'var(--nexus-text)', fontSize: '0.875rem' }}>{user.email}</td>
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(212,149,86,0.05)', color: 'var(--nexus-text)', fontSize: '0.875rem' }}>
                      <span className={getRoleBadge(user.role)}>{roleLabels[user.role]}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(212,149,86,0.05)', color: 'var(--nexus-text)', fontSize: '0.875rem' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                        padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500,
                        background: user.active ? 'rgba(34,197,94,0.12)' : 'rgba(216,75,95,0.12)',
                        color: user.active ? '#22C55E' : '#D84B5F',
                      }}>
                        {user.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(212,149,86,0.05)', color: 'var(--nexus-text)', fontSize: '0.875rem', textAlign: 'right' }}>
                      <button
                        onClick={() => openEdit(user)}
                        style={{ color: '#D49556', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}
                      >
                        Editar
                      </button>
                      <span style={{ color: 'var(--nexus-border)', margin: '0 0.5rem' }}>|</span>
                      <button
                        onClick={() => handleToggleActive(user)}
                        style={{
                          color: user.active ? '#D84B5F' : '#22C55E', background: 'none', border: 'none',
                          cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem',
                        }}
                      >
                        {user.active ? 'Desativar' : 'Ativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--nexus-card-strong)', border: '1px solid var(--nexus-border)', borderRadius: '18px', padding: '2rem', width: '100%', maxWidth: '32rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--nexus-text)', marginBottom: '1.5rem' }}>
              {editingUser ? 'Editar Usuario' : 'Novo Usuario'}
            </h2>

            {error && (
              <div style={{ background: 'rgba(216, 75, 95, 0.12)', color: '#D84B5F', border: '1px solid rgba(216, 75, 95, 0.2)', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Nome</label>
                <input
                  type="text" style={inputStyle} required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label style={{ color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Email</label>
                <input
                  type="email" style={inputStyle} required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label style={{ color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>
                  {editingUser ? 'Nova Senha (deixe em branco para manter)' : 'Senha'}
                </label>
                <input
                  type="password" style={inputStyle}
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div>
                <label style={{ color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Perfil</label>
                <select
                  style={inputStyle}
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })}
                >
                  <option value="admin">Administrador</option>
                  <option value="manager">Gerente</option>
                  <option value="operator">Operador</option>
                  <option value="viewer">Visualizador</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
                <button
                  type="button" onClick={() => setShowModal(false)}
                  style={{ background: 'var(--nexus-card)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', padding: '0.625rem 1.25rem', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ background: 'linear-gradient(135deg, #C65A71, #9d4e58)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.625rem 1.25rem', fontWeight: 500, cursor: 'pointer' }}
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
