import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon, MagnifyingGlassIcon, FunnelIcon, ChevronDownIcon,
  EyeIcon, PencilSquareIcon, TrashIcon, XMarkIcon,
  HomeIcon, ChevronRightIcon as ChevronSep,
  TrophyIcon, UserGroupIcon, CurrencyDollarIcon, ChartBarIcon,
  PhoneIcon, EnvelopeIcon, BuildingOfficeIcon, CalendarIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

/* ─── types ──────────────────────────────────────────── */
interface Lead {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  value: number;
  notes: string | null;
  next_follow_up: string | null;
  created_at: string;
}

/* ─── constants ─────────────────────────────────────── */
const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  new:         { label: 'Novo',        color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.25)' },
  contacted:   { label: 'Contactado', color: '#D89A28', bg: 'rgba(216,154,40,0.12)', border: 'rgba(216,154,40,0.25)' },
  qualified:   { label: 'Qualificado',color: '#a78bfa', bg: 'rgba(167,139,250,0.12)',border: 'rgba(167,139,250,0.25)' },
  proposal:    { label: 'Proposta',   color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.25)' },
  negotiation: { label: 'Negociação', color: 'var(--nexus-rose)', bg: 'rgba(var(--nexus-rose-rgb),0.12)', border: 'rgba(var(--nexus-rose-rgb),0.25)' },
  won:         { label: 'Ganho',      color: 'var(--nexus-success)', bg: 'rgba(var(--nexus-success-rgb),0.12)', border: 'rgba(var(--nexus-success-rgb),0.25)' },
  lost:        { label: 'Perdido',    color: 'var(--nexus-danger)', bg: 'rgba(var(--nexus-danger-rgb),0.12)', border: 'rgba(var(--nexus-danger-rgb),0.25)' },
};

