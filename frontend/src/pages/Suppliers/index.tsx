import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserGroupIcon,
  UserPlusIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon,
  PencilIcon,
  EllipsisVerticalIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { StarIcon as StarOutline } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { Supplier } from '../../types';

/* ─── Avatar colors ────────────────────────────────────────────────── */
const avatarColors = [
  { bg: '#1c2a3a', color: '#7ab4d1' }, // Blue (TS)
  { bg: '#2b1d3a', color: '#a78bfa' }, // Purple (ME)
  { bg: '#1e3440', color: '#5fcfb0' }, // Teal (IN)
  { bg: '#2b2b1e', color: '#c9b654' }, // Gold (GM)
  { bg: '#1e3825', color: '#7dda6a' }, // Green (AG)
  { bg: '#3a1d2b', color: '#e27b93' }, // Rose (DM)
  { bg: '#3a2b16', color: '#e0b06b' }, // Amber (LT)
];

const categories = ['Informática', 'Material de Escritório', 'Eletrônicos', 'Construção', 'Agropecuário', 'Hospitalar', 'Transporte'];
const ratings    = [4.8, 4.6, 4.9, 4.5, 4.7, 4.4, 4.6];

function getInitials(name: string) {
  if (!name) return 'FN';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

/* ─── Star Rating component ────────────────────────────────────────── */
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = rating >= i;
          const half   = !filled && rating >= i - 0.5;
          return filled || half ? (
            <StarSolid key={i} className="w-3.5 h-3.5" style={{ color: 'var(--nexus-gold)' }} />
          ) : (
            <StarOutline key={i} className="w-3.5 h-3.5" style={{ color: 'var(--nexus-gold)', opacity: 0.3 }} />
          );
        })}
      </div>
      <span className="text-xs font-medium" style={{ color: 'var(--nexus-muted-2)' }}>{rating.toFixed(1)}</span>
    </div>
  );
}

/* ─── KPI Card ─────────────────────────────────────────────────────── */
function KpiCard({ label, value, icon, trend, subtitle }: {
  label: string; value: string; icon: React.ReactNode; trend: string; subtitle?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2, boxShadow: '0 0 28px rgba(var(--nexus-gold-rgb),0.12)' }}
      className="relative rounded-xl p-5 overflow-hidden"
      style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}
    >
      <div className="absolute top-0 left-0 w-1 h-full rounded-r" style={{ background: 'var(--nexus-gold)' }} />
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--nexus-gold)' }}>
          {label}
        </span>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(var(--nexus-gold-rgb),0.12)', color: 'var(--nexus-gold)' }}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold mb-1" style={{ color: 'var(--nexus-text)' }}>{value}</p>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium" style={{ color: 'var(--nexus-success)' }}>↑ {trend}</span>
        {subtitle && <span className="text-xs" style={{ color: 'var(--nexus-muted-2)' }}>{subtitle}</span>}
      </div>
    </motion.div>
  );
}

/* ─── Floating label select ────────────────────────────────────────── */
function FilterSelect({ label, options }: { label: string; options: string[] }) {
  return (
    <div className="relative">
      <select
        className="appearance-none rounded-lg pl-3 pr-8 py-2.5 text-sm outline-none cursor-pointer transition-all"
        style={{
          background: 'var(--nexus-input-bg)',
          border: '1px solid rgba(var(--nexus-gold-rgb),0.18)',
          color: 'var(--nexus-muted-2)',
          minWidth: 120,
        }}
      >
        {options.map((o) => <option key={o} value={o.toLowerCase()}>{o}</option>)}
      </select>
      <ChevronDownIcon className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: 'var(--nexus-muted-2)' }} />
      <span
        className="absolute left-3 top-[-9px] px-1 text-[10px] font-medium"
        style={{ background: 'var(--nexus-card)', color: 'var(--nexus-muted-2)' }}
      >
        {label}
      </span>
    </div>
  );
}

