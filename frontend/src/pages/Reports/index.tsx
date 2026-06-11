import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import {
  ArrowDownTrayIcon, CalendarIcon, EyeIcon, EllipsisVerticalIcon,
  CurrencyDollarIcon, ShoppingCartIcon, ArchiveBoxIcon, UserGroupIcon,
  ChevronRightIcon, ChevronLeftIcon, ChartBarIcon, TruckIcon
} from '@heroicons/react/24/outline';

/* ─── helpers ──────────────────────────────────────────── */
const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const PIE_COLORS = [
  'var(--nexus-rose)', 'var(--nexus-gold)', 'var(--nexus-bronze)', 'var(--nexus-muted)', 'var(--nexus-muted-2)'
];

/* ─── component ────────────────────────────────────────── */
export function Reports() {
  const [page, setPage] = useState(1);

  // Fake Area Chart Data
  const areaData = [
    { label: '01 Mai', value: 18000 },
    { label: '06 Mai', value: 34000 },
    { label: '11 Mai', value: 26000 },
    { label: '16 Mai', value: 46000 },
    { label: '21 Mai', value: 32000 },
    { label: '26 Mai', value: 24000 },
    { label: '31 Mai', value: 42000 },
    { label: '05 Jun', value: 58000 },
    { label: '10 Jun', value: 38000 },
    { label: '15 Jun', value: 54000 },
    { label: '20 Jun', value: 51000 },
    { label: '25 Jun', value: 72000 },
  ];

  // Fake Pie Data
  const pieData = [
    { name: 'Eletrônicos', value: 45680.50, pct: 36, color: 'var(--nexus-rose)' },
    { name: 'Informática', value: 32450.00, pct: 26, color: 'var(--nexus-gold)' },
    { name: 'Móveis', value: 21780.00, pct: 17, color: 'var(--nexus-bronze)' },
    { name: 'Acessórios', value: 15320.00, pct: 12, color: 'var(--nexus-muted)' },
    { name: 'Outros', value: 11199.70, pct: 9, color: 'var(--nexus-muted-2)' },
  ];

  // Sparkline data
  const spark1 = [{v:10},{v:15},{v:12},{v:18},{v:16},{v:22},{v:19},{v:25},{v:22},{v:28}];
  const spark2 = [{v:5},{v:12},{v:9},{v:16},{v:13},{v:20},{v:18},{v:22},{v:15},{v:20}];
  const spark3 = [{v:5},{v:8},{v:6},{v:10},{v:13},{v:11},{v:18},{v:14},{v:22},{v:25}];
  const spark4 = [{v:8},{v:10},{v:12},{v:11},{v:16},{v:15},{v:19},{v:22},{v:20},{v:28}];
  const spark5 = [{v:12},{v:10},{v:18},{v:15},{v:22},{v:20},{v:28},{v:25},{v:30},{v:35}];

  return (
    <div className="p-6 space-y-6" style={{ background: 'var(--nexus-bg)' }}>

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-[28px] font-medium" style={{ color: 'var(--nexus-text)' }}>Relatórios</h1>
            <p className="text-[13px] mt-1" style={{ color: 'var(--nexus-muted)' }}>Análises e relatórios detalhados do seu negócio</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border cursor-pointer transition-colors"
              style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)', color: 'var(--nexus-muted)' }}>
              <CalendarIcon className="w-4 h-4" />
              <span>01/05/2024 - 31/05/2024</span>
              <ChevronRightIcon className="w-3 h-3 rotate-90" />
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all hover:bg-black/5 dark:hover:bg-white/5"
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
        className="grid grid-cols-5 gap-3 lg:gap-4"
      >
        {[
          { label: 'Faturamento Total', value: 'R$ 126.430,20', icon: <CurrencyDollarIcon className="w-4 h-4 lg:w-5 lg:h-5" />, change: '↑ 15,3% em relação ao período anterior', spark: spark1 },
          { label: 'Total de Vendas', value: '215', icon: <ShoppingCartIcon className="w-4 h-4 lg:w-5 lg:h-5" />, change: '↑ 12,8% em relação ao período anterior', spark: spark2 },
          { label: 'Total de Compras', value: '98', icon: <ArchiveBoxIcon className="w-4 h-4 lg:w-5 lg:h-5" />, change: '↑ 8,6% em relação ao período anterior', spark: spark3 },
          { label: 'Novos Clientes', value: '32', icon: <UserGroupIcon className="w-4 h-4 lg:w-5 lg:h-5" />, change: '↑ 23,4% em relação ao período anterior', spark: spark4 },
          { label: 'Produtos Vendidos', value: '1.430', icon: <ArchiveBoxIcon className="w-4 h-4 lg:w-5 lg:h-5" />, change: '↑ 17,2% em relação ao período anterior', spark: spark5 },
        ].map((kpi, i) => (
          <div key={i} className="rounded-2xl border overflow-hidden flex flex-col"
            style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)' }}>
            <div className="p-4 lg:p-5 flex-1 min-w-0">
              <div className="flex items-center gap-2 lg:gap-3 min-w-0 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border"
                  style={{ background: 'var(--nexus-bg-soft)', borderColor: 'var(--nexus-border)', color: 'var(--nexus-gold)' }}>
                  {kpi.icon}
                </div>
                <span className="text-[11px] lg:text-[13px] font-medium truncate" style={{ color: 'var(--nexus-muted)' }}>{kpi.label}</span>
              </div>
              <div className="min-w-0 mb-1">
                <span className="text-[16px] xl:text-[20px] 2xl:text-[24px] font-semibold tracking-tight truncate block" style={{ color: 'var(--nexus-text)' }}>{kpi.value}</span>
              </div>
              <div className="min-w-0">
                <span className="text-[9px] lg:text-[10px] font-medium truncate block" style={{ color: 'var(--nexus-success)' }}>
                  {kpi.change}
                </span>
              </div>
            </div>
            {/* Sparkline */}
            <div className="h-10 w-full mt-auto opacity-80" style={{ filter: `drop-shadow(0 4px 6px rgba(0,0,0,0.1))` }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={kpi.spark} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <Line type="monotone" dataKey="v" stroke="var(--nexus-rose)" strokeWidth={2} dot={{ r: 2, fill: 'var(--nexus-rose)', strokeWidth: 0 }} activeDot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Charts Row ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-4"
      >
        {/* Faturamento por período */}
        <div className="rounded-2xl p-6 border flex flex-col"
          style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)', minHeight: '380px' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[15px] font-medium" style={{ color: 'var(--nexus-text)' }}>Faturamento por período</h2>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border cursor-pointer"
              style={{ borderColor: 'var(--nexus-border)', color: 'var(--nexus-muted)' }}>
              Diário
              <ChevronRightIcon className="w-3 h-3 rotate-90" />
            </div>
          </div>
          
          <div className="flex-1 min-h-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--nexus-rose)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--nexus-rose)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" axisLine={false} tickLine={false}
                  tick={{ fill: 'var(--nexus-muted)', fontSize: 10 }} dy={10} 
                  interval="preserveStartEnd" minTickGap={20} />
                <YAxis axisLine={false} tickLine={false}
                  tick={{ fill: 'var(--nexus-muted)', fontSize: 10 }}
                  tickFormatter={(v) => `R$ ${v >= 1000 ? `${v / 1000}k` : v}`} />
                <Tooltip
                  contentStyle={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)', borderRadius: 8, color: 'var(--nexus-text)', fontSize: 12 }}
                  formatter={(v: any) => fmtBRL(v)} />
                <Area type="monotone" dataKey="value" stroke="var(--nexus-rose)" strokeWidth={3}
                  fillOpacity={1} fill="url(#colorValue)" 
                  activeDot={{ r: 6, fill: 'var(--nexus-rose)', stroke: 'var(--nexus-bg)', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Faturamento por categoria */}
        <div className="rounded-2xl p-6 border flex flex-col"
          style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)', minHeight: '380px' }}>
          <h2 className="text-[15px] font-medium mb-6" style={{ color: 'var(--nexus-text)' }}>Faturamento por categoria</h2>

          <div className="flex-1 flex items-center">
            <div className="w-[180px] h-[180px] flex-shrink-0 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85}
                    paddingAngle={0} dataKey="value" stroke="none"
                    labelLine={false}
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, pct }) => {
                      const rad = Math.PI / 180;
                      const r = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + r * Math.cos(-midAngle * rad);
                      const y = cy + r * Math.sin(-midAngle * rad);
                      return <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11}>{pct}%</text>;
                    }}>
                    {pieData.map((item, idx) => (
                      <Cell key={idx} fill={item.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 ml-6 space-y-4">
              {pieData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                    <div>
                      <p className="text-[13px] font-medium" style={{ color: 'var(--nexus-text)' }}>{item.name}</p>
                      <p className="text-[11px]" style={{ color: 'var(--nexus-muted)' }}>{fmtBRL(item.value)}</p>
                    </div>
                  </div>
                  <span className="text-[13px] font-medium" style={{ color: 'var(--nexus-text)' }}>{item.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Table + Sidebar Row ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="grid grid-cols-1 lg:grid-cols-[70%_30%] gap-4"
      >
        {/* Relatórios disponíveis */}
        <div className="rounded-2xl border overflow-hidden flex flex-col"
          style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)', minHeight: '400px' }}>
          <div className="px-6 py-5">
            <h2 className="text-[15px] font-medium" style={{ color: 'var(--nexus-text)' }}>Relatórios disponíveis</h2>
          </div>
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="grid grid-cols-[minmax(200px,1fr)_minmax(250px,1fr)_120px_140px_100px] gap-4 px-6 py-3" style={{ borderBottom: '1px solid var(--nexus-border)' }}>
              {['Relatório','Descrição','Categoria','Última geração','Ações'].map(h => (
                <div key={h} className="text-[11px] font-medium" style={{ color: 'var(--nexus-muted)' }}>{h}</div>
              ))}
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto">
              {[
                { name: 'Relatório de Vendas', desc: 'Análise completa de vendas por período, produtos e clientes', cat: 'Vendas', catColor: 'var(--nexus-rose)', date: '31/05/2024 08:45', icon: <ChartBarIcon className="w-4 h-4"/> },
                { name: 'Relatório de Compras', desc: 'Análise de compras, fornecedores e custos', cat: 'Compras', catColor: 'var(--nexus-gold)', date: '31/05/2024 08:30', icon: <ShoppingCartIcon className="w-4 h-4"/> },
                { name: 'Relatório Financeiro', desc: 'Receitas, despesas, lucros e fluxo de caixa', cat: 'Financeiro', catColor: 'var(--nexus-danger)', date: '31/05/2024 08:15', icon: <CurrencyDollarIcon className="w-4 h-4"/> },
                { name: 'Relatório de Estoque', desc: 'Movimentações, produtos e níveis de estoque', cat: 'Estoque', catColor: 'var(--nexus-gold)', date: '31/05/2024 08:00', icon: <ArchiveBoxIcon className="w-4 h-4"/> },
                { name: 'Relatório de Clientes', desc: 'Análise de clientes, cadastros e vendas', cat: 'Clientes', catColor: 'var(--nexus-rose)', date: '30/05/2024 17:40', icon: <UserGroupIcon className="w-4 h-4"/> },
              ].map((t, i) => (
                <div key={i}
                  className="grid grid-cols-[minmax(200px,1fr)_minmax(250px,1fr)_120px_140px_100px] gap-4 px-6 py-4 items-center transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ borderBottom: '1px solid var(--nexus-border)' }}>
                  
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--nexus-bg-soft)', color: t.catColor }}>
                      {t.icon}
                    </div>
                    <span className="text-[13px] font-medium truncate" style={{ color: 'var(--nexus-muted)' }}>{t.name}</span>
                  </div>
                  
                  <div className="text-[12px] truncate" style={{ color: 'var(--nexus-muted)' }}>{t.desc}</div>
                  
                  <div>
                    <span className="inline-flex px-2.5 py-1 rounded-[6px] text-[10px] font-medium"
                      style={{ background: 'var(--nexus-bg-soft)', color: t.catColor, border: `1px solid var(--nexus-border)` }}>
                      {t.cat}
                    </span>
                  </div>
                  
                  <div className="text-[12px]" style={{ color: 'var(--nexus-muted)' }}>{t.date}</div>
                  
                  <div className="flex items-center gap-1">
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                      style={{ color: 'var(--nexus-gold)' }}>
                      <EyeIcon className="w-4 h-4" />
                    </button>
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                      style={{ color: 'var(--nexus-gold)' }}>
                      <ArrowDownTrayIcon className="w-4 h-4" />
                    </button>
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                      style={{ color: 'var(--nexus-muted)' }}>
                      <EllipsisVerticalIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 mt-auto">
            <p className="text-[12px]" style={{ color: 'var(--nexus-muted)' }}>
              Mostrando 1 a 5 de 12 relatórios
            </p>
            <div className="flex items-center gap-1.5">
              <button disabled className="w-8 h-8 rounded-lg flex items-center justify-center border disabled:opacity-30 transition-colors"
                style={{ color: 'var(--nexus-text)', background: 'var(--nexus-bg)', borderColor: 'var(--nexus-border)' }}>
                1
              </button>
              {[2, 3, '...'].map((p, i) =>
                p === '...' ? (
                  <span key={i} className="w-8 h-8 flex items-center justify-center text-[12px]" style={{ color: 'var(--nexus-muted)' }}>…</span>
                ) : (
                  <button key={i} className="w-8 h-8 rounded-lg flex items-center justify-center text-[12px] transition-colors"
                    style={{ background: 'transparent', color: 'var(--nexus-muted)' }}>
                    {p}
                  </button>
                )
              )}
              <button className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors"
                style={{ color: 'var(--nexus-text)', background: 'var(--nexus-bg)', borderColor: 'var(--nexus-border)' }}>
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Relatórios rápidos */}
        <div className="rounded-2xl p-6 border flex flex-col" style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)' }}>
          <h3 className="text-[15px] font-medium mb-6" style={{ color: 'var(--nexus-text)' }}>Relatórios rápidos</h3>
          
          <div className="flex-1 space-y-1 mb-6">
            {[
              { name: 'Vendas por período', icon: <ChartBarIcon className="w-4 h-4" /> },
              { name: 'Vendas por produto', icon: <ChartBarIcon className="w-4 h-4" /> },
              { name: 'Vendas por cliente', icon: <UserGroupIcon className="w-4 h-4" /> },
              { name: 'Compras por fornecedor', icon: <TruckIcon className="w-4 h-4" /> },
              { name: 'Produtos mais vendidos', icon: <ArchiveBoxIcon className="w-4 h-4" /> },
              { name: 'Movimentação de estoque', icon: <ArchiveBoxIcon className="w-4 h-4" /> },
              { name: 'Fluxo de caixa', icon: <CurrencyDollarIcon className="w-4 h-4" /> },
            ].map((item, i) => (
              <button key={i} className="w-full flex items-center justify-between p-2.5 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/5 group">
                <div className="flex items-center gap-3 text-[13px]" style={{ color: 'var(--nexus-muted)' }}>
                  <div style={{ color: 'var(--nexus-bronze)' }}>
                    {item.icon}
                  </div>
                  <span className="group-hover:text-[var(--nexus-text)] transition-colors">{item.name}</span>
                </div>
                <ChevronRightIcon className="w-4 h-4" style={{ color: 'var(--nexus-muted)' }} />
              </button>
            ))}
          </div>

          <button className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 flex items-center justify-center gap-2"
            style={{ background: 'var(--nexus-rose)', color: '#fff' }}>
            + Gerar relatório personalizado
          </button>
        </div>
      </motion.div>
    </div>
  );
}