const AVATAR_COLORS = [
  '#8B5CF6','#C65A71','#D49556','#3B82F6','#10B981','#F59E0B','#EC4899','#6366F1',
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

const fmtBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';

const inputCls = 'w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200';
const inputStyle = {
  background: 'var(--nexus-input-bg)',
  border: '1px solid rgba(var(--nexus-gold-rgb),0.15)',
  color: 'var(--nexus-text)',
};

const EMPTY_FORM = { name:'', email:'', phone:'', company:'', status:'new', value:0, notes:'', next_follow_up:'' };

/* ─── component ─────────────────────────────────────── */
export function CRM() {
  const { showToast } = useToast();
  const [leads, setLeads]             = useState<Lead[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [editing, setEditing]         = useState<Lead | null>(null);
  const [viewing, setViewing]         = useState<Lead | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch]           = useState('');
  const [formData, setFormData]       = useState({ ...EMPTY_FORM });
  const [actionMenu, setActionMenu]   = useState<number | null>(null);
  const [viewMode, setViewMode]       = useState<'list' | 'kanban'>('list');

  useEffect(() => { load(); }, [statusFilter]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/crm', { params: { status: statusFilter || undefined } });
      setLeads(res.data.data || []);
    } catch { showToast('Erro ao carregar leads.', 'error'); }
    finally { setLoading(false); }
  }

  function openCreate() {
    setEditing(null);
    setFormData({ ...EMPTY_FORM });
    setShowModal(true);
  }

  function openEdit(lead: Lead) {
    setEditing(lead);
    setFormData({
      name: lead.name, email: lead.email || '', phone: lead.phone || '',
      company: lead.company || '', status: lead.status, value: lead.value,
      notes: lead.notes || '', next_follow_up: lead.next_follow_up?.slice(0, 16) || '',
    });
    setShowModal(true);
    setActionMenu(null);
    setViewing(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/crm/${editing.id}`, formData);
        showToast('Lead atualizado com sucesso!');
      } else {
        await api.post('/crm', formData);
        showToast('Lead criado com sucesso!');
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao salvar.', 'error');
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Excluir este lead?')) return;
    try {
      await api.delete(`/crm/${id}`);
      showToast('Lead excluído.');
      load();
    } catch { showToast('Erro ao excluir.', 'error'); }
    setActionMenu(null);
  }

  // Derived stats
  const totalPipeline = leads.filter(l => !['won','lost'].includes(l.status)).reduce((s, l) => s + l.value, 0);
  const totalWon      = leads.filter(l => l.status === 'won').reduce((s, l) => s + l.value, 0);
  const wonCount      = leads.filter(l => l.status === 'won').length;
  const convRate      = leads.length > 0 ? Math.round((wonCount / leads.length) * 100) : 0;

  const filtered = leads.filter(l =>
    (!search || l.name.toLowerCase().includes(search.toLowerCase()) ||
     (l.email || '').toLowerCase().includes(search.toLowerCase()) ||
     (l.company || '').toLowerCase().includes(search.toLowerCase()))
  );

  const statusOptions = [
    { value: '', label: 'Todos' },
    ...Object.entries(STATUS_META).map(([value, m]) => ({ value, label: m.label })),
  ];

  const StatusBadge = ({ status }: { status: string }) => {
    const m = STATUS_META[status] || { label: status, color: '#999', bg: 'transparent', border: '#999' };
    return (
      <span className="inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border"
        style={{ background: m.bg, color: m.color, borderColor: m.border }}>
        {m.label}
      </span>
    );
  };

  /* ── render ── */
  return (
    <div className="p-6 space-y-6 min-h-screen" onClick={() => setActionMenu(null)}>

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <nav className="flex items-center gap-2 text-xs mb-3" style={{ color: 'var(--nexus-muted)' }}>
          <HomeIcon className="w-3.5 h-3.5" />
          <span>Dashboard</span>
          <ChevronSep className="w-3 h-3" />
          <span style={{ color: 'var(--nexus-text)' }}>CRM</span>
        </nav>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--nexus-text)' }}>CRM</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--nexus-muted)' }}>Gestão de leads e oportunidades</p>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 shadow-lg"
            style={{ background: 'linear-gradient(135deg, var(--nexus-rose), var(--nexus-rose-dark))' }}>
            <PlusIcon className="w-4 h-4" />
            Novo Lead
          </button>
        </div>
      </motion.div>

      {/* ── KPI Cards ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          { label: 'Total de Leads',   value: String(leads.length),   icon: <UserGroupIcon className="w-7 h-7" />, sub: 'no pipeline' },
          { label: 'Pipeline Total',   value: fmtBRL(totalPipeline),  icon: <ChartBarIcon className="w-7 h-7" />, sub: 'em oportunidades' },
          { label: 'Receita Ganha',    value: fmtBRL(totalWon),       icon: <TrophyIcon className="w-7 h-7" />,   sub: `${wonCount} leads fechados` },
          { label: 'Taxa de Conversão',value: `${convRate}%`,         icon: <CurrencyDollarIcon className="w-7 h-7" />, sub: 'ganhos / total' },
        ].map((kpi, i) => (
          <div key={i} className="rounded-2xl p-5 flex items-start gap-4 border transition-all hover:shadow-[var(--nexus-glow)] group"
            style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)' }}>
            <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 border transition-transform group-hover:scale-105"
              style={{ background: 'rgba(var(--nexus-gold-rgb),0.1)', borderColor: 'rgba(var(--nexus-gold-rgb),0.2)', color: 'var(--nexus-gold)' }}>
              {kpi.icon}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold tracking-wide" style={{ color: 'var(--nexus-gold)' }}>{kpi.label}</span>
              <span className="text-xl font-bold mt-0.5 truncate" style={{ color: 'var(--nexus-text)' }}>{kpi.value}</span>
              <span className="text-xs mt-1" style={{ color: 'var(--nexus-muted)' }}>{kpi.sub}</span>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Toolbar ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center gap-3"
        onClick={e => e.stopPropagation()}
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--nexus-muted)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar lead, empresa, email..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-text)' }}
            onFocus={e => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.5)'}
            onBlur={e => e.target.style.borderColor = 'var(--nexus-border)'} />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--nexus-muted)' }}>
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status filters */}
        <div className="flex flex-wrap gap-2">
          {statusOptions.map(opt => (
            <button key={opt.value} onClick={() => setStatusFilter(opt.value)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all"
              style={statusFilter === opt.value ? {
                background: 'rgba(var(--nexus-gold-rgb),0.15)',
                borderColor: 'rgba(var(--nexus-gold-rgb),0.4)',
                color: 'var(--nexus-gold)',
              } : {
                background: 'transparent',
                borderColor: 'var(--nexus-border)',
                color: 'var(--nexus-muted)',
              }}>
              {opt.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Table / Empty ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}
      >
        {loading ? (
          <div className="p-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4 mb-4">
                <div className="w-10 h-10 rounded-full animate-pulse flex-shrink-0" style={{ background: 'var(--nexus-bg-soft)' }} />
                <div className="flex-1 space-y-2">
                  <div className="h-4 rounded animate-pulse" style={{ background: 'var(--nexus-bg-soft)', width: '40%' }} />
                  <div className="h-3 rounded animate-pulse" style={{ background: 'var(--nexus-bg-soft)', width: '60%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 border"
              style={{ background: 'rgba(var(--nexus-gold-rgb),0.08)', borderColor: 'rgba(var(--nexus-gold-rgb),0.2)' }}>
              <UserGroupIcon className="w-10 h-10" style={{ color: 'var(--nexus-gold)' }} />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--nexus-text)' }}>
              {search || statusFilter ? 'Nenhum lead encontrado' : 'Nenhum lead cadastrado ainda'}
            </h3>
            <p className="text-sm max-w-xs mb-6" style={{ color: 'var(--nexus-muted)' }}>
              {search || statusFilter
                ? 'Tente ajustar os filtros ou a busca para encontrar o lead desejado.'
                : 'Comece cadastrando seu primeiro lead para gerenciar suas oportunidades de negócio.'}
            </p>
            {!search && !statusFilter && (
              <button onClick={openCreate}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white shadow-lg transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, var(--nexus-rose), var(--nexus-rose-dark))' }}>
                <PlusIcon className="w-4 h-4" />
                Cadastrar Primeiro Lead
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--nexus-border)' }}>
                  {['Lead','Empresa','Contato','Status','Valor','Próximo Contato','Ações'].map(h => (
                    <th key={h} className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--nexus-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(lead => (
                  <tr key={lead.id}
                    className="transition-colors group cursor-pointer"
                    style={{ borderBottom: '1px solid rgba(var(--nexus-gold-rgb),0.05)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--nexus-gold-rgb),0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => setViewing(lead)}>

                    {/* Avatar + Name */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: avatarColor(lead.name) }}>
                          {getInitials(lead.name)}
                        </div>
                        <div>
                          <p className="font-semibold leading-tight" style={{ color: 'var(--nexus-text)' }}>{lead.name}</p>
                          <p className="text-[11px] mt-0.5" style={{ color: 'var(--nexus-muted)' }}>#{String(lead.id).padStart(4,'0')}</p>
                        </div>
                      </div>
                    </td>

                    {/* Empresa */}
                    <td className="px-5 py-3.5" style={{ color: 'var(--nexus-muted)' }}>{lead.company || '-'}</td>

                    {/* Contato */}
                    <td className="px-5 py-3.5">
                      <div className="space-y-0.5">
                        {lead.email && <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--nexus-muted)' }}><EnvelopeIcon className="w-3.5 h-3.5 flex-shrink-0" />{lead.email}</div>}
                        {lead.phone && <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--nexus-muted)' }}><PhoneIcon className="w-3.5 h-3.5 flex-shrink-0" />{lead.phone}</div>}
                        {!lead.email && !lead.phone && <span style={{ color: 'var(--nexus-muted)' }}>-</span>}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5"><StatusBadge status={lead.status} /></td>

                    {/* Valor */}
                    <td className="px-5 py-3.5 font-semibold" style={{ color: lead.value > 0 ? 'var(--nexus-text)' : 'var(--nexus-muted)' }}>
                      {lead.value > 0 ? fmtBRL(lead.value) : '-'}
                    </td>

                    {/* Próximo Contato */}
                    <td className="px-5 py-3.5">
                      {lead.next_follow_up ? (
                        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--nexus-muted)' }}>
                          <CalendarIcon className="w-3.5 h-3.5" />
                          {fmtDate(lead.next_follow_up)}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--nexus-muted)' }}>-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 justify-end">
                        <button onClick={() => setViewing(lead)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-105"
                          style={{ background: 'var(--nexus-bg-soft)', color: 'var(--nexus-muted)' }}>
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(lead)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-105"
                          style={{ background: 'rgba(var(--nexus-gold-rgb),0.1)', color: 'var(--nexus-gold)' }}>
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(lead.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-105"
                          style={{ background: 'rgba(var(--nexus-danger-rgb),0.1)', color: 'var(--nexus-danger)' }}>
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* ═══ View Modal ═══ */}
      <AnimatePresence>
        {viewing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'var(--nexus-overlay)' }}
            onClick={() => setViewing(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl p-6"
              style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold" style={{ color: 'var(--nexus-text)' }}>Detalhes do Lead</h2>
                <button onClick={() => setViewing(null)} className="w-8 h-8 flex items-center justify-center rounded-lg"
                  style={{ background: 'var(--nexus-bg-soft)', color: 'var(--nexus-muted)' }}>
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-4 mb-5 pb-5" style={{ borderBottom: '1px solid var(--nexus-border)' }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white"
                  style={{ background: avatarColor(viewing.name) }}>
                  {getInitials(viewing.name)}
                </div>
                <div>
                  <p className="font-bold text-base" style={{ color: 'var(--nexus-text)' }}>{viewing.name}</p>
                  {viewing.company && <p className="text-sm mt-0.5" style={{ color: 'var(--nexus-muted)' }}>{viewing.company}</p>}
                  <div className="mt-1"><StatusBadge status={viewing.status} /></div>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { icon: <EnvelopeIcon className="w-4 h-4" />, label: 'Email', value: viewing.email },
                  { icon: <PhoneIcon className="w-4 h-4" />, label: 'Telefone', value: viewing.phone },
                  { icon: <CurrencyDollarIcon className="w-4 h-4" />, label: 'Valor', value: viewing.value > 0 ? fmtBRL(viewing.value) : null },
                  { icon: <CalendarIcon className="w-4 h-4" />, label: 'Próximo Contato', value: viewing.next_follow_up ? fmtDate(viewing.next_follow_up) : null },
                  { icon: <BuildingOfficeIcon className="w-4 h-4" />, label: 'Observações', value: viewing.notes },
                ].map(f => f.value ? (
                  <div key={f.label} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: 'rgba(var(--nexus-gold-rgb),0.1)', color: 'var(--nexus-gold)' }}>
                      {f.icon}
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--nexus-muted)' }}>{f.label}</p>
                      <p className="text-sm mt-0.5" style={{ color: 'var(--nexus-text)' }}>{f.value}</p>
                    </div>
                  </div>
                ) : null)}
              </div>
              <div className="flex gap-3 mt-6 pt-4" style={{ borderTop: '1px solid var(--nexus-border)' }}>
                <button onClick={() => openEdit(viewing)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(var(--nexus-gold-rgb),0.12)', color: 'var(--nexus-gold)', border: '1px solid rgba(var(--nexus-gold-rgb),0.25)' }}>
                  Editar
                </button>
                <button onClick={() => setViewing(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
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
                  {editing ? 'Editar Lead' : 'Novo Lead'}
                </h2>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg"
                  style={{ background: 'var(--nexus-bg-soft)', color: 'var(--nexus-muted)' }}>
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

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
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted)' }}>Email</label>
                    <input type="email" value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className={inputCls} style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted)' }}>Telefone</label>
                    <input type="text" value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className={inputCls} style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted)' }}>Empresa</label>
                    <input type="text" value={formData.company}
                      onChange={e => setFormData({ ...formData, company: e.target.value })}
                      className={inputCls} style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted)' }}>Status</label>
                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}
                      className={inputCls} style={inputStyle}>
                      {Object.entries(STATUS_META).map(([key, m]) => (
                        <option key={key} value={key}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted)' }}>Valor Potencial (R$)</label>
                    <input type="number" step="0.01" min="0" value={formData.value}
                      onChange={e => setFormData({ ...formData, value: Number(e.target.value) })}
                      className={inputCls} style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted)' }}>Próximo Contato</label>
                    <input type="datetime-local" value={formData.next_follow_up}
                      onChange={e => setFormData({ ...formData, next_follow_up: e.target.value })}
                      className={inputCls} style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'} />
                  </div>
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
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, var(--nexus-rose), var(--nexus-rose-dark))' }}>
                    {editing ? 'Salvar Alterações' : 'Criar Lead'}
                  </button>
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
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