/* ─── Status Badge ─────────────────────────────────────────────────── */
function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={active
        ? { background: 'rgba(var(--nexus-success-rgb),0.12)', color: 'var(--nexus-success)', border: '1px solid rgba(var(--nexus-success-rgb),0.25)' }
        : { background: 'rgba(var(--nexus-danger-rgb),0.12)', color: 'var(--nexus-danger)', border: '1px solid rgba(var(--nexus-danger-rgb),0.25)' }
      }
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? 'var(--nexus-success)' : 'var(--nexus-danger)' }} />
      {active ? 'Ativo' : 'Inativo'}
    </span>
  );
}

/* ─── Action button ────────────────────────────────────────────────── */
function ActionBtn({ onClick, title, gold, children }: {
  onClick?: () => void; title?: string; gold?: boolean; children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
      style={{
        color: gold ? 'var(--nexus-gold)' : 'var(--nexus-muted-2)',
        border: gold ? '1px solid rgba(var(--nexus-gold-rgb),0.22)' : '1px solid rgba(var(--nexus-gold-rgb),0.1)',
        background: hovered ? (gold ? 'rgba(var(--nexus-gold-rgb),0.1)' : 'rgba(var(--nexus-gold-rgb),0.05)') : 'transparent',
      }}
    >
      {children}
    </button>
  );
}

/* ─── Gradient button ──────────────────────────────────────────────── */
function GradBtn({ onClick, children, secondary, type = 'button' }: {
  onClick?: () => void; children: React.ReactNode; secondary?: boolean; type?: 'button' | 'submit';
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type={type}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
      style={secondary
        ? {
            background: 'transparent',
            color: 'var(--nexus-muted-2)',
            border: '1px solid rgba(var(--nexus-gold-rgb),0.2)',
          }
        : {
            background: hov
              ? 'linear-gradient(135deg, var(--nexus-gold), var(--nexus-rose))'
              : 'linear-gradient(135deg, var(--nexus-rose), var(--nexus-rose-dark))',
            color: '#fff',
            border: 'none',
            boxShadow: hov ? '0 0 18px rgba(var(--nexus-rose-rgb),0.35)' : 'none',
          }
      }
    >
      {children}
    </button>
  );
}

