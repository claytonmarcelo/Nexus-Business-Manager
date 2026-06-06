import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { DashboardData } from '../../types';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { UserGroupIcon, CurrencyDollarIcon, ArrowTrendingUpIcon, BanknotesIcon } from '@heroicons/react/24/solid';
import { NexusAIInsights } from '../../components/ai/NexusAIInsights';

const GOLD = '#D49556';
const SUCCESS = '#9BE37A';
const ROSE = '#c96f78';
const MUTED = '#8f8580';

const chartColors = [GOLD, ROSE, '#60a5fa', SUCCESS, '#a78bfa', '#f472b6', MUTED];

const mockStock = [
  { product: 'Teclado Mecanico RGB', category: 'Perifericos', qty: 45, min: 20, status: 'normal' as const },
  { product: 'Monitor 27" 4K', category: 'Monitores', qty: 12, min: 15, status: 'low' as const },
  { product: 'Mouse Wireless', category: 'Perifericos', qty: 78, min: 30, status: 'normal' as const },
  { product: 'Webcam HD 1080p', category: 'Perifericos', qty: 3, min: 10, status: 'critical' as const },
  { product: 'Notebook Pro i7', category: 'Computadores', qty: 8, min: 10, status: 'low' as const },
  { product: 'Fonte 650W 80Plus', category: 'Componentes', qty: 22, min: 15, status: 'normal' as const },
];

