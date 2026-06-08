import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { DashboardData } from '../../types';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { UserGroupIcon, CurrencyDollarIcon, ArrowTrendingUpIcon, BanknotesIcon } from '@heroicons/react/24/solid';
import { NexusAIInsights } from '../../components/ai/NexusAIInsights';
import { StatsCard } from '../../components/ui/StatsCard';

const GOLD = '#D49556';
const LIGHT_GOLD = '#C48A43';
const SUCCESS = '#7DDA6A';
const LIGHT_SUCCESS = '#2F9E44';
const ROSE = '#C65A71';
const GRAY = '#A8A8A8';
const LIGHT_GRAY = '#5A5A5A';
const WHITE = '#FFFFFF';
const DANGER = '#D84B5F';
const LIGHT_DANGER = '#C92A2A';
const WARNING = '#D89A28';

const chartColors = [GOLD, ROSE, '#60a5fa', SUCCESS, '#a78bfa', '#f472b6', GRAY];
const lightChartColors = [LIGHT_GOLD, ROSE, '#60a5fa', LIGHT_SUCCESS, '#a78bfa', '#f472b6', LIGHT_GRAY];



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

interface LowStockItem {
  id: number;
  name: string;
  category: string;
  quantity: number;
  minStock: number;
  status: 'normal' | 'low' | 'critical';
}

interface ActivityItem {
  text: string;
  time: string;
  color: 'green' | 'rose' | 'gold' | 'blue';
}

