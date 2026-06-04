import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface Stats {
  users: number;
  clients: number;
  products: number;
}

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ users: 0, clients: 0, products: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [usersRes, clientsRes, productsRes] = await Promise.all([
          api.get('/users'),
          api.get('/clients'),
          api.get('/products'),
        ]);
        setStats({
          users: usersRes.data.length,
          clients: clientsRes.data.length,
          products: productsRes.data.length,
        });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const cards = [
    { label: 'Usuarios', value: stats.users, color: 'bg-blue-500', icon: 'U' },
    { label: 'Clientes', value: stats.clients, color: 'bg-green-500', icon: 'C' },
    { label: 'Produtos', value: stats.products, color: 'bg-purple-500', icon: 'P' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Bem-vindo, {user?.name}!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="card">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center text-white font-bold text-lg`}>
                {card.icon}
              </div>
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '...' : card.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informacoes do Sistema</h2>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span>Versao</span>
            <span className="font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span>Seu Perfil</span>
            <span className="font-medium capitalize">{user?.role}</span>
          </div>
          <div className="flex justify-between py-2">
            <span>Ambiente</span>
            <span className="font-medium">Producao</span>
          </div>
        </div>
      </div>
    </div>
  );
}
