import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import {
  PlusIcon, MagnifyingGlassIcon, FunnelIcon, ChevronDownIcon,
  EyeIcon, PencilSquareIcon, TrashIcon, XMarkIcon,
  HomeIcon, ChevronRightIcon as ChevronSep,
  PhoneIcon, EnvelopeIcon, CalendarIcon,
  EllipsisVerticalIcon, ChatBubbleLeftRightIcon,
  CheckCircleIcon, ClockIcon, StarIcon,
  UserGroupIcon, AdjustmentsHorizontalIcon
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
  contacted:   { label: 'Contactado', color: 'var(--nexus-warning)', bg: 'rgba(var(--nexus-warning-rgb),0.12)', border: 'rgba(var(--nexus-warning-rgb),0.25)' },
  qualified:   { label: 'Qualificado',color: '#a78bfa', bg: 'rgba(167,139,250,0.12)',border: 'rgba(167,139,250,0.25)' },
  proposal:    { label: 'Proposta',   color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.25)' },
  negotiation: { label: 'Negociação', color: 'var(--nexus-rose)', bg: 'rgba(var(--nexus-rose-rgb),0.12)', border: 'rgba(var(--nexus-rose-rgb),0.25)' },
  won:         { label: 'Ganho',      color: 'var(--nexus-success)', bg: 'rgba(var(--nexus-success-rgb),0.12)', border: 'rgba(var(--nexus-success-rgb),0.25)' },
  lost:        { label: 'Perdido',    color: 'var(--nexus-danger)', bg: 'rgba(var(--nexus-danger-rgb),0.12)', border: 'rgba(var(--nexus-danger-rgb),0.25)' },
};

const AVATAR_COLORS = [
  '#8B5CF6','var(--nexus-rose)','var(--nexus-gold)','#3B82F6','#10B981','#F59E0B','#EC4899','#6366F1',
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

/* ─── action button helper ──────────────────────────── */
function ActionBtn({ onClick, title, gold, children }: { onClick?: () => void; title: string; gold?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-105"
      style={{ background: gold ? 'rgba(var(--nexus-gold-rgb),0.1)' : 'var(--nexus-bg-soft)', color: gold ? 'var(--nexus-gold)' : 'var(--nexus-muted)' }}>
      {children}
    </button>
  );
}

/* ─── badge helpers ─────────────────────────────────── */
const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  Concluída:  { bg: 'rgba(34,197,94,.15)', color: '#22C55E' },
  'Em andamento': { bg: 'rgba(234,179,8,.15)', color: '#EAB308' },
  Pendente:   { bg: 'rgba(239,68,68,.15)', color: '#EF4444' },
};

const PRIORITY_COLORS: Record<string, string> = {
  Alta: '#EF4444',
  Média: '#EAB308',
  Baixa: '#22C55E',
};

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  WhatsApp: <ChatBubbleLeftRightIcon className="w-4 h-4" />,
  'E-mail': <EnvelopeIcon className="w-4 h-4" />,
  Telefone: <PhoneIcon className="w-4 h-4" />,
  Chat: <ChatBubbleLeftRightIcon className="w-4 h-4" />,
};