export function Dashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isLight = theme === 'light' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: light)').matches);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [suggestionStats, setSuggestionStats] = useState<{ status: string; count: number }[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [dashRes, productsRes, auditRes, sugRes] = await Promise.all([
          api.get('/dashboard'),
          api.get('/products'),
          api.get('/audit'),
          api.get('/suggestions/stats').catch(() => null),
        ]);

        const dashData = dashRes.data?.data || dashRes.data;
        setData(dashData);

        const allProducts = productsRes.data?.data || [];
        const lowStockItems = allProducts
          .filter((p: any) => p.quantity <= (p.min_stock || 5))
          .slice(0, 6)
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            category: p.category || 'Sem categoria',
            quantity: p.quantity,
            minStock: p.min_stock || 5,
            status: (p.quantity <= 3 ? 'critical' : p.quantity <= (p.min_stock || 5) ? 'low' : 'normal') as 'normal' | 'low' | 'critical',
          }));
        setLowStock(lowStockItems.length > 0 ? lowStockItems : []);

        const auditData = auditRes.data?.data || auditRes.data || [];
        const recent: ActivityItem[] = (Array.isArray(auditData) ? auditData : []).slice(0, 6).map((a: any) => ({
          text: `${a.action} em ${a.entity}`,
          time: a.created_at ? new Date(a.created_at + 'Z').toLocaleString('pt-BR') : '',
          color: (a.action === 'DELETE' ? 'rose' : a.action === 'CREATE' ? 'green' : 'gold') as 'rose' | 'green' | 'gold',
        }));
        setActivities(recent);

        if (sugRes?.data?.data) setSuggestionStats(sugRes.data.data);
      } catch (err: any) {
        const errorMsg = err?.response?.data?.message || err?.message || 'Erro ao carregar dashboard.';
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
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
          <p className="text-sm capitalize" style={{color: 'var(--nexus-muted)'}}>{dateStr}</p>
          <h1 className="text-2xl font-bold mt-1" style={{color: 'var(--nexus-text)'}}>{greeting}, {user?.name}!</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="kpi-card animate-pulse">
              <div className="h-4 rounded w-20 mb-3" style={{background: 'var(--nexus-card-soft)'}} />
              <div className="h-8 rounded w-28 mb-2" style={{background: 'var(--nexus-card-soft)'}} />
              <div className="h-3 rounded w-16" style={{background: 'var(--nexus-card-soft)'}} />
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
      icon: <UserGroupIcon className="w-5 h-5" />,
      color: 'blue' as const,
      trend: { value: '+12.5%', direction: 'up' as const },
    },
    {
      label: 'Vendas',
      value: stats ? formatCurrency(stats.total_revenue) : 'R$ 0',
      icon: <CurrencyDollarIcon className="w-5 h-5" />,
      color: 'gold' as const,
      trend: { value: '+8.2%', direction: 'up' as const },
    },
    {
      label: 'Receitas',
      value: data && charts ? formatCurrency(charts.salesByMonth.reduce((s, m) => s + m.value, 0)) : 'R$ 0',
      icon: <ArrowTrendingUpIcon className="w-5 h-5" />,
      color: 'green' as const,
      trend: { value: '+15.3%', direction: 'up' as const },
    },
    {
      label: 'Lucro',
      value: stats ? formatCurrency(stats.balance) : 'R$ 0',
      icon: <BanknotesIcon className="w-5 h-5" />,
      color: 'rose' as const,
      trend: stats && stats.balance < 0
        ? { value: '-3.2%', direction: 'down' as const }
        : { value: '+5.7%', direction: 'up' as const },
    },
  ];

  const areaData = charts ? charts.salesByMonth.map(m => ({ name: m.label, Vendas: m.value })) : [];

  const totalSalesRevenue = areaData.reduce((s, d) => s + d.Vendas, 0);

  const donutData = charts ? charts.productsByCategory : [];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm capitalize" style={{color: 'var(--nexus-muted)'}}>{dateStr}</p>
          <h1 className="text-2xl font-bold mt-1" style={{color: 'var(--nexus-text)'}}>{greeting}, {user?.name}!</h1>
        </div>
        <button
          onClick={() => navigate('/nexus-ai')}
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
          style={{color: 'var(--nexus-gold)', borderColor: 'var(--nexus-border)', background: 'var(--nexus-card)'}}
        >
          <span className="w-2 h-2 rounded-full animate-pulse" style={{background: 'var(--nexus-gold)'}} />
          Nexus AI Online
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {cards.map((card) => (
          <StatsCard
            key={card.label}
            label={card.label}
            value={card.value}
            icon={card.icon}
            color={card.color}
            trend={card.trend}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="chart-card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="chart-title mb-0">Vendas dos Ultimos 7 Dias</h3>
            {totalSalesRevenue > 0 && (
              <span className="text-xs" style={{color: 'var(--nexus-muted-2)'}}>
                Total: {formatCurrency(totalSalesRevenue)}
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={areaData}>
              <AreaChartGradient />
              <CartesianGrid strokeDasharray="3 3" stroke={isLight ? 'rgba(216, 197, 174, 0.3)' : 'rgba(212, 149, 86, 0.08)'} />
              <XAxis dataKey="name" fontSize={12} tick={{ fill: isLight ? LIGHT_GRAY : GRAY }} axisLine={false} tickLine={false} />
              <YAxis fontSize={12} tick={{ fill: isLight ? LIGHT_GRAY : GRAY }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(11, 13, 16, 0.95)',
                  border: isLight ? '1px solid #D8C5AE' : '1px solid rgba(212, 149, 86, 0.3)',
                  borderRadius: '10px',
                  color: isLight ? '#2B2B2B' : '#f5f1ec',
                }}
              />
              <Area type="monotone" dataKey="Vendas" stroke={isLight ? LIGHT_GOLD : GOLD} fill="url(#salesGrad)" strokeWidth={2} />
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
                  <Cell key={index} fill={isLight ? lightChartColors[index % lightChartColors.length] : chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(11, 13, 16, 0.95)',
                  border: isLight ? '1px solid #D8C5AE' : '1px solid rgba(212, 149, 86, 0.3)',
                  borderRadius: '10px',
                  color: isLight ? '#2B2B2B' : '#f5f1ec',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {donutData.map((entry, index) => (
              <div key={entry.label} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: isLight ? lightChartColors[index % lightChartColors.length] : chartColors[index % chartColors.length] }} />
                <span className="text-xs" style={{color: 'var(--nexus-muted)'}}>{entry.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="chart-card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="chart-title mb-0">Estoque</h3>
            <button
              onClick={() => navigate('/stock')}
              className="text-xs font-medium transition-colors"
              style={{color: 'var(--nexus-gold)'}}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--nexus-text)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--nexus-gold)'}
            >
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
                {lowStock.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8" style={{color: 'var(--nexus-muted)'}}>
                      Nenhum produto com estoque baixo
                    </td>
                  </tr>
                ) : lowStock.map((item, i) => {
                  const statusLabel = item.status === 'normal' ? 'Normal'
                    : item.status === 'low' ? 'Baixo' : 'Critico';
                  return (
                    <tr key={item.id}>
                      <td className="font-medium">{item.name}</td>
                      <td className="hidden sm:table-cell" style={{color: 'var(--nexus-muted)'}}>{item.category}</td>
                      <td>
                        <span style={item.quantity <= item.minStock ? {color: DANGER} : {}}>
                          {item.quantity}
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
            <button
              onClick={() => navigate('/notifications')}
              className="text-xs font-medium transition-colors"
              style={{color: 'var(--nexus-gold)'}}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--nexus-text)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--nexus-gold)'}
            >
              Ver todas
            </button>
          </div>
          <div>
            {activities.length === 0 ? (
              <p className="text-center py-8" style={{color: 'var(--nexus-muted)'}}>Nenhuma atividade recente</p>
            ) : activities.map((act, i) => (
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
          <button
            onClick={() => navigate('/nexus-ai')}
            className="text-xs font-medium transition-colors"
            style={{color: 'var(--nexus-gold)'}}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--nexus-text)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--nexus-gold)'}
          >
            Ver todos
          </button>
        </div>
        <NexusAIInsights compact />
      </div>

      {suggestionStats.length > 0 && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">Sugestoes Recebidas</h3>
            <button
              onClick={() => navigate('/suggestions/admin')}
              className="text-xs font-medium transition-colors"
              style={{color: 'var(--nexus-gold)'}}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--nexus-text)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--nexus-gold)'}
            >
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
                pending: WARNING, under_review: '#60a5fa', approved: SUCCESS,
                rejected: DANGER, implemented: GOLD,
              };
              return (
                <div key={s.status} className="text-center">
                  <p className="text-xl font-bold" style={{color: statusColors[s.status] || 'var(--nexus-text)'}}>{s.count}</p>
                  <p className="text-xs" style={{color: 'var(--nexus-muted)'}}>{statusLabels[s.status] || s.status}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg p-4 mb-6" style={{ background: 'rgba(255, 107, 107, 0.1)', border: '1px solid rgba(255, 107, 107, 0.2)' }}>
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{color: DANGER}}>{error}</p>
            <button
              onClick={() => { setLoading(true); setError(''); }}
              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{color: DANGER, background: 'rgba(216, 75, 95, 0.2)'}}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(216, 75, 95, 0.3)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(216, 75, 95, 0.2)'}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