/* ─── Input field ──────────────────────────────────────────────────── */
function Field({ label, value, onChange, type = 'text', required }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--nexus-muted-2)' }}>
        {label}{required && <span style={{ color: 'var(--nexus-rose)' }}> *</span>}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all duration-200"
        style={{
          background: 'var(--nexus-input-bg)',
          border: `1px solid ${focus ? 'rgba(var(--nexus-gold-rgb),0.5)' : 'rgba(var(--nexus-gold-rgb),0.15)'}`,
          color: 'var(--nexus-text)',
          boxShadow: focus ? '0 0 0 3px rgba(var(--nexus-gold-rgb),0.08)' : 'none',
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                     */
/* ═══════════════════════════════════════════════════════════════════ */
export function Suppliers() {
  const [suppliers, setSuppliers]   = useState<Supplier[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState<Supplier | null>(null);
  const [search, setSearch]         = useState('');
  const [formData, setFormData]     = useState({ company_name: '', phone: '', email: '', contact_name: '' });
  const [error, setError]           = useState('');
  const [openMenu, setOpenMenu]     = useState<number | null>(null);

  useEffect(() => { loadSuppliers(); }, []);

  async function loadSuppliers() {
    try {
      const res = await api.get('/suppliers');
      setSuppliers(res.data?.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  function openCreate() {
    setEditing(null);
    setFormData({ company_name: '', phone: '', email: '', contact_name: '' });
    setError('');
    setShowModal(true);
  }

  function openEdit(s: Supplier) {
    setEditing(s);
    setFormData({ company_name: s.company_name, phone: s.phone || '', email: s.email || '', contact_name: s.contact_name || '' });
    setError('');
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.put(`/suppliers/${editing.id}`, formData);
      } else {
        await api.post('/suppliers', formData);
      }
      setShowModal(false);
      loadSuppliers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar fornecedor');
    }
  }

  /* Mock data shown when API is empty */
  const displaySuppliers: (Supplier & { _cat?: string; _rating?: number })[] =
    suppliers.length > 0 ? suppliers : [
      { id: 1, company_name: 'Tech Solutions Ltda',  contact_name: 'Carlos Mendes',   phone: '(11) 99888-7777', email: 'contato@techsolutions.com.br',   active: true,  created_at: '', updated_at: '' },
      { id: 2, company_name: 'Mega Suprimentos',     contact_name: 'Juliana Costa',   phone: '(21) 97777-3333', email: 'juliana@megasuprimentos.com.br', active: true,  created_at: '', updated_at: '' },
      { id: 3, company_name: 'Inova Distribuidora',  contact_name: 'Roberto Almeida', phone: '(31) 96666-4444', email: 'vendas@inovadist.com.br',         active: true,  created_at: '', updated_at: '' },
      { id: 4, company_name: 'Global Materiais',     contact_name: 'Fernanda Lima',   phone: '(41) 95555-2222', email: 'fernanda@globalmateriais.com.br', active: true,  created_at: '', updated_at: '' },
      { id: 5, company_name: 'Agro & Cia Ltda',      contact_name: 'Paulo Henrique',  phone: '(62) 94444-1111', email: 'paulo@agroecia.com.br',           active: true,  created_at: '', updated_at: '' },
      { id: 6, company_name: 'Delta Medical',        contact_name: 'Amanda Rocha',    phone: '(51) 93333-8888', email: 'contato@deltamedical.com.br',     active: false, created_at: '', updated_at: '' },
      { id: 7, company_name: 'Logis Transportes',    contact_name: 'Leandro Silva',   phone: '(11) 91234-5678', email: 'leandro@logistransportes.com.br', active: true,  created_at: '', updated_at: '' },
    ];

  const filtered = displaySuppliers.filter((s) =>
    !search ||
    s.company_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.phone || '').includes(search)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="pb-12"
      onClick={() => setOpenMenu(null)}
    >
      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--nexus-text)' }}>Fornecedores</h1>
          <div className="text-sm flex items-center gap-2" style={{ color: 'var(--nexus-muted)' }}>
            <span>Dashboard</span>
            <ChevronRightIcon className="w-3 h-3" />
            <span style={{ color: 'var(--nexus-muted-2)' }}>Fornecedores</span>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <KpiCard label="Total de Fornecedores" value="320"           icon={<UserGroupIcon      className="w-5 h-5" />} trend="12,5%" subtitle="este mês" />
        <KpiCard label="Novos Fornecedores"    value="22"            icon={<UserPlusIcon        className="w-5 h-5" />} trend="8,3%"  subtitle="este mês" />
        <KpiCard label="Total de Compras"      value="R$ 84.230,50"  icon={<ShoppingCartIcon    className="w-5 h-5" />} trend="18,7%" subtitle="este mês" />
        <KpiCard label="Ticket Médio"          value="R$ 1.245,30"   icon={<CurrencyDollarIcon  className="w-5 h-5" />} trend="15,3%" subtitle="este mês" />
        <KpiCard label="Avaliação Média"       value="4,7 / 5"       icon={<ChartBarIcon        className="w-5 h-5" />} trend="6,2%"  subtitle="este mês" />
      </div>

      {/* ── Table Card ──────────────────────────────────────────── */}
      <div className="rounded-xl overflow-visible" style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>

        {/* Filters bar */}
        <div
          className="px-5 py-4 flex flex-col lg:flex-row gap-4 items-center justify-between"
          style={{ borderBottom: '1px solid var(--nexus-border)' }}
        >
          {/* Search */}
          <div className="relative w-full lg:w-72 flex-shrink-0">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--nexus-muted-2)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, email ou telefone..."
              className="w-full rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none transition-all"
              style={{
                background: 'var(--nexus-input-bg)',
                border: '1px solid rgba(var(--nexus-gold-rgb),0.15)',
                color: 'var(--nexus-text)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.4)')}
              onBlur={(e)  => (e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)')}
            />
          </div>

          {/* Right side controls */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
            <FilterSelect label="Categoria" options={['Todas', ...categories]} />
            <FilterSelect label="Status"    options={['Todos', 'Ativo', 'Inativo']} />
            <FilterSelect label="Avaliação" options={['Todas', '5 estrelas', '4+ estrelas', '3+ estrelas']} />

            {/* More filters */}
            <button
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{ color: 'var(--nexus-gold)', background: 'transparent', border: '1px solid rgba(var(--nexus-gold-rgb),0.22)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--nexus-gold-rgb),0.06)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <AdjustmentsHorizontalIcon className="w-4 h-4" />
              Mais filtros
            </button>

            {/* New supplier */}
            <GradBtn onClick={openCreate}>
              <PlusIcon className="w-4 h-4" />
              Novo Fornecedor
            </GradBtn>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--nexus-border)' }}>
                {['Fornecedor', 'Contato', 'Categoria', 'Telefone', 'Email', 'Avaliação', 'Status', 'Ações'].map((h) => (
                  <th
                    key={h}
                    className={`px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider${h === 'Ações' ? ' text-right' : ''}`}
                    style={{ color: 'var(--nexus-muted-2)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && suppliers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
                    Carregando fornecedores...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
                    Nenhum fornecedor encontrado.
                  </td>
                </tr>
              ) : filtered.map((s, idx) => {
                const av = avatarColors[(s.id - 1) % avatarColors.length];
                const cat = categories[(s.id - 1) % categories.length];
                const rat = ratings[(s.id - 1) % ratings.length];
                const isLast = idx === filtered.length - 1;

                return (
                  <motion.tr
                    key={s.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.04 }}
                    className="group"
                    style={{
                      borderBottom: isLast ? 'none' : '1px solid var(--nexus-border)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--nexus-gold-rgb),0.04)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Fornecedor */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
                          style={{ background: av.bg, color: av.color }}
                        >
                          {getInitials(s.company_name)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold" style={{ color: 'var(--nexus-text)' }}>
                            {s.company_name}
                          </div>
                          <div className="text-[11px] mt-0.5" style={{ color: 'var(--nexus-muted-2)' }}>
                            #FOR-{String(s.id).padStart(4, '0')}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contato */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
                        {s.contact_name || '—'}
                      </span>
                    </td>

                    {/* Categoria */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm" style={{ color: 'var(--nexus-muted-2)' }}>{cat}</span>
                    </td>

                    {/* Telefone */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
                        {s.phone || '—'}
                      </span>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
                        {s.email || '—'}
                      </span>
                    </td>

                    {/* Avaliação */}
                    <td className="px-4 py-3.5">
                      <StarRating rating={rat} />
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <StatusBadge active={s.active ?? true} />
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
                        <ActionBtn title="Visualizar">
                          <EyeIcon className="w-4 h-4" />
                        </ActionBtn>
                        <ActionBtn gold title="Editar" onClick={() => openEdit(s as Supplier)}>
                          <PencilIcon className="w-4 h-4" />
                        </ActionBtn>
                        <div className="relative">
                          <ActionBtn title="Mais opções" onClick={() => setOpenMenu(openMenu === s.id ? null : s.id)}>
                            <EllipsisVerticalIcon className="w-4 h-4" />
                          </ActionBtn>

                          <AnimatePresence>
                            {openMenu === s.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 top-9 z-50 rounded-xl py-1 min-w-[140px]"
                                style={{
                                  background: 'var(--nexus-card-strong)',
                                  border: '1px solid var(--nexus-border)',
                                  boxShadow: 'var(--nexus-shadow)',
                                }}
                              >
                                {['Ver detalhes', 'Editar', 'Desativar', 'Excluir'].map((opt) => (
                                  <button
                                    key={opt}
                                    className="w-full text-left px-4 py-2 text-xs transition-colors"
                                    style={{ color: opt === 'Excluir' ? 'var(--nexus-danger)' : 'var(--nexus-muted-2)' }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--nexus-gold-rgb),0.06)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div
          className="px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderTop: '1px solid var(--nexus-border)' }}
        >
          <span className="text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
            Mostrando 1 a {filtered.length} de 320 registros
          </span>

          <div className="flex items-center gap-1">
            <PaginBtn icon><ChevronLeftIcon className="w-4 h-4" /></PaginBtn>
            <PaginBtn active>1</PaginBtn>
            <PaginBtn>2</PaginBtn>
            <PaginBtn>3</PaginBtn>
            <span className="w-8 h-8 flex items-center justify-center text-xs" style={{ color: 'var(--nexus-muted-2)' }}>…</span>
            <PaginBtn>46</PaginBtn>
            <PaginBtn icon><ChevronRightIcon className="w-4 h-4" /></PaginBtn>
          </div>

          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
            <span>Registros por página</span>
            <div className="relative">
              <select
                className="appearance-none rounded-lg pl-3 pr-7 py-1.5 text-sm outline-none cursor-pointer"
                style={{ background: 'var(--nexus-input-bg)', border: '1px solid rgba(var(--nexus-gold-rgb),0.15)', color: 'var(--nexus-text)' }}
              >
                <option>10</option>
                <option>20</option>
                <option>50</option>
              </select>
              <ChevronDownIcon className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--nexus-muted-2)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'var(--nexus-overlay)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl p-6"
              style={{ background: 'var(--nexus-card-strong)', border: '1px solid var(--nexus-border)', boxShadow: 'var(--nexus-shadow)' }}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(var(--nexus-gold-rgb),0.12)', color: 'var(--nexus-gold)' }}>
                    <UserGroupIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold" style={{ color: 'var(--nexus-text)' }}>
                      {editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                    </h2>
                    <p className="text-xs" style={{ color: 'var(--nexus-muted-2)' }}>
                      {editing ? 'Atualize os dados do fornecedor' : 'Preencha os dados do fornecedor'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{ color: 'var(--nexus-muted-2)', background: 'var(--nexus-card-soft)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--nexus-gold-rgb),0.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--nexus-card-soft)')}
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="px-4 py-3 rounded-lg mb-4 text-sm"
                  style={{ background: 'rgba(var(--nexus-danger-rgb),0.1)', color: 'var(--nexus-danger)', border: '1px solid rgba(var(--nexus-danger-rgb),0.2)' }}>
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <Field
                  label="Empresa"
                  required
                  value={formData.company_name}
                  onChange={(v) => setFormData({ ...formData, company_name: v })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Telefone"
                    value={formData.phone}
                    onChange={(v) => setFormData({ ...formData, phone: v })}
                  />
                  <Field
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(v) => setFormData({ ...formData, email: v })}
                  />
                </div>
                <Field
                  label="Nome do Contato"
                  value={formData.contact_name}
                  onChange={(v) => setFormData({ ...formData, contact_name: v })}
                />
                <div
                  className="flex justify-end gap-3 pt-2"
                  style={{ borderTop: '1px solid var(--nexus-border)' }}
                >
                  <GradBtn secondary onClick={() => setShowModal(false)}>Cancelar</GradBtn>
                  <GradBtn type="submit">
                    {editing ? 'Salvar alterações' : 'Cadastrar'}
                  </GradBtn>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Pagination button helper ──────────────────────────────────── */
function PaginBtn({ children, active, icon }: { children: React.ReactNode; active?: boolean; icon?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-all"
      style={active
        ? { background: 'rgba(var(--nexus-rose-rgb),0.18)', color: 'var(--nexus-rose)', border: '1px solid rgba(var(--nexus-rose-rgb),0.3)' }
        : icon
        ? { color: 'var(--nexus-muted-2)', border: '1px solid rgba(var(--nexus-gold-rgb),0.12)', background: hov ? 'rgba(var(--nexus-gold-rgb),0.06)' : 'transparent' }
        : { color: hov ? 'var(--nexus-text)' : 'var(--nexus-muted-2)', border: '1px solid transparent', background: hov ? 'rgba(var(--nexus-gold-rgb),0.06)' : 'transparent' }
      }
    >
      {children}
    </button>
  );
}