/* ─── pipeline table data ───────────────────────────── */
const MOCK_INTERACTIONS = [
  { protocolo: 'INT-2024-2540', cliente: 'João Silva', assunto: 'Dúvida sobre produto', canal: 'WhatsApp', data: '05/06/2024 14:30', responsavel: 'Ana Beatriz', status: 'Concluída', prioridade: 'Média' },
  { protocolo: 'INT-2024-2539', cliente: 'Maria Costa', assunto: 'Pedido não recebido', canal: 'E-mail', data: '05/06/2024 11:15', responsavel: 'Carlos Eduardo', status: 'Em andamento', prioridade: 'Alta' },
  { protocolo: 'INT-2024-2538', cliente: 'Roberto Pereira', assunto: 'Solicitação de orçamento', canal: 'Telefone', data: '04/06/2024 16:45', responsavel: 'Juliana Martins', status: 'Concluída', prioridade: 'Baixa' },
  { protocolo: 'INT-2024-2537', cliente: 'Ana Oliveira', assunto: 'Suporte técnico', canal: 'Chat', data: '04/06/2024 10:20', responsavel: 'Ana Beatriz', status: 'Pendente', prioridade: 'Alta' },
  { protocolo: 'INT-2024-2536', cliente: 'Fernando Lima', assunto: 'Renovação de contrato', canal: 'E-mail', data: '03/06/2024 09:00', responsavel: 'Carlos Eduardo', status: 'Concluída', prioridade: 'Média' },
  { protocolo: 'INT-2024-2535', cliente: 'Juliana Santos', assunto: 'Cancelamento', canal: 'Telefone', data: '03/06/2024 15:30', responsavel: 'Juliana Martins', status: 'Em andamento', prioridade: 'Alta' },
  { protocolo: 'INT-2024-2534', cliente: 'Pedro Alves', assunto: 'Dúvida sobre fatura', canal: 'WhatsApp', data: '02/06/2024 11:10', responsavel: 'Ana Beatriz', status: 'Concluída', prioridade: 'Baixa' },
  { protocolo: 'INT-2024-2533', cliente: 'Carla Dias', assunto: 'Troca de produto', canal: 'E-mail', data: '02/06/2024 08:45', responsavel: 'Carlos Eduardo', status: 'Pendente', prioridade: 'Média' },
  { protocolo: 'INT-2024-2532', cliente: 'Luciana Rocha', assunto: 'Solicitação de orçamento', canal: 'WhatsApp', data: '01/06/2024 14:00', responsavel: 'Juliana Martins', status: 'Em andamento', prioridade: 'Baixa' },
  { protocolo: 'INT-2024-2531', cliente: 'Marcos Teixeira', assunto: 'Suporte técnico', canal: 'Chat', data: '01/06/2024 10:30', responsavel: 'Ana Beatriz', status: 'Concluída', prioridade: 'Média' },
];

/* ─── chart data ────────────────────────────────────── */
const CHANNEL_DATA = [
  { name: 'WhatsApp', value: 1240, pct: 48.8, color: 'var(--nexus-success)' },
  { name: 'E-mail', value: 680, pct: 26.8, color: 'var(--nexus-gold)' },
  { name: 'Telefone', value: 420, pct: 16.5, color: 'var(--nexus-rose)' },
  { name: 'Chat', value: 200, pct: 7.9, color: 'var(--nexus-chart-blue)' },
];

const NPS_DATA = [
  { label: 'Excelente', pct: 72, color: '#22C55E' },
  { label: 'Bom', pct: 18, color: '#3B82F6' },
  { label: 'Regular', pct: 6, color: '#EAB308' },
  { label: 'Ruim', pct: 4, color: '#EF4444' },
];

