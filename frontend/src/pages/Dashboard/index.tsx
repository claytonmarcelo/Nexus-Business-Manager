import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { DashboardData } from '../../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#B76E79', '#D6B370', '#32252B', '#8B5F5F', '#C49A6C', '#4A3840', '#A0796A'];

export function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/dashboard');
        setData(res.data);
      } catch {
        setError('Erro ao carregar dashboard. Verifique a conexao com o servidor.');
      }
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
    { label: 'Clientes', value: stats.total_clients, color: 'bg-brand-champagneGold' },
    { label: 'Produtos', value: stats.total_products, color: 'bg-brand-roseGold/70' },
    { label: 'Fornecedores', value: stats.total_suppliers, color: 'bg-brand-champagneGold' },
    { label: 'Vendas', value: stats.total_sales, color: 'bg-brand-roseGold/70' },
    { label: 'Estoque Baixo', value: stats.low_stock_count, color: stats.low_stock_count > 0 ? 'bg-red-500' : 'bg-gray-300' },
  ];

  const revenueCards = [
    { label: 'Receitas', value: stats.total_revenue, color: 'text-green-600', prefix: 'R$' },
    { label: 'Despesas', value: stats.total_expense, color: 'text-red-600', prefix: 'R$' },
    { label: 'Saldo', value: stats.balance, color: stats.balance >= 0 ? 'text-green-600' : 'text-red-600', prefix: 'R$' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-brand-blackCherry">Dashboard</h1>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
            <h3 className="text-sm font-semibold text-brand-blackCherry mb-4">Receitas x Despesas por Mes</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueExpenseData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
            <h3 className="text-sm font-semibold text-brand-blackCherry mb-4">Vendas por Mes</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={charts.salesByMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" fill="#B76E79" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
            <h3 className="text-sm font-semibold text-brand-blackCherry mb-4">Produtos por Categoria</h3>
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
          <h3 className="text-sm font-semibold text-brand-blackCherry mb-4">Valor em Estoque</h3>
          <p className="text-4xl font-bold mb-4" style={{ color: '#B76E79' }}>
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
