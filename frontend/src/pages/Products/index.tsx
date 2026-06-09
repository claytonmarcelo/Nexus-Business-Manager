import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CubeIcon,
  TagIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
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
import api from '../../services/api';
import { Product } from '../../types';

/* ─── Mock product images (placeholder avatars per category) ─────── */
const categoryColors: Record<string, { bg: string; color: string }> = {
  'Informática':          { bg: '#1c2a3a', color: '#7ab4d1' },
  'Móveis':               { bg: '#2b2b1e', color: '#c9b654' },
  'Eletrônicos':          { bg: '#1e3440', color: '#5fcfb0' },
  'Construção':           { bg: '#3a2b16', color: '#e0b06b' },
  'Agropecuário':         { bg: '#1e3825', color: '#7dda6a' },
  'Hospitalar':           { bg: '#3a1d2b', color: '#e27b93' },
  'Transporte':           { bg: '#2b1d3a', color: '#a78bfa' },
};

function getCatStyle(cat: string | null) {
  return categoryColors[cat || ''] ?? { bg: '#1c2535', color: '#8aa4bf' };
}

function getInitials(name: string) {
  if (!name) return 'PR';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

/* ─── KPI Card ─────────────────────────────────────────────────────── */
function KpiCard({
  label, value, icon, trend, subtitle, trendDown,
}: {
  label: string; value: string; icon: React.ReactNode;
  trend: string; subtitle?: string; trendDown?: boolean;
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
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(var(--nexus-gold-rgb),0.12)', color: 'var(--nexus-gold)' }}
        >
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold mb-1" style={{ color: 'var(--nexus-text)' }}>{value}</p>
      <div className="flex items-center gap-1.5">
        <span
          className="text-xs font-medium"
          style={{ color: trendDown ? 'var(--nexus-danger)' : 'var(--nexus-success)' }}
        >
          {trendDown ? '↓' : '↑'} {trend}
        </span>
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
      <ChevronDownIcon
        className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: 'var(--nexus-muted-2)' }}
      />
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
function StatusBadge({ qty, active }: { qty: number; active: boolean }) {
  if (!active || qty === 0) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
        style={{
          background: 'rgba(var(--nexus-danger-rgb),0.12)',
          color: 'var(--nexus-danger)',
          border: '1px solid rgba(var(--nexus-danger-rgb),0.25)',
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--nexus-danger)' }} />
        Crítico
      </span>
    );
  }
  if (qty <= 3) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
        style={{
          background: 'rgba(var(--nexus-warning-rgb),0.12)',
          color: 'var(--nexus-warning)',
          border: '1px solid rgba(var(--nexus-warning-rgb),0.25)',
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--nexus-warning)' }} />
        Baixo estoque
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{
        background: 'rgba(var(--nexus-success-rgb),0.12)',
        color: 'var(--nexus-success)',
        border: '1px solid rgba(var(--nexus-success-rgb),0.25)',
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--nexus-success)' }} />
      Ativo
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
        ? { background: 'transparent', color: 'var(--nexus-muted-2)', border: '1px solid rgba(var(--nexus-gold-rgb),0.2)' }
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

/* ─── Pagination button ─────────────────────────────────────────────── */
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

/* ═══════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                     */
/* ═══════════════════════════════════════════════════════════════════ */
export function Products() {
  const [products, setProducts]   = useState<Product[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<Product | null>(null);
  const [search, setSearch]       = useState('');
  const [formData, setFormData]   = useState({ name: '', sku: '', category: '', price: '0', quantity: '0', image: '' });
  const [error, setError]         = useState('');
  const [openMenu, setOpenMenu]   = useState<number | null>(null);

  useEffect(() => { loadProducts(); }, []);

  async function loadProducts() {
    try {
      const res = await api.get('/products');
      setProducts(res.data?.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  function openCreate() {
    setEditing(null);
    setFormData({ name: '', sku: '', category: '', price: '0', quantity: '0', image: '' });
    setError('');
    setShowModal(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setFormData({
      name: p.name, sku: p.sku, category: p.category || '',
      price: String(p.price), quantity: String(p.quantity), image: p.image || '',
    });
    setError('');
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...formData, price: Number(formData.price), quantity: Number(formData.quantity) };
      if (editing) {
        await api.put(`/products/${editing.id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setShowModal(false);
      loadProducts();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar produto');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    try {
      await api.delete(`/products/${id}`);
      loadProducts();
    } catch { /* silent */ }
  }

  function formatPrice(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  /* Mock data shown when API is empty */
  const displayProducts: Product[] = products.length > 0 ? products : [
    { id: 1, name: 'Notebook Dell Inspiron 15',  sku: 'PRD-001', category: 'Informática', price: 2850,  quantity: 8,  image: null, created_by: 1, active: true,  created_at: '', updated_at: '' },
    { id: 2, name: 'Mouse Gamer Logitech G502',  sku: 'PRD-002', category: 'Informática', price: 320,   quantity: 15, image: null, created_by: 1, active: true,  created_at: '', updated_at: '' },
    { id: 3, name: 'Teclado Mecânico Redragon',  sku: 'PRD-003', category: 'Informática', price: 450,   quantity: 3,  image: null, created_by: 1, active: true,  created_at: '', updated_at: '' },
    { id: 4, name: 'Monitor LG 24" Full HD',     sku: 'PRD-004', category: 'Informática', price: 750,   quantity: 12, image: null, created_by: 1, active: true,  created_at: '', updated_at: '' },
    { id: 5, name: 'Cadeira Gamer ThunderX3',    sku: 'PRD-005', category: 'Móveis',      price: 1200,  quantity: 2,  image: null, created_by: 1, active: true,  created_at: '', updated_at: '' },
    { id: 6, name: 'Smartphone Galaxy A54',      sku: 'PRD-006', category: 'Eletrônicos', price: 1850,  quantity: 5,  image: null, created_by: 1, active: true,  created_at: '', updated_at: '' },
    { id: 7, name: 'Impressora HP LaserJet',     sku: 'PRD-007', category: 'Informática', price: 1150,  quantity: 1,  image: null, created_by: 1, active: false, created_at: '', updated_at: '' },
  ];

  const categories = [...new Set(displayProducts.map(p => p.category).filter(Boolean) as string[])];

  const filtered = displayProducts.filter((p) =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const totalActive   = displayProducts.filter(p => p.active && p.quantity > 0).length;
  const totalInactive = displayProducts.filter(p => !p.active || p.quantity === 0).length;
  const avgPrice      = displayProducts.length > 0
    ? displayProducts.reduce((a, b) => a + b.price, 0) / displayProducts.length
    : 0;

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
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--nexus-text)' }}>Produtos</h1>
          <p className="text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
            Gerencie os produtos cadastrados da sua empresa
          </p>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <KpiCard
          label="Produtos cadastrados"
          value={String(displayProducts.length > 100 ? '1.890' : displayProducts.length)}
          icon={<CubeIcon className="w-5 h-5" />}
          trend="8%"
          subtitle="este mês"
        />
        <KpiCard
          label="Categorias"
          value={String(categories.length > 10 ? '24' : categories.length)}
          icon={<TagIcon className="w-5 h-5" />}
          trend="3 novas"
        />
        <KpiCard
          label="Produtos ativos"
          value={String(totalActive > 100 ? '1.720' : totalActive)}
          icon={<CheckCircleIcon className="w-5 h-5" />}
          trend="12%"
          subtitle="este mês"
        />
        <KpiCard
          label="Produtos inativos"
          value={String(totalInactive > 100 ? '170' : totalInactive)}
          icon={<XCircleIcon className="w-5 h-5" />}
          trend="4%"
          subtitle="este mês"
          trendDown
        />
        <KpiCard
          label="Valor médio"
          value={avgPrice > 0 ? formatPrice(avgPrice) : 'R$ 850,40'}
          icon={<CurrencyDollarIcon className="w-5 h-5" />}
          trend="6,5%"
          subtitle="este mês"
        />
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
              placeholder="Buscar produto, categoria, código..."
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
            <FilterSelect label="Status"    options={['Todos', 'Ativo', 'Inativo', 'Baixo estoque', 'Crítico']} />

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

            {/* New product */}
            <GradBtn onClick={openCreate}>
              <PlusIcon className="w-4 h-4" />
              Novo produto
            </GradBtn>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--nexus-border)' }}>
                {['Produto', 'Categoria', 'Código', 'Preço', 'Estoque', 'Status', 'Ações'].map((h) => (
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
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
                    Carregando...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
                    Nenhum produto encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map((p, idx) => {
                  const style = getCatStyle(p.category);
                  return (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      style={{
                        borderBottom: '1px solid rgba(var(--nexus-gold-rgb),0.06)',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--nexus-gold-rgb),0.04)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Produto */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ background: style.bg, color: style.color }}
                          >
                            {getInitials(p.name)}
                          </div>
                          <span className="text-sm font-medium" style={{ color: 'var(--nexus-text)' }}>
                            {p.name}
                          </span>
                        </div>
                      </td>

                      {/* Categoria */}
                      <td className="px-4 py-3.5">
                        <span className="text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
                          {p.category || '—'}
                        </span>
                      </td>

                      {/* Código */}
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-mono" style={{ color: 'var(--nexus-muted-2)' }}>
                          {p.sku}
                        </span>
                      </td>

                      {/* Preço */}
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-medium" style={{ color: 'var(--nexus-text)' }}>
                          {formatPrice(p.price)}
                        </span>
                      </td>

                      {/* Estoque */}
                      <td className="px-4 py-3.5">
                        <span className="text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
                          {p.quantity} {p.quantity === 1 ? 'unidade' : 'unidades'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <StatusBadge qty={p.quantity} active={p.active} />
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
                          <ActionBtn title="Visualizar">
                            <EyeIcon className="w-4 h-4" />
                          </ActionBtn>
                          <ActionBtn gold title="Editar" onClick={() => openEdit(p)}>
                            <PencilIcon className="w-4 h-4" />
                          </ActionBtn>
                          <div className="relative">
                            <ActionBtn title="Mais opções" onClick={() => setOpenMenu(openMenu === p.id ? null : p.id)}>
                              <EllipsisVerticalIcon className="w-4 h-4" />
                            </ActionBtn>

                            <AnimatePresence>
                              {openMenu === p.id && (
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
                                      onClick={() => {
                                        if (opt === 'Excluir') handleDelete(p.id);
                                        if (opt === 'Editar') openEdit(p);
                                        setOpenMenu(null);
                                      }}
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
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div
          className="px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderTop: '1px solid var(--nexus-border)' }}
        >
          <span className="text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
            Mostrando 1 a {filtered.length} de 1.890 registros
          </span>

          <div className="flex items-center gap-1">
            <PaginBtn icon><ChevronLeftIcon className="w-4 h-4" /></PaginBtn>
            <PaginBtn active>1</PaginBtn>
            <PaginBtn>2</PaginBtn>
            <PaginBtn>3</PaginBtn>
            <span className="w-8 h-8 flex items-center justify-center text-xs" style={{ color: 'var(--nexus-muted-2)' }}>…</span>
            <PaginBtn>270</PaginBtn>
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
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(var(--nexus-gold-rgb),0.12)', color: 'var(--nexus-gold)' }}
                  >
                    <CubeIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold" style={{ color: 'var(--nexus-text)' }}>
                      {editing ? 'Editar Produto' : 'Novo Produto'}
                    </h2>
                    <p className="text-xs" style={{ color: 'var(--nexus-muted-2)' }}>
                      {editing ? 'Atualize os dados do produto' : 'Preencha os dados do produto'}
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
                <div
                  className="px-4 py-3 rounded-lg mb-4 text-sm"
                  style={{ background: 'rgba(var(--nexus-danger-rgb),0.1)', color: 'var(--nexus-danger)', border: '1px solid rgba(var(--nexus-danger-rgb),0.2)' }}
                >
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="Nome" required value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="SKU / Código" required value={formData.sku} onChange={(v) => setFormData({ ...formData, sku: v })} />
                  <Field label="Categoria" value={formData.category} onChange={(v) => setFormData({ ...formData, category: v })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Preço (R$)" type="number" required value={formData.price} onChange={(v) => setFormData({ ...formData, price: v })} />
                  <Field label="Quantidade" type="number" required value={formData.quantity} onChange={(v) => setFormData({ ...formData, quantity: v })} />
                </div>
                <Field label="URL da Imagem" value={formData.image} onChange={(v) => setFormData({ ...formData, image: v })} />
                <div className="flex justify-end gap-3 pt-2" style={{ borderTop: '1px solid var(--nexus-border)' }}>
                  <GradBtn secondary onClick={() => setShowModal(false)}>Cancelar</GradBtn>
                  <GradBtn type="submit">{editing ? 'Salvar alterações' : 'Cadastrar'}</GradBtn>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
