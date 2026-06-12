import { memo } from 'react';
import { motion } from 'framer-motion';
import {
  UserGroupIcon, ShoppingCartIcon, CurrencyDollarIcon,
  ArrowTrendingUpIcon, TagIcon, BellIcon, CalendarDaysIcon,
  ArrowRightIcon, EllipsisVerticalIcon,
  ArchiveBoxIcon, CheckCircleIcon,
  ClockIcon, ExclamationCircleIcon, ArrowUpIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { StatsCard } from '../../components/ui/StatsCard';

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const PIE_COLORS = [
  'var(--nexus-rose)', 'var(--nexus-gold)',
  'var(--nexus-chart-blue)', 'var(--nexus-chart-purple)',
];

const cardStyle = {
  background: 'var(--nexus-card)',
  border: '1px solid var(--nexus-border)',
  boxShadow: 'var(--nexus-shadow)',
} as const;

const topAccentStyle = {
  background: 'linear-gradient(90deg, transparent, var(--nexus-gold), transparent)',
  opacity: 0.3,
} as const;

const mock = {
  kpis: {
    clients:  { value: '1.250',          trend: '+12,5%', up: true, sparkline: [1000,1050,1020,1100,1150,1200,1250] },
    sales:    { value: 'R$ 84.230,50',   trend: '+18,7%', up: true, sparkline: [60000,65000,62000,70000,75000,80000,84230] },
    revenue:  { value: 'R$ 126.430,20',  trend: '+15,3%', up: true, sparkline: [90000,95000,92000,105000,110000,118000,126430] },
    profit:   { value: 'R$ 28.200,00',   trend: '+11,8%', up: true, sparkline: [20000,21000,20500,24000,25000,26500,28200] },
    avgTicket:{ value: 'R$ 1.420,35',    trend: '+8,2%',  up: true, sparkline: [1200,1250,1220,1300,1350,1380,1420] },
  },
  sales12months: [
    { name: 'Jan', value: 10000 }, { name: 'Fev', value: 35000 },
    { name: 'Mar', value: 34000 }, { name: 'Abr', value: 35000 },
    { name: 'Mai', value: 45000 }, { name: 'Jun', value: 85000 },
    { name: 'Jul', value: 65000 }, { name: 'Ago', value: 60000 },
    { name: 'Set', value: 72000 }, { name: 'Out', value: 62000 },
    { name: 'Nov', value: 58000 }, { name: 'Dez', value: 72000 },
  ],
  financialFlow: [
    { name: 'Semana 1', receitas: 42000, despesas: 28000, lucro: 14000 },
    { name: 'Semana 2', receitas: 58000, despesas: 35000, lucro: 23000 },
    { name: 'Semana 3', receitas: 65000, despesas: 21000, lucro: 44000 },
    { name: 'Semana 4', receitas: 48000, despesas: 39000, lucro: 9000 },
    { name: 'Semana 5', receitas: 62000, despesas: 35000, lucro: 27000 },
  ],
  revenueByCategory: [
    { name: 'Servicos', value: 45, raw: '45%' },
    { name: 'Produtos', value: 30, raw: '30%' },
    { name: 'Assinaturas', value: 15, raw: '15%' },
    { name: 'Outros', value: 10, raw: '10%' },
  ],
  recentSales: [
    { id: '#VEN-2540', client: 'Joao Silva',      date: '05/06/2026', value: 2450,  status: 'Concluida' },
    { id: '#VEN-2539', client: 'Maria Costa',     date: '05/06/2026', value: 1280,  status: 'Concluida' },
    { id: '#VEN-2538', client: 'Roberto Pereira', date: '04/06/2026', value: 3750,  status: 'Concluida' },
    { id: '#VEN-2537', client: 'Ana Ferreira',    date: '04/06/2026', value: 980,   status: 'Pendente' },
    { id: '#VEN-2536', client: 'Carlos Lima',     date: '04/06/2026', value: 1450,  status: 'Concluida' },
  ],
  newClients: [
    { name: 'Juliana Martins',  city: 'Sao Paulo - SP',        date: '05/06/2026' },
    { name: 'Lucas Almeida',    city: 'Rio de Janeiro - RJ',   date: '05/06/2026' },
    { name: 'Fernanda Souza',   city: 'Belo Horizonte - MG',   date: '04/06/2026' },
    { name: 'Bruno Santos',     city: 'Curitiba - PR',         date: '04/06/2026' },
    { name: 'Patricia Oliveira',city: 'Salvador - BA',         date: '03/06/2026' },
  ],
  lowStock: [
    { product: 'Teclado Mecanico',  stock: 3, min: 10, status: 'Critico'  as const },
    { product: 'Mouse Gamer',        stock: 5, min: 15, status: 'Critico'  as const },
    { product: 'Monitor 24"',        stock: 2, min: 8,  status: 'Critico'  as const },
    { product: 'Cadeira Office',     stock: 4, min: 10, status: 'Atencao' as const },
    { product: 'Impressora Laser',   stock: 6, min: 12, status: 'Atencao' as const },
  ],
  receivables: [
    { client: 'Joao Silva',      value: 2450, due: '10/06/2026' },
    { client: 'Maria Costa',     value: 1280, due: '12/06/2026' },
    { client: 'Roberto Pereira', value: 3750, due: '15/06/2026' },
    { client: 'Ana Ferreira',    value: 980,  due: '18/06/2026' },
    { client: 'Carlos Lima',     value: 1450, due: '20/06/2026' },
  ],
  activities: [
    { icon: ShoppingCartIcon,    color: 'var(--nexus-chart-blue)', text: 'Nova venda realizada #VEN-2540',       time: '05/06/2026 14:32' },
    { icon: UserGroupIcon,       color: 'var(--nexus-rose)',       text: 'Cliente cadastrado: Juliana Martins',  time: '05/06/2026 13:10' },
    { icon: ShoppingCartIcon,    color: 'var(--nexus-success)',    text: 'Compra realizada #COM-1530',           time: '05/06/2026 11:45' },
    { icon: ArchiveBoxIcon,      color: 'var(--nexus-gold)',       text: 'Produto atualizado: Teclado Mecanico', time: '05/06/2026 10:20' },
    { icon: CurrencyDollarIcon,  color: 'var(--nexus-success)',    text: 'Pagamento recebido de Joao Silva',     time: '05/06/2026 09:15' },
  ],
  notifications: [
    { icon: ExclamationCircleIcon, color: 'var(--nexus-danger)',      text: 'Estoque baixo: Teclado Mecanico',         time: 'Ha 5 minutos' },
    { icon: ClockIcon,             color: 'var(--nexus-warning)',     text: 'Conta a receber vencendo: Joao Silva',    time: 'Ha 1 hora' },
    { icon: BellIcon,              color: 'var(--nexus-chart-blue)',  text: 'Nova mensagem de Ana Beatriz no CRM',     time: 'Ha 2 horas' },
    { icon: CheckCircleIcon,       color: 'var(--nexus-success)',     text: 'Backup realizado com sucesso',            time: 'Ha 3 horas' },
    { icon: ArrowUpIcon,           color: 'var(--nexus-chart-blue)', text: 'Atualizacao do sistema disponivel',       time: 'Ha 5 horas' },
  ],
  executive: {
    totalRevenue: 1248530,
    growth: '+23%',
    activeClients: 942,
    conversion: '18,7%',
    avgTicket: 1420.35,
  },
};

const MotionCard = motion.div;

/* ── KPI Row ────────────────────────────────────────────── */
const KpiRow = memo(function KpiRow() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      <StatsCard label="Clientes" value={mock.kpis.clients.value}
        icon={<UserGroupIcon className="w-4 h-4" />} color="gold"
        trend={{ value: mock.kpis.clients.trend, direction: 'up' }} subtitle="este mes"
        sparklineData={mock.kpis.clients.sparkline} />
      <StatsCard label="Vendas" value={mock.kpis.sales.value}
        icon={<ShoppingCartIcon className="w-4 h-4" />} color="rose"
        trend={{ value: mock.kpis.sales.trend, direction: 'up' }} subtitle="este mes"
        sparklineData={mock.kpis.sales.sparkline} />
      <StatsCard label="Receitas" value={mock.kpis.revenue.value}
        icon={<CurrencyDollarIcon className="w-4 h-4" />} color="gold"
        trend={{ value: mock.kpis.revenue.trend, direction: 'up' }} subtitle="este mes"
        sparklineData={mock.kpis.revenue.sparkline} />
      <StatsCard label="Lucro Liquido" value={mock.kpis.profit.value}
        icon={<ArrowTrendingUpIcon className="w-4 h-4" />} color="rose"
        trend={{ value: mock.kpis.profit.trend, direction: 'up' }} subtitle="este mes"
        sparklineData={mock.kpis.profit.sparkline} />
      <StatsCard label="Ticket Medio" value={mock.kpis.avgTicket.value}
        icon={<TagIcon className="w-4 h-4" />} color="gold"
        trend={{ value: mock.kpis.avgTicket.trend, direction: 'up' }} subtitle="este mes"
        sparklineData={mock.kpis.avgTicket.sparkline} />
    </div>
  );
});

