import { memo } from 'react';
import { motion } from 'framer-motion';
import {
  UserGroupIcon, ShoppingCartIcon, CurrencyDollarIcon,
  ArrowTrendingUpIcon, TagIcon, BellIcon, CalendarDaysIcon,
  ArrowRightIcon, EllipsisVerticalIcon,
  ArchiveBoxIcon, CheckCircleIcon,
  ClockIcon, ExclamationCircleIcon, ArrowUpIcon,
} from '@heroicons/react/24/outline';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { StatsCard } from '../../components/ui/StatsCard';

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const PIE_COLORS = [
  'var(--nexus-rose)', 'var(--nexus-gold)',
  'var(--nexus-bronze)', 'var(--nexus-muted)',
];

const cardStyle = {
  background: 'var(--nexus-card)',
  border: '1px solid var(--nexus-border)',
  boxShadow: 'var(--nexus-shadow)',
} as const;

const mock = {
  kpis: {
    clients: { value: '1.250', trend: '+12,5%', up: true },
    sales: { value: 'R$ 84.230,50', trend: '+18,7%', up: true },
    revenue: { value: 'R$ 126.430,20', trend: '+15,3%', up: true },
    profit: { value: 'R$ 28.200,00', trend: '+11,8%', up: true },
    avgTicket: { value: 'R$ 1.420,35', trend: '+8,2%', up: true },
  },
  sales12months: [
    { name: 'Jan', value: 32000 }, { name: 'Fev', value: 28000 },
    { name: 'Mar', value: 45000 }, { name: 'Abr', value: 38000 },
    { name: 'Mai', value: 52000 }, { name: 'Jun', value: 48000 },
    { name: 'Jul', value: 41000 }, { name: 'Ago', value: 56000 },
    { name: 'Set', value: 49000 }, { name: 'Out', value: 62000 },
    { name: 'Nov', value: 58000 }, { name: 'Dez', value: 72000 },
  ],
  financialFlow: [
    { name: 'Jan', receitas: 42000, despesas: 28000, lucro: 14000 },
    { name: 'Fev', receitas: 38000, despesas: 25000, lucro: 13000 },
    { name: 'Mar', receitas: 55000, despesas: 31000, lucro: 24000 },
    { name: 'Abr', receitas: 48000, despesas: 29000, lucro: 19000 },
    { name: 'Mai', receitas: 62000, despesas: 35000, lucro: 27000 },
    { name: 'Jun', receitas: 58000, despesas: 33000, lucro: 25000 },
  ],
  revenueByCategory: [
    { name: 'Serviços', value: 42, raw: 'R$ 53.100,00' },
    { name: 'Produtos', value: 31, raw: 'R$ 39.200,00' },
    { name: 'Assinaturas', value: 18, raw: 'R$ 22.760,00' },
    { name: 'Outros', value: 9, raw: 'R$ 11.370,00' },
  ],
  recentSales: [
    { id: '#VDA-1592', client: 'João Silva', date: '09/06/2026', value: 12840, status: 'Concluída' },
    { id: '#VDA-1591', client: 'Maria Oliveira', date: '08/06/2026', value: 5620, status: 'Concluída' },
    { id: '#VDA-1590', client: 'Carlos Souza', date: '08/06/2026', value: 3450, status: 'Pendente' },
    { id: '#VDA-1589', client: 'Ana Costa', date: '07/06/2026', value: 8900, status: 'Concluída' },
    { id: '#VDA-1588', client: 'Pedro Santos', date: '07/06/2026', value: 2340, status: 'Concluída' },
  ],
  newClients: [
    { name: 'Fernanda Lima', city: 'São Paulo', date: '09/06/2026' },
    { name: 'Roberto Alves', city: 'Rio de Janeiro', date: '08/06/2026' },
    { name: 'Juliana Mendes', city: 'Belo Horizonte', date: '08/06/2026' },
    { name: 'Lucas Pereira', city: 'Curitiba', date: '07/06/2026' },
  ],
  lowStock: [
    { product: 'Teclado Mecânico Redragon', stock: 3, min: 10, status: 'Crítico' as const },
    { product: 'Mouse Gamer Logitech G502', stock: 5, min: 8, status: 'Atenção' as const },
    { product: 'Monitor LG 24" Full HD', stock: 2, min: 5, status: 'Crítico' as const },
    { product: 'Cadeira ThunderX3', stock: 1, min: 3, status: 'Crítico' as const },
  ],
  receivables: [
    { client: 'Tech Solutions Ltda', value: 15840, due: '15/06/2026' },
    { client: 'Mega Suprimentos', value: 9200, due: '18/06/2026' },
    { client: 'Inova Distribuidora', value: 6450, due: '20/06/2026' },
    { client: 'Global Materiais', value: 12300, due: '25/06/2026' },
  ],
  activities: [
    { icon: ShoppingCartIcon, color: 'var(--nexus-rose)', text: 'Nova venda realizada', detail: '#VDA-1592 - R$ 12.840,00', time: 'Agora' },
    { icon: UserGroupIcon, color: 'var(--nexus-gold)', text: 'Cliente cadastrado', detail: 'Fernanda Lima', time: '5 min' },
    { icon: ShoppingCartIcon, color: 'var(--nexus-muted)', text: 'Compra realizada', detail: 'CMP-2024-984', time: '1h' },
    { icon: ArchiveBoxIcon, color: 'var(--nexus-gold)', text: 'Produto atualizado', detail: 'Teclado Mecânico Redragon', time: '2h' },
    { icon: CurrencyDollarIcon, color: 'var(--nexus-success)', text: 'Pagamento recebido', detail: 'R$ 8.900,00 - Ana Costa', time: '3h' },
  ],
  notifications: [
    { icon: ExclamationCircleIcon, color: 'var(--nexus-danger)', text: 'Estoque baixo', detail: '4 produtos precisam de reposição' },
    { icon: ClockIcon, color: 'var(--nexus-warning)', text: 'Conta vencendo', detail: 'Fatura #FAT-001 vence em 3 dias' },
    { icon: BellIcon, color: 'var(--nexus-gold)', text: 'Mensagem CRM', detail: 'Novo lead qualificado' },
    { icon: CheckCircleIcon, color: 'var(--nexus-success)', text: 'Backup realizado', detail: 'Backup diário concluído' },
    { icon: ArrowUpIcon, color: 'var(--nexus-rose)', text: 'Atualização disponível', detail: 'Nexus v1.2.0 disponível' },
  ],
  executive: {
    totalRevenue: 1248530,
    activeClients: 942,
    conversion: 18.7,
    avgTicket: 1420.35,
  },
};

