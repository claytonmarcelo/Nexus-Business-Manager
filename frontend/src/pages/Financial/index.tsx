import { useState, useEffect, useMemo, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  ArrowDownTrayIcon, ArrowUpIcon, ArrowDownIcon,
  CalendarIcon, XMarkIcon,
  EyeIcon, PencilSquareIcon, EllipsisVerticalIcon,
  CurrencyDollarIcon,
  CreditCardIcon, BuildingLibraryIcon,
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
  border: '1px solid var(--nexus-border)',
  color: 'var(--nexus-text)',
};

const PIE_COLORS = [
  '#C65A71', '#9a6a42', '#D49556', '#8c7355', '#6b5744', '#524335', '#A8A8A8'
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
      const rawTx = Array.isArray(transRes.data) ? transRes.data : (transRes.data?.data || []);
      const txData = rawTx.map((t: any) => ({
        ...t,
        value: typeof t.value === 'string' ? parseFloat(t.value) : (Number(t.value) || 0)
      }));
      const cfData = flowRes.data?.total_revenue !== undefined ? flowRes.data : (flowRes.data?.data || flowRes.data);
      
      setTransactions(txData);
      setCashFlow({
        total_revenue: Number(cfData?.total_revenue) || 0,
        total_expense: Number(cfData?.total_expense) || 0,
        balance: Number(cfData?.balance) || 0
      });
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
    
    const validTx = transactions.filter(t => !isNaN(new Date(t.transaction_date).getTime()));
    const sortedTx = [...validTx].sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());
    
    sortedTx.forEach(t => {
      const d = new Date(t.transaction_date);
      const label = `${String(d.getDate()).padStart(2,'0')} ${d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').replace(/^\w/, c => c.toUpperCase())}`;
      
      if (t.type === 'revenue') revMap[label] = (revMap[label] || 0) + t.value;
      else expMap[label] = (expMap[label] || 0) + t.value;
    });
    
    const keys = [...new Set([...Object.keys(revMap), ...Object.keys(expMap)])];
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
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    const entries = Object.entries(map)
      .map(([name, value]) => ({
        name, 
        value, 
        pct: total > 0 ? ((value / total) * 100).toFixed(1).replace('.', ',') : '0,0',
      }))
      .filter(e => e.value > 0)
      .sort((a, b) => b.value - a.value);
      
    return entries;
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

  // Sparkline static dummy data matching the image curves roughly
  const spark1 = [{v:10},{v:15},{v:12},{v:18},{v:16},{v:22},{v:19},{v:25},{v:22},{v:28}];
  const spark2 = [{v:5},{v:12},{v:9},{v:16},{v:13},{v:20},{v:18},{v:22},{v:15},{v:20}];
  const spark3 = [{v:5},{v:8},{v:6},{v:10},{v:13},{v:11},{v:18},{v:14},{v:22},{v:25}];
  const spark4 = [{v:8},{v:10},{v:12},{v:11},{v:16},{v:15},{v:19},{v:22},{v:20},{v:28}];

  return (
    <div className="p-6 space-y-6 min-h-screen" style={{ background: 'var(--nexus-bg)' }}>

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-[28px] font-medium" style={{ color: 'var(--nexus-text)' }}>Financeiro</h1>
            <p className="text-[13px] mt-1" style={{ color: 'var(--nexus-muted)' }}>Gerencie as finanças da sua empresa</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Date Range */}
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border cursor-pointer transition-colors"
              style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)', color: 'var(--nexus-muted)' }}>
              <CalendarIcon className="w-4 h-4" />
              <span>01/05/2024 - 31/05/2024</span>
              <ChevronRightIcon className="w-3 h-3 rotate-90" />
            </div>
            {/* Export */}
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all"
              style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)', color: 'var(--nexus-text)' }}>
              <ArrowDownTrayIcon className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── KPI Cards ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-4 gap-3 lg:gap-4"
      >
        {[
          { label: 'Receitas', value: cashFlow.total_revenue || 126430.20, icon: <ArrowDownIcon className="w-4 h-4 lg:w-5 lg:h-5" />, change: '↑ 15,3% este mês', up: true, spark: spark1, sparkColor: 'var(--nexus-rose)' },
          { label: 'Despesas', value: cashFlow.total_expense || 98230.50, icon: <ArrowUpIcon className="w-4 h-4 lg:w-5 lg:h-5" />, change: '↑ 8,7% este mês', up: true, spark: spark2, sparkColor: 'var(--nexus-rose)' },
          { label: 'Saldo', value: cashFlow.balance || 28199.70, icon: <CurrencyDollarIcon className="w-4 h-4 lg:w-5 lg:h-5" />, change: '↑ 28,4% este mês', up: true, spark: spark3, sparkColor: 'var(--nexus-gold)' },
          { label: 'Saldo Previsto', value: (cashFlow.balance || 28199.70) * 1.1, icon: <CreditCardIcon className="w-4 h-4 lg:w-5 lg:h-5" />, change: '↑ 12,6% este mês', up: true, spark: spark4, sparkColor: 'var(--nexus-gold)' },
        ].map((kpi, i) => (
          <div key={i} className="rounded-2xl border overflow-hidden flex flex-col"
            style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)' }}>
            <div className="p-3 lg:p-5 flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center flex-shrink-0 border"
                    style={{ background: 'var(--nexus-bg-soft)', borderColor: 'var(--nexus-border)', color: 'var(--nexus-gold)' }}>
                    {kpi.icon}
                  </div>
                  <span className="text-[11px] lg:text-[13px] font-medium truncate" style={{ color: 'var(--nexus-muted)' }}>{kpi.label}</span>
                </div>
                <EllipsisVerticalIcon className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0 ml-1" style={{ color: 'var(--nexus-muted)' }} />
              </div>
              <div className="mt-3 lg:mt-4 min-w-0">
                <span className="text-[15px] xl:text-[18px] 2xl:text-[22px] font-semibold tracking-tight truncate block" style={{ color: 'var(--nexus-text)' }}>{fmtBRL(kpi.value)}</span>
              </div>
              <div className="mt-1 min-w-0">
                <span className="text-[9px] lg:text-[11px] font-medium truncate block" style={{ color: kpi.up ? 'var(--nexus-success)' : 'var(--nexus-danger)' }}>
                  {kpi.change}
                </span>
              </div>
            </div>
            {/* Sparkline */}
            <div className="h-8 lg:h-12 w-full mt-auto opacity-80" style={{ filter: `drop-shadow(0 4px 6px rgba(0,0,0,0.1))` }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={kpi.spark} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <Line type="monotone" dataKey="v" stroke={kpi.sparkColor} strokeWidth={2} dot={{ r: 2, fill: kpi.sparkColor, strokeWidth: 0 }} activeDot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Charts Row ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      >
        {/* Fluxo de caixa */}
        <div className="lg:col-span-2 rounded-2xl p-6 border flex flex-col"
          style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)', minHeight: '380px' }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[15px] font-medium" style={{ color: 'var(--nexus-text)' }}>Fluxo de caixa</h2>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border cursor-pointer"
              style={{ borderColor: 'var(--nexus-border)', color: 'var(--nexus-muted)' }}>
              Diário
              <CalendarIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          
          <div className="flex items-center gap-5 text-[11px] mb-6" style={{ color: 'var(--nexus-muted)' }}>
            <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded-full" style={{ background: 'var(--nexus-rose)' }} />Receitas</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded-full" style={{ background: 'var(--nexus-danger)' }} />Despesas</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded-full" style={{ background: 'var(--nexus-gold)' }} />Saldo</span>
          </div>

          <div className="flex-1 min-h-0 relative">
            {lineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="label" axisLine={false} tickLine={false}
                    tick={{ fill: 'var(--nexus-muted)', fontSize: 10 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false}
                    tick={{ fill: 'var(--nexus-muted)', fontSize: 10 }}
                    tickFormatter={(v) => `${v < 0 ? '-' : ''}R$ ${Math.abs(v) >= 1000 ? `${Math.abs(v) / 1000}k` : Math.abs(v)}`} />
                  <Tooltip
                    contentStyle={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)', borderRadius: 8, color: 'var(--nexus-text)', fontSize: 12 }}
                    formatter={(v: any) => fmtBRL(v)} />
                  <Line type="monotone" dataKey="receita" name="Receitas" stroke="var(--nexus-rose)" strokeWidth={2}
                    dot={{ r: 3, fill: 'var(--nexus-rose)', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: 'var(--nexus-rose)', stroke: 'var(--nexus-bg)', strokeWidth: 2 }} />
                  <Line type="monotone" dataKey="despesa" name="Despesas" stroke="var(--nexus-danger)" strokeWidth={2}
                    dot={{ r: 3, fill: 'var(--nexus-danger)', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: 'var(--nexus-danger)', stroke: 'var(--nexus-bg)', strokeWidth: 2 }} />
                  <Line type="monotone" dataKey="saldo" name="Saldo" stroke="var(--nexus-gold)" strokeWidth={2}
                    dot={{ r: 3, fill: 'var(--nexus-gold)', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: 'var(--nexus-gold)', stroke: 'var(--nexus-bg)', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--nexus-muted)' }}>
                Gráfico de fluxo de caixa vazio (sem dados no período)
              </div>
            )}
          </div>
        </div>

        {/* Despesas por Categoria */}
        <div className="rounded-2xl p-6 border flex flex-col"
          style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)', minHeight: '380px' }}>
          <h2 className="text-[15px] font-medium mb-6" style={{ color: 'var(--nexus-text)' }}>Despesas por categoria</h2>

          <div className="flex-1 flex items-center">
            {pieData.length > 0 ? (
              <>
                <div className="w-[140px] h-[140px] flex-shrink-0 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70}
                        paddingAngle={1} dataKey="value" stroke="none"
                        labelLine={false}
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, pct }) => {
                          const rad = Math.PI / 180;
                          const r = innerRadius + (outerRadius - innerRadius) * 0.5;
                          const x = cx + r * Math.cos(-midAngle * rad);
                          const y = cy + r * Math.sin(-midAngle * rad);
                          const percent = parseFloat(pct.replace(',','.'));
                          if(percent < 5) return null; // hide small labels
                          return <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={10}>{Math.round(percent)}%</text>;
                        }}>
                        {pieData.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 ml-6 space-y-3">
                  {pieData.slice(0, 6).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-start gap-2.5">
                        <div className="w-2 h-2 rounded-full mt-1.5" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        <div>
                          <p className="text-[12px] font-medium" style={{ color: 'var(--nexus-text)' }}>{item.name}</p>
                          <p className="text-[10px]" style={{ color: 'var(--nexus-muted)' }}>{fmtBRL(item.value)}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-medium" style={{ color: 'var(--nexus-text)' }}>{item.pct}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center w-full h-full text-sm" style={{ color: 'var(--nexus-muted)' }}>
                Nenhuma despesa registrada
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Table + Sidebar Row ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      >
        {/* Lançamentos recentes */}
        <div className="lg:col-span-2 rounded-2xl border overflow-hidden flex flex-col"
          style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)', minHeight: '400px' }}>
          <div className="px-6 py-5">
            <h2 className="text-[15px] font-medium" style={{ color: 'var(--nexus-text)' }}>Lançamentos recentes</h2>
          </div>
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="grid grid-cols-[100px_minmax(150px,1fr)_120px_90px_110px_80px_100px] gap-4 px-6 py-3" style={{ borderBottom: '1px solid var(--nexus-border)' }}>
              {['Data','Descrição','Categoria','Tipo','Valor','Status','Ações'].map(h => (
                <div key={h} className="text-[11px] font-medium" style={{ color: 'var(--nexus-muted)' }}>{h}</div>
              ))}
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-[100px_minmax(150px,1fr)_120px_90px_110px_80px_100px] gap-4 px-6 py-4 items-center" style={{ borderBottom: '1px solid var(--nexus-border)' }}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <div key={j} className="h-4 rounded animate-pulse" style={{ background: 'var(--nexus-bg-soft)', width: j === 1 ? '80%' : '70px' }} />
                    ))}
                  </div>
                ))
              ) : paged.length === 0 ? (
                <div className="px-6 py-12 text-center text-[13px]" style={{ color: 'var(--nexus-muted)' }}>
                  Nenhum lançamento encontrado
                </div>
              ) : (
                paged.map(t => (
                  <div key={t.id}
                    className="grid grid-cols-[100px_minmax(150px,1fr)_120px_90px_110px_80px_100px] gap-4 px-6 py-3.5 items-center transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ borderBottom: '1px solid var(--nexus-border)' }}>
                    
                    <div className="text-[12px] truncate" style={{ color: 'var(--nexus-muted)' }}>{fmtDate(t.transaction_date)}</div>
                    <div className="text-[13px] truncate" style={{ color: 'var(--nexus-text)' }}>{t.description}</div>
                    <div className="text-[12px] truncate" style={{ color: 'var(--nexus-muted)' }}>{t.category}</div>
                    
                    <div>
                      <span className="inline-flex px-2.5 py-1 rounded-[6px] text-[10px] font-medium"
                        style={t.type === 'revenue' ? {
                          background: 'rgba(var(--nexus-success-rgb), 0.15)', color: 'var(--nexus-success)'
                        } : {
                          background: 'rgba(var(--nexus-danger-rgb), 0.15)', color: 'var(--nexus-danger)'
                        }}>
                        {t.type === 'revenue' ? 'Receita' : 'Despesa'}
                      </span>
                    </div>
                    
                    <div className="text-[13px] font-medium truncate" style={{ color: t.type === 'revenue' ? 'var(--nexus-text)' : 'var(--nexus-muted)' }}>
                      {t.type === 'expense' ? '-' : ''}{fmtBRL(t.value)}
                    </div>
                    
                    <div>
                      <span className="inline-flex px-2.5 py-1 rounded-[6px] text-[10px] font-medium"
                        style={{ background: 'rgba(var(--nexus-success-rgb), 0.15)', color: 'var(--nexus-success)' }}>
                        Pago
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        style={{ color: 'var(--nexus-muted)' }}>
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        style={{ color: 'var(--nexus-gold)' }}>
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(t.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        style={{ color: 'var(--nexus-muted)' }}>
                        <EllipsisVerticalIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          {/* Pagination */}
          {!loading && transactions.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 mt-auto">
              <p className="text-[12px]" style={{ color: 'var(--nexus-muted)' }}>
                Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, transactions.length)} de {transactions.length} lançamentos
              </p>
              <div className="flex items-center gap-1.5">
                <button onClick={() => page > 1 && setPage(page - 1)} disabled={page === 1}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border disabled:opacity-30 transition-colors"
                  style={{ color: 'var(--nexus-text)', background: 'var(--nexus-bg)', borderColor: 'var(--nexus-border)' }}>
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                {pageRange().map((p, i) =>
                  p === '...' ? (
                    <span key={i} className="w-8 h-8 flex items-center justify-center text-[12px]" style={{ color: 'var(--nexus-muted)' }}>…</span>
                  ) : (
                    <button key={i} onClick={() => setPage(Number(p))}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[12px] transition-colors"
                      style={Number(p) === page ? {
                        background: 'var(--nexus-rose)', color: '#fff',
                      } : {
                        background: 'transparent', color: 'var(--nexus-muted)',
                      }}>
                      {p}
                    </button>
                  )
                )}
                <button onClick={() => page < totalPages && setPage(page + 1)} disabled={page === totalPages}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border disabled:opacity-30 transition-colors"
                  style={{ color: 'var(--nexus-text)', background: 'var(--nexus-bg)', borderColor: 'var(--nexus-border)' }}>
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar: Contas & A receber/pagar ── */}
        <div className="space-y-4">
          {/* Contas bancárias */}
          <div className="rounded-2xl p-5 border" style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[14px] font-medium" style={{ color: 'var(--nexus-text)' }}>Contas bancárias</h3>
              <button className="text-[11px] hover:underline" style={{ color: 'var(--nexus-muted)' }}>Ver todas</button>
            </div>
            <div className="space-y-4">
              {[
                { name: 'Conta Principal', bank: 'Banco do Brasil', suffix: '•••• 1234', value: 18450.75, color: 'var(--nexus-gold)', icon: <BuildingLibraryIcon className="w-5 h-5"/> },
                { name: 'Conta Secundária', bank: 'Itaú Unibanco', suffix: '•••• 5678', value: 9780.30, color: '#3B82F6', icon: <BuildingLibraryIcon className="w-5 h-5"/> },
              ].map((acc, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--nexus-bg-soft)', color: acc.color }}>
                    {acc.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium" style={{ color: 'var(--nexus-text)' }}>{acc.name}</p>
                    <p className="text-[11px]" style={{ color: 'var(--nexus-muted)' }}>{acc.bank}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-medium" style={{ color: 'var(--nexus-text)' }}>{fmtBRL(acc.value)}</p>
                    <p className="text-[11px]" style={{ color: 'var(--nexus-muted)' }}>{acc.suffix}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* A receber / A pagar */}
          <div className="rounded-2xl p-5 border" style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[14px] font-medium" style={{ color: 'var(--nexus-text)' }}>A receber / A pagar</h3>
              <button className="text-[11px] hover:underline" style={{ color: 'var(--nexus-muted)' }}>Ver todos</button>
            </div>
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-medium" style={{ color: 'var(--nexus-muted)' }}>A receber</span>
                  <span className="text-[13px] font-medium" style={{ color: 'var(--nexus-text)' }}>R$ 42.350,00</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--nexus-bg-soft)' }}>
                  <div className="h-full rounded-full" style={{ width: '70%', background: 'var(--nexus-success)' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-medium" style={{ color: 'var(--nexus-muted)' }}>A pagar</span>
                  <span className="text-[13px] font-medium" style={{ color: 'var(--nexus-text)' }}>R$ 28.650,00</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--nexus-bg-soft)' }}>
                  <div className="h-full rounded-full" style={{ width: '45%', background: 'var(--nexus-danger)' }} />
                </div>
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
                  style={{ background: 'rgba(var(--nexus-danger-rgb), 0.1)', color: 'var(--nexus-danger)', border: '1px solid rgba(var(--nexus-danger-rgb), 0.2)' }}>
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
                    className={inputCls} style={inputStyle} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted)' }}>Valor (R$)</label>
                    <input type="number" step="0.01" min="0" required value={formData.value}
                      onChange={e => setFormData({ ...formData, value: Number(e.target.value) })}
                      className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted)' }}>Data</label>
                    <input type="date" required value={formData.transaction_date}
                      onChange={e => setFormData({ ...formData, transaction_date: e.target.value })}
                      className={inputCls} style={inputStyle} />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit"
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                    style={{ background: 'var(--nexus-rose)' }}>
                    Salvar
                  </button>
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'transparent', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)' }}>
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
