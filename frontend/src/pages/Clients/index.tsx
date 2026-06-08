import { useState, useEffect, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { UserGroupIcon, UserPlusIcon, CheckBadgeIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { Client } from '../../types';
import { StatsCard } from '../../components/ui/StatsCard';
import { PremiumTable, Column } from '../../components/ui/PremiumTable';
import { SearchBar } from '../../components/ui/SearchBar';
import { Pagination } from '../../components/ui/Pagination';
import { GradientButton } from '../../components/ui/GradientButton';
import { PremiumBadge } from '../../components/ui/PremiumBadge';
import { EmptyState } from '../../components/ui/EmptyState';

function extractCity(address: string | null): string {
  if (!address) return '-';
  const parts = address.split(',').map(s => s.trim());
  return parts.length > 1 ? parts[parts.length - 2] : parts[0];
}

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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => { loadClients(); }, []);

  async function loadClients(query = '', p = 1) {
    try {
      setLoading(true);
      const params: any = { page: p, limit: 10 };
      if (query) params.search = query;
      const res = await api.get('/clients', { params });
      setClients(res.data.data || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch { console.error('Erro ao carregar clientes'); }
    finally { setLoading(false); }
  }

  function handleSearch() {
    setPage(1);
    loadClients(search, 1);
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    loadClients(search, newPage);
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
      status: (client as any).status || (client.active ? 'ATIVO' : 'INATIVO'),
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
      loadClients(search, page);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Erro ao salvar cliente');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    try {
      await api.delete(`/clients/${id}`);
      loadClients(search, page);
    } catch { console.error('Erro ao excluir cliente'); }
  }

  const newClientsThisMonth = clients.filter(c => {
    if (!c.created_at) return false;
    const d = new Date(c.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const activeClients = clients.filter(c => c.active).length;

  const columns: Column<Client>[] = [
    {
      key: 'name',
      header: 'Cliente',
      render: (client) => (
        <span className="font-medium" style={{ color: 'var(--nexus-text)' }}>{client.name}</span>
      ),
    },
    {
      key: 'phone',
      header: 'Contato',
      render: (client) => (
        <span style={{ color: 'var(--nexus-muted-2)' }}>{client.phone || '-'}</span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      hide: 'md',
      render: (client) => (
        <span style={{ color: 'var(--nexus-muted-2)' }}>{client.email || '-'}</span>
      ),
    },
    {
      key: 'city',
      header: 'Cidade',
      hide: 'md',
      render: (client) => (
        <span style={{ color: 'var(--nexus-muted-2)' }}>{extractCity(client.address)}</span>
      ),
    },
    {
      key: 'last_purchase',
      header: 'Ultima Compra',
      hide: 'lg',
      render: () => (
        <span style={{ color: 'var(--nexus-muted-2)' }}>-</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (client) => (
        <PremiumBadge variant={client.active ? 'success' : 'danger'}>
          {client.active ? 'ATIVO' : 'INATIVO'}
        </PremiumBadge>
      ),
    },
    {
      key: 'document',
      header: 'CPF/CNPJ',
      hide: 'lg',
      render: (client) => (
        <span style={{ color: 'var(--nexus-muted-2)' }}>{client.document || '-'}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Acoes',
      render: (client) => (
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(client); }}
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
            onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }}
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
            style={{
              color: 'var(--nexus-danger)',
              background: 'rgba(var(--nexus-danger-rgb), 0.1)',
              border: '1px solid rgba(var(--nexus-danger-rgb), 0.2)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(var(--nexus-danger-rgb), 0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(var(--nexus-danger-rgb), 0.1)'; }}
          >
            Excluir
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-between items-center mb-8"
      >
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--nexus-text)' }}>Clientes</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--nexus-muted-2)' }}>Cadastro centralizado de clientes</p>
        </div>
        <GradientButton onClick={openCreate}>
          Novo Cliente
        </GradientButton>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      >
        <StatsCard
          label="Total de Clientes"
          value={String(total)}
          icon={<UserGroupIcon className="w-5 h-5" />}
          color="gold"
        />
        <StatsCard
          label="Novos Clientes"
          value={String(newClientsThisMonth)}
          icon={<UserPlusIcon className="w-5 h-5" />}
          color="rose"
          subtitle="este mes"
        />
        <StatsCard
          label="Clientes Ativos"
          value={String(activeClients)}
          icon={<CheckBadgeIcon className="w-5 h-5" />}
          color="green"
          trend={total > 0 ? { value: `${Math.round((activeClients / total) * 100)}%`, direction: 'up' } : undefined}
        />
        <StatsCard
          label="Ticket Medio"
          value="-"
          icon={<CurrencyDollarIcon className="w-5 h-5" />}
          color="blue"
          subtitle="em breve"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mb-6"
      >
        <SearchBar
          value={search}
          onChange={(val) => setSearch(val)}
          onSubmit={handleSearch}
          placeholder="Buscar por nome, email, telefone ou documento..."
          rightContent={
            <div className="flex items-center gap-2">
              {search && (
                <button
                  onClick={() => { setSearch(''); loadClients('', 1); setPage(1); }}
                  className="text-xs font-medium px-3 py-2 rounded-lg transition-all duration-200"
                  style={{
                    color: 'var(--nexus-muted-2)',
                    background: 'var(--nexus-input-bg)',
                    border: '1px solid rgba(var(--nexus-gold-rgb),0.15)',
                  }}
                >
                  Limpar
                </button>
              )}
            </div>
          }
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="rounded-xl overflow-hidden"
        style={{
          background: 'var(--nexus-card)',
          border: '1px solid var(--nexus-border)',
        }}
      >
        {loading ? (
          <PremiumTable columns={columns} data={[]} loading />
        ) : clients.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Nenhum cliente encontrado"
              message={search ? 'Nenhum resultado para a busca realizada.' : 'Cadastre seu primeiro cliente para comecar.'}
              action={<GradientButton onClick={openCreate}>Cadastrar Cliente</GradientButton>}
            />
          </div>
        ) : (
          <>
            <PremiumTable columns={columns} data={clients} />
            <div className="px-6 pb-4">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          </>
        )}
      </motion.div>

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
            style={{
              background: 'var(--nexus-card)',
              border: '1px solid var(--nexus-border)',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: 'var(--nexus-text)' }}>
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
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
              <div
                className="px-4 py-3 rounded-lg mb-4 text-sm"
                style={{
                  background: 'rgba(var(--nexus-danger-rgb), 0.12)',
                  color: 'var(--nexus-danger)',
                  border: '1px solid rgba(var(--nexus-danger-rgb), 0.2)',
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-muted-2)' }}>Nome *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all duration-200"
                  style={{
                    background: 'var(--nexus-input-bg)',
                    border: '1px solid rgba(var(--nexus-gold-rgb),0.15)',
                    color: 'var(--nexus-text)',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.4)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-muted-2)' }}>Telefone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all duration-200"
                    style={{
                      background: 'var(--nexus-input-bg)',
                      border: '1px solid rgba(var(--nexus-gold-rgb),0.15)',
                      color: 'var(--nexus-text)',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.4)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-muted-2)' }}>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all duration-200"
                    style={{
                      background: 'var(--nexus-input-bg)',
                      border: '1px solid rgba(var(--nexus-gold-rgb),0.15)',
                      color: 'var(--nexus-text)',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.4)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-muted-2)' }}>CPF/CNPJ</label>
                <input
                  type="text"
                  value={formData.document}
                  onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all duration-200"
                  style={{
                    background: 'var(--nexus-input-bg)',
                    border: '1px solid rgba(var(--nexus-gold-rgb),0.15)',
                    color: 'var(--nexus-text)',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.4)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-muted-2)' }}>Endereco</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all duration-200"
                  style={{
                    background: 'var(--nexus-input-bg)',
                    border: '1px solid rgba(var(--nexus-gold-rgb),0.15)',
                    color: 'var(--nexus-text)',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.4)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-muted-2)' }}>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all duration-200"
                  style={{
                    background: 'var(--nexus-input-bg)',
                    border: '1px solid rgba(var(--nexus-gold-rgb),0.15)',
                    color: 'var(--nexus-text)',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.4)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'}
                >
                  <option value="ATIVO">ATIVO</option>
                  <option value="INATIVO">INATIVO</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-muted-2)' }}>Observacoes</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all duration-200 resize-none"
                  style={{
                    background: 'var(--nexus-input-bg)',
                    border: '1px solid rgba(var(--nexus-gold-rgb),0.15)',
                    color: 'var(--nexus-text)',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.4)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <GradientButton
                  variant="secondary"
                  type="button"
                  onClick={() => setShowModal(false)}
                >
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
    </div>
  );
}
