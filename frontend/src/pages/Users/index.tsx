import { useState, useEffect, FormEvent } from 'react';
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

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="page-title">Usuarios</h1>
          <p className="text-brand-graphiteWine/60 mt-1">Gerenciar usuarios do sistema</p>
        </div>
        <button onClick={openCreate} className="btn-primary">Novo Usuario</button>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center text-brand-graphiteWine/70">Carregando...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-brand-graphiteWine/70">Nenhum usuario encontrado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-blackCherry text-brand-ivorySmoke">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-brand-ivorySmoke">Nome</th>
                  <th className="text-left py-3 px-4 font-medium text-brand-ivorySmoke">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-brand-ivorySmoke">Perfil</th>
                  <th className="text-left py-3 px-4 font-medium text-brand-ivorySmoke">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-brand-ivorySmoke">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-[rgba(214,179,112,0.18)]">
                    <td className="py-3 px-4 font-medium">{user.name}</td>
                    <td className="py-3 px-4 text-brand-graphiteWine/70">{user.email}</td>
                    <td className="py-3 px-4">
                      <span className={getRoleBadge(user.role)}>
                        {roleLabels[user.role]}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {user.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button onClick={() => openEdit(user)} className="text-brand-roseGold hover:text-brand-champagneGold font-medium">Editar</button>
                      <button onClick={() => handleToggleActive(user)} className={`font-medium ${user.active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}>
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
        <div className="fixed inset-0 bg-brand-blackCherry/45 flex items-center justify-center z-50">
          <div className="card rounded-2xl w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold mb-6">
              {editingUser ? 'Editar Usuario' : 'Novo Usuario'}
            </h2>

            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-blackCherry mb-1">Nome</label>
                <input
                  type="text" className="input-field" required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-blackCherry mb-1">Email</label>
                <input
                  type="email" className="input-field" required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-blackCherry mb-1">
                  {editingUser ? 'Nova Senha (deixe em branco para manter)' : 'Senha'}
                </label>
                <input
                  type="password" className="input-field"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-blackCherry mb-1">Perfil</label>
                <select
                  className="input-field"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })}
                >
                  <option value="admin">Administrador</option>
                  <option value="manager">Gerente</option>
                  <option value="operator">Operador</option>
                  <option value="viewer">Visualizador</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
