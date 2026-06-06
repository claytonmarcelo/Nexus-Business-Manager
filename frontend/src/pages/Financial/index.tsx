import { useState, useEffect, useMemo, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import api from '../../services/api';
import { Transaction, CashFlow } from '../../types';
import { PremiumTable, Column } from '../../components/ui/PremiumTable';
import { PremiumBadge } from '../../components/ui/PremiumBadge';
import { GradientButton } from '../../components/ui/GradientButton';
import { ChartCard } from '../../components/ui/ChartCard';

const currency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const PIE_COLORS = ['#D49556', '#C65A71', '#7DDA6A', '#60a5fa', '#a78bfa', '#D89A28', '#D84B5F'];

const sparklineHeights = Array.from({ length: 8 }, () => Math.floor(Math.random() * 30) + 10);

const MOCK_RECEBER = [
  { id: 1, cliente: 'Empresa ABC', valor: 5000, vencimento: '15/06/2026' },
  { id: 2, cliente: 'Cliente XYZ', valor: 3200, vencimento: '20/06/2026' },
  { id: 3, cliente: 'Tech Solutions', valor: 7800, vencimento: '25/06/2026' },
];

const MOCK_PAGAR = [
  { id: 1, fornecedor: 'Fornecedor A', valor: 2500, vencimento: '10/06/2026' },
  { id: 2, fornecedor: 'Aluguel', valor: 4000, vencimento: '05/06/2026' },
  { id: 3, fornecedor: 'Internet', valor: 350, vencimento: '15/06/2026' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export function Financial() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cashFlow, setCashFlow] = useState<CashFlow>({ total_revenue: 0, total_expense: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    type: 'revenue' as 'revenue' | 'expense',
    category: '',
    description: '',
    value: 0,
    transaction_date: new Date().toISOString().split('T')[0],
  });
  const [error, setError] = useState('');

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
    e.preventDefault();
    setError('');
    try {
      await api.post('/financial', formData);
      setShowModal(false);
      setFormData({ type: 'revenue', category: '', description: '', value: 0, transaction_date: new Date().toISOString().split('T')[0] });
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar transacao');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza?')) return;
    try {
      await api.delete(`/financial/${id}`);
      loadData();
    } catch { console.error('Erro ao excluir transacao'); }
  }

  const revenueCategories = ['Vendas', 'Servicos', 'Investimentos', 'Outros'];
  const expenseCategories = ['Agua', 'Luz', 'Internet', 'Salarios', 'Aluguel', 'Material', 'Outros'];

  const monthlyData = useMemo(() => {
    const revenueMap: Record<string, number> = {};
    const expenseMap: Record<string, number> = {};
    transactions.forEach((t) => {
      const d = new Date(t.transaction_date);
      const label = `${d.toLocaleDateString('pt-BR', { month: 'short' })}/${String(d.getFullYear()).slice(2)}`;
      if (t.type === 'revenue') revenueMap[label] = (revenueMap[label] || 0) + t.value;
      else expenseMap[label] = (expenseMap[label] || 0) + t.value;
    });
    const keys = [...new Set([...Object.keys(revenueMap), ...Object.keys(expenseMap)])].sort();
    return keys.map((label) => ({
      label,
      receita: revenueMap[label] || 0,
      despesa: expenseMap[label] || 0,
    }));
  }, [transactions]);

  const pieData = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.filter((t) => t.type === 'expense').forEach((t) => {
      map[t.category] = (map[t.category] || 0) + t.value;
    });
    const entries = Object.entries(map).map(([name, value]) => ({ name, value }));
    return entries.length > 0 ? entries : [{ name: 'Nenhuma despesa', value: 1 }];
  }, [transactions]);

  const columns: Column<Transaction>[] = [
    {
      key: 'data',
      header: 'Data',
      render: (t) => (
        <span style={{ color: 'var(--nexus-muted-2)' }}>
          {new Date(t.transaction_date).toLocaleDateString('pt-BR')}
        </span>
      ),
    },
    {
      key: 'tipo',
      header: 'Tipo',
      render: (t) => (
        <PremiumBadge variant={t.type === 'revenue' ? 'success' : 'danger'}>
          {t.type === 'revenue' ? 'Receita' : 'Despesa'}
        </PremiumBadge>
      ),
    },
    {
      key: 'categoria',
      header: 'Categoria',
      render: (t) => (
        <span style={{ color: 'var(--nexus-text)' }}>{t.category}</span>
      ),
    },
    {
      key: 'descricao',
      header: 'Descricao',
      hide: 'md',
      render: (t) => (
        <span style={{ color: 'var(--nexus-muted-2)' }}>{t.description}</span>
      ),
    },
    {
      key: 'valor',
      header: 'Valor',
      render: (t) => (
        <span className="font-medium" style={{ color: t.type === 'revenue' ? 'var(--nexus-success)' : 'var(--nexus-danger)' }}>
          {currency(t.value)}
        </span>
      ),
    },
    {
      key: 'acoes',
      header: 'Acoes',
      render: (t) => (
        <div className="flex justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
            className="text-xs font-medium transition-opacity hover:opacity-80"
            style={{ color: 'var(--nexus-danger)' }}
          >
            Excluir
          </button>
        </div>
      ),
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--nexus-text)' }}>Financeiro</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--nexus-muted-2)' }}>Fluxo de caixa e transacoes</p>
        </div>
        <GradientButton icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        } onClick={() => { setShowModal(true); setError(''); }}>
          Nova Transacao
        </GradientButton>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {([
          { label: 'Receitas', value: cashFlow.total_revenue, color: 'green', bars: '#7DDA6A' },
          { label: 'Despesas', value: cashFlow.total_expense, color: 'rose', bars: '#D84B5F' },
          { label: 'Saldo', value: cashFlow.balance, color: 'gold', bars: '#D49556' },
          { label: 'Saldo Previsto', value: cashFlow.balance * 1.1, color: 'blue', bars: '#60a5fa' },
        ] as const).map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.08 }}
            whileHover={{ y: -3, boxShadow: `0 0 30px rgba(212, 149, 86, 0.1)` }}
            className="relative rounded-xl p-5 overflow-hidden"
            style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}
          >
            <div className="absolute top-0 left-0 w-1 h-full rounded-r" style={{ background: card.bars }} />
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--nexus-muted-2)' }}>
                {card.label}
              </span>
            </div>
            <p className="text-2xl font-bold mb-3" style={{ color: 'var(--nexus-text)' }}>
              {currency(card.value)}
            </p>
            <div className="flex items-end gap-0.5 h-8">
              {sparklineHeights.map((h, j) => (
                <div
                  key={j}
                  className="sparkline-bar flex-1 rounded-sm"
                  style={{
                    height: `${h}px`,
                    background: card.bars,
                    opacity: 0.6 + (h / 40) * 0.4,
                  }}
                />
              ))}
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Fluxo de Caixa">
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7DDA6A" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7DDA6A" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradDespesa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D84B5F" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D84B5F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,149,86,0.08)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--nexus-muted-2)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--nexus-muted-2)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => currency(v).slice(0, -3)} />
                <Tooltip
                  contentStyle={{ background: 'var(--nexus-card-strong)', border: '1px solid var(--nexus-border)', borderRadius: 12, color: 'var(--nexus-text)' }}
                  labelStyle={{ color: 'var(--nexus-muted-2)' }}
                  formatter={(v: number) => currency(v)}
                />
                <Area type="monotone" dataKey="receita" stroke="#7DDA6A" strokeWidth={2} fill="url(#gradReceita)" />
                <Area type="monotone" dataKey="despesa" stroke="#D84B5F" strokeWidth={2} fill="url(#gradDespesa)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-sm" style={{ color: 'var(--nexus-muted)' }}>
              Nenhum dado disponivel
            </div>
          )}
        </ChartCard>

        <ChartCard title="Despesas por Categoria">
          {pieData.length > 0 && pieData[0].name !== 'Nenhuma despesa' ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--nexus-card-strong)', border: '1px solid var(--nexus-border)', borderRadius: 12, color: 'var(--nexus-text)' }}
                  formatter={(v: number) => currency(v)}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-sm" style={{ color: 'var(--nexus-muted)' }}>
              Nenhuma despesa registrada
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {pieData.map((entry, idx) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--nexus-muted-2)' }}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                {entry.name}
              </div>
            ))}
          </div>
        </ChartCard>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard title="Lancamentos Recentes">
            <PremiumTable
              columns={columns}
              data={transactions.slice(0, 10)}
              loading={loading}
              emptyMessage="Nenhuma transacao encontrada."
            />
          </ChartCard>
        </div>

        <div className="space-y-4">
          <ChartCard title="A Receber">
            <div className="space-y-3">
              {MOCK_RECEBER.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: 'rgba(125, 218, 106, 0.06)' }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--nexus-text)' }}>{item.cliente}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--nexus-muted-2)' }}>Vence {item.vencimento}</p>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--nexus-success)' }}>
                    {currency(item.valor)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--nexus-border)' }}>
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--nexus-muted-2)' }}>Total</span>
                <span className="text-sm font-bold" style={{ color: 'var(--nexus-success)' }}>
                  {currency(MOCK_RECEBER.reduce((s, i) => s + i.valor, 0))}
                </span>
              </div>
            </div>
          </ChartCard>

          <ChartCard title="A Pagar">
            <div className="space-y-3">
              {MOCK_PAGAR.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: 'rgba(216, 75, 95, 0.06)' }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--nexus-text)' }}>{item.fornecedor}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--nexus-muted-2)' }}>Vence {item.vencimento}</p>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--nexus-danger)' }}>
                    {currency(item.valor)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--nexus-border)' }}>
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--nexus-muted-2)' }}>Total</span>
                <span className="text-sm font-bold" style={{ color: 'var(--nexus-danger)' }}>
                  {currency(MOCK_PAGAR.reduce((s, i) => s + i.valor, 0))}
                </span>
              </div>
            </div>
          </ChartCard>
        </div>
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(5, 7, 10, 0.75)' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md rounded-xl p-6"
              style={{ background: 'var(--nexus-card-strong)', border: '1px solid var(--nexus-border)' }}
            >
              <h2 className="text-lg font-semibold mb-5" style={{ color: 'var(--nexus-text)' }}>
                Nova Transacao
              </h2>

              {error && (
                <div
                  className="text-sm px-4 py-3 rounded-lg mb-4"
                  style={{ background: 'rgba(216, 75, 95, 0.1)', color: 'var(--nexus-danger)' }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--nexus-text)' }}>Tipo</label>
                  <select
                    className="w-full rounded-xl text-sm"
                    style={{
                      height: '52px',
                      padding: '0 16px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      color: 'var(--nexus-text)',
                      border: '1px solid rgba(212, 149, 86, 0.2)',
                      outline: 'none',
                    }}
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'revenue' | 'expense', category: '' })}
                  >
                    <option value="revenue">Receita</option>
                    <option value="expense">Despesa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--nexus-text)' }}>Categoria</label>
                  <select
                    className="w-full rounded-xl text-sm"
                    style={{
                      height: '52px',
                      padding: '0 16px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      color: 'var(--nexus-text)',
                      border: '1px solid rgba(212, 149, 86, 0.2)',
                      outline: 'none',
                    }}
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="">Selecione...</option>
                    {(formData.type === 'revenue' ? revenueCategories : expenseCategories).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--nexus-text)' }}>Descricao</label>
                  <input
                    type="text"
                    className="w-full rounded-xl text-sm"
                    style={{
                      height: '52px',
                      padding: '0 16px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      color: 'var(--nexus-text)',
                      border: '1px solid rgba(212, 149, 86, 0.2)',
                      outline: 'none',
                    }}
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--nexus-text)' }}>Valor</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full rounded-xl text-sm"
                      style={{
                        height: '52px',
                        padding: '0 16px',
                        background: 'rgba(0, 0, 0, 0.4)',
                        color: 'var(--nexus-text)',
                        border: '1px solid rgba(212, 149, 86, 0.2)',
                        outline: 'none',
                      }}
                      required
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--nexus-text)' }}>Data</label>
                    <input
                      type="date"
                      className="w-full rounded-xl text-sm"
                      style={{
                        height: '52px',
                        padding: '0 16px',
                        background: 'rgba(0, 0, 0, 0.4)',
                        color: 'var(--nexus-text)',
                        border: '1px solid rgba(212, 149, 86, 0.2)',
                        outline: 'none',
                      }}
                      required
                      value={formData.transaction_date}
                      onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="inline-flex items-center justify-center gap-2 font-medium py-3 px-6 rounded-xl transition-all duration-200"
                    style={{ background: 'rgba(11, 13, 16, 0.86)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)' }}
                  >
                    Cancelar
                  </button>
                  <GradientButton type="submit">Salvar</GradientButton>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
