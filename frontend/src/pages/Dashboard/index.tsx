import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { DashboardData } from '../../types';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#d6a85d', '#c96f78', '#9a6a42', '#e89aa2', '#8f8580', '#9d4e58', '#b8afa7'];

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

  if (loading) {
    return <div className="p-8 text-center text-brand-graphiteWine/60">Carregando dashboard...</div>;
  }

  if (error) {
    return <div className="p-8 text-center">
      <p className="text-red-500 mb-4">{error}</p>
      <button onClick={() => { setLoading(true); setError(''); api.get('/dashboard').then(r => setData(r.data)).catch(() => setError('Erro ao carregar dashboard')).finally(() => setLoading(false)); }} className="btn-primary">Tentar novamente</button>
    </div>;
  }

  if (!data) {
    return <div className="p-8 text-center text-brand-graphiteWine/60">Nenhum dado disponivel.</div>;
  }

  const { stats, charts } = data;

  const revenueExpenseData = charts.revenueByMonth.map((r) => {
    const exp = charts.expenseByMonth.find((e) => e.label === r.label);
    return { name: r.label, Receitas: r.value, Despesas: exp?.value || 0 };
  });

  const cards = [
    { label: 'Clientes', value: stats.total_clients, color: 'bg-amber' },
    { label: 'Produtos', value: stats.total_products, color: 'bg-rose' },
    { label: 'Fornecedores', value: stats.total_suppliers, color: 'bg-amber' },
    { label: 'Vendas', value: stats.total_sales, color: 'bg-rose' },
    { label: 'Estoque Baixo', value: stats.low_stock_count, color: stats.low_stock_count > 0 ? 'bg-red-500' : 'bg-amber' },
  ];

  const revenueCards = [
    { label: 'Receitas', value: stats.total_revenue, color: 'text-green-600', prefix: 'R$' },
    { label: 'Despesas', value: stats.total_expense, color: 'text-red-600', prefix: 'R$' },
    { label: 'Saldo', value: stats.balance, color: stats.balance >= 0 ? 'text-green-600' : 'text-red-600', prefix: 'R$' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">Dashboard</h1>
        <p className="text-brand-graphiteWine/60 mt-1">Bem-vindo, {user?.name}!</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="card text-center">
              <p className="text-sm text-brand-graphiteWine/60">{card.label}</p>
              <p className={`text-2xl font-bold mt-1 ${card.color.replace('bg-', 'text-')}`}>{card.value}</p>
            <div className={`h-1.5 rounded-full mt-2 ${card.color}`} style={{ width: `${Math.min(100, (card.value / 100) * 100)}%` }} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {revenueCards.map((card) => (
          <div key={card.label} className="card">
              <p className="text-sm text-brand-graphiteWine/60">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(card.value)}
            </p>
          </div>
        ))}
      </div>

      {suggestionStats.length > 0 && (
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">Sugestoes Recebidas</h3>
            <button onClick={() => navigate('/suggestions/admin')} className="text-xs text-brand-primary hover:text-brand-primaryHover font-medium">
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
                rejected: 'text-red-500', implemented: 'text-brand-primary',
              };
              return (
                <div key={s.status} className="text-center">
                  <p className={`text-xl font-bold ${statusColors[s.status] || ''}`}>{s.count}</p>
                  <p className="text-xs text-brand-graphiteWine/60">{statusLabels[s.status] || s.status}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
            <h3 className="section-title">Receitas x Despesas por Mes</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueExpenseData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="Receitas" fill="#8fd6a3" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Despesas" fill="#ef6f7a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
            <h3 className="section-title">Vendas por Mes</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={charts.salesByMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" fill="#d6a85d" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
            <h3 className="section-title">Produtos por Categoria</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={charts.productsByCategory} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={100} label>
                {charts.productsByCategory.map((_entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="section-title">Valor em Estoque</h3>
          <p className="text-4xl font-bold mb-4" style={{ color: 'var(--nexus-gold)' }}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.stock_value)}
          </p>
          <div className="space-y-3 text-sm text-brand-graphiteWine/70">
            <div className="flex justify-between py-2 border-b border-brand-ivorySmoke">
              <span>Total de Produtos</span>
              <span className="font-medium">{stats.total_products}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-brand-ivorySmoke">
              <span>Total de Vendas</span>
              <span className="font-medium">{stats.total_sales}</span>
            </div>
            <div className="flex justify-between py-2">
              <span>Produtos com Estoque Baixo</span>
              <span className={`font-medium ${stats.low_stock_count > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {stats.low_stock_count}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