/* ── Section Header ─────────────────────────────────────── */
const SectionHeader = memo(function SectionHeader({ title, link }: { title: string; link?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold" style={{ color: 'var(--nexus-text)' }}>{title}</h2>
      {link && (
        <button className="flex items-center gap-1 text-xs font-medium transition-colors whitespace-nowrap"
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

/* ── Custom Tooltip ─────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--nexus-card-strong)', border: '1px solid var(--nexus-border)', borderRadius: 8, padding: '8px 12px' }}>
      <p style={{ color: 'var(--nexus-muted)', fontSize: 11, marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color, fontSize: 12, fontWeight: 600 }}>
          {p.name}: {typeof p.value === 'number' && p.value > 999 ? fmtBRL(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

/* ── Sales Chart (12 months AreaChart) ──────────────────── */
const SalesChart = memo(function SalesChart() {
  return (
    <MotionCard initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }} whileHover={{ y: -2 }}
      className="rounded-2xl p-5 flex flex-col relative overflow-hidden h-full"
      style={cardStyle}>
      <div className="absolute top-0 left-0 w-full h-px" style={topAccentStyle} />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--nexus-text)' }}>Vendas dos ultimos 12 meses</h2>
        <div className="relative">
          <select className="appearance-none border rounded-lg px-3 py-1 pr-7 text-xs cursor-pointer"
            style={{ borderColor: 'var(--nexus-border)', color: 'var(--nexus-muted)', background: 'var(--nexus-bg-soft)' }}>
            <option style={{ background: 'var(--nexus-bg)', color: 'var(--nexus-text)' }}>Ultimos 12 meses</option>
          </select>
          <CalendarDaysIcon className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--nexus-muted)' }} />
        </div>
      </div>
      <div className="flex-1" style={{ minHeight: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={mock.sales12months} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--nexus-rose)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--nexus-rose)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--nexus-chart-grid)" />
            <XAxis dataKey="name" axisLine={false} tickLine={false}
              tick={{ fill: 'var(--nexus-muted)', fontSize: 11 }} dy={8} />
            <YAxis axisLine={false} tickLine={false}
              tick={{ fill: 'var(--nexus-muted)', fontSize: 11 }}
              tickFormatter={(v: number) => `${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="value" name="Vendas" stroke="var(--nexus-rose)" strokeWidth={2}
              fill="url(#salesGrad)" dot={false}
              activeDot={{ r: 4, fill: 'var(--nexus-rose)', stroke: 'var(--nexus-bg)', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </MotionCard>
  );
});

/* ── Financial Flow (BarChart) ──────────────────────────── */
const FinancialChart = memo(function FinancialChart() {
  const legendItems = [
    { key: 'receitas', label: 'Receitas', color: 'var(--nexus-success)' },
    { key: 'despesas', label: 'Despesas', color: 'var(--nexus-danger)' },
    { key: 'lucro',    label: 'Lucro',    color: 'var(--nexus-gold)' },
  ];
  return (
    <MotionCard initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }} whileHover={{ y: -2 }}
      className="rounded-2xl p-5 flex flex-col relative overflow-hidden h-full"
      style={cardStyle}>
      <div className="absolute top-0 left-0 w-full h-px" style={topAccentStyle} />
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--nexus-text)' }}>Fluxo Financeiro</h2>
        <div className="relative">
          <select className="appearance-none border rounded-lg px-3 py-1 pr-7 text-xs cursor-pointer"
            style={{ borderColor: 'var(--nexus-border)', color: 'var(--nexus-muted)', background: 'var(--nexus-bg-soft)' }}>
            <option style={{ background: 'var(--nexus-bg)', color: 'var(--nexus-text)' }}>Este mes</option>
          </select>
          <CalendarDaysIcon className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--nexus-muted)' }} />
        </div>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 mb-3">
        {legendItems.map(l => (
          <div key={l.key} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
            <span className="text-[10px]" style={{ color: 'var(--nexus-muted)' }}>{l.label}</span>
          </div>
        ))}
      </div>
      <div className="flex-1" style={{ minHeight: 170 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={mock.financialFlow} margin={{ top: 6, right: 6, left: -18, bottom: 0 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--nexus-chart-grid)" />
            <XAxis dataKey="name" axisLine={false} tickLine={false}
              tick={{ fill: 'var(--nexus-muted)', fontSize: 10 }} dy={8} />
            <YAxis axisLine={false} tickLine={false}
              tick={{ fill: 'var(--nexus-muted)', fontSize: 10 }}
              tickFormatter={(v: number) => `${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="receitas" name="Receitas" fill="var(--nexus-success)" radius={[3, 3, 0, 0]} maxBarSize={14} />
            <Bar dataKey="despesas" name="Despesas" fill="var(--nexus-danger)"  radius={[3, 3, 0, 0]} maxBarSize={14} />
            <Bar dataKey="lucro"    name="Lucro"    fill="var(--nexus-gold)"    radius={[3, 3, 0, 0]} maxBarSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </MotionCard>
  );
});

/* ── Revenue Donut ──────────────────────────────────────── */
const CategoryDonut = memo(function CategoryDonut() {
  return (
    <MotionCard initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }} whileHover={{ y: -2 }}
      className="rounded-2xl p-5 flex flex-col relative overflow-hidden h-full"
      style={cardStyle}>
      <div className="absolute top-0 left-0 w-full h-px" style={topAccentStyle} />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--nexus-text)' }}>Receita por Categoria</h2>
        <button style={{ color: 'var(--nexus-muted)' }}><EllipsisVerticalIcon className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 flex flex-col items-center gap-3">
        <div className="relative w-full" style={{ height: 150 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={mock.revenueByCategory} cx="50%" cy="50%" innerRadius={45} outerRadius={68}
                paddingAngle={3} dataKey="value" stroke="none">
                {mock.revenueByCategory.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--nexus-card-strong)', border: '1px solid var(--nexus-border)', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--nexus-muted)' }}>Total</span>
            <span className="text-xs font-bold" style={{ color: 'var(--nexus-text)' }}>{fmtBRL(126430.20)}</span>
          </div>
        </div>
        <div className="w-full space-y-2">
          {mock.revenueByCategory.map((cat, i) => (
            <div key={cat.name} className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                <span style={{ color: 'var(--nexus-muted)' }}>{cat.name}</span>
              </div>
              <span className="font-semibold" style={{ color: 'var(--nexus-text)' }}>{cat.raw}</span>
            </div>
          ))}
        </div>
      </div>
    </MotionCard>
  );
});