const MotionCard = motion.div;

/* ── KPI Row ──────────────────────────────────────────────── */
const KpiRow = memo(function KpiRow() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
      <StatsCard label="Clientes" value={mock.kpis.clients.value}
        icon={<UserGroupIcon className="w-5 h-5" />} color="gold"
        trend={{ value: mock.kpis.clients.trend, direction: 'up' }} subtitle="este mês" />
      <StatsCard label="Vendas" value={mock.kpis.sales.value}
        icon={<ShoppingCartIcon className="w-5 h-5" />} color="gold"
        trend={{ value: mock.kpis.sales.trend, direction: 'up' }} subtitle="este mês" />
      <StatsCard label="Receitas" value={mock.kpis.revenue.value}
        icon={<CurrencyDollarIcon className="w-5 h-5" />} color="green"
        trend={{ value: mock.kpis.revenue.trend, direction: 'up' }} subtitle="este mês" />
      <StatsCard label="Lucro Líquido" value={mock.kpis.profit.value}
        icon={<ArrowTrendingUpIcon className="w-5 h-5" />} color="gold"
        trend={{ value: mock.kpis.profit.trend, direction: 'up' }} subtitle="este mês" />
      <StatsCard label="Ticket Médio" value={mock.kpis.avgTicket.value}
        icon={<TagIcon className="w-5 h-5" />} color="blue"
        trend={{ value: mock.kpis.avgTicket.trend, direction: 'up' }} subtitle="este mês" />
    </div>
  );
});

/* ── Section Header ───────────────────────────────────────── */
const SectionHeader = memo(function SectionHeader({ title, link }: { title: string; link?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-semibold" style={{ color: 'var(--nexus-text)' }}>{title}</h2>
      {link && (
        <button className="flex items-center gap-1 text-xs font-medium transition-colors"
          style={{ color: 'var(--nexus-gold)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--nexus-gold-light)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--nexus-gold)'; }}>
          {link}
          <ArrowRightIcon className="w-3 h-3" />
        </button>
      )}
    </div>
  );
});

