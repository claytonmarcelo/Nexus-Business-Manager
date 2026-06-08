import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  CurrencyDollarIcon, ArrowTrendingUpIcon, BanknotesIcon,
  UserGroupIcon, ChartBarIcon, DocumentArrowDownIcon,
} from '@heroicons/react/24/solid';
import { StatsCard } from '../../components/ui/StatsCard';
import { PremiumTable, Column } from '../../components/ui/PremiumTable';
import { ChartCard } from '../../components/ui/ChartCard';
import { GradientButton } from '../../components/ui/GradientButton';

type ReportType = 'clients' | 'products' | 'financial' | 'stock';

const reportLabels: Record<ReportType, string> = {
  clients: 'Clientes',
  products: 'Produtos',
  financial: 'Financeiro',
  stock: 'Estoque',
};

interface ReportRow {
  id: number;
  type: ReportType;
  description: string;
  ultimaGeracao: string;
}

const monthlyData = [
  { month: 'Jan', value: 8200 },
  { month: 'Fev', value: 9500 },
  { month: 'Mar', value: 11200 },
  { month: 'Abr', value: 10800 },
  { month: 'Mai', value: 12500 },
  { month: 'Jun', value: 14100 },
  { month: 'Jul', value: 13600 },
  { month: 'Ago', value: 15200 },
  { month: 'Set', value: 14800 },
  { month: 'Out', value: 16300 },
  { month: 'Nov', value: 18100 },
  { month: 'Dez', value: 20500 },
];

const categoryData = [
  { name: 'Produtos', value: 45, color: 'var(--nexus-gold)' },
  { name: 'Servicos', value: 30, color: 'var(--nexus-rose)' },
  { name: 'Consultorias', value: 25, color: 'var(--nexus-chart-blue)' },
];

const reportRows: ReportRow[] = [
  { id: 1, type: 'clients', description: 'Lista completa de clientes cadastrados', ultimaGeracao: '15/05/2026' },
  { id: 2, type: 'products', description: 'Catalogo de produtos com precos e quantidades', ultimaGeracao: '14/05/2026' },
  { id: 3, type: 'financial', description: 'Todas as receitas e despesas registradas', ultimaGeracao: '13/05/2026' },
  { id: 4, type: 'stock', description: 'Movimentacoes e saldo atual do estoque', ultimaGeracao: '12/05/2026' },
];

const quickActions = [
  { label: 'Vendas do Mes', type: 'products' as ReportType, format: 'pdf' },
  { label: 'Clientes Ativos', type: 'clients' as ReportType, format: 'xlsx' },
  { label: 'Resumo Financeiro', type: 'financial' as ReportType, format: 'pdf' },
  { label: 'Mov. Estoque', type: 'stock' as ReportType, format: 'xlsx' },
];

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function CustomBarTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-sm shadow-lg" style={{ background: 'var(--nexus-card-strong)', border: '1px solid var(--nexus-border)' }}>
      <p style={{ color: 'var(--nexus-muted-2)' }}>{label}</p>
      <p className="font-semibold" style={{ color: 'var(--nexus-gold)' }}>{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

function CustomPieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-sm shadow-lg" style={{ background: 'var(--nexus-card-strong)', border: '1px solid var(--nexus-border)' }}>
      <p style={{ color: 'var(--nexus-text)' }}>{payload[0].name}</p>
      <p className="font-semibold" style={{ color: 'var(--nexus-gold)' }}>{payload[0].value}%</p>
    </div>
  );
}

