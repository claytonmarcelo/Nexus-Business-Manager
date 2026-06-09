import { useState } from 'react';
import {
  ChartBarIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ShoppingCartIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EllipsisVerticalIcon,
  CalendarIcon,
  ComputerDesktopIcon,
  ArchiveBoxIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { StatsCard } from '../../components/ui/StatsCard';

const mockData = {
  stats: {
    total_clients: 1250,
    total_sales: 84230.50,
    total_revenue: 126430.20,
    profit: 28200.00
  },
  salesData: [
    { name: '05 Mai', value: 9000 },
    { name: '06 Mai', value: 14000 },
    { name: '07 Mai', value: 8000 },
    { name: '08 Mai', value: 23000 },
    { name: '09 Mai', value: 13000 },
    { name: '10 Mai', value: 16000 },
    { name: '11 Mai', value: 5000 }
  ],
  categoryData: [
    { name: 'Eletrônicos', value: 35, color: 'var(--nexus-rose)', rawValue: 'R$ 29.480,00' },
    { name: 'Informática', value: 25, color: 'var(--nexus-gold)', rawValue: 'R$ 21.150,00' },
    { name: 'Acessórios', value: 20, color: 'var(--nexus-bronze)', rawValue: 'R$ 16.860,00' },
    { name: 'Outros', value: 20, color: 'var(--nexus-muted)', rawValue: 'R$ 16.740,00' }
  ],
  products: [
    { name: 'Notebook Dell Inspiron 15', stock: 8, status: 'Baixo', icon: ComputerDesktopIcon },
    { name: 'Mouse Gamer Logitech G502', stock: 15, status: 'Normal', icon: ArchiveBoxIcon },
    { name: 'Teclado Mecânico Redragon', stock: 3, status: 'Baixo', icon: ArchiveBoxIcon },
    { name: 'Monitor LG 24" Full HD', stock: 12, status: 'Normal', icon: ComputerDesktopIcon },
    { name: 'Cadeira Gamer ThunderX3', stock: 2, status: 'Crítico', icon: ArchiveBoxIcon }
  ],
  activities: [
    { type: 'sale', description: 'Nova venda realizada', details: 'Venda #VDA-2024-1587', time: 'Agora', icon: ShoppingCartIcon, iconColor: 'text-[var(--nexus-rose)]', iconBg: 'bg-[rgba(var(--nexus-rose-rgb),0.15)]' },
    { type: 'client', description: 'Novo cliente cadastrado', details: 'João Silva', time: '5 min atrás', icon: UserGroupIcon, iconColor: 'text-[var(--nexus-gold)]', iconBg: 'bg-[rgba(var(--nexus-gold-rgb),0.15)]' },
    { type: 'stock', description: 'Produto com estoque baixo', details: 'Teclado Mecânico Redragon', time: '15 min atrás', icon: ChartBarIcon, iconColor: 'text-[var(--nexus-gold)]', iconBg: 'bg-[rgba(var(--nexus-gold-rgb),0.15)]' },
    { type: 'purchase', description: 'Nova compra realizada', details: 'Compra #CMP-2024-984', time: '1 hora atrás', icon: ShoppingCartIcon, iconColor: 'text-[var(--nexus-muted)]', iconBg: 'bg-[rgba(var(--nexus-muted-rgb),0.15)]' },
    { type: 'payment', description: 'Pagamento recebido', details: 'Venda #VDA-2024-1586', time: '2 horas atrás', icon: CalendarIcon, iconColor: 'text-[var(--nexus-success)]', iconBg: 'bg-[rgba(var(--nexus-success-rgb),0.15)]' }
  ]
};

export function Dashboard() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="p-6 space-y-6 min-h-screen bg-transparent">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--nexus-text)]">Dashboard</h1>
          <p className="text-[var(--nexus-muted)] text-sm mt-1">Visão geral do seu negócio</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          label="Clientes"
          value="1.250"
          icon={<UserGroupIcon className="w-5 h-5" />}
          color="gold"
          trend={{ value: '12,5%', direction: 'up' }}
          subtitle="este mês"
        />
        <StatsCard
          label="Vendas"
          value="R$ 84.230,50"
          icon={<ShoppingCartIcon className="w-5 h-5" />}
          color="gold"
          trend={{ value: '18,7%', direction: 'up' }}
          subtitle="este mês"
        />
        <StatsCard
          label="Receitas"
          value="R$ 126.430,20"
          icon={<CurrencyDollarIcon className="w-5 h-5" />}
          color="gold"
          trend={{ value: '15,3%', direction: 'up' }}
          subtitle="este mês"
        />
        <StatsCard
          label="Lucro Líquido"
          value="R$ 28.200,00"
          icon={<ArrowTrendingUpIcon className="w-5 h-5" />}
          color="gold"
          trend={{ value: '11,8%', direction: 'up' }}
          subtitle="este mês"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-[var(--nexus-card)] rounded-2xl p-6 border border-[var(--nexus-border)] flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-semibold text-[var(--nexus-text)]">Vendas nos últimos 7 dias</h2>
            <div className="relative">
              <select className="appearance-none bg-transparent border border-[var(--nexus-border)] rounded-lg px-4 py-1.5 pr-8 text-sm text-[var(--nexus-muted)] focus:outline-none focus:border-[var(--nexus-gold)] cursor-pointer">
                <option>Últimos 7 dias</option>
                <option>Últimos 30 dias</option>
              </select>
              <CalendarIcon className="w-4 h-4 text-[var(--nexus-muted)] absolute right-2.5 top-1/2 transform -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockData.salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--nexus-rose)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--nexus-rose)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--nexus-chart-grid)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--nexus-muted)', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--nexus-muted)', fontSize: 12 }}
                  tickFormatter={(value) => `R$ ${value >= 1000 ? `${value / 1000}k` : value}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--nexus-card)', 
                    borderColor: 'var(--nexus-border)',
                    borderRadius: '8px',
                    color: 'var(--nexus-text)'
                  }}
                  itemStyle={{ color: 'var(--nexus-rose)' }}
                  formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Vendas']}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="var(--nexus-rose)" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                  activeDot={{ r: 6, fill: 'var(--nexus-rose)', stroke: 'var(--nexus-bg)', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Chart */}
        <div className="bg-[var(--nexus-card)] rounded-2xl p-6 border border-[var(--nexus-border)] flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-semibold text-[var(--nexus-text)]">Vendas por categoria</h2>
            <button className="text-[var(--nexus-muted)] hover:text-[var(--nexus-text)] transition-colors">
              <EllipsisVerticalIcon className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 flex flex-col justify-center gap-6 pb-2">
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockData.categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {mockData.categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--nexus-card)', 
                      borderColor: 'var(--nexus-border)',
                      borderRadius: '8px'
                    }}
                    itemStyle={{ color: 'var(--nexus-text)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3 mt-auto px-2">
              {mockData.categoryData.map((item, index) => (
                <div key={index} className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-2.5 h-2.5 rounded-full mt-1.5" style={{ backgroundColor: item.color }} />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-[var(--nexus-text)]">{item.name}</span>
                      <span className="text-xs text-[var(--nexus-muted)] mt-0.5">{item.rawValue}</span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-[var(--nexus-text)] mt-1">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Products in Stock */}
        <div className="bg-[var(--nexus-card)] rounded-2xl p-6 border border-[var(--nexus-border)] flex flex-col min-h-[380px]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[var(--nexus-text)]">Produtos em estoque</h2>
            <button className="text-[var(--nexus-muted)] hover:text-[var(--nexus-text)] transition-colors">
              <EllipsisVerticalIcon className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--nexus-border)]">
                  <th className="pb-4 text-xs font-semibold text-[var(--nexus-muted)] uppercase tracking-wider pl-2">Produto</th>
                  <th className="pb-4 text-xs font-semibold text-[var(--nexus-muted)] uppercase tracking-wider text-center">Estoque</th>
                  <th className="pb-4 text-xs font-semibold text-[var(--nexus-muted)] uppercase tracking-wider text-right pr-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--nexus-border)]/50">
                {mockData.products.map((product, index) => (
                  <tr key={index} className="hover:bg-[var(--nexus-bg-soft)] transition-colors group">
                    <td className="py-3 pl-2">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-lg bg-[var(--nexus-bg-soft)] border border-[var(--nexus-border)] flex items-center justify-center text-[var(--nexus-muted)] group-hover:border-[var(--nexus-gold)] transition-colors">
                          <product.icon className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-[var(--nexus-text)]">{product.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      <span className="text-sm text-[var(--nexus-muted)]">{product.stock} unidades</span>
                    </td>
                    <td className="py-3 pr-2 text-right">
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border ${
                        product.status === 'Crítico' ? 'bg-[rgba(var(--nexus-danger-rgb),0.1)] text-[var(--nexus-danger)] border-[rgba(var(--nexus-danger-rgb),0.2)]' :
                        product.status === 'Baixo' ? 'bg-[rgba(212,149,86,0.1)] text-[var(--nexus-gold)] border-[rgba(212,149,86,0.2)]' :
                        'bg-[rgba(var(--nexus-success-rgb),0.1)] text-[var(--nexus-success)] border-[rgba(var(--nexus-success-rgb),0.2)]'
                      }`}>
                        {product.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 pt-4 border-t border-[var(--nexus-border)] flex justify-end">
            <button className="flex items-center text-xs font-medium text-[var(--nexus-gold)] hover:text-[var(--nexus-gold-light)] transition-colors group">
              Ver todos os produtos
              <ArrowRightIcon className="w-3.5 h-3.5 ml-1.5 transform group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-[var(--nexus-card)] rounded-2xl p-6 border border-[var(--nexus-border)] flex flex-col min-h-[380px]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[var(--nexus-text)]">Atividades recentes</h2>
            <button className="text-[var(--nexus-muted)] hover:text-[var(--nexus-text)] transition-colors">
              <EllipsisVerticalIcon className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 space-y-1">
            {mockData.activities.map((activity, index) => (
              <div key={index} className="flex items-start space-x-4 p-3 hover:bg-[var(--nexus-bg-soft)] rounded-xl transition-colors group cursor-pointer">
                <div className={`w-10 h-10 rounded-lg ${activity.iconBg} flex items-center justify-center flex-shrink-0 border border-transparent group-hover:border-[var(--nexus-border)] transition-all`}>
                  <activity.icon className={`w-5 h-5 ${activity.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-[var(--nexus-text)] truncate pr-4">{activity.description}</h3>
                    <span className="text-[11px] text-[var(--nexus-muted)] whitespace-nowrap">{activity.time}</span>
                  </div>
                  <p className="text-xs text-[var(--nexus-muted)] truncate group-hover:text-[var(--nexus-text)] transition-colors">{activity.details}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-[var(--nexus-border)] flex justify-end">
            <button className="flex items-center text-xs font-medium text-[var(--nexus-gold)] hover:text-[var(--nexus-gold-light)] transition-colors group">
              Ver todas as atividades
              <ArrowRightIcon className="w-3.5 h-3.5 ml-1.5 transform group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}