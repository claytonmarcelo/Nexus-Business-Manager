import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserGroupIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { PremiumTable, Column } from '../../components/ui/PremiumTable';
import { GradientButton } from '../../components/ui/GradientButton';
import api from '../../services/api';
import { Client } from '../../types';
import { useToast } from '../../contexts/ToastContext';

export function Clients() {
  const { showToast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', document: '', address: '', notes: '', status: 'ATIVO',
  });
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 10;

  useEffect(() => { loadClients(); }, []);

  async function loadClients(query = '', p = 1) {
    try {
      setLoading(true);
      const params: any = { page: p, limit: PAGE_SIZE };
      if (query) params.search = query;
      const res = await api.get('/clients', { params });
      setClients(res.data.data || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err: any) {
      console.error('Erro ao carregar clientes:', err);
      const errorMsg = err?.response?.data?.message || err?.response?.data?.error || 'Erro ao carregar clientes';
      showToast(errorMsg, 'error');
    }
    finally { setLoading(false); }
  }

  function handleSearch(e?: FormEvent) {
    e?.preventDefault();
    setPage(1);
    loadClients(search, 1);
  }

  function handlePageChange(p: number) {
    if (p < 1 || p > totalPages) return;
    setPage(p);
    loadClients(search, p);
  }

  function openCreate() {
    setEditingClient(null);
    setFormData({ name:'', phone:'', email:'', document:'', address:'', notes:'', status:'ATIVO' });
    setError('');
    setShowModal(true);
  }

  function openEdit(client: Client) {
    setEditingClient(client);
    setFormData({
      name: client.name, phone: client.phone || '', email: client.email || '',
      document: client.document || '', address: client.address || '',
      notes: client.notes || '', status: (client as any).status || (client.active ? 'ATIVO' : 'INATIVO'),
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
        showToast('Cliente atualizado com sucesso');
      } else {
        await api.post('/clients', formData);
        showToast('Cliente criado com sucesso');
      }
      setShowModal(false);
      loadClients(search, page);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Erro ao salvar cliente');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    try {
      await api.delete(`/clients/${id}`);
      showToast('Cliente excluído com sucesso');
      loadClients(search, page);
    } catch { showToast('Erro ao excluir cliente', 'error'); }
  }

  function extractCity(address: string | null): string {
    if (!address) return '-';
    const parts = address.split(',').map(s => s.trim());
    return parts.length > 1 ? `${parts[parts.length - 2]}` : parts[0];
  }

  const columns: Column<Client>[] = [
    {
      key: 'name',
      header: 'Cliente',
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'var(--nexus-gold)', color: '#000' }}>
            {c.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--nexus-text)' }}>{c.name}</p>
            <p className="text-[11px]" style={{ color: 'var(--nexus-muted)' }}>#{String(c.id).padStart(4, '0')}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Telefone',
      render: (c) => c.phone || '-',
    },
    {
      key: 'email',
      header: 'Email',
      render: (c) => c.email || '-',
    },
    {
      key: 'address',
      header: 'Cidade',
      render: (c) => extractCity(c.address),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
          style={c.active
            ? { background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid #22c55e' }
            : { background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid #ef4444' }
          }
        >
          {c.active ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (c) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEdit(c)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
            style={{
              color: 'var(--nexus-gold)',
              background: 'rgba(var(--nexus-gold-rgb), 0.1)',
              border: '1px solid rgba(var(--nexus-gold-rgb), 0.2)',
            }}
          >
            Editar
          </button>
          <button
            onClick={() => handleDelete(c.id)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
            style={{
              color: 'var(--nexus-danger)',
              background: 'rgba(var(--nexus-danger-rgb), 0.1)',
              border: '1px solid rgba(var(--nexus-danger-rgb), 0.2)',
            }}
          >
            Excluir
          </button>
        </div>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
            Gerenciar clientes
          </p>
        </div>
        <GradientButton onClick={openCreate}>
          <PlusIcon className="w-4 h-4" />
          Novo Cliente
        </GradientButton>
      </div>

      <div className="nexus-card p-4 mb-4">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--nexus-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar clientes..."
            className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm outline-none transition-all"
            style={{ background: 'var(--nexus-bg)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-text)' }}
          />
          {search && (
            <button type="button" onClick={() => { setSearch(''); loadClients('', 1); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--nexus-muted)' }}>
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>

      <div style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)', borderRadius: '14px', overflow: 'hidden' }}>
        <PremiumTable columns={columns} data={clients} loading={loading} />
        
        {!loading && clients.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--nexus-border)' }}>
            <div className="text-sm" style={{ color: 'var(--nexus-muted)' }}>
              Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, total)} de {total} clientes
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="p-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'var(--nexus-card-soft)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)' }}
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className="w-8 h-8 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: page === p ? 'linear-gradient(135deg, var(--nexus-gold), var(--nexus-bronze))' : 'var(--nexus-card-soft)',
                    color: page === p ? '#000' : 'var(--nexus-text)',
                    border: page === p ? 'none' : '1px solid var(--nexus-border)',
                  }}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="p-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'var(--nexus-card-soft)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)' }}
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'var(--nexus-overlay)' }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
              style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold" style={{ color: 'var(--nexus-text)' }}>
                  {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg"
                  style={{ background: 'var(--nexus-card-soft)', color: 'var(--nexus-muted-2)' }}
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              {error && (
                <div
                  className="px-4 py-3 rounded-xl mb-4 text-sm"
                  style={{ background: 'rgba(var(--nexus-danger-rgb), 0.12)', color: 'var(--nexus-danger)', border: '1px solid rgba(var(--nexus-danger-rgb), 0.2)' }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted-2)' }}>
                    Nome <span style={{ color: 'var(--nexus-rose)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                    style={{ background: 'var(--nexus-input-bg)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-text)' }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted-2)' }}>
                      Telefone
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                      style={{ background: 'var(--nexus-input-bg)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-text)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted-2)' }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                      style={{ background: 'var(--nexus-input-bg)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-text)' }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted-2)' }}>
                      CPF/CNPJ
                    </label>
                    <input
                      type="text"
                      value={formData.document}
                      onChange={e => setFormData({ ...formData, document: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                      style={{ background: 'var(--nexus-input-bg)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-text)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted-2)' }}>
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all cursor-pointer"
                      style={{ background: 'var(--nexus-input-bg)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-text)' }}
                    >
                      <option value="ATIVO" style={{ background: 'var(--nexus-bg)', color: 'var(--nexus-text)' }}>Ativo</option>
                      <option value="INATIVO" style={{ background: 'var(--nexus-bg)', color: 'var(--nexus-text)' }}>Inativo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted-2)' }}>
                    Endereço
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                    style={{ background: 'var(--nexus-input-bg)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-text)' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted-2)' }}>
                    Observações
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all resize-none"
                    style={{ background: 'var(--nexus-input-bg)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-text)' }}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <GradientButton type="submit" className="flex-1">
                    {editingClient ? 'Salvar' : 'Cadastrar'}
                  </GradientButton>
                  <GradientButton
                    type="button"
                    variant="secondary"
                    onClick={() => setShowModal(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </GradientButton>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