const TEMPO_RESPOSTA = [
  { dia: '30 Mai', minutos: 22 },
  { dia: '31 Mai', minutos: 19 },
  { dia: '01 Jun', minutos: 21 },
  { dia: '02 Jun', minutos: 17 },
  { dia: '03 Jun', minutos: 20 },
  { dia: '04 Jun', minutos: 16 },
  { dia: '05 Jun', minutos: 18.5 },
];

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

  const [channelFilter, setChannelFilter]     = useState('');
  const [statusTableFilter, setStatusTableFilter] = useState('');
  const [priorityFilter, setPriorityFilter]   = useState('');
  const [periodFilter, setPeriodFilter]       = useState('');
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  useEffect(() => { load(); }, [statusFilter]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/crm', { params: { status: statusFilter || undefined } });
      setLeads(res.data.data || []);
    } catch (err: any) {
      console.error('Erro ao carregar leads:', err);
      const errorMsg = err?.response?.data?.message || err?.response?.data?.error || 'Erro ao carregar leads';
      showToast(errorMsg, 'error');
    }
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

  /* ── interaction table filters ── */
  const filteredInteractions = MOCK_INTERACTIONS.filter(item => {
    const matchSearch = !search || item.cliente.toLowerCase().includes(search.toLowerCase()) || item.protocolo.toLowerCase().includes(search.toLowerCase()) || item.assunto.toLowerCase().includes(search.toLowerCase());
    const matchChannel = !channelFilter || item.canal === channelFilter;
    const matchStatus = !statusTableFilter || item.status === statusTableFilter;
    const matchPriority = !priorityFilter || item.prioridade === priorityFilter;
    return matchSearch && matchChannel && matchStatus && matchPriority;
  });

  /* ── render ── */
  return (
    <div className="p-6 space-y-6" onClick={() => setActionMenu(null)}>

      {/* ── Breadcrumb + Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <nav className="flex items-center gap-2 text-xs mb-3" style={{ color: 'var(--nexus-muted)' }}>
          <HomeIcon className="w-3.5 h-3.5" />
          <span>Dashboard</span>
          <ChevronSep className="w-3 h-3" />
          <span style={{ color: 'var(--nexus-text)' }}>CRM</span>
        </nav>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--nexus-text)' }}>CRM</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--nexus-muted-2)' }}>Central de Monitoramento de Relacionamento com Cliente</p>
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
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4"
      >
        {[
          { label: 'Total de Interações', value: '2.540', icon: <UserGroupIcon className="w-6 h-6" />, trend: '↑ 18,7%', trendUp: true },
          { label: 'Conversas Ativas', value: '38', icon: <ChatBubbleLeftRightIcon className="w-6 h-6" />, trend: '↑ 15,3%', trendUp: true },
          { label: 'Resoluções', value: '1.856', icon: <CheckCircleIcon className="w-6 h-6" />, trend: '↑ 20,1%', trendUp: true },
          { label: 'Tempo Médio Resposta', value: '00:18:34', icon: <ClockIcon className="w-6 h-6" />, trend: '↓ 12,4%', trendUp: false },
          { label: 'Satisfação do Cliente', value: '4,8 / 5', icon: <StarIcon className="w-6 h-6" />, trend: '↑ 6,5%', trendUp: true },
        ].map((kpi, i) => (
          <div key={i} className="rounded-2xl p-5 flex items-start gap-4 border transition-all hover:shadow-[var(--nexus-glow)] group"
            style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border transition-transform group-hover:scale-105"
              style={{ background: 'rgba(var(--nexus-gold-rgb),0.1)', borderColor: 'rgba(var(--nexus-gold-rgb),0.2)', color: 'var(--nexus-gold)' }}>
              {kpi.icon}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold tracking-wide" style={{ color: 'var(--nexus-muted-2)' }}>{kpi.label}</span>
              <span className="text-xl font-bold mt-0.5 truncate" style={{ color: 'var(--nexus-text)' }}>{kpi.value}</span>
              <span className="text-xs mt-1 font-medium" style={{ color: kpi.trendUp ? 'var(--nexus-success)' : 'var(--nexus-danger)' }}>{kpi.trend}</span>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Filters Bar ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-2xl p-4 border flex flex-wrap items-center gap-3"
        style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--nexus-muted)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cliente, protocolo ou assunto..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{ background: 'var(--nexus-bg-soft)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-text)' }}
            onFocus={e => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.5)'}
            onBlur={e => e.target.style.borderColor = 'var(--nexus-border)'} />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--nexus-muted)' }}>
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter selects */}
        <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl text-xs font-semibold outline-none cursor-pointer min-w-[110px]"
          style={{ background: 'var(--nexus-bg-soft)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-text)' }}>
          <option value="">Canal</option>
          <option value="WhatsApp">WhatsApp</option>
          <option value="E-mail">E-mail</option>
          <option value="Telefone">Telefone</option>
          <option value="Chat">Chat</option>
        </select>

        <select value={statusTableFilter} onChange={e => setStatusTableFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl text-xs font-semibold outline-none cursor-pointer min-w-[110px]"
          style={{ background: 'var(--nexus-bg-soft)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-text)' }}>
          <option value="">Status</option>
          <option value="Concluída">Concluída</option>
          <option value="Em andamento">Em andamento</option>
          <option value="Pendente">Pendente</option>
        </select>

        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl text-xs font-semibold outline-none cursor-pointer min-w-[110px]"
          style={{ background: 'var(--nexus-bg-soft)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-text)' }}>
          <option value="">Prioridade</option>
          <option value="Alta">Alta</option>
          <option value="Média">Média</option>
          <option value="Baixa">Baixa</option>
        </select>

        <select value={periodFilter} onChange={e => setPeriodFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl text-xs font-semibold outline-none cursor-pointer min-w-[120px]"
          style={{ background: 'var(--nexus-bg-soft)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-text)' }}>
          <option value="">Período</option>
          <option value="today">Hoje</option>
          <option value="week">Esta Semana</option>
          <option value="month">Este Mês</option>
          <option value="quarter">Este Trimestre</option>
        </select>

        {/* More filters */}
        <button onClick={() => setShowMoreFilters(!showMoreFilters)}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all"
          style={{ background: 'var(--nexus-bg-soft)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-muted)' }}>
          <AdjustmentsHorizontalIcon className="w-4 h-4" />
          Mais filtros
        </button>

        {/* New Interaction */}
        <button
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 shadow-lg ml-auto"
          style={{ background: 'linear-gradient(135deg, var(--nexus-rose), var(--nexus-rose-dark))' }}>
          <PlusIcon className="w-4 h-4" />
          Nova Interação
        </button>
      </motion.div>

      {/* ── Additional filters (expandable) ── */}
      <AnimatePresence>
        {showMoreFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl border overflow-hidden"
            style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)' }}>
            <div className="p-4 flex flex-wrap items-center gap-3">
              <select className="px-3.5 py-2.5 rounded-xl text-xs font-semibold outline-none cursor-pointer min-w-[140px]"
                style={{ background: 'var(--nexus-bg-soft)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-text)' }}>
                <option value="">Responsável</option>
                <option value="Ana Beatriz">Ana Beatriz</option>
                <option value="Carlos Eduardo">Carlos Eduardo</option>
                <option value="Juliana Martins">Juliana Martins</option>
              </select>
              <input type="date" className="px-3.5 py-2.5 rounded-xl text-xs font-semibold outline-none"
                style={{ background: 'var(--nexus-bg-soft)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-text)' }} />
              <span className="text-xs" style={{ color: 'var(--nexus-muted)' }}>até</span>
              <input type="date" className="px-3.5 py-2.5 rounded-xl text-xs font-semibold outline-none"
                style={{ background: 'var(--nexus-bg-soft)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-text)' }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Table ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="rounded-2xl overflow-hidden border"
        style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--nexus-border)' }}>
                {['Protocolo', 'Cliente', 'Assunto', 'Canal', 'Data/Hora', 'Responsável', 'Status', 'Prioridade', 'Ações'].map(h => (
                  <th key={h} className={`px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider ${h === 'Ações' ? 'text-right' : ''}`}
                    style={{ color: 'var(--nexus-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredInteractions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--nexus-muted)' }}>
                    Nenhuma interação encontrada
                  </td>
                </tr>
              ) : (
                filteredInteractions.map((item, idx) => (
                  <tr key={idx}
                    className="transition-colors group"
                    style={{ borderBottom: '1px solid rgba(var(--nexus-gold-rgb),0.05)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--nexus-gold-rgb),0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => setActionMenu(null)}>

                    {/* Protocolo */}
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-mono font-semibold" style={{ color: 'var(--nexus-gold)' }}>{item.protocolo}</span>
                    </td>

                    {/* Cliente */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                          style={{ background: avatarColor(item.cliente) }}>
                          {getInitials(item.cliente)}
                        </div>
                        <span className="font-semibold text-sm" style={{ color: 'var(--nexus-text)' }}>{item.cliente}</span>
                      </div>
                    </td>

                    {/* Assunto */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm" style={{ color: 'var(--nexus-muted-2)' }}>{item.assunto}</span>
                    </td>

                    {/* Canal */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span style={{ color: 'var(--nexus-gold)' }}>{CHANNEL_ICONS[item.canal]}</span>
                        <span className="text-xs" style={{ color: 'var(--nexus-muted-2)' }}>{item.canal}</span>
                      </div>
                    </td>

                    {/* Data/Hora */}
                    <td className="px-4 py-3.5">
                      <span className="text-xs" style={{ color: 'var(--nexus-muted-2)' }}>{item.data}</span>
                    </td>

                    {/* Responsável */}
                    <td className="px-4 py-3.5">
                      <span className="text-xs" style={{ color: 'var(--nexus-muted-2)' }}>{item.responsavel}</span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <span className="inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border"
                        style={{ background: (STATUS_BADGE[item.status] || { bg: 'transparent' }).bg, color: (STATUS_BADGE[item.status] || { color: 'var(--nexus-muted)' }).color, borderColor: 'transparent' }}>
                        {item.status}
                      </span>
                    </td>

                    {/* Prioridade */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: PRIORITY_COLORS[item.prioridade] || 'var(--nexus-muted)' }} />
                        <span className="text-xs" style={{ color: PRIORITY_COLORS[item.prioridade] || 'var(--nexus-muted)' }}>{item.prioridade}</span>
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 justify-end" onClick={e => e.stopPropagation()}>
                        <ActionBtn title="Visualizar">
                          <EyeIcon className="w-4 h-4" />
                        </ActionBtn>
                        <ActionBtn gold title="Editar">
                          <PencilSquareIcon className="w-4 h-4" />
                        </ActionBtn>
                        <div className="relative">
                          <ActionBtn title="Mais opções" onClick={() => setActionMenu(actionMenu === idx ? null : idx)}>
                            <EllipsisVerticalIcon className="w-4 h-4" />
                          </ActionBtn>
                          <AnimatePresence>
                            {actionMenu === idx && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 top-9 z-50 rounded-xl py-1 min-w-[140px]"
                                style={{ background: 'var(--nexus-card-strong)', border: '1px solid var(--nexus-border)', boxShadow: 'var(--nexus-shadow)' }}>
                                <button className="w-full flex items-center gap-2 px-3.5 py-2 text-xs transition-colors hover:bg-white/5"
                                  style={{ color: 'var(--nexus-text)' }}>
                                  <EyeIcon className="w-3.5 h-3.5" />
                                  Visualizar
                                </button>
                                <button className="w-full flex items-center gap-2 px-3.5 py-2 text-xs transition-colors hover:bg-white/5"
                                  style={{ color: 'var(--nexus-text)' }}>
                                  <PencilSquareIcon className="w-3.5 h-3.5" />
                                  Editar
                                </button>
                                <div style={{ borderTop: '1px solid var(--nexus-border)', margin: '0.25rem 0' }} />
                                <button className="w-full flex items-center gap-2 px-3.5 py-2 text-xs transition-colors hover:bg-white/5"
                                  style={{ color: 'var(--nexus-danger)' }}>
                                  <TrashIcon className="w-3.5 h-3.5" />
                                  Excluir
                                </button>
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
      </motion.div>

      {/* ── Charts Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Chart 1: Interações por Canal (Doughnut) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl p-5 border"
          style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)' }}
        >
          <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--nexus-text)' }}>Interações por Canal</h3>
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={CHANNEL_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {CHANNEL_DATA.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full space-y-2 mt-2">
              {CHANNEL_DATA.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                    <span style={{ color: 'var(--nexus-muted-2)' }}>{item.name}</span>
                  </div>
                  <span style={{ color: 'var(--nexus-text)' }}>{item.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Chart 2: NPS */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="rounded-2xl p-5 border"
          style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)' }}
        >
          <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--nexus-text)' }}>Satisfação do Cliente (NPS)</h3>
          <div className="flex flex-col items-center mb-4">
            <span className="text-4xl font-bold" style={{ color: 'var(--nexus-gold)' }}>4,8</span>
            <span className="text-xs mt-1" style={{ color: 'var(--nexus-muted-2)' }}>de 5</span>
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4, 5].map(s => (
                <StarIcon key={s} className="w-5 h-5" style={{ color: s <= 4 ? 'var(--nexus-gold)' : 'var(--nexus-muted)' }} fill={s <= 4 ? 'var(--nexus-gold)' : 'none'} />
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {NPS_DATA.map((item, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span style={{ color: 'var(--nexus-muted-2)' }}>{item.label}</span>
                  <span style={{ color: item.color }}>{item.pct}%</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--nexus-bg-soft)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.pct}%` }}
                    transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                    className="h-full rounded-full"
                    style={{ background: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Chart 3: Tempo Médio de Resposta */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-2xl p-5 border"
          style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)' }}
        >
          <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--nexus-text)' }}>Tempo Médio de Resposta</h3>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-2xl font-bold" style={{ color: 'var(--nexus-text)' }}>00:18:34</span>
            <span className="text-xs font-medium" style={{ color: 'var(--nexus-success)' }}>↓ 12,4%</span>
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <LineChart data={TEMPO_RESPOSTA}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--nexus-chart-grid)" />
              <XAxis dataKey="dia" tick={{ fontSize: 10, fill: 'var(--nexus-muted)' }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[10, 30]} />
              <Tooltip
                contentStyle={{
                  background: 'var(--nexus-card-strong)',
                  border: '1px solid var(--nexus-border)',
                  borderRadius: '10px',
                  color: 'var(--nexus-text)',
                  fontSize: '12px',
                }}
                formatter={(v: number) => [`${v} min`, 'Tempo Médio']}
              />
              <Line type="monotone" dataKey="minutos" stroke="var(--nexus-gold)" strokeWidth={2} dot={{ fill: 'var(--nexus-gold)', r: 3 }} activeDot={{ r: 5, fill: 'var(--nexus-gold)' }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

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
                  { icon: <span className="text-xs font-bold" style={{ color: 'var(--nexus-gold)' }}>R$</span>, label: 'Valor', value: viewing.value > 0 ? fmtBRL(viewing.value) : null },
                  { icon: <CalendarIcon className="w-4 h-4" />, label: 'Próximo Contato', value: viewing.next_follow_up ? fmtDate(viewing.next_follow_up) : null },
                  { icon: <span className="text-xs" style={{ color: 'var(--nexus-gold)' }}>📝</span>, label: 'Observações', value: viewing.notes },
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