/* ── Tables ─────────────────────────────────────────────── */
const SalesTable = memo(function SalesTable() {
  const badge = (s: string) => {
    const isOk = s === 'Concluida';
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap"
        style={{
          background: isOk ? 'rgba(125,218,106,0.12)' : 'rgba(216,154,40,0.12)',
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
      className="rounded-2xl p-5 flex flex-col relative overflow-hidden"
      style={cardStyle}>
      <div className="absolute top-0 left-0 w-full h-px" style={topAccentStyle} />
      <SectionHeader title="Ultimas Vendas" link="Ver todas" />
      <div className="flex-1">
        <table className="w-full text-left" style={{ fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--nexus-border)' }}>
              {['Pedido', 'Cliente', 'Data', 'Valor', 'Status'].map(h => (
                <th key={h} className="pb-2 pr-2 font-semibold uppercase tracking-wider whitespace-normal break-words"
                  style={{ color: 'var(--nexus-muted-2)', fontSize: 10 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mock.recentSales.map(s => (
              <tr key={s.id} className="transition-colors" style={{ borderBottom: '1px solid var(--nexus-border)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--nexus-bg-soft)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                <td className="py-2 pr-2 font-medium whitespace-normal break-words" style={{ color: 'var(--nexus-text)' }}>{s.id}</td>
                <td className="py-2 pr-2 whitespace-normal break-words" style={{ color: 'var(--nexus-muted)' }}>{s.client}</td>
                <td className="py-2 pr-2 whitespace-normal break-words" style={{ color: 'var(--nexus-muted)' }}>{s.date}</td>
                <td className="py-2 pr-2 font-medium whitespace-normal break-words" style={{ color: 'var(--nexus-text)' }}>{fmtBRL(s.value)}</td>
                <td className="py-2 whitespace-normal break-words">{badge(s.status)}</td>
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
      className="rounded-2xl p-5 flex flex-col relative overflow-hidden"
      style={cardStyle}>
      <div className="absolute top-0 left-0 w-full h-px" style={topAccentStyle} />
      <SectionHeader title="Novos Clientes" link="Ver todas" />
      <div className="flex-1">
        <table className="w-full text-left" style={{ fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--nexus-border)' }}>
              {['Cliente', 'Cidade', 'Data'].map(h => (
                <th key={h} className="pb-2 pr-2 font-semibold uppercase tracking-wider whitespace-normal break-words"
                  style={{ color: 'var(--nexus-muted-2)', fontSize: 10 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mock.newClients.map((c, i) => (
              <tr key={i} className="transition-colors" style={{ borderBottom: '1px solid var(--nexus-border)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--nexus-bg-soft)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                <td className="py-2 pr-2 font-medium whitespace-normal break-words" style={{ color: 'var(--nexus-text)' }}>{c.name}</td>
                <td className="py-2 pr-2 whitespace-normal break-words" style={{ color: 'var(--nexus-muted)' }}>{c.city}</td>
                <td className="py-2 whitespace-normal break-words" style={{ color: 'var(--nexus-muted)' }}>{c.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MotionCard>
  );
});

const LowStockTable = memo(function LowStockTable() {
  const badge = (s: 'Critico' | 'Atencao') => {
    const isCrit = s === 'Critico';
    return (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
        style={{
          background: isCrit ? 'rgba(216,75,95,0.12)' : 'rgba(216,154,40,0.12)',
          color: isCrit ? 'var(--nexus-danger)' : 'var(--nexus-warning)',
        }}>
        {s === 'Critico' ? 'Critico' : 'Atencao'}
      </span>
    );
  };
  return (
    <MotionCard initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }} whileHover={{ y: -2 }}
      className="rounded-2xl p-5 flex flex-col relative overflow-hidden"
      style={cardStyle}>
      <div className="absolute top-0 left-0 w-full h-px" style={topAccentStyle} />
      <SectionHeader title="Estoque Baixo" link="Ver todas" />
      <div className="flex-1">
        <table className="w-full text-left" style={{ fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--nexus-border)' }}>
              {['Produto', 'Estoque', 'Minimo', 'Status'].map(h => (
                <th key={h} className="pb-2 pr-2 font-semibold uppercase tracking-wider whitespace-normal break-words"
                  style={{ color: 'var(--nexus-muted-2)', fontSize: 10 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mock.lowStock.map((p, i) => (
              <tr key={i} className="transition-colors" style={{ borderBottom: '1px solid var(--nexus-border)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--nexus-bg-soft)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                <td className="py-2 pr-2 font-medium whitespace-normal break-words" style={{ color: 'var(--nexus-text)' }}>{p.product}</td>
                <td className="py-2 pr-2 font-bold whitespace-normal break-words" style={{ color: 'var(--nexus-danger)' }}>{p.stock}</td>
                <td className="py-2 pr-2 whitespace-normal break-words" style={{ color: 'var(--nexus-muted)' }}>{p.min}</td>
                <td className="py-2 whitespace-normal break-words">{badge(p.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MotionCard>
  );
});

const ReceivablesTable = memo(function ReceivablesTable() {
  const isDue = (due: string) => {
    const parts = due.split('/');
    const dueDate = new Date(+parts[2], +parts[1] - 1, +parts[0]);
    const today = new Date();
    const diff = (dueDate.getTime() - today.getTime()) / 86400000;
    return diff < 3;
  };
  return (
    <MotionCard initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.25 }} whileHover={{ y: -2 }}
      className="rounded-2xl p-5 flex flex-col relative overflow-hidden"
      style={cardStyle}>
      <div className="absolute top-0 left-0 w-full h-px" style={topAccentStyle} />
      <SectionHeader title="Contas a Receber" link="Ver todas" />
      <div className="flex-1">
        <table className="w-full text-left" style={{ fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--nexus-border)' }}>
              {['Cliente', 'Valor', 'Vencimento'].map(h => (
                <th key={h} className="pb-2 pr-2 font-semibold uppercase tracking-wider whitespace-normal break-words"
                  style={{ color: 'var(--nexus-muted-2)', fontSize: 10 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mock.receivables.map((r, i) => (
              <tr key={i} className="transition-colors" style={{ borderBottom: '1px solid var(--nexus-border)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--nexus-bg-soft)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                <td className="py-2 pr-2 font-medium whitespace-normal break-words" style={{ color: 'var(--nexus-text)' }}>{r.client}</td>
                <td className="py-2 pr-2 font-medium whitespace-normal break-words" style={{ color: 'var(--nexus-text)' }}>{fmtBRL(r.value)}</td>
                <td className="py-2 font-semibold whitespace-normal break-words" style={{ color: isDue(r.due) ? 'var(--nexus-danger)' : 'var(--nexus-warning)' }}>{r.due}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MotionCard>
  );
});

/* ── Activities Timeline ─────────────────────────────────── */
const ActivitiesTimeline = memo(function ActivitiesTimeline() {
  return (
    <MotionCard initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }} whileHover={{ y: -2 }}
      className="rounded-2xl p-5 flex flex-col relative overflow-hidden h-full"
      style={cardStyle}>
      <div className="absolute top-0 left-0 w-full h-px" style={topAccentStyle} />
      <SectionHeader title="Atividades Recentes" />
      <div className="flex-1 space-y-3">
        {mock.activities.map((a, i) => {
          const Icon = a.icon;
          return (
            <div key={i} className="flex items-center justify-between gap-3 cursor-pointer">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ border: `1.5px solid ${a.color}`, color: a.color }}>
                  <Icon className="w-3 h-3" />
                </div>
                <p className="text-xs font-medium truncate" style={{ color: 'var(--nexus-text)' }}>{a.text}</p>
              </div>
              <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--nexus-muted-2)' }}>{a.time}</span>
            </div>
          );
        })}
      </div>
    </MotionCard>
  );
});

/* ── Notifications Panel ─────────────────────────────────── */
const NotificationsPanel = memo(function NotificationsPanel() {
  return (
    <MotionCard initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }} whileHover={{ y: -2 }}
      className="rounded-2xl p-5 flex flex-col relative overflow-hidden h-full"
      style={cardStyle}>
      <div className="absolute top-0 left-0 w-full h-px" style={topAccentStyle} />
      <SectionHeader title="Notificacoes" link="Ver todas" />
      <div className="flex-1 space-y-3">
        {mock.notifications.map((n, i) => {
          const Icon = n.icon;
          return (
            <div key={i} className="flex items-center justify-between gap-3 cursor-pointer">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: n.color, color: '#fff' }}>
                  <Icon className="w-3 h-3" />
                </div>
                <p className="text-xs font-medium truncate" style={{ color: 'var(--nexus-text)' }}>{n.text}</p>
              </div>
              <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--nexus-muted-2)' }}>{n.time}</span>
            </div>
          );
        })}
      </div>
    </MotionCard>
  );
});

/* ── Executive Panel ─────────────────────────────────────── */
const ExecutivePanel = memo(function ExecutivePanel() {
  const cards = [
    { label: 'Receita Total',   value: 'R$ 1.248.530,00', sub: '+23% vs mes anterior', color: 'var(--nexus-gold)',        icon: CurrencyDollarIcon },
    { label: 'Crescimento',     value: '+23%',            sub: 'vs mes anterior',       color: 'var(--nexus-success)',     icon: ArrowTrendingUpIcon },
    { label: 'Clientes Ativos', value: '942',             sub: '+18% vs mes anterior',  color: 'var(--nexus-rose)',        icon: UsersIcon },
    { label: 'Conversao',       value: '18,7%',           sub: '+5% vs mes anterior',   color: 'var(--nexus-chart-blue)', icon: ArrowUpIcon },
    { label: 'Ticket Medio',    value: 'R$ 1.420,35',     sub: '+8,2% vs mes anterior', color: 'var(--nexus-gold)',       icon: TagIcon },
  ];
  return (
    <MotionCard initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.25 }} whileHover={{ y: -2 }}
      className="rounded-2xl p-5 flex flex-col relative overflow-hidden h-full"
      style={cardStyle}>
      <div className="absolute top-0 left-0 w-full h-px" style={topAccentStyle} />
      <SectionHeader title="Painel Executivo" />
      <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-3">
        {cards.map((c, i) => {
          const Icon = c.icon;
          const valSize = c.value.length > 10 ? 'text-sm' : 'text-base';
          return (
            <motion.div key={i}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex flex-col items-center justify-center p-3 rounded-xl text-center gap-1"
              style={{ background: 'var(--nexus-bg-soft)', border: '1px solid var(--nexus-border)' }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-1"
                style={{ background: 'rgba(212,149,86,0.10)', color: 'var(--nexus-gold)' }}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--nexus-muted)' }}>{c.label}</p>
              <p className={`${valSize} font-bold leading-tight`} style={{ color: 'var(--nexus-text)' }}>{c.value}</p>
              <span className="text-[10px] font-semibold" style={{ color: c.color }}>{c.sub}</span>
            </motion.div>
          );
        })}
      </div>
    </MotionCard>
  );
});

/* ── Main Dashboard ──────────────────────────────────────── */
export function Dashboard() {
  return (
    <div className="p-5 space-y-5 bg-transparent">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--nexus-text)' }}>Dashboard</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--nexus-muted)' }}>Visao geral do seu negocio em tempo real</p>
      </div>

      {/* KPI Row */}
      <KpiRow />

      {/* Charts row: 2cols SalesChart | 1col FinancialChart | 1col CategoryDonut */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ minHeight: 280 }}>
        <div className="lg:col-span-2 flex flex-col">
          <SalesChart />
        </div>
        <div className="lg:col-span-1 flex flex-col">
          <FinancialChart />
        </div>
        <div className="lg:col-span-1 flex flex-col">
          <CategoryDonut />
        </div>
      </div>

      {/* Data tables row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <SalesTable />
        <NewClientsTable />
        <LowStockTable />
        <ReceivablesTable />
      </div>

      {/* Bottom row: Activities | Notifications | Executive Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1 flex flex-col">
          <ActivitiesTimeline />
        </div>
        <div className="lg:col-span-1 flex flex-col">
          <NotificationsPanel />
        </div>
        <div className="lg:col-span-2 flex flex-col">
          <ExecutivePanel />
        </div>
      </div>

    </div>
  );
}
