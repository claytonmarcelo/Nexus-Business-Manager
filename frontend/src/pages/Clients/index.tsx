import { useState, useEffect, FormEvent } from 'react';
import api from '../../services/api';
import { Client } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/Skeleton';

export function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', document: '', address: '', notes: '', status: 'ATIVO',
  });
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { loadClients(); }, []);

  async function loadClients(query = '') {
    try {
      setLoading(true);
      const params: any = { page: 1, limit: 50 };
      if (query) params.search = query;
      const res = await api.get('/clients', { params });
      setClients(res.data.data || res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    loadClients(search);
  }

  function openCreate() {
    setEditingClient(null);
    setFormData({ name: '', phone: '', email: '', document: '', address: '', notes: '', status: 'ATIVO' });
    setError('');
    setShowModal(true);
  }

  function openEdit(client: Client) {
    setEditingClient(client);
    setFormData({
      name: client.name,
      phone: client.phone || '',
      email: client.email || '',
      document: client.document || '',
      address: client.address || '',
      notes: client.notes || '',
      status: (client as any).status || 'ATIVO',
    });
    setError('');
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    try {
      if (editingClient) {
        await api.put(`/clients/${editingClient.id}`, formData);
      } else {
        await api.post('/clients', formData);
      }
      setShowModal(false);
      loadClients(search);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Erro ao salvar cliente');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    try {
      await api.delete(`/clients/${id}`);
      loadClients(search);
    } catch { /* ignore */ }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 mt-1">Cadastro centralizado de clientes</p>
        </div>
        <button onClick={openCreate} className="btn-primary">Novo Cliente</button>
      </div>

      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Buscar por nome, email, telefone ou documento..."
          className="input-field flex-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="btn-primary">Buscar</button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); loadClients(); }} className="btn-secondary">Limpar</button>
        )}
      </form>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : clients.length === 0 ? (
          <EmptyState
            title="Nenhum cliente encontrado"
            message={search ? 'Nenhum resultado para a busca realizada.' : 'Cadastre seu primeiro cliente para comecar.'}
            action={<button onClick={openCreate} className="btn-primary">Cadastrar Cliente</button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Nome</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Telefone</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Documento</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{client.name}</td>
                    <td className="py-3 px-4 text-gray-500">{client.phone || '-'}</td>
                    <td className="py-3 px-4 text-gray-500">{client.email || '-'}</td>
                    <td className="py-3 px-4 text-gray-500">{client.document || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`badge ${(client as any).status === 'ATIVO' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {(client as any).status || 'ATIVO'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button onClick={() => openEdit(client)} className="text-nexus-600 hover:text-nexus-800 font-medium">Editar</button>
                      <button onClick={() => handleDelete(client.id)} className="text-red-600 hover:text-red-800 font-medium">Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg mx-4">
            <h2 className="text-xl font-semibold mb-6">
              {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>

            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input type="text" className="input-field" required value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input type="text" className="input-field" value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" className="input-field" value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CPF/CNPJ</label>
                <input type="text" className="input-field" value={formData.document}
                  onChange={(e) => setFormData({ ...formData, document: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Endereco</label>
                <input type="text" className="input-field" value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select className="input-field" value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  <option value="ATIVO">ATIVO</option>
                  <option value="INATIVO">INATIVO</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observacoes</label>
                <textarea className="input-field" rows={3} value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
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
