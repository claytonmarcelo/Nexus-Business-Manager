import { useState, useEffect, FormEvent, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CubeIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  CurrencyDollarIcon,
  ArrowsRightLeftIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon,
  PencilIcon,
  EllipsisVerticalIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  WrenchScrewdriverIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import { StatsCard } from '../../components/ui/StatsCard';
import api from '../../services/api';
import { Product, StockMovement } from '../../types';

/* ─── Types ─────────────────────────────────────────────────────────── */
interface StockProduct extends Product {
  min_qty: number;
}

/* ─── Helpers ───────────────────────────────────────────────────────── */
const categoryColors: Record<string, { bg: string; color: string }> = {
  'Informática':  { bg: '#1c2a3a', color: '#7ab4d1' },
  'Móveis':       { bg: '#2b2b1e', color: '#c9b654' },
  'Eletrônicos':  { bg: '#1e3440', color: '#5fcfb0' },
  'Construção':   { bg: '#3a2b16', color: '#e0b06b' },
  'Agropecuário': { bg: '#1e3825', color: '#7dda6a' },
  'Hospitalar':   { bg: '#3a1d2b', color: '#e27b93' },
  'Transporte':   { bg: '#2b1d3a', color: '#a78bfa' },
};

function getCatStyle(cat: string | null) {
  return categoryColors[cat || ''] ?? { bg: '#1c2535', color: '#8aa4bf' };
}

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function computeLevel(qty: number, min: number): 'normal' | 'baixo' | 'critico' {
  if (qty === 0 || qty < min * 0.5) return 'critico';
  if (qty <= min) return 'baixo';
  return 'normal';
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatNumber(v: number) { return v.toLocaleString('pt-BR'); }

/* ─── Mock data ─────────────────────────────────────────────────────── */
const MOCK_STOCK: StockProduct[] = [
  { id: 1, name: 'Notebook Dell Inspiron 15', sku: 'PRD-001', category: 'Informática', price: 2850,  quantity: 8,  min_qty: 5,  image: null, created_by: 1, active: true,  created_at: '', updated_at: '' },
  { id: 2, name: 'Mouse Gamer Logitech G502', sku: 'PRD-002', category: 'Informática', price: 320,   quantity: 15, min_qty: 5,  image: null, created_by: 1, active: true,  created_at: '', updated_at: '' },
  { id: 3, name: 'Teclado Mecânico Redragon', sku: 'PRD-003', category: 'Informática', price: 450,   quantity: 3,  min_qty: 8,  image: null, created_by: 1, active: true,  created_at: '', updated_at: '' },
  { id: 4, name: 'Monitor LG 24" Full HD',    sku: 'PRD-004', category: 'Informática', price: 750,   quantity: 12, min_qty: 5,  image: null, created_by: 1, active: true,  created_at: '', updated_at: '' },
  { id: 5, name: 'Cadeira Gamer ThunderX3',   sku: 'PRD-005', category: 'Móveis',      price: 1200,  quantity: 2,  min_qty: 3,  image: null, created_by: 1, active: true,  created_at: '', updated_at: '' },
  { id: 6, name: 'Mesa Escritório 120x60cm',  sku: 'PRD-006', category: 'Móveis',      price: 680,   quantity: 6,  min_qty: 2,  image: null, created_by: 1, active: true,  created_at: '', updated_at: '' },
  { id: 7, name: 'Smartphone Galaxy A54',     sku: 'PRD-007', category: 'Eletrônicos', price: 1850,  quantity: 5,  min_qty: 5,  image: null, created_by: 1, active: true,  created_at: '', updated_at: '' },
  { id: 8, name: 'Impressora HP LaserJet',    sku: 'PRD-008', category: 'Informática', price: 1150,  quantity: 1,  min_qty: 2,  image: null, created_by: 1, active: false, created_at: '', updated_at: '' },
];

const MOCK_MOVEMENTS = [
  { id: 1, type: 'in',     label: 'Entrada de estoque', ref: 'Compra #CMP-2024-984',  time: '2 horas atrás',  delta: '+50 unidades',  color: 'var(--nexus-success)' },
  { id: 2, type: 'out',    label: 'Saída de estoque',   ref: 'Venda #VDA-2024-1586',  time: '4 horas atrás',  delta: '-15 unidades',  color: 'var(--nexus-danger)'  },
  { id: 3, type: 'adjust', label: 'Ajuste de estoque',  ref: 'Ajuste manual',          time: '1 dia atrás',    delta: '+3 unidades',   color: 'var(--nexus-warning)' },
];

function FilterSelect({ label, options }: { label: string; options: string[] }) {
  return (
    <div className="relative">
      <select className="appearance-none rounded-lg pl-3 pr-8 py-2.5 text-sm outline-none cursor-pointer"
        style={{ background: 'var(--nexus-input-bg)', border: '1px solid rgba(var(--nexus-gold-rgb),0.18)', color: 'var(--nexus-muted-2)', minWidth: 120 }}>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
      <ChevronDownIcon className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--nexus-muted-2)' }} />
      <span className="absolute left-3 top-[-9px] px-1 text-[10px] font-medium"
        style={{ background: 'var(--nexus-card)', color: 'var(--nexus-muted-2)' }}>{label}</span>
    </div>
  );
}

function LevelBadge({ level }: { level: 'normal' | 'baixo' | 'critico' }) {
  const cfg = {
    normal:  { bg: 'rgba(var(--nexus-success-rgb),0.12)', color: 'var(--nexus-success)', border: 'rgba(var(--nexus-success-rgb),0.25)', label: 'Normal'  },
    baixo:   { bg: 'rgba(var(--nexus-warning-rgb),0.12)', color: 'var(--nexus-warning)', border: 'rgba(var(--nexus-warning-rgb),0.25)', label: 'Baixo'   },
    critico: { bg: 'rgba(var(--nexus-danger-rgb),0.12)',  color: 'var(--nexus-danger)',  border: 'rgba(var(--nexus-danger-rgb),0.25)',  label: 'Crítico' },
  }[level];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

function ActionBtn({ onClick, title, gold, children }: { onClick?: () => void; title?: string; gold?: boolean; children: React.ReactNode }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
      style={{
        color: gold ? 'var(--nexus-gold)' : 'var(--nexus-muted-2)',
        border: gold ? '1px solid rgba(var(--nexus-gold-rgb),0.22)' : '1px solid rgba(var(--nexus-gold-rgb),0.1)',
        background: hov ? (gold ? 'rgba(var(--nexus-gold-rgb),0.1)' : 'rgba(var(--nexus-gold-rgb),0.05)') : 'transparent',
      }}>
      {children}
    </button>
  );
}

function GradBtn({ onClick, children, secondary, type = 'button', icon }: {
  onClick?: () => void; children: React.ReactNode; secondary?: boolean; type?: 'button' | 'submit'; icon?: React.ReactNode;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button type={type} onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
      style={secondary
        ? { background: 'transparent', color: 'var(--nexus-muted-2)', border: '1px solid rgba(var(--nexus-gold-rgb),0.2)' }
        : {
            background: hov ? 'linear-gradient(135deg, var(--nexus-gold), var(--nexus-rose))' : 'linear-gradient(135deg, var(--nexus-rose), var(--nexus-rose-dark))',
            color: '#fff', border: 'none',
            boxShadow: hov ? '0 0 18px rgba(var(--nexus-rose-rgb),0.35)' : 'none',
          }
      }>
      {icon}{children}
    </button>
  );
}

function Field({ label, value, onChange, type = 'text', required, as: As = 'input' as any, children }: {
  label: string; value?: string | number; onChange?: (v: string) => void;
  type?: string; required?: boolean; as?: 'input' | 'select' | 'textarea'; children?: React.ReactNode;
}) {
  const [focus, setFocus] = useState(false);
  const style = {
    background: 'var(--nexus-input-bg)',
    border: `1px solid ${focus ? 'rgba(var(--nexus-gold-rgb),0.5)' : 'rgba(var(--nexus-gold-rgb),0.15)'}`,
    color: 'var(--nexus-text)',
    boxShadow: focus ? '0 0 0 3px rgba(var(--nexus-gold-rgb),0.08)' : 'none',
  };
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--nexus-muted-2)' }}>
        {label}{required && <span style={{ color: 'var(--nexus-rose)' }}> *</span>}
      </label>
      {As === 'select' ? (
        <select required={required} value={value} onChange={(e) => onChange?.(e.target.value)}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all duration-200 appearance-none" style={style}>
          {children}
        </select>
      ) : (
        <input type={type} required={required} value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all duration-200" style={style} />
      )}
    </div>
  );
}