/* ── Sales Chart (12 months AreaChart) ────────────────────── */
const SalesChart = memo(function SalesChart() {
  return (
    <MotionCard initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }} whileHover={{ y: -2 }}
      className="lg:col-span-2 rounded-2xl p-6 flex flex-col relative overflow-hidden"
      style={cardStyle}>
      <div className="absolute top-0 left-0 w-full h-px" style={{
        background: 'linear-gradient(90deg, transparent, var(--nexus-gold), transparent)',
        opacity: 0.3,
      }} />
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--nexus-text)' }}>Vendas dos últimos 12 meses</h2>
        <div className="relative">
          <select className="appearance-none bg-transparent border rounded-lg px-3 py-1.5 pr-7 text-xs cursor-pointer"
            style={{ borderColor: 'var(--nexus-border)', color: 'var(--nexus-muted)' }}>
            <option>Últimos 12 meses</option>
          </select>
          <CalendarDaysIcon className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--nexus-muted)' }} />
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={mock.sales12months} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--nexus-rose)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--nexus-rose)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--nexus-chart-grid)" />
            <XAxis dataKey="name" axisLine={false} tickLine={false}
              tick={{ fill: 'var(--nexus-muted)', fontSize: 11 }} dy={8} />
            <YAxis axisLine={false} tickLine={false}
              tick={{ fill: 'var(--nexus-muted)', fontSize: 11 }}
              tickFormatter={(v: number) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
            <Tooltip contentStyle={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)', borderRadius: 10, color: 'var(--nexus-text)' }}
              itemStyle={{ color: 'var(--nexus-rose)' }}
              formatter={(v: any) => [fmtBRL(Number(v)), 'Vendas']} />
            <Area type="monotone" dataKey="value" stroke="var(--nexus-rose)" strokeWidth={2.5}
              fill="url(#salesGrad)" activeDot={{ r: 5, fill: 'var(--nexus-rose)', stroke: 'var(--nexus-bg)', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </MotionCard>
  );
});

/* ── Financial Flow (BarChart) ────────────────────────────── */
const FinancialChart = memo(function FinancialChart() {
  return (
    <MotionCard initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }} whileHover={{ y: -2 }}
      className="rounded-2xl p-6 flex flex-col relative overflow-hidden"
      style={cardStyle}>
      <div className="absolute top-0 left-0 w-full h-px" style={{
        background: 'linear-gradient(90deg, transparent, var(--nexus-gold), transparent)',
        opacity: 0.3,
      }} />
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--nexus-text)' }}>Fluxo Financeiro</h2>
        <div className="relative">
          <select className="appearance-none bg-transparent border rounded-lg px-3 py-1.5 pr-7 text-xs cursor-pointer"
            style={{ borderColor: 'var(--nexus-border)', color: 'var(--nexus-muted)' }}>
            <option>Este mês</option>
          </select>
          <CalendarDaysIcon className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--nexus-muted)' }} />
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={mock.financialFlow} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--nexus-chart-grid)" />
            <XAxis dataKey="name" axisLine={false} tickLine={false}
              tick={{ fill: 'var(--nexus-muted)', fontSize: 11 }} dy={8} />
            <YAxis axisLine={false} tickLine={false}
              tick={{ fill: 'var(--nexus-muted)', fontSize: 11 }}
              tickFormatter={(v: number) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
            <Tooltip contentStyle={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)', borderRadius: 10 }}
              formatter={(v: any) => [fmtBRL(Number(v)), '']} />
            <Bar dataKey="receitas" name="Receitas" fill="var(--nexus-success)" radius={[4, 4, 0, 0]} maxBarSize={18} />
            <Bar dataKey="despesas" name="Despesas" fill="var(--nexus-danger)" radius={[4, 4, 0, 0]} maxBarSize={18} />
            <Bar dataKey="lucro" name="Lucro" fill="var(--nexus-gold)" radius={[4, 4, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </MotionCard>
  );
});

