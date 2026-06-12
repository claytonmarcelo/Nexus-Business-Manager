import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserGroupIcon, UserPlusIcon, CheckBadgeIcon, CurrencyDollarIcon,
  MagnifyingGlassIcon, FunnelIcon, ChevronDownIcon, PlusIcon,
  EyeIcon, PencilSquareIcon, EllipsisVerticalIcon, ChevronLeftIcon,
  ChevronRightIcon, XMarkIcon, HomeIcon, ChevronRightIcon as ChevronSep
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { Client } from '../../types';
import { StatsCard } from '../../components/ui/StatsCard';
import { useToast } from '../../contexts/ToastContext';

/* ─── helpers ─────────────────────────────────────────── */
function extractCity(address: string | null): string {
  if (!address) return '-';
  const parts = address.split(',').map(s => s.trim());
  return parts.length > 1 ? `${parts[parts.length - 2]}` : parts[0];
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

const AVATAR_COLORS = [
  '#8B5CF6','var(--nexus-rose)','var(--nexus-gold)','#3B82F6','#10B981','#F59E0B',
  '#EC4899','#6366F1','#14B8A6','#EF4444',
];

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

/* ─── input style helper ──────────────────────────────── */
const inputCls = 'w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200';
const inputStyle = {
  background: 'var(--nexus-input-bg)',
  border: '1px solid rgba(var(--nexus-gold-rgb),0.15)',
  color: 'var(--nexus-text)',
};

/* ─── component ────────────────────────────────────────── */
export function Clients() {
  const { showToast } = useToast();
  const [clients, setClients]           = useState<Client[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [formData, setFormData]         = useState({
    name: '', phone: '', email: '', document: '', address: '', notes: '', status: 'ATIVO',
  });
  const [error, setError]               = useState('');
  const [search, setSearch]             = useState('');
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [total, setTotal]               = useState(0);
  const [sortLabel, setSortLabel]       = useState('Mais recentes');
  const [showSort, setShowSort]         = useState(false);
  const [actionMenu, setActionMenu]     = useState<number | null>(null);
  const PAGE_SIZE                       = 10;

  const sortOptions = ['Mais recentes','Mais antigos','A-Z','Z-A'];

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
    setActionMenu(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (editingClient) await api.put(`/clients/${editingClient.id}`, formData);
      else await api.post('/clients', formData);
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
    } catch { showToast('Erro ao excluir cliente', 'error'); }
    setActionMenu(null);
  }

  const newClientsThisMonth = clients.filter(c => {
    if (!c.created_at) return false;
    const d = new Date(c.created_at), now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const activeClients = clients.filter(c => c.active).length;

  /* pagination range */
  function pageRange() {
    const delta = 1;
    const range: (number | string)[] = [];
    for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) range.push(i);
    if ((range[0] as number) > 2) range.unshift('...');
    if ((range[range.length - 1] as number) < totalPages - 1) range.push('...');
    if (totalPages > 1) range.unshift(1);
    if (totalPages > 1) range.push(totalPages);
    return range;
  }

  return (
    <div className="p-6 space-y-6" onClick={() => { setShowSort(false); setActionMenu(null); }}>

      {/* ── Breadcrumb + Title ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <nav className="flex items-center gap-2 text-xs mb-3" style={{ color: 'var(--nexus-muted)' }}>
          <HomeIcon className="w-3.5 h-3.5" />
          <span>Dashboard</span>
          <ChevronSep className="w-3 h-3" />
          <span style={{ color: 'var(--nexus-text)' }}>Clientes</span>
        </nav>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--nexus-text)' }}>Clientes</h1>
      </motion.div>

      {/* ── KPI Cards ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatsCard
          label="Total de Clientes"
          value={total.toLocaleString('pt-BR')}
          icon={<UserGroupIcon className="w-5 h-5" />}
          color="gold"
          trend={{ value: '12,5%', direction: 'up' }}
          subtitle="este mês"
        />
        <StatsCard
          label="Novos Clientes"
          value={String(newClientsThisMonth)}
          icon={<UserPlusIcon className="w-5 h-5" />}
          color="gold"
          trend={{ value: '8,3%', direction: 'up' }}
          subtitle="este mês"
        />
        <StatsCard
          label="Clientes Ativos"
          value={activeClients.toLocaleString('pt-BR')}
          icon={<CheckBadgeIcon className="w-5 h-5" />}
          color="gold"
          trend={{ value: '15,7%', direction: 'up' }}
          subtitle="este mês"
        />
        <StatsCard
          label="Ticket Médio"
          value="R$ 528,40"
          icon={<CurrencyDollarIcon className="w-5 h-5" />}
          color="gold"
          trend={{ value: '9,4%', direction: 'up' }}
          subtitle="este mês"
        />
      </motion.div>

      {/* ── Toolbar ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="flex items-center gap-4 flex-wrap"
        onClick={e => e.stopPropagation()}
      >
        {/* Search */}
        <form onSubmit={handleSearch} className="relative flex-1 min-w-[180px] max-w-[320px]">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--nexus-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, email ou telefone..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-text)' }}
            onFocus={e => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.5)'}
            onBlur={e => e.target.style.borderColor = 'var(--nexus-border)'}
          />
          {search && (
            <button type="button" onClick={() => { setSearch(''); loadClients('', 1); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--nexus-muted)' }}>
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </form>

        {/* Right Controls */}
        <div className="flex items-center gap-3 ml-auto flex-wrap">
          {/* Filter btn */}
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all whitespace-nowrap flex-shrink-0"
            style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)', color: 'var(--nexus-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.4)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--nexus-border)')}>
            <FunnelIcon className="w-4 h-4" />
            Filtros
          </button>

          {/* Sort dropdown */}
          <div className="relative flex-shrink-0">
            <button onClick={e => { e.stopPropagation(); setShowSort(v => !v); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all whitespace-nowrap"
              style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)', color: 'var(--nexus-muted)' }}>
              {sortLabel}
              <ChevronDownIcon className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {showSort && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="absolute right-0 top-12 z-20 rounded-xl overflow-hidden shadow-xl min-w-[160px]"
                  style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
                  {sortOptions.map(opt => (
                    <button key={opt} onClick={() => { setSortLabel(opt); setShowSort(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[rgba(var(--nexus-gold-rgb),0.08)] whitespace-nowrap"
                      style={{ color: opt === sortLabel ? 'var(--nexus-gold)' : 'var(--nexus-text)' }}>
                      {opt}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* New Client */}
          <div className="flex-shrink-0">
            <button onClick={openCreate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 shadow-lg whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg, var(--nexus-rose), var(--nexus-rose-dark))' }}>
              <PlusIcon className="w-4 h-4" />
              Novo Cliente
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Table ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}
      >
        <div className="">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--nexus-border)' }}>
                {['Cliente','Contato','Telefone','Email','Cidade','Última Compra','Status','Ações'].map(h => (
                  <th key={h} className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider whitespace-normal break-words"
                    style={{ color: 'var(--nexus-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(var(--nexus-gold-rgb),0.05)' }}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-5 py-4 whitespace-normal break-words">
                        <div className="h-4 rounded animate-pulse" style={{ background: 'var(--nexus-bg-soft)', width: j === 0 ? '140px' : '80px' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-sm whitespace-normal break-words" style={{ color: 'var(--nexus-muted)' }}>
                    <UserGroupIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Nenhum cliente encontrado</p>
                    <p className="text-xs mt-1 opacity-70">{search ? 'Tente outra busca.' : 'Cadastre o primeiro cliente.'}</p>
                  </td>
                </tr>
              ) : (
                clients.map(client => (
                  <tr key={client.id}
                    className="transition-colors cursor-pointer group"
                    style={{ borderBottom: '1px solid rgba(var(--nexus-gold-rgb),0.05)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--nexus-gold-rgb),0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                    {/* Avatar + Name + ID */}
                    <td className="px-5 py-3.5 whitespace-normal break-words">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow"
                          style={{ background: avatarColor(client.name) }}>
                          {getInitials(client.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--nexus-text)' }}>{client.name}</p>
                          <p className="text-[11px] mt-0.5" style={{ color: 'var(--nexus-muted)' }}>
                            #{String(client.id).padStart(4, '0')}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Contato */}
                    <td className="px-5 py-3.5 text-sm whitespace-normal break-words" style={{ color: 'var(--nexus-muted)' }}>{client.name}</td>

                    {/* Telefone */}
                    <td className="px-5 py-3.5 text-sm whitespace-normal break-words" style={{ color: 'var(--nexus-muted)' }}>{client.phone || '-'}</td>

                    {/* Email */}
                    <td className="px-5 py-3.5 text-sm whitespace-normal break-words" style={{ color: 'var(--nexus-muted)' }}>{client.email || '-'}</td>

                    {/* Cidade */}
                    <td className="px-5 py-3.5 text-sm whitespace-normal break-words" style={{ color: 'var(--nexus-muted)' }}>{extractCity(client.address)}</td>

                    {/* Última Compra */}
                    <td className="px-5 py-3.5 text-sm whitespace-normal break-words" style={{ color: 'var(--nexus-muted)' }}>-</td>

                    {/* Status */}
                    <td className="px-5 py-3.5 whitespace-normal break-words">
                      <span className="inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border"
                        style={client.active ? {
                          background: 'rgba(var(--nexus-success-rgb),0.1)',
                          color: 'var(--nexus-success)',
                          borderColor: 'rgba(var(--nexus-success-rgb),0.25)',
                        } : {
                          background: 'rgba(var(--nexus-danger-rgb),0.1)',
                          color: 'var(--nexus-danger)',
                          borderColor: 'rgba(var(--nexus-danger-rgb),0.25)',
                        }}>
                        {client.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 whitespace-normal break-words" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 justify-end">
                        <button onClick={() => setViewingClient(client)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-105"
                          style={{ background: 'var(--nexus-bg-soft)', color: 'var(--nexus-muted)' }}
                          title="Visualizar">
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(client)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-105"
                          style={{ background: 'rgba(var(--nexus-gold-rgb),0.1)', color: 'var(--nexus-gold)' }}
                          title="Editar">
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <div className="relative">
                          <button onClick={() => setActionMenu(actionMenu === client.id ? null : client.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-105"
                            style={{ background: 'var(--nexus-bg-soft)', color: 'var(--nexus-muted)' }}
                            title="Mais ações">
                            <EllipsisVerticalIcon className="w-4 h-4" />
                          </button>
                          <AnimatePresence>
                            {actionMenu === client.id && (
                              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                                className="absolute right-0 top-10 z-20 rounded-xl overflow-hidden shadow-xl min-w-[140px]"
                                style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
                                <button onClick={() => openEdit(client)}
                                  className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[rgba(var(--nexus-gold-rgb),0.08)]"
                                  style={{ color: 'var(--nexus-text)' }}>Editar</button>
                                <button onClick={() => handleDelete(client.id)}
                                  className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[rgba(var(--nexus-danger-rgb),0.1)]"
                                  style={{ color: 'var(--nexus-danger)' }}>Excluir</button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {!loading && clients.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4" style={{ borderTop: '1px solid var(--nexus-border)' }}>
            <p className="text-xs" style={{ color: 'var(--nexus-muted)' }}>
              Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, total)} de {total.toLocaleString('pt-BR')} registros
            </p>
            <div className="flex items-center gap-1.5">
              <button onClick={() => handlePageChange(page - 1)} disabled={page === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all disabled:opacity-30"
                style={{ background: 'var(--nexus-bg-soft)', borderColor: 'var(--nexus-border)', color: 'var(--nexus-muted)' }}>
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              {pageRange().map((p, i) => (
                p === '...' ? (
                  <span key={i} className="w-8 h-8 flex items-center justify-center text-xs" style={{ color: 'var(--nexus-muted)' }}>…</span>
                ) : (
                  <button key={i} onClick={() => handlePageChange(Number(p))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold border transition-all"
                    style={Number(p) === page ? {
                      background: 'var(--nexus-rose)', borderColor: 'var(--nexus-rose)', color: '#fff',
                    } : {
                      background: 'var(--nexus-bg-soft)', borderColor: 'var(--nexus-border)', color: 'var(--nexus-muted)',
                    }}>
                    {p}
                  </button>
                )
              ))}
              <button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}
                className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all disabled:opacity-30"
                style={{ background: 'var(--nexus-bg-soft)', borderColor: 'var(--nexus-border)', color: 'var(--nexus-muted)' }}>
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--nexus-muted)' }}>
              Registros por página
              <select value={PAGE_SIZE} className="rounded-lg px-2 py-1 text-xs outline-none cursor-pointer"
                style={{ background: 'var(--nexus-bg-soft)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-text)' }}>
                <option style={{ background: 'var(--nexus-bg)', color: 'var(--nexus-text)' }}>10</option>
                <option style={{ background: 'var(--nexus-bg)', color: 'var(--nexus-text)' }}>25</option>
                <option style={{ background: 'var(--nexus-bg)', color: 'var(--nexus-text)' }}>50</option>
              </select>
            </div>
          </div>
        )}
      </motion.div>

      {/* ═══ View Modal ═══ */}
      <AnimatePresence>
        {viewingClient && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'var(--nexus-overlay)' }}
            onClick={() => setViewingClient(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl p-6"
              style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold" style={{ color: 'var(--nexus-text)' }}>Detalhes do Cliente</h2>
                <button onClick={() => setViewingClient(null)} className="w-8 h-8 flex items-center justify-center rounded-lg"
                  style={{ background: 'var(--nexus-bg-soft)', color: 'var(--nexus-muted)' }}>
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-4 mb-6 pb-6" style={{ borderBottom: '1px solid var(--nexus-border)' }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg"
                  style={{ background: avatarColor(viewingClient.name) }}>
                  {getInitials(viewingClient.name)}
                </div>
                <div>
                  <p className="text-lg font-bold" style={{ color: 'var(--nexus-text)' }}>{viewingClient.name}</p>
                  <p className="text-sm" style={{ color: 'var(--nexus-muted)' }}>#{String(viewingClient.id).padStart(4, '0')}</p>
                  <span className="inline-flex px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border mt-1"
                    style={viewingClient.active ? {
                      background: 'rgba(var(--nexus-success-rgb),0.1)', color: 'var(--nexus-success)', borderColor: 'rgba(var(--nexus-success-rgb),0.25)'
                    } : {
                      background: 'rgba(var(--nexus-danger-rgb),0.1)', color: 'var(--nexus-danger)', borderColor: 'rgba(var(--nexus-danger-rgb),0.25)'
                    }}>
                    {viewingClient.active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Telefone', value: viewingClient.phone },
                  { label: 'Email', value: viewingClient.email },
                  { label: 'CPF/CNPJ', value: viewingClient.document },
                  { label: 'Endereço', value: viewingClient.address },
                  { label: 'Observações', value: viewingClient.notes },
                ].map(f => f.value ? (
                  <div key={f.label} className="flex gap-3">
                    <span className="text-xs font-semibold w-24 flex-shrink-0 mt-0.5" style={{ color: 'var(--nexus-muted)' }}>{f.label}</span>
                    <span className="text-sm" style={{ color: 'var(--nexus-text)' }}>{f.value}</span>
                  </div>
                ) : null)}
              </div>
              <div className="flex gap-3 mt-6 pt-4" style={{ borderTop: '1px solid var(--nexus-border)' }}>
                <button onClick={() => { setViewingClient(null); openEdit(viewingClient); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: 'rgba(var(--nexus-gold-rgb),0.12)', color: 'var(--nexus-gold)', border: '1px solid rgba(var(--nexus-gold-rgb),0.25)' }}>
                  Editar
                </button>
                <button onClick={() => setViewingClient(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: 'var(--nexus-bg-soft)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)' }}>
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Create/Edit Modal ═══ */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'var(--nexus-overlay)' }}
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
              style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold" style={{ color: 'var(--nexus-text)' }}>
                  {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                </h2>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg"
                  style={{ background: 'var(--nexus-bg-soft)', color: 'var(--nexus-muted)' }}>
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl mb-4 text-sm"
                  style={{ background: 'rgba(var(--nexus-danger-rgb),0.1)', color: 'var(--nexus-danger)', border: '1px solid rgba(var(--nexus-danger-rgb),0.2)' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted)' }}>Nome *</label>
                  <input type="text" required value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className={inputCls} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.5)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Telefone', key: 'phone', type: 'text' },
                    { label: 'Email', key: 'email', type: 'email' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted)' }}>{f.label}</label>
                      <input type={f.type} value={(formData as any)[f.key]}
                        onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                        className={inputCls} style={inputStyle}
                        onFocus={e => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.5)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'} />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted)' }}>CPF/CNPJ</label>
                    <input type="text" value={formData.document}
                      onChange={e => setFormData({ ...formData, document: e.target.value })}
                      className={inputCls} style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted)' }}>Status</label>
                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}
                      className={`${inputCls} cursor-pointer`} style={inputStyle}>
                      <option value="ATIVO" style={{ background: 'var(--nexus-bg)', color: 'var(--nexus-text)' }}>Ativo</option>
                      <option value="INATIVO" style={{ background: 'var(--nexus-bg)', color: 'var(--nexus-text)' }}>Inativo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted)' }}>Endereço</label>
                  <input type="text" value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className={inputCls} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.5)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'} />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted)' }}>Observações</label>
                  <textarea rows={3} value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className={`${inputCls} resize-none`} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.5)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'} />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit"
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 whitespace-nowrap"
                    style={{ background: 'linear-gradient(135deg, var(--nexus-rose), var(--nexus-rose-dark))' }}>
                    {editingClient ? 'Salvar' : 'Criar Cliente'}
                  </button>
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{ background: 'var(--nexus-bg-soft)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)' }}>
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