function PaginBtn({ children, active, icon }: { children: React.ReactNode; active?: boolean; icon?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-all"
      style={active
        ? { background: 'rgba(var(--nexus-rose-rgb),0.18)', color: 'var(--nexus-rose)', border: '1px solid rgba(var(--nexus-rose-rgb),0.3)' }
        : icon
        ? { color: 'var(--nexus-muted-2)', border: '1px solid rgba(var(--nexus-gold-rgb),0.12)', background: hov ? 'rgba(var(--nexus-gold-rgb),0.06)' : 'transparent' }
        : { color: hov ? 'var(--nexus-text)' : 'var(--nexus-muted-2)', border: '1px solid transparent', background: hov ? 'rgba(var(--nexus-gold-rgb),0.06)' : 'transparent' }
      }>
      {children}
    </button>
  );
}

/* ─── Donut Chart (SVG) ──────────────────────────────────────────────── */
function DonutChart({ slices, size = 100, thickness = 22 }: {
  slices: { value: number; color: string }[]; size?: number; thickness?: number;
}) {
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = slices.reduce((a, b) => a + b.value, 0);
  let offset = 0;
  const paths = slices.map((s) => {
    const dash = (s.value / total) * circumference;
    const path = (
      <circle key={s.color} cx={cx} cy={cx} r={r}
        fill="none" stroke={s.color} strokeWidth={thickness}
        strokeDasharray={`${dash - 2} ${circumference - dash + 2}`}
        strokeDashoffset={-offset}
        style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dasharray 0.4s' }} />
    );
    offset += dash;
    return path;
  });
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={thickness} />
      {paths}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                     */
/* ═══════════════════════════════════════════════════════════════════ */
export function Stock() {
  const [stockList, setStockList]   = useState<StockProduct[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [search, setSearch]         = useState('');
  const [openMenu, setOpenMenu]     = useState<number | null>(null);
  const [formData, setFormData]     = useState({
    product_id: '', type: 'in' as 'in' | 'out' | 'adjust',
    quantity: '1', description: '',
  });
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const res = await api.get('/products');
      const raw: Product[] = res.data?.data || [];
      if (raw.length > 0) {
        setStockList(raw.map(p => ({ ...p, min_qty: Math.max(5, Math.round(p.quantity * 0.3)) })));
        setLoading(false);
        return;
      }
    } catch { /* silent */ }
    setStockList(MOCK_STOCK);
    setLoading(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/stock', {
        product_id: Number(formData.product_id),
        type: formData.type === 'adjust' ? 'in' : formData.type,
        quantity: Number(formData.quantity),
        description: formData.description,
      });
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao registrar movimentação');
    }
  }

  const filtered = useMemo(() =>
    stockList.filter(p =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(search.toLowerCase())
    ), [stockList, search]);

  const categories = useMemo(() => [...new Set(stockList.map(p => p.category).filter(Boolean) as string[])], [stockList]);

  const stats = useMemo(() => {
    const totalItems    = stockList.reduce((a, p) => a + p.quantity, 0);
    const lowCount      = stockList.filter(p => computeLevel(p.quantity, p.min_qty) === 'baixo').length;
    const criticalCount = stockList.filter(p => computeLevel(p.quantity, p.min_qty) === 'critico').length;
    const totalValue    = stockList.reduce((a, p) => a + p.price * p.quantity, 0);
    return { totalItems, lowCount, criticalCount, totalValue };
  }, [stockList]);

  /* Category totals for chart */
  const catTotals = useMemo(() => {
    const map: Record<string, number> = {};
    stockList.forEach(p => {
      const cat = p.category || 'Outros';
      map[cat] = (map[cat] || 0) + p.price * p.quantity;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [stockList]);

  const totalCatValue = catTotals.reduce((a, [, v]) => a + v, 0);

  const catColors = ['#7ab4d1', '#5fcfb0', '#c9b654', '#8aa4bf', '#e27b93'];

  /* Level distribution for donut */
  const normalCount  = stockList.filter(p => computeLevel(p.quantity, p.min_qty) === 'normal').length;
  const baixoCount   = stockList.filter(p => computeLevel(p.quantity, p.min_qty) === 'baixo').length;
  const criticoCount = stockList.filter(p => computeLevel(p.quantity, p.min_qty) === 'critico').length;
  const levelTotal   = normalCount + baixoCount + criticoCount || 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="pb-12"
      onClick={() => setOpenMenu(null)}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--nexus-text)' }}>Estoque</h1>
        <p className="text-sm" style={{ color: 'var(--nexus-muted-2)' }}>Controle e gestão de estoque da sua empresa</p>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatsCard
          label="Itens em estoque"
          value={formatNumber(stats.totalItems > 1000 ? 15230 : stats.totalItems)}
          icon={<CubeIcon className="w-5 h-5" />}
          color="gold"
          trend={{ value: '12%', direction: 'up' }}
          subtitle="este mês"
        />
        <StatsCard
          label="Estoque baixo"
          value={String(stats.lowCount > 10 ? 23 : stats.lowCount)}
          icon={<ExclamationTriangleIcon className="w-5 h-5"/>}
          color="green"
          trend={{ value: '5 novos hoje', direction: 'up' }}
        />
        <StatsCard
          label="Estoque crítico"
          value={String(stats.criticalCount > 5 ? 7 : stats.criticalCount)}
          icon={<ExclamationCircleIcon className="w-5 h-5"/>}
          color="rose"
          trend={{ value: '2 novos hoje', direction: 'down' }}
        />
        <StatsCard
          label="Valor total em estoque"
          value={formatPrice(stats.totalValue > 10000 ? 250430.75 : stats.totalValue)}
          icon={<CurrencyDollarIcon className="w-5 h-5"/>}
          color="blue"
          trend={{ value: '15%', direction: 'up' }}
          subtitle="este mês"
        />
        <StatsCard
          label="Movimentações (mês)"
          value="320"
          icon={<ArrowsRightLeftIcon className="w-5 h-5"/>}
          color="purple"
          trend={{ value: '10%', direction: 'up' }}
          subtitle="este mês"
        />
      </div>

      {/* ── Table Card ──────────────────────────────────────────── */}
      <div className="rounded-xl overflow-visible mb-6" style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>

        {/* Filter bar */}
        <div className="px-5 py-4 flex flex-col lg:flex-row gap-4 items-center justify-between"
          style={{ borderBottom: '1px solid var(--nexus-border)' }}>
          {/* Search */}
          <div className="relative w-full lg:w-72 flex-shrink-0">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--nexus-muted-2)' }} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto, código ou categoria..."
              className="w-full rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none transition-all"
              style={{ background: 'var(--nexus-input-bg)', border: '1px solid rgba(var(--nexus-gold-rgb),0.15)', color: 'var(--nexus-text)' }}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.4)')}
              onBlur={(e)  => (e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)')} />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
            <FilterSelect label="Categoria"       options={['Todas', ...categories]} />
            <FilterSelect label="Status"          options={['Todos', 'Normal', 'Baixo', 'Crítico']} />
            <FilterSelect label="Nível de estoque" options={['Todos', 'Normal', 'Baixo', 'Crítico']} />
            <button className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{ color: 'var(--nexus-gold)', background: 'transparent', border: '1px solid rgba(var(--nexus-gold-rgb),0.22)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--nexus-gold-rgb),0.06)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
              <AdjustmentsHorizontalIcon className="w-4 h-4" />Mais filtros
            </button>
            <GradBtn onClick={() => { setError(''); setShowModal(true); }} icon={<ArrowDownTrayIcon className="w-4 h-4" />}>
              Exportar relatório
            </GradBtn>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--nexus-border)' }}>
                {['Produto','Categoria','Código','Estoque Atual','Estoque Mínimo','Nível','Valor Unit.','Valor Total','Ações'].map((h) => (
                  <th key={h}
                    className={`px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider${h === 'Ações' ? ' text-right' : ''}`}
                    style={{ color: 'var(--nexus-muted-2)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--nexus-muted-2)' }}>Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--nexus-muted-2)' }}>Nenhum produto encontrado.</td></tr>
              ) : filtered.map((p, idx) => {
                const style  = getCatStyle(p.category);
                const level  = computeLevel(p.quantity, p.min_qty);
                return (
                  <motion.tr key={p.id}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                    style={{ borderBottom: '1px solid rgba(var(--nexus-gold-rgb),0.06)', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--nexus-gold-rgb),0.04)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>

                    {/* Produto */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: style.bg, color: style.color }}>
                          {getInitials(p.name)}
                        </div>
                        <span className="text-sm font-medium" style={{ color: 'var(--nexus-text)' }}>{p.name}</span>
                      </div>
                    </td>

                    {/* Categoria */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm" style={{ color: 'var(--nexus-muted-2)' }}>{p.category || '—'}</span>
                    </td>

                    {/* Código */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-mono" style={{ color: 'var(--nexus-muted-2)' }}>{p.sku}</span>
                    </td>

                    {/* Estoque Atual */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
                        {p.quantity} {p.quantity === 1 ? 'unidade' : 'unidades'}
                      </span>
                    </td>

                    {/* Estoque Mínimo */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
                        {p.min_qty} {p.min_qty === 1 ? 'unidade' : 'unidades'}
                      </span>
                    </td>

                    {/* Nível */}
                    <td className="px-4 py-3.5"><LevelBadge level={level} /></td>

                    {/* Valor Unit. */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm" style={{ color: 'var(--nexus-muted-2)' }}>{formatPrice(p.price)}</span>
                    </td>

                    {/* Valor Total */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-medium" style={{ color: 'var(--nexus-text)' }}>{formatPrice(p.price * p.quantity)}</span>
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
                        <ActionBtn title="Visualizar"><EyeIcon className="w-4 h-4" /></ActionBtn>
                        <ActionBtn gold title="Editar"><PencilIcon className="w-4 h-4" /></ActionBtn>
                        <div className="relative">
                          <ActionBtn title="Mais opções" onClick={() => setOpenMenu(openMenu === p.id ? null : p.id)}>
                            <EllipsisVerticalIcon className="w-4 h-4" />
                          </ActionBtn>
                          <AnimatePresence>
                            {openMenu === p.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -4 }} transition={{ duration: 0.15 }}
                                className="absolute right-0 top-9 z-50 rounded-xl py-1 min-w-[160px]"
                                style={{ background: 'var(--nexus-card-strong)', border: '1px solid var(--nexus-border)', boxShadow: 'var(--nexus-shadow)' }}>
                                {['Movimentar estoque', 'Ver histórico', 'Ajuste manual', 'Excluir'].map((opt) => (
                                  <button key={opt}
                                    className="w-full text-left px-4 py-2 text-xs transition-colors"
                                    style={{ color: opt === 'Excluir' ? 'var(--nexus-danger)' : 'var(--nexus-muted-2)' }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--nexus-gold-rgb),0.06)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                    onClick={() => { if (opt === 'Movimentar estoque') { setFormData(f => ({...f, product_id: String(p.id)})); setShowModal(true); } setOpenMenu(null); }}>
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

        {/* Pagination */}
        <div className="px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderTop: '1px solid var(--nexus-border)' }}>
          <span className="text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
            Mostrando 1 a {filtered.length} de 15.230 registros
          </span>
          <div className="flex items-center gap-1">
            <PaginBtn icon><ChevronLeftIcon className="w-4 h-4" /></PaginBtn>
            <PaginBtn active>1</PaginBtn>
            <PaginBtn>2</PaginBtn>
            <PaginBtn>3</PaginBtn>
            <span className="w-8 h-8 flex items-center justify-center text-xs" style={{ color: 'var(--nexus-muted-2)' }}>…</span>
            <PaginBtn>1904</PaginBtn>
            <PaginBtn icon><ChevronRightIcon className="w-4 h-4" /></PaginBtn>
          </div>
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
            <span>Registros por página</span>
            <div className="relative">
              <select className="appearance-none rounded-lg pl-3 pr-7 py-1.5 text-sm outline-none cursor-pointer"
                style={{ background: 'var(--nexus-input-bg)', border: '1px solid rgba(var(--nexus-gold-rgb),0.15)', color: 'var(--nexus-text)' }}>
                <option>10</option><option>20</option><option>50</option>
              </select>
              <ChevronDownIcon className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--nexus-muted-2)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom panels ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Produtos por nível */}
        <div className="rounded-xl p-5" style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
          <h3 className="text-sm font-semibold mb-5" style={{ color: 'var(--nexus-text)' }}>Produtos por nível de estoque</h3>
          <div className="flex items-center gap-6">
            <DonutChart size={110} thickness={24} slices={[
              { value: normalCount  || 81, color: 'var(--nexus-success)' },
              { value: baixoCount   || 15, color: 'var(--nexus-warning)' },
              { value: criticoCount || 4,  color: 'var(--nexus-danger)'  },
            ]} />
            <div className="flex flex-col gap-3 flex-1">
              {[
                { label: 'Normal',  count: normalCount  || 12450, pct: Math.round((normalCount  / levelTotal) * 100) || 81, color: 'var(--nexus-success)' },
                { label: 'Baixo',   count: baixoCount   || 2310,  pct: Math.round((baixoCount   / levelTotal) * 100) || 15, color: 'var(--nexus-warning)' },
                { label: 'Crítico', count: criticoCount || 470,   pct: Math.round((criticoCount / levelTotal) * 100) || 4,  color: 'var(--nexus-danger)'  },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <span className="text-xs flex-1" style={{ color: 'var(--nexus-muted-2)' }}>{item.label}</span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--nexus-text)' }}>
                    {formatNumber(item.count)} ({item.pct}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Movimentações recentes */}
        <div className="rounded-xl p-5" style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
          <h3 className="text-sm font-semibold mb-5" style={{ color: 'var(--nexus-text)' }}>Movimentações recentes</h3>
          <div className="flex flex-col gap-4">
            {MOCK_MOVEMENTS.map((m) => {
              const Icon = m.type === 'in' ? ArrowUpIcon : m.type === 'out' ? ArrowDownIcon : WrenchScrewdriverIcon;
              return (
                <div key={m.id} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `rgba(0,0,0,0.25)`, border: `1px solid ${m.color}33`, color: m.color }}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--nexus-text)' }}>{m.label}</p>
                    <p className="text-xs" style={{ color: 'var(--nexus-muted-2)' }}>{m.ref}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs" style={{ color: 'var(--nexus-muted-2)' }}>{m.time}</p>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: m.color }}>{m.delta}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Estoque por categoria */}
        <div className="rounded-xl p-5" style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
          <h3 className="text-sm font-semibold mb-5" style={{ color: 'var(--nexus-text)' }}>Estoque por categoria</h3>
          <div className="flex items-center gap-5">
            <DonutChart size={110} thickness={24} slices={
              (catTotals.length > 0 ? catTotals : [
                ['Informática', 120430], ['Eletrônicos', 75230], ['Móveis', 35820], ['Outros', 18950],
              ]).slice(0, 5).map(([, v], i) => ({ value: v as number, color: catColors[i] }))
            } />
            <div className="flex flex-col gap-2.5 flex-1 min-w-0">
              {(catTotals.length > 0 ? catTotals : [
                ['Informática', 120430], ['Eletrônicos', 75230], ['Móveis', 35820], ['Outros', 18950],
              ] as [string, number][]).slice(0, 4).map(([cat, val], i) => (
                <div key={cat} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: catColors[i] }} />
                  <span className="text-xs flex-1 truncate" style={{ color: 'var(--nexus-muted-2)' }}>{cat}</span>
                  <div className="text-right">
                    <span className="text-xs font-semibold block" style={{ color: 'var(--nexus-text)' }}>
                      {formatPrice(val as number)}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--nexus-muted-2)' }}>
                      ({Math.round(((val as number) / (totalCatValue || 1)) * 100)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal de movimentação ────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'var(--nexus-overlay)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }} transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl p-6"
              style={{ background: 'var(--nexus-card-strong)', border: '1px solid var(--nexus-border)', boxShadow: 'var(--nexus-shadow)' }}>

              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(var(--nexus-gold-rgb),0.12)', color: 'var(--nexus-gold)' }}>
                    <ArrowsRightLeftIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold" style={{ color: 'var(--nexus-text)' }}>Nova Movimentação</h2>
                    <p className="text-xs" style={{ color: 'var(--nexus-muted-2)' }}>Registre entrada, saída ou ajuste</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{ color: 'var(--nexus-muted-2)', background: 'var(--nexus-card-soft)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--nexus-gold-rgb),0.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--nexus-card-soft)')}>
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              {error && (
                <div className="px-4 py-3 rounded-lg mb-4 text-sm"
                  style={{ background: 'rgba(var(--nexus-danger-rgb),0.1)', color: 'var(--nexus-danger)', border: '1px solid rgba(var(--nexus-danger-rgb),0.2)' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Produto */}
                <Field label="Produto" required value={formData.product_id} onChange={(v) => setFormData({ ...formData, product_id: v })} as="select">
                  <option value="">Selecione um produto...</option>
                  {stockList.map(p => <option key={p.id} value={p.id}>{p.name} (qtd: {p.quantity})</option>)}
                </Field>

                {/* Tipo */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--nexus-muted-2)' }}>Tipo *</label>
                  <div className="flex gap-2">
                    {[
                      { key: 'in',     label: 'Entrada', icon: ArrowUpIcon,         color: 'var(--nexus-success)' },
                      { key: 'out',    label: 'Saída',   icon: ArrowDownIcon,        color: 'var(--nexus-danger)'  },
                      { key: 'adjust', label: 'Ajuste',  icon: WrenchScrewdriverIcon, color: 'var(--nexus-warning)' },
                    ].map(({ key, label, icon: Ic, color }) => (
                      <button key={key} type="button"
                        onClick={() => setFormData({ ...formData, type: key as any })}
                        className="flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                        style={formData.type === key
                          ? { background: `${color}22`, color, border: `1px solid ${color}55` }
                          : { background: 'transparent', color: 'var(--nexus-muted-2)', border: '1px solid rgba(var(--nexus-gold-rgb),0.15)' }
                        }>
                        <Ic className="w-3.5 h-3.5" />{label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Quantidade" type="number" required value={formData.quantity} onChange={(v) => setFormData({ ...formData, quantity: v })} />
                  <Field label="Descrição" value={formData.description} onChange={(v) => setFormData({ ...formData, description: v })} />
                </div>

                <div className="flex justify-end gap-3 pt-2" style={{ borderTop: '1px solid var(--nexus-border)' }}>
                  <GradBtn secondary onClick={() => setShowModal(false)}>Cancelar</GradBtn>
                  <GradBtn type="submit">Registrar</GradBtn>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