/* ── Revenue Donut ─────────────────────────────────────────── */
const CategoryDonut = memo(function CategoryDonut() {
  return (
    <MotionCard initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }} whileHover={{ y: -2 }}
      className="rounded-2xl p-6 flex flex-col relative overflow-hidden"
      style={cardStyle}>
      <div className="absolute top-0 left-0 w-full h-px" style={{
        background: 'linear-gradient(90deg, transparent, var(--nexus-gold), transparent)',
        opacity: 0.3,
      }} />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--nexus-text)' }}>Receita por Categoria</h2>
        <button style={{ color: 'var(--nexus-muted)' }}><EllipsisVerticalIcon className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="relative w-full max-w-[180px]">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={mock.revenueByCategory} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                paddingAngle={3} dataKey="value" stroke="none">
                {mock.revenueByCategory.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)', borderRadius: 10 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-xs font-bold leading-tight text-center" style={{ color: 'var(--nexus-gold)' }}>
              Total<br />{fmtBRL(126430.20)}
            </p>
          </div>
        </div>
        <div className="w-full space-y-2 px-1">
          {mock.revenueByCategory.map((cat, i) => (
            <div key={cat.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                <span style={{ color: 'var(--nexus-muted)' }}>{cat.name}</span>
              </div>
              <span className="font-medium" style={{ color: 'var(--nexus-text)' }}>{cat.raw}</span>
            </div>
          ))}
        </div>
      </div>
    </MotionCard>
  );
});

