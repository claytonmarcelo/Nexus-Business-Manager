import { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  UserGroupIcon, 
  CurrencyDollarIcon, 
  ArrowTrendingUpIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  BellIcon,
  ChevronDownIcon,
  ShoppingCartIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

// Dados mockados para demonstração (substituir pela API quando funcionar)
const mockData = {
  stats: {
    total_clients: 1250,
    total_sales: 84230.50,
    total_revenue: 126430.20,
    profit: 28200.00
  },
  salesData: [
    { name: '05 Mai', value: 20 },
    { name: '06 Mai', value: 15 },
    { name: '07 Mai', value: 25 },
    { name: '08 Mai', value: 40 },
    { name: '09 Mai', value: 30 },
    { name: '10 Mai', value: 35 },
    { name: '11 Mai', value: 22 }
  ],
  categoryData: [
    { name: 'Eletrônicos', value: 35, color: '#B76E79' },
    { name: 'Informática', value: 25, color: '#D6B370' },
    { name: 'Casa', value: 20, color: '#32252B' },
    { name: 'Acessórios', value: 20, color: '#F7F2EC' }
  ],
  products: [
    { name: 'Notebook Dell Inspiron 15', stock: 8, status: 'Baixo', image: '💻' },
    { name: 'Mouse Gamer Logitech G502', stock: 15, status: 'Normal', image: '🖱️' },
    { name: 'Teclado Mecânico Kedragon', stock: 3, status: 'Baixo', image: '⌨️' },
    { name: 'Monitor LG 24" Full HD', stock: 12, status: 'Normal', image: '🖥️' },
    { name: 'Cadeira Gamer ThunderX3', stock: 2, status: 'Crítico', image: '🪑' }
  ],
  activities: [
    { type: 'sale', description: 'Nova venda realizada', details: 'Venda #VDA-2024-1587', time: 'Agora', icon: '🛒' },
    { type: 'client', description: 'Novo cliente cadastrado', details: 'João Silva', time: '5 min atrás', icon: '👤' },
    { type: 'stock', description: 'Produto com estoque baixo', details: 'Teclado Mecânico Kedragon', time: '15 min atrás', icon: '📦' },
    { type: 'purchase', description: 'Nova compra realizada', details: 'Compra #CMP-2024-964', time: '1 hora atrás', icon: '🛍️' },
    { type: 'payment', description: 'Pagamento recebido', details: 'Venda #VDA-2024-1586', time: '2 horas atrás', icon: '💳' }
  ]
};

export function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const StatCard = ({ title, value, change, icon: Icon, trend }: any) => (
    <div className="bg-gradient-to-br from-brand-blackCherry/95 to-brand-graphiteWine/95 dark:from-brand-blackCherry dark:to-brand-graphiteWine rounded-2xl p-6 border border-brand-roseGold/20">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-gradient-to-r from-brand-roseGold to-brand-champagneGold rounded-xl">
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-brand-ivorySmoke/60">Últimos 7 dias</span>
          <Cog6ToothIcon className="w-4 h-4 text-brand-ivorySmoke/40" />
        </div>
      </div>
      <h3 className="text-sm font-medium text-brand-ivorySmoke/80 mb-1">{title}</h3>
      <div className="flex items-baseline space-x-2">
        <span className="text-2xl font-bold text-brand-ivorySmoke">{value}</span>
        <div className={`flex items-center text-xs ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
          {trend === 'up' ? <ArrowUpIcon className="w-3 h-3 mr-1" /> : <ArrowDownIcon className="w-3 h-3 mr-1" />}
          {change}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-brand-blackCherry to-brand-graphiteWine min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-ivorySmoke">Dashboard</h1>
          <p className="text-brand-ivorySmoke/70">Visão geral do seu negócio</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <input 
              type="text" 
              placeholder="Buscar no sistema..." 
              className="bg-brand-blackCherry/50 border border-brand-roseGold/30 rounded-xl px-4 py-2 pl-10 text-brand-ivorySmoke placeholder-brand-ivorySmoke/50 focus:outline-none focus:border-brand-champagneGold w-80"
            />
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-ivorySmoke/50" />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-brand-ivorySmoke/40">Ctrl + K</span>
          </div>
          
          {/* Notifications */}
          <div className="relative">
            <button className="p-2 bg-brand-blackCherry/50 border border-brand-roseGold/30 rounded-xl hover:bg-brand-roseGold/20 transition-colors">
              <BellIcon className="w-5 h-5 text-brand-ivorySmoke" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">3</span>
            </button>
          </div>
          
          {/* User Menu */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-brand-roseGold to-brand-champagneGold rounded-full flex items-center justify-center text-white font-semibold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-brand-ivorySmoke">{user?.name || 'Usuário'}</p>
              <p className="text-xs text-brand-ivorySmoke/60 capitalize">{user?.role || 'Admin'}</p>
            </div>
            <ChevronDownIcon className="w-4 h-4 text-brand-ivorySmoke/60" />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Clientes" 
          value="1.250" 
          change="12,5% este mês" 
          icon={UserGroupIcon}
          trend="up"
        />
        <StatCard 
          title="Vendas" 
          value="R$ 84.230,50" 
          change="18,7% este mês" 
          icon={ShoppingCartIcon}
          trend="up"
        />
        <StatCard 
          title="Receitas" 
          value="R$ 126.430,20" 
          change="15,3% este mês" 
          icon={CurrencyDollarIcon}
          trend="up"
        />
        <StatCard 
          title="Lucro Líquido" 
          value="R$ 28.200,00" 
          change="11,8% este mês" 
          icon={ArrowTrendingUpIcon}
          trend="up"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-gradient-to-br from-brand-blackCherry/95 to-brand-graphiteWine/95 rounded-2xl p-6 border border-brand-roseGold/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-brand-ivorySmoke">Vendas nos últimos 7 dias</h2>
            <select className="bg-brand-blackCherry/50 border border-brand-roseGold/30 rounded-lg px-3 py-1 text-sm text-brand-ivorySmoke">
              <option>Últimos 7 dias</option>
            </select>
          </div>
          
          {/* Simple Line Chart */}
          <div className="h-64 flex items-end space-x-4">
            {mockData.salesData.map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-gradient-to-t from-brand-roseGold to-brand-champagneGold rounded-t-lg"
                  style={{ height: `${(item.value / 40) * 100}%` }}
                />
                <span className="text-xs text-brand-ivorySmoke/60 mt-2">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Chart */}
        <div className="bg-gradient-to-br from-brand-blackCherry/95 to-brand-graphiteWine/95 rounded-2xl p-6 border border-brand-roseGold/20">
          <h2 className="text-lg font-semibold text-brand-ivorySmoke mb-6">Vendas por categoria</h2>
          
          {/* Simple Pie Chart */}
          <div className="space-y-4">
            {mockData.categoryData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-brand-ivorySmoke">{item.name}</span>
                </div>
                <span className="text-sm font-medium text-brand-ivorySmoke">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Products in Stock */}
        <div className="bg-gradient-to-br from-brand-blackCherry/95 to-brand-graphiteWine/95 rounded-2xl p-6 border border-brand-roseGold/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-brand-ivorySmoke">Produtos em estoque</h2>
            <button className="text-brand-champagneGold text-sm hover:underline">Ver todos os produtos →</button>
          </div>
          
          <div className="space-y-4">
            {mockData.products.map((product, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-brand-blackCherry/30 rounded-xl">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{product.image}</span>
                  <div>
                    <h3 className="text-sm font-medium text-brand-ivorySmoke">{product.name}</h3>
                    <p className="text-xs text-brand-ivorySmoke/60">{product.stock} unidades</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  product.status === 'Crítico' ? 'bg-red-500/20 text-red-400' :
                  product.status === 'Baixo' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {product.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-gradient-to-br from-brand-blackCherry/95 to-brand-graphiteWine/95 rounded-2xl p-6 border border-brand-roseGold/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-brand-ivorySmoke">Atividades recentes</h2>
            <button className="text-brand-champagneGold text-sm hover:underline">Ver todas as atividades →</button>
          </div>
          
          <div className="space-y-4">
            {mockData.activities.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-brand-blackCherry/30 rounded-xl">
                <span className="text-xl">{activity.icon}</span>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-brand-ivorySmoke">{activity.description}</h3>
                  <p className="text-xs text-brand-champagneGold">{activity.details}</p>
                  <p className="text-xs text-brand-ivorySmoke/60 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-sm text-brand-ivorySmoke/60">© 2024 Nexus Business Manager. Todos os direitos reservados.</p>
      </div>
    </div>
  );
}