const mockActivities = [
  { text: 'Nova venda registrada para Tech Solutions Ltda', time: 'Ha 5 minutos', color: 'green' as const },
  { text: 'Estoque critico: Webcam HD 1080p (3 unidades)', time: 'Ha 15 minutos', color: 'rose' as const },
  { text: 'Lead qualificado no CRM: Inovacao Tech', time: 'Ha 1 hora', color: 'blue' as const },
  { text: 'Relatorio financeiro de Maio gerado', time: 'Ha 2 horas', color: 'gold' as const },
  { text: 'Produto cadastrado: Mousepad Gamer XL', time: 'Ha 3 horas', color: 'green' as const },
  { text: 'Pagamento recebido de Distribuidora ABC', time: 'Ha 5 horas', color: 'gold' as const },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatNumber(value: number) {
  if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
  if (value >= 1000) return (value / 1000).toFixed(1) + 'k';
  return value.toLocaleString('pt-BR');
}

function AreaChartGradient() {
  return (
    <defs>
      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={GOLD} stopOpacity={0.3} />
        <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
      </linearGradient>
      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={SUCCESS} stopOpacity={0.3} />
        <stop offset="95%" stopColor={SUCCESS} stopOpacity={0} />
      </linearGradient>
    </defs>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [suggestionStats, setSuggestionStats] = useState<{ status: string; count: number }[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/dashboard');
        if (res.data && res.data.data) {
          setData(res.data.data);
        } else {
          setData(res.data);
        }
      } catch (err: any) {
        console.error('Erro ao carregar dashboard:', err);
        const errorMsg = err?.response?.data?.message || err?.message || 'Erro ao carregar dashboard. Verifique a conexão com o servidor.';
        setError(errorMsg);
      }
      try {
        const sug = await api.get('/suggestions/stats');
        if (sug.data?.data) setSuggestionStats(sug.data.data);
      } catch { /* suggestions table may not exist yet */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <p className="text-sm text-nexus-muted capitalize">{dateStr}</p>
          <h1 className="text-2xl font-bold text-nexus-text mt-1">{greeting}, {user?.name}!</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="kpi-card animate-pulse">
              <div className="h-4 bg-nexus-card-soft rounded w-20 mb-3" />
              <div className="h-8 bg-nexus-card-soft rounded w-28 mb-2" />
              <div className="h-3 bg-nexus-card-soft rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const stats = data?.stats;
  const charts = data?.charts;

  const cards = [
    {
      label: 'Clientes',
      value: stats ? formatNumber(stats.total_clients) : '0',
      icon: UserGroupIcon,
      colorClass: 'blue',
      change: '+12.5%',
      changeType: 'up' as const,
    },
    {
      label: 'Vendas',
      value: stats ? formatCurrency(stats.total_revenue) : 'R$ 0',
      icon: CurrencyDollarIcon,
      colorClass: 'gold',
      change: '+8.2%',
      changeType: 'up' as const,
    },
    {
      label: 'Receitas',
      value: data && charts ? formatCurrency(charts.salesByMonth.reduce((s, m) => s + m.value, 0)) : 'R$ 0',
      icon: ArrowTrendingUpIcon,
      colorClass: 'green',
      change: '+15.3%',
      changeType: 'up' as const,
    },
    {
      label: 'Lucro',
      value: stats ? formatCurrency(stats.balance) : 'R$ 0',
      icon: BanknotesIcon,
      colorClass: 'rose',
      change: stats && stats.balance < 0 ? '-3.2%' : '+5.7%',
      changeType: stats && stats.balance < 0 ? 'down' as const : 'up' as const,
    },
  ];

  const areaData = charts ? charts.salesByMonth.map(m => ({ name: m.label, Vendas: m.value })) : [];

  const totalSalesRevenue = areaData.reduce((s, d) => s + d.Vendas, 0);

  const donutData = charts ? charts.productsByCategory : [];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm text-nexus-muted capitalize">{dateStr}</p>
          <h1 className="text-2xl font-bold text-nexus-text mt-1">{greeting}, {user?.name}!</h1>
        </div>
        <button
          onClick={() => navigate('/nexus-ai')}
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-nexus-gold border border-nexus-border hover:bg-nexus-card transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-nexus-gold animate-pulse" />
          Nexus AI Online
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`kpi-card ${card.colorClass}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-nexus-muted-2 uppercase tracking-wider">{card.label}</span>
                <div className={`kpi-icon ${card.colorClass}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-nexus-text mb-1">{card.value}</p>
              <span className={`text-xs font-medium ${card.changeType === 'up' ? 'change-up' : 'change-down'}`}>
                {card.change} {card.changeType === 'up' ? '\u2191' : '\u2193'}
              </span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="chart-card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="chart-title mb-0">Vendas dos Ultimos 7 Dias</h3>
            {totalSalesRevenue > 0 && (
              <span className="text-xs text-nexus-muted-2">
                Total: {formatCurrency(totalSalesRevenue)}
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={areaData}>
              <AreaChartGradient />
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(212, 149, 86, 0.08)" />
              <XAxis dataKey="name" fontSize={12} tick={{ fill: MUTED }} axisLine={false} tickLine={false} />
              <YAxis fontSize={12} tick={{ fill: MUTED }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(11, 13, 16, 0.95)',
                  border: '1px solid rgba(212, 149, 86, 0.3)',
                  borderRadius: '10px',
                  color: '#f5f1ec',
                }}
              />
              <Area type="monotone" dataKey="Vendas" stroke={GOLD} fill="url(#salesGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Categorias</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={donutData}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
              >
                {donutData.map((_entry, index) => (
                  <Cell key={index} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'rgba(11, 13, 16, 0.95)',
                  border: '1px solid rgba(212, 149, 86, 0.3)',
                  borderRadius: '10px',
                  color: '#f5f1ec',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {donutData.map((entry, index) => (
              <div key={entry.label} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: chartColors[index % chartColors.length] }} />
                <span className="text-xs text-nexus-muted">{entry.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="chart-card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="chart-title mb-0">Estoque</h3>
            <button onClick={() => navigate('/stock')} className="text-xs text-nexus-gold hover:text-nexus-text transition-colors font-medium">
              Ver todos
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="stock-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th className="hidden sm:table-cell">Categoria</th>
                  <th>Qtd</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {mockStock.map((item, i) => {
                  const statusLabel = item.status === 'normal' ? 'Normal'
                    : item.status === 'low' ? 'Baixo' : 'Critico';
                  return (
                    <tr key={i}>
                      <td className="font-medium">{item.product}</td>
                      <td className="hidden sm:table-cell text-nexus-muted">{item.category}</td>
                      <td>
                        <span className={item.qty <= item.min ? 'text-nexus-danger' : ''}>
                          {item.qty}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${item.status}`}>
                          <span className={`status-dot ${item.status}`} />
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="chart-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="chart-title mb-0">Atividades Recentes</h3>
            <button onClick={() => navigate('/notifications')} className="text-xs text-nexus-gold hover:text-nexus-text transition-colors font-medium">
              Ver todas
            </button>
          </div>
          <div>
            {mockActivities.map((act, i) => (
              <div key={i} className="activity-item">
                <span className={`activity-dot ${act.color}`} />
                <div>
                  <p className="activity-text">{act.text}</p>
                  <p className="activity-time">{act.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title mb-0">Insights do Nexus AI</h3>
          <button onClick={() => navigate('/nexus-ai')} className="text-xs text-nexus-gold hover:text-nexus-text transition-colors font-medium">
            Ver todos
          </button>
        </div>
        <NexusAIInsights compact />
      </div>

      {suggestionStats.length > 0 && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">Sugestoes Recebidas</h3>
            <button onClick={() => navigate('/suggestions/admin')} className="text-xs text-nexus-gold hover:text-nexus-text transition-colors font-medium">
              Gerenciar
            </button>
          </div>
          <div className="grid grid-cols-5 gap-4">
            {suggestionStats.map((s) => {
              const statusLabels: Record<string, string> = {
                pending: 'Pendentes', under_review: 'Analise', approved: 'Aprovadas',
                rejected: 'Rejeitadas', implemented: 'Implementadas',
              };
              const statusColors: Record<string, string> = {
                pending: 'text-yellow-500', under_review: 'text-blue-500', approved: 'text-green-500',
                rejected: 'text-nexus-danger', implemented: 'text-nexus-gold',
              };
              return (
                <div key={s.status} className="text-center">
                  <p className={`text-xl font-bold ${statusColors[s.status] || ''}`}>{s.count}</p>
                  <p className="text-xs text-nexus-muted">{statusLabels[s.status] || s.status}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg p-4 mb-6" style={{ background: 'rgba(255, 107, 107, 0.1)', border: '1px solid rgba(255, 107, 107, 0.2)' }}>
          <div className="flex items-center justify-between">
            <p className="text-sm text-nexus-danger">{error}</p>
            <button
              onClick={() => { setLoading(true); setError(''); window.location.reload(); }}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-nexus-danger/20 text-nexus-danger hover:bg-nexus-danger/30 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