/* ── Tables ────────────────────────────────────────────────── */
const SalesTable = memo(function SalesTable() {
  const badge = (s: string) => {
    const isOk = s === 'Concluída';
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap"
        style={{
          background: isOk ? 'rgba(var(--nexus-success-rgb),0.12)' : 'rgba(var(--nexus-warning-rgb),0.12)',
          color: isOk ? 'var(--nexus-success)' : 'var(--nexus-warning)',
        }}>
        {isOk ? <CheckCircleIcon className="w-3 h-3" /> : <ClockIcon className="w-3 h-3" />}
        {s}
      </span>
    );
  };

  return (
    <MotionCard initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }} whileHover={{ y: -2 }}
      className="rounded-2xl p-6 flex flex-col relative overflow-hidden"
      style={cardStyle}>
      <div className="absolute top-0 left-0 w-1 h-12 rounded-r" style={{ background: 'var(--nexus-rose)' }} />
      <SectionHeader title="Últimas Vendas" link="Ver todas" />
      <div className="flex-1 overflow-x-auto -mx-6 px-6">
        <table className="w-full text-left text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--nexus-border)' }}>
              {['Pedido', 'Cliente', 'Data', 'Valor', 'Status'].map(h => (
                <th key={h} className="pb-2.5 pr-3 font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--nexus-muted-2)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mock.recentSales.map(s => (
              <tr key={s.id} className="transition-colors" style={{ borderBottom: '1px solid var(--nexus-border)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--nexus-bg-soft)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                <td className="py-2.5 pr-3 font-medium" style={{ color: 'var(--nexus-text)' }}>{s.id}</td>
                <td className="py-2.5 pr-3" style={{ color: 'var(--nexus-muted)' }}>{s.client}</td>
                <td className="py-2.5 pr-3" style={{ color: 'var(--nexus-muted)' }}>{s.date}</td>
                <td className="py-2.5 pr-3 font-medium" style={{ color: 'var(--nexus-text)' }}>{fmtBRL(s.value)}</td>
                <td className="py-2.5">{badge(s.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MotionCard>
  );
});

const NewClientsTable = memo(function NewClientsTable() {
  return (
    <MotionCard initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }} whileHover={{ y: -2 }}
      className="rounded-2xl p-6 flex flex-col relative overflow-hidden"
      style={cardStyle}>
      <div className="absolute top-0 left-0 w-1 h-12 rounded-r" style={{ background: 'var(--nexus-gold)' }} />
      <SectionHeader title="Novos Clientes" link="Ver todas" />
      <div className="flex-1 overflow-x-auto -mx-6 px-6">
        <table className="w-full text-left text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--nexus-border)' }}>
              {['Cliente', 'Cidade', 'Data'].map(h => (
                <th key={h} className="pb-2.5 pr-3 font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--nexus-muted-2)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mock.newClients.map((c, i) => (
              <tr key={i} className="transition-colors" style={{ borderBottom: '1px solid var(--nexus-border)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--nexus-bg-soft)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                <td className="py-2.5 pr-3 font-medium" style={{ color: 'var(--nexus-text)' }}>{c.name}</td>
                <td className="py-2.5 pr-3" style={{ color: 'var(--nexus-muted)' }}>{c.city}</td>
                <td className="py-2.5" style={{ color: 'var(--nexus-muted)' }}>{c.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MotionCard>
  );
});

const LowStockTable = memo(function LowStockTable() {
  const badge = (s: 'Crítico' | 'Atenção') => {
    const isCrit = s === 'Crítico';
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider whitespace-nowrap"
        style={{
          background: isCrit ? 'rgba(var(--nexus-danger-rgb),0.12)' : 'rgba(var(--nexus-warning-rgb),0.12)',
          color: isCrit ? 'var(--nexus-danger)' : 'var(--nexus-warning)',
        }}>
        {s}
      </span>
    );
  };

  return (
    <MotionCard initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }} whileHover={{ y: -2 }}
      className="rounded-2xl p-6 flex flex-col relative overflow-hidden"
      style={cardStyle}>
      <div className="absolute top-0 left-0 w-1 h-12 rounded-r" style={{ background: 'var(--nexus-danger)' }} />
      <SectionHeader title="Estoque Baixo" link="Ver todas" />
      <div className="flex-1 overflow-x-auto -mx-6 px-6">
        <table className="w-full text-left text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--nexus-border)' }}>
              {['Produto', 'Estoque', 'Mínimo', 'Status'].map(h => (
                <th key={h} className="pb-2.5 pr-3 font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--nexus-muted-2)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mock.lowStock.map((p, i) => (
              <tr key={i} className="transition-colors" style={{ borderBottom: '1px solid var(--nexus-border)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--nexus-bg-soft)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                <td className="py-2.5 pr-3 font-medium" style={{ color: 'var(--nexus-text)' }}>{p.product}</td>
                <td className="py-2.5 pr-3" style={{ color: 'var(--nexus-muted)' }}>{p.stock}</td>
                <td className="py-2.5 pr-3" style={{ color: 'var(--nexus-muted)' }}>{p.min}</td>
                <td className="py-2.5">{badge(p.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MotionCard>
  );
});

const ReceivablesTable = memo(function ReceivablesTable() {
  return (
    <MotionCard initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.25 }} whileHover={{ y: -2 }}
      className="rounded-2xl p-6 flex flex-col relative overflow-hidden"
      style={cardStyle}>
      <div className="absolute top-0 left-0 w-1 h-12 rounded-r" style={{ background: 'var(--nexus-success)' }} />
      <SectionHeader title="Contas a Receber" link="Ver todas" />
      <div className="flex-1 overflow-x-auto -mx-6 px-6">
        <table className="w-full text-left text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--nexus-border)' }}>
              {['Cliente', 'Valor', 'Vencimento'].map(h => (
                <th key={h} className="pb-2.5 pr-3 font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--nexus-muted-2)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mock.receivables.map((r, i) => (
              <tr key={i} className="transition-colors" style={{ borderBottom: '1px solid var(--nexus-border)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--nexus-bg-soft)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                <td className="py-2.5 pr-3 font-medium" style={{ color: 'var(--nexus-text)' }}>{r.client}</td>
                <td className="py-2.5 pr-3 font-medium" style={{ color: 'var(--nexus-gold)' }}>{fmtBRL(r.value)}</td>
                <td className="py-2.5" style={{ color: 'var(--nexus-muted)' }}>{r.due}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MotionCard>
  );
});

/* ── Activities Timeline ──────────────────────────────────── */
const ActivitiesTimeline = memo(function ActivitiesTimeline() {
  return (
    <MotionCard initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }} whileHover={{ y: -2 }}
      className="rounded-2xl p-6 flex flex-col relative overflow-hidden"
      style={cardStyle}>
      <div className="absolute top-0 left-0 w-full h-px" style={{
        background: 'linear-gradient(90deg, transparent, var(--nexus-gold), transparent)',
        opacity: 0.3,
      }} />
      <SectionHeader title="Atividades Recentes" link="Ver todas" />
      <div className="flex-1 space-y-0.5">
        {mock.activities.map((a, i) => {
          const Icon = a.icon;
          return (
            <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl transition-all cursor-pointer"
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--nexus-bg-soft)';
                e.currentTarget.style.paddingLeft = '16px';
                e.currentTarget.style.borderLeftColor = a.color;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.paddingLeft = '10px';
                e.currentTarget.style.borderLeftColor = 'transparent';
              }}
              style={{ borderLeft: '3px solid transparent', paddingLeft: '10px' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `rgba(var(--nexus-gold-rgb),0.08)`, color: a.color }}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium" style={{ color: 'var(--nexus-text)' }}>{a.text}</p>
                <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--nexus-muted)' }}>{a.detail}</p>
              </div>
              <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--nexus-muted-2)' }}>{a.time}</span>
            </div>
          );
        })}
      </div>
    </MotionCard>
  );
});

/* ── Notifications Panel ──────────────────────────────────── */
const NotificationsPanel = memo(function NotificationsPanel() {
  return (
    <MotionCard initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }} whileHover={{ y: -2 }}
      className="rounded-2xl p-6 flex flex-col relative overflow-hidden"
      style={cardStyle}>
      <div className="absolute top-0 left-0 w-full h-px" style={{
        background: 'linear-gradient(90deg, transparent, var(--nexus-gold), transparent)',
        opacity: 0.3,
      }} />
      <SectionHeader title="Notificações" link="Ver todas" />
      <div className="flex-1 space-y-0.5">
        {mock.notifications.map((n, i) => {
          const Icon = n.icon;
          return (
            <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl transition-colors cursor-pointer"
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--nexus-bg-soft)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `rgba(var(--nexus-gold-rgb),0.08)`, color: n.color }}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium" style={{ color: 'var(--nexus-text)' }}>{n.text}</p>
                <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--nexus-muted)' }}>{n.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </MotionCard>
  );
});

/* ── Executive Panel ──────────────────────────────────────── */
const ExecutivePanel = memo(function ExecutivePanel() {
  const cards = [
    { label: 'Receita Total', value: fmtBRL(mock.executive.totalRevenue), trend: '+23%', color: 'var(--nexus-gold)' },
    { label: 'Crescimento', value: '+23%', trend: '', color: 'var(--nexus-success)' },
    { label: 'Clientes Ativos', value: '942', trend: '', color: 'var(--nexus-rose)' },
    { label: 'Conversão', value: '18,7%', trend: '', color: 'var(--nexus-chart-blue)' },
    { label: 'Ticket Médio', value: fmtBRL(mock.executive.avgTicket), trend: '', color: 'var(--nexus-bronze)' },
  ];

  return (
    <MotionCard initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.25 }} whileHover={{ y: -2 }}
      className="rounded-2xl p-6 flex flex-col relative overflow-hidden"
      style={cardStyle}>
      <div className="absolute top-0 left-0 w-full h-px" style={{
        background: 'linear-gradient(90deg, transparent, var(--nexus-gold), transparent)',
        opacity: 0.3,
      }} />
      <SectionHeader title="Painel Executivo" />
      <div className="flex-1 grid grid-cols-1 gap-3">
        {cards.map((c, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            className="flex items-center justify-between p-3 rounded-xl"
            style={{ background: 'var(--nexus-bg-soft)', borderLeft: `3px solid transparent` }}
            onMouseEnter={e => { e.currentTarget.style.borderLeftColor = c.color; }}
            onMouseLeave={e => { e.currentTarget.style.borderLeftColor = 'transparent'; }}>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--nexus-muted-2)' }}>{c.label}</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--nexus-text)' }}>{c.value}</p>
            </div>
            {c.trend && (
              <span className="text-xs font-semibold flex items-center gap-0.5" style={{ color: 'var(--nexus-success)' }}>
                <ArrowUpIcon className="w-3 h-3" />{c.trend}
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </MotionCard>
  );
});

/* ── Main Dashboard ────────────────────────────────────────── */
export function Dashboard() {
  return (
    <div className="p-6 space-y-6 min-h-screen bg-transparent">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--nexus-text)' }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--nexus-muted)' }}>Visão geral do seu negócio em tempo real</p>
      </div>

      <KpiRow />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ minHeight: 340 }}>
        <SalesChart />
        <FinancialChart />
        <CategoryDonut />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <SalesTable />
        <NewClientsTable />
        <LowStockTable />
        <ReceivablesTable />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ActivitiesTimeline />
        <NotificationsPanel />
        <ExecutivePanel />
      </div>
    </div>
  );
}