export function Reports() {
  const [loading, setLoading] = useState<{ type: ReportType; format: string } | null>(null);

  async function handleDownload(type: ReportType, format: string) {
    setLoading({ type, format });
    try {
      const token = localStorage.getItem('@nexus:token');
      const baseUrl = '/api';
      const url = format === 'pdf'
        ? `${baseUrl}/reports/pdf/${type}`
        : `${baseUrl}/reports/xlsx/${type}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Erro ao baixar relatorio');
        return;
      }

      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `relatorio_${type}_${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
    } catch {
      alert('Erro ao baixar relatorio');
    } finally {
      setLoading(null);
    }
  }

  const columns: Column<ReportRow>[] = [
    {
      key: 'relatorio',
      header: 'Relatorio',
      render: (row) => (
        <div>
          <p className="font-medium text-sm" style={{ color: 'var(--nexus-text)' }}>
            {reportLabels[row.type]}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--nexus-muted-2)' }}>{row.description}</p>
        </div>
      ),
    },
    {
      key: 'ultimaGeracao',
      header: 'Ultima Geracao',
      hide: 'sm',
      render: (row) => (
        <span className="text-sm" style={{ color: 'var(--nexus-muted)' }}>{row.ultimaGeracao}</span>
      ),
    },
    {
      key: 'formato',
      header: 'Formato',
      hide: 'md',
      render: () => (
        <div className="flex gap-2">
          <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: 'rgba(212, 149, 86, 0.12)', color: 'var(--nexus-gold)' }}>PDF</span>
          <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: 'rgba(198, 90, 113, 0.12)', color: 'var(--nexus-rose)' }}>XLSX</span>
        </div>
      ),
    },
    {
      key: 'acoes',
      header: 'Acoes',
      render: (row) => {
        const isLoading = loading?.type === row.type;
        return (
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); handleDownload(row.type, 'pdf'); }}
              disabled={!!isLoading}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200"
              style={{
                background: isLoading && loading?.format === 'pdf'
                  ? 'rgba(212, 149, 86, 0.1)'
                  : 'rgba(212, 149, 86, 0.12)',
                color: 'var(--nexus-gold)',
                border: '1px solid rgba(212, 149, 86, 0.2)',
                opacity: isLoading && loading?.format === 'pdf' ? 0.6 : 1,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(212, 149, 86, 0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(212, 149, 86, 0.12)'; }}
            >
              {isLoading && loading?.format === 'pdf' ? '...' : 'PDF'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDownload(row.type, 'xlsx'); }}
              disabled={!!isLoading}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200"
              style={{
                background: isLoading && loading?.format === 'xlsx'
                  ? 'rgba(198, 90, 113, 0.1)'
                  : 'rgba(198, 90, 113, 0.12)',
                color: 'var(--nexus-rose)',
                border: '1px solid rgba(198, 90, 113, 0.2)',
                opacity: isLoading && loading?.format === 'xlsx' ? 0.6 : 1,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(198, 90, 113, 0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(198, 90, 113, 0.12)'; }}
            >
              {isLoading && loading?.format === 'xlsx' ? '...' : 'Excel'}
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="mb-8"
      >
        <h1 className="page-title">Relatorios</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
          Visualize indicadores, analise dados e exporte relatorios em PDF ou Excel
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatsCard
          label="Faturamento Total"
          value="R$ 126,5k"
          icon={<CurrencyDollarIcon className="w-5 h-5" />}
          color="gold"
          trend={{ value: '12,5%', direction: 'up' }}
          subtitle="vs. mes anterior"
        />
        <StatsCard
          label="Total de Vendas"
          value="2.847"
          icon={<ArrowTrendingUpIcon className="w-5 h-5" />}
          color="rose"
          trend={{ value: '8,3%', direction: 'up' }}
          subtitle="vs. mes anterior"
        />
        <StatsCard
          label="Compras"
          value="1.234"
          icon={<BanknotesIcon className="w-5 h-5" />}
          color="blue"
          trend={{ value: '2,1%', direction: 'down' }}
          subtitle="vs. mes anterior"
        />
        <StatsCard
          label="Novos Clientes"
          value="456"
          icon={<UserGroupIcon className="w-5 h-5" />}
          color="green"
          trend={{ value: '15,7%', direction: 'up' }}
          subtitle="vs. mes anterior"
        />
        <StatsCard
          label="Produtos Vendidos"
          value="5.321"
          icon={<ChartBarIcon className="w-5 h-5" />}
          color="purple"
          trend={{ value: '5,4%', direction: 'up' }}
          subtitle="vs. mes anterior"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Faturamento por Periodo">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--nexus-chart-grid)" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--nexus-muted-2)', fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--nexus-muted-2)', fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'var(--nexus-chart-grid)' }} />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--nexus-gold)" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="var(--nexus-bronze)" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="url(#barGradient)" style={{ filter: 'drop-shadow(0 0 6px rgba(212, 149, 86, 0.25))' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Faturamento por Categoria">
          <div className="h-72 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  cornerRadius={6}
                >
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex flex-col items-center">
                <span className="text-xs" style={{ color: 'var(--nexus-muted-2)' }}>Total</span>
                <span className="text-lg font-bold" style={{ color: 'var(--nexus-text)' }}>R$ 126,5k</span>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            {categoryData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
                <span className="text-xs" style={{ color: 'var(--nexus-muted)' }}>{entry.name} ({entry.value}%)</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Relatorios Disponiveis">
          <PremiumTable columns={columns} data={reportRows} />
        </ChartCard>

        <ChartCard title="Relatorios Rapidos">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const isBusy = loading?.type === action.type && loading?.format === action.format;
              return (
                <motion.button
                  key={`${action.type}-${action.format}`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleDownload(action.type, action.format)}
                  disabled={!!isBusy}
                  className="flex items-center gap-3 p-4 rounded-xl text-left transition-all duration-200"
                  style={{
                    background: 'var(--nexus-card)',
                    border: '1px solid var(--nexus-border)',
                    opacity: isBusy ? 0.6 : 1,
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(212, 149, 86, 0.1)', color: 'var(--nexus-gold)' }}
                  >
                    <DocumentArrowDownIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--nexus-text)' }}>
                      {action.label}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--nexus-muted-2)' }}>
                      {action.format.toUpperCase()}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </ChartCard>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="flex justify-center"
      >
        <GradientButton icon={<DocumentArrowDownIcon className="w-5 h-5" />}>
          Gerar Relatorio Personalizado
        </GradientButton>
      </motion.div>
    </motion.div>
  );
}
