import { useState, useEffect, useMemo, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  ArrowDownTrayIcon, ArrowUpIcon, ArrowDownIcon,
  HomeIcon, ChevronRightIcon as ChevronSep,
  CalendarIcon, PlusIcon, XMarkIcon,
  EyeIcon, PencilSquareIcon, EllipsisVerticalIcon,
  BanknotesIcon, ArrowTrendingDownIcon, CurrencyDollarIcon,
  ChartBarIcon, BuildingLibraryIcon,
  ChevronLeftIcon, ChevronRightIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { Transaction, CashFlow } from '../../types';

/* ─── helpers ──────────────────────────────────────────── */
const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

const inputCls = 'w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200';
const inputStyle = {
  background: 'var(--nexus-input-bg)',
  border: '1px solid rgba(var(--nexus-gold-rgb),0.15)',
  color: 'var(--nexus-text)',
};

const PIE_COLORS = [
  '#D49556', '#C65A71', '#9a6a42', '#60a5fa', '#a78bfa', '#A8A8A8',
];

/* ─── component ────────────────────────────────────────── */
export function Financial() {
  const [transactions, setTransactions]   = useState<Transaction[]>([]);
  const [cashFlow, setCashFlow]           = useState<CashFlow>({ total_revenue: 0, total_expense: 0, balance: 0 });
  const [loading, setLoading]             = useState(true);
  const [showModal, setShowModal]         = useState(false);
  const [page, setPage]                   = useState(1);
  const [formData, setFormData]           = useState({
    type: 'revenue' as 'revenue' | 'expense',
    category: '', description: '', value: 0,
    transaction_date: new Date().toISOString().split('T')[0],
  });
  const [error, setError] = useState('');
  const PAGE_SIZE = 5;

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [transRes, flowRes] = await Promise.all([api.get('/financial'), api.get('/financial/cashflow')]);
      const txData = Array.isArray(transRes.data) ? transRes.data : (transRes.data?.data || []);
      const cfData = flowRes.data?.total_revenue !== undefined ? flowRes.data : (flowRes.data?.data || flowRes.data);
      setTransactions(txData);
      setCashFlow(cfData);
    } catch { console.error('Erro ao carregar dados financeiros'); }
    finally { setLoading(false); }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError('');
    try {
      await api.post('/financial', formData);
      setShowModal(false);
      setFormData({ type: 'revenue', category: '', description: '', value: 0, transaction_date: new Date().toISOString().split('T')[0] });
      loadData();
    } catch (err: any) { setError(err.response?.data?.error || 'Erro ao salvar transação'); }
  }

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza?')) return;
    try { await api.delete(`/financial/${id}`); loadData(); }
    catch { console.error('Erro ao excluir transação'); }
  }

  const revenueCategories = ['Vendas','Serviços','Investimentos','Outros'];
  const expenseCategories = ['Compras','Despesas Fixas','Operacionais','Comerciais','Financeiras','Outros'];

  /* ── chart data ── */
  const lineData = useMemo(() => {
    const revMap: Record<string, number> = {};
    const expMap: Record<string, number> = {};
    transactions.forEach(t => {
      const d = new Date(t.transaction_date);
      const label = `${String(d.getDate()).padStart(2,'0')} ${d.toLocaleDateString('pt-BR', { month: 'short' })}`;
      if (t.type === 'revenue') revMap[label] = (revMap[label] || 0) + t.value;
      else expMap[label] = (expMap[label] || 0) + t.value;
    });
    const keys = [...new Set([...Object.keys(revMap), ...Object.keys(expMap)])].sort();
    return keys.map(label => ({
      label,
      receita: revMap[label] || 0,
      despesa: expMap[label] || 0,
      saldo: (revMap[label] || 0) - (expMap[label] || 0),
    }));
  }, [transactions]);

  const pieData = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.value;
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1;
    const entries = Object.entries(map).map(([name, value]) => ({
      name, value, pct: Math.round((value / total) * 100),
    }));
    return entries.length > 0 ? entries : [];
  }, [transactions]);

  /* ── pagination ── */
  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const paged = transactions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function pageRange() {
    const delta = 1;
    const range: (number | string)[] = [];
    for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) range.push(i);
    if ((range[0] as number) > 2) range.unshift('...');
    if ((range[range.length - 1] as number) < totalPages - 1) range.push('...');
    if (totalPages > 0) range.unshift(1);
    if (totalPages > 1) range.push(totalPages);
    return range;
  }

  return (
    <div className="p-6 space-y-6 min-h-screen">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <nav className="flex items-center gap-2 text-xs mb-3" style={{ color: 'var(--nexus-muted)' }}>
          <HomeIcon className="w-3.5 h-3.5" />
          <span>Dashboard</span>
          <ChevronSep className="w-3 h-3" />
          <span style={{ color: 'var(--nexus-text)' }}>Financeiro</span>
        </nav>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--nexus-text)' }}>Financeiro</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--nexus-muted)' }}>Gerencie as finanças da sua empresa</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Date Range */}
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border"
              style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)', color: 'var(--nexus-muted)' }}>
              <CalendarIcon className="w-4 h-4" />
              <span>01/05/2024 - 31/05/2024</span>
              <ChevronRightIcon className="w-3 h-3 rotate-90" />
            </div>
            {/* Export */}
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all"
              style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)', color: 'var(--nexus-muted)' }}>
              <ArrowDownTrayIcon className="w-4 h-4" />
              Exportar
            </button>
            {/* New Transaction */}
            <button onClick={() => { setShowModal(true); setError(''); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, var(--nexus-rose), var(--nexus-rose-dark))' }}>
              <PlusIcon className="w-4 h-4" />
              Nova Transação
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── KPI Cards ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          { label: 'Receitas', value: cashFlow.total_revenue, icon: <ArrowDownIcon className="w-7 h-7" />, change: '+15,3% este mês', up: true, accent: 'var(--nexus-success)' },
          { label: 'Despesas', value: cashFlow.total_expense, icon: <ArrowTrendingDownIcon className="w-7 h-7" />, change: '+8,7% este mês', up: false, accent: 'var(--nexus-rose)' },
          { label: 'Saldo', value: cashFlow.balance, icon: <CurrencyDollarIcon className="w-7 h-7" />, change: '+28,4% este mês', up: true, accent: 'var(--nexus-gold)' },
          { label: 'Saldo Previsto', value: cashFlow.balance * 1.1, icon: <ChartBarIcon className="w-7 h-7" />, change: '+12,6% este mês', up: true, accent: 'var(--nexus-muted)' },
        ].map((kpi, i) => (
          <div key={i} className="rounded-2xl p-5 flex items-start gap-4 border transition-all hover:shadow-[var(--nexus-glow)] group"
            style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)' }}>
            <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 border transition-transform group-hover:scale-105"
              style={{ background: 'rgba(var(--nexus-gold-rgb),0.1)', borderColor: 'rgba(var(--nexus-gold-rgb),0.2)', color: 'var(--nexus-gold)' }}>
              {kpi.icon}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wide" style={{ color: 'var(--nexus-gold)' }}>{kpi.label}</span>
                <EllipsisVerticalIcon className="w-4 h-4" style={{ color: 'var(--nexus-muted)' }} />
              </div>
              <span className="text-2xl font-bold mt-0.5" style={{ color: 'var(--nexus-text)' }}>{fmtBRL(kpi.value)}</span>
              <span className="text-xs mt-1 font-medium" style={{ color: kpi.up ? 'var(--nexus-success)' : 'var(--nexus-danger)' }}>
                {kpi.up ? '▲' : '▼'} {kpi.change}
              </span>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Charts Row ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Cash Flow Chart */}
        <div className="lg:col-span-2 rounded-2xl p-6 border flex flex-col"
          style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)', minHeight: '400px' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--nexus-text)' }}>Fluxo de caixa</h2>
            <div className="flex items-center gap-4">
              {/* Legend */}
              <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--nexus-muted)' }}>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded" style={{ background: 'var(--nexus-rose)' }} />Receitas</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded" style={{ background: 'var(--nexus-gold)' }} />Despesas</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded" style={{ background: 'var(--nexus-muted)' }} />Saldo</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border"
                style={{ borderColor: 'var(--nexus-border)', color: 'var(--nexus-muted)' }}>
                Diário
                <CalendarIcon className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            {lineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--nexus-chart-grid)" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false}
                    tick={{ fill: 'var(--nexus-muted)', fontSize: 11 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false}
                    tick={{ fill: 'var(--nexus-muted)', fontSize: 11 }}
                    tickFormatter={(v) => `R$ ${v >= 1000 ? `${v / 1000}k` : v}`} />
                  <Tooltip
                    contentStyle={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)', borderRadius: 10, color: 'var(--nexus-text)' }}
                    formatter={(v: any) => fmtBRL(v)} />
                  <Line type="monotone" dataKey="receita" name="Receitas" stroke="var(--nexus-rose)" strokeWidth={2.5}
                    dot={{ r: 4, fill: 'var(--nexus-rose)', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: 'var(--nexus-rose)', stroke: 'var(--nexus-bg)', strokeWidth: 2 }} />
                  <Line type="monotone" dataKey="despesa" name="Despesas" stroke="var(--nexus-gold)" strokeWidth={2.5}
                    dot={{ r: 4, fill: 'var(--nexus-gold)', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: 'var(--nexus-gold)', stroke: 'var(--nexus-bg)', strokeWidth: 2 }} />
                  <Line type="monotone" dataKey="saldo" name="Saldo" stroke="var(--nexus-muted)" strokeWidth={2} strokeDasharray="5 5"
                    dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--nexus-muted)' }}>
                Nenhum dado disponível
              </div>
            )}
          </div>
        </div>

        {/* Pie Chart */}
        <div className="rounded-2xl p-6 border flex flex-col"
          style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)', minHeight: '400px' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--nexus-text)' }}>Despesas por categoria</h2>
            <EllipsisVerticalIcon className="w-5 h-5" style={{ color: 'var(--nexus-muted)' }} />
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {pieData.length > 0 ? (
              <>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                        paddingAngle={2} dataKey="value" stroke="none"
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, pct }) => {
                          const rad = Math.PI / 180;
                          const r = innerRadius + (outerRadius - innerRadius) * 1.4;
                          const x = cx + r * Math.cos(-midAngle * rad);
                          const y = cy + r * Math.sin(-midAngle * rad);
                          return <text x={x} y={y} fill="var(--nexus-muted)" textAnchor="middle" fontSize={11}>{pct}%</text>;
                        }}>
                        {pieData.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)', borderRadius: 8 }}
                        formatter={(v: any) => fmtBRL(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2.5 mt-4 px-1">
                  {pieData.map((item, idx) => (
                    <div key={idx} className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full mt-1" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--nexus-text)' }}>{item.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--nexus-muted)' }}>{fmtBRL(item.value)}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold mt-1" style={{ color: 'var(--nexus-text)' }}>{item.pct}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--nexus-muted)' }}>
                Nenhuma despesa registrada
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Table + Sidebar Row ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Lançamentos recentes */}
        <div className="lg:col-span-2 rounded-2xl border overflow-hidden"
          style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)' }}>
          <div className="px-6 py-5">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--nexus-text)' }}>Lançamentos recentes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--nexus-border)' }}>
                  {['Data','Descrição','Categoria','Tipo','Valor','Status','Ações'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--nexus-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(var(--nexus-gold-rgb),0.05)' }}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-5 py-3.5">
                          <div className="h-4 rounded animate-pulse" style={{ background: 'var(--nexus-bg-soft)', width: j === 1 ? '120px' : '70px' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : paged.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-sm" style={{ color: 'var(--nexus-muted)' }}>
                    Nenhum lançamento encontrado
                  </td></tr>
                ) : (
                  paged.map(t => (
                    <tr key={t.id}
                      className="transition-colors group"
                      style={{ borderBottom: '1px solid rgba(var(--nexus-gold-rgb),0.05)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--nexus-gold-rgb),0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td className="px-5 py-3.5" style={{ color: 'var(--nexus-muted)' }}>{fmtDate(t.transaction_date)}</td>
                      <td className="px-5 py-3.5 font-medium" style={{ color: 'var(--nexus-text)' }}>{t.description}</td>
                      <td className="px-5 py-3.5" style={{ color: 'var(--nexus-muted)' }}>{t.category}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border"
                          style={t.type === 'revenue' ? {
                            background: 'rgba(var(--nexus-success-rgb),0.1)', color: 'var(--nexus-success)', borderColor: 'rgba(var(--nexus-success-rgb),0.25)'
                          } : {
                            background: 'rgba(var(--nexus-danger-rgb),0.1)', color: 'var(--nexus-danger)', borderColor: 'rgba(var(--nexus-danger-rgb),0.25)'
                          }}>
                          {t.type === 'revenue' ? 'Receita' : 'Despesa'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-semibold" style={{ color: t.type === 'revenue' ? 'var(--nexus-text)' : 'var(--nexus-danger)' }}>
                        {t.type === 'expense' ? '-' : ''}{fmtBRL(t.value)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border"
                          style={{ background: 'rgba(var(--nexus-success-rgb),0.1)', color: 'var(--nexus-success)', borderColor: 'rgba(var(--nexus-success-rgb),0.25)' }}>
                          Pago
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-105"
                            style={{ background: 'var(--nexus-bg-soft)', color: 'var(--nexus-muted)' }}>
                            <EyeIcon className="w-3.5 h-3.5" />
                          </button>
                          <button className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-105"
                            style={{ background: 'rgba(var(--nexus-gold-rgb),0.1)', color: 'var(--nexus-gold)' }}>
                            <PencilSquareIcon className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(t.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-105"
                            style={{ background: 'var(--nexus-bg-soft)', color: 'var(--nexus-muted)' }}>
                            <EllipsisVerticalIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {!loading && transactions.length > 0 && (
            <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: '1px solid var(--nexus-border)' }}>
              <p className="text-xs" style={{ color: 'var(--nexus-muted)' }}>
                Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, transactions.length)} de {transactions.length} lançamentos
              </p>
              <div className="flex items-center gap-1.5">
                <button onClick={() => page > 1 && setPage(page - 1)} disabled={page === 1}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border disabled:opacity-30"
                  style={{ background: 'var(--nexus-bg-soft)', borderColor: 'var(--nexus-border)', color: 'var(--nexus-muted)' }}>
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                {pageRange().map((p, i) =>
                  p === '...' ? (
                    <span key={i} className="w-8 h-8 flex items-center justify-center text-xs" style={{ color: 'var(--nexus-muted)' }}>…</span>
                  ) : (
                    <button key={i} onClick={() => setPage(Number(p))}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold border"
                      style={Number(p) === page ? {
                        background: 'var(--nexus-rose)', borderColor: 'var(--nexus-rose)', color: '#fff',
                      } : {
                        background: 'var(--nexus-bg-soft)', borderColor: 'var(--nexus-border)', color: 'var(--nexus-muted)',
                      }}>
                      {p}
                    </button>
                  )
                )}
                <button onClick={() => page < totalPages && setPage(page + 1)} disabled={page === totalPages}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border disabled:opacity-30"
                  style={{ background: 'var(--nexus-bg-soft)', borderColor: 'var(--nexus-border)', color: 'var(--nexus-muted)' }}>
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar: Contas + A receber/pagar ── */}
        <div className="space-y-4">
          {/* Contas bancárias */}
          <div className="rounded-2xl p-5 border" style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--nexus-text)' }}>Contas bancárias</h3>
              <button className="text-xs font-medium" style={{ color: 'var(--nexus-gold)' }}>Ver todas</button>
            </div>
            <div className="space-y-3">
              {[
                { name: 'Conta Principal', bank: 'Banco do Brasil', suffix: '•••• 1234', value: 18450.75, color: '#3B82F6' },
                { name: 'Conta Secundária', bank: 'Itaú Unibanco', suffix: '•••• 5678', value: 9780.30, color: '#F59E0B' },
              ].map((acc, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--nexus-bg-soft)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${acc.color}20`, color: acc.color }}>
                    <BuildingLibraryIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--nexus-text)' }}>{acc.name}</p>
                    <p className="text-[11px]" style={{ color: 'var(--nexus-muted)' }}>{acc.bank} · {acc.suffix}</p>
                  </div>
                  <span className="text-sm font-bold" style={{ color: 'var(--nexus-text)' }}>{fmtBRL(acc.value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* A receber / A pagar */}
          <div className="rounded-2xl p-5 border" style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--nexus-text)' }}>A receber / A pagar</h3>
              <button className="text-xs font-medium" style={{ color: 'var(--nexus-gold)' }}>Ver todos</button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: 'rgba(var(--nexus-success-rgb),0.06)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-8 rounded-full" style={{ background: 'var(--nexus-success)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--nexus-success)' }}>A receber</span>
                </div>
                <span className="text-sm font-bold" style={{ color: 'var(--nexus-success)' }}>R$ 42.350,00</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: 'rgba(var(--nexus-danger-rgb),0.06)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-8 rounded-full" style={{ background: 'var(--nexus-danger)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--nexus-danger)' }}>A pagar</span>
                </div>
                <span className="text-sm font-bold" style={{ color: 'var(--nexus-danger)' }}>R$ 28.650,00</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══ Create Modal ═══ */}
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
                <h2 className="text-lg font-bold" style={{ color: 'var(--nexus-text)' }}>Nova Transação</h2>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted)' }}>Tipo</label>
                    <select value={formData.type}
                      onChange={e => setFormData({ ...formData, type: e.target.value as 'revenue' | 'expense', category: '' })}
                      className={inputCls} style={inputStyle}>
                      <option value="revenue">Receita</option>
                      <option value="expense">Despesa</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted)' }}>Categoria</label>
                    <select required value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className={inputCls} style={inputStyle}>
                      <option value="">Selecione...</option>
                      {(formData.type === 'revenue' ? revenueCategories : expenseCategories).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted)' }}>Descrição</label>
                  <input type="text" required value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className={inputCls} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.5)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted)' }}>Valor (R$)</label>
                    <input type="number" step="0.01" min="0" required value={formData.value}
                      onChange={e => setFormData({ ...formData, value: Number(e.target.value) })}
                      className={inputCls} style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted)' }}>Data</label>
                    <input type="date" required value={formData.transaction_date}
                      onChange={e => setFormData({ ...formData, transaction_date: e.target.value })}
                      className={inputCls} style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'} />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit"
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, var(--nexus-rose), var(--nexus-rose-dark))' }}>
                    Salvar
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
