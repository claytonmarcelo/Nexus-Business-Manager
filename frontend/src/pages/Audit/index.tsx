import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ClipboardDocumentListIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChartBarIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import api from '../../services/api';
import { AuditLog } from '../../types';
import { useToast } from '../../contexts/ToastContext';

const COLORS = {
  green: '#22C55E',
  blue: '#3B82F6',
  orange: '#F97316',
  purple: '#8B5CF6',
  darkPurple: '#6D28D9',
  red: '#EF4444',
  gold: 'var(--nexus-gold)',
  rose: 'var(--nexus-rose)',
};

const CHART_COLORS = ['#F97316', '#3B82F6', '#22C55E', '#8B5CF6', '#6B7280'];

export function Audit() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => { load(); }, [page, filterUser, filterAction, filterModule, filterPeriod]);

  async function load() {
    try {
      setLoading(true);
      const params: any = { page, limit: PAGE_SIZE };
      if (search) params.search = search;
      if (filterUser) params.user_id = filterUser;
      if (filterAction) params.action = filterAction;
      if (filterModule) params.entity_type = filterModule;
      if (filterPeriod) params.period = filterPeriod;
      const res = await api.get('/audit', { params });
      setLogs(res.data?.data || []);
      setTotalPages(res.data?.totalPages || 1);
    } catch (err: any) {
      console.error('Erro ao carregar auditoria:', err);
      const errorMsg = err?.response?.data?.message || err?.response?.data?.error || 'Erro ao carregar auditoria';
      showToast(errorMsg, 'error');
    }
    finally { setLoading(false); }
  }

  function actionLabel(action: string) {
    const map: Record<string, string> = {
      create: 'Criar',
      update: 'Editar',
      delete: 'Excluir',
      login: 'Login',
      backup: 'Backup',
    };
    return map[action] || action;
  }

  function actionColor(action: string) {
    const map: Record<string, string> = {
      create: COLORS.green,
      update: COLORS.blue,
      delete: COLORS.orange,
      login: COLORS.purple,
      backup: COLORS.darkPurple,
    };
    return map[action] || COLORS.gold;
  }

  function getDeviceIcon(device: string | null) {
    if (!device) return <ComputerDesktopIcon className="w-4 h-4" />;
    const d = device.toLowerCase();
    if (d.includes('mobile') || d.includes('android') || d.includes('iphone')) return <DevicePhoneMobileIcon className="w-4 h-4" />;
    if (d.includes('tablet') || d.includes('ipad')) return <DeviceTabletIcon className="w-4 h-4" />;
    return <ComputerDesktopIcon className="w-4 h-4" />;
  }

  const filteredLogs = logs;

  const moduleStats = useMemo(() => {
    const stats: Record<string, number> = {};
    filteredLogs.forEach(log => {
      const module = log.entity_type || 'Outros';
      stats[module] = (stats[module] || 0) + 1;
    });
    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  }, [filteredLogs]);

  const actionStats = useMemo(() => {
    const stats: Record<string, number> = {};
    filteredLogs.forEach(log => {
      const action = actionLabel(log.action);
      stats[action] = (stats[action] || 0) + 1;
    });
    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  }, [filteredLogs]);

  const userStats = useMemo(() => {
    const stats: Record<string, number> = {};
    filteredLogs.forEach(log => {
      stats[log.user_name] = (stats[log.user_name] || 0) + 1;
    });
    return Object.entries(stats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredLogs]);

  const criticalActions = useMemo(() => {
    return filteredLogs
      .filter(log => log.action === 'delete' || log.action === 'update')
      .slice(0, 5);
  }, [filteredLogs]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--nexus-bg)' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--nexus-text)' }}>Auditoria</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--nexus-muted-2)' }}>Monitore todas as ações realizadas no sistema</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl p-6 transition-all duration-200 hover:scale-105"
            style={{ background: 'var(--nexus-card)', border: '1px solid rgba(var(--nexus-gold-rgb), 0.2)', boxShadow: '0 4px 20px rgba(var(--nexus-gold-rgb), 0.1)' }}>
            <div className="flex items-center justify-between mb-4">
              <ClipboardDocumentListIcon className="w-6 h-6" style={{ color: 'var(--nexus-gold)' }} />
              <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E' }}>↑ 15,7% este mês</span>
            </div>
            <p className="text-sm mb-1" style={{ color: 'var(--nexus-muted-2)' }}>Total de eventos</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--nexus-text)' }}>18.732</p>
          </div>

          <div className="rounded-xl p-6 transition-all duration-200 hover:scale-105"
            style={{ background: 'var(--nexus-card)', border: '1px solid rgba(var(--nexus-gold-rgb), 0.2)', boxShadow: '0 4px 20px rgba(var(--nexus-gold-rgb), 0.1)' }}>
            <div className="flex items-center justify-between mb-4">
              <UserGroupIcon className="w-6 h-6" style={{ color: 'var(--nexus-gold)' }} />
              <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E' }}>↑ 9,1% este mês</span>
            </div>
            <p className="text-sm mb-1" style={{ color: 'var(--nexus-muted-2)' }}>Usuários ativos</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--nexus-text)' }}>24</p>
          </div>

          <div className="rounded-xl p-6 transition-all duration-200 hover:scale-105"
            style={{ background: 'var(--nexus-card)', border: '1px solid rgba(var(--nexus-gold-rgb), 0.2)', boxShadow: '0 4px 20px rgba(var(--nexus-gold-rgb), 0.1)' }}>
            <div className="flex items-center justify-between mb-4">
              <ExclamationTriangleIcon className="w-6 h-6" style={{ color: 'var(--nexus-gold)' }} />
              <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}>↓ 8,3% este mês</span>
            </div>
            <p className="text-sm mb-1" style={{ color: 'var(--nexus-muted-2)' }}>Ações críticas</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--nexus-text)' }}>128</p>
          </div>

          <div className="rounded-xl p-6 transition-all duration-200 hover:scale-105"
            style={{ background: 'var(--nexus-card)', border: '1px solid rgba(var(--nexus-gold-rgb), 0.2)', boxShadow: '0 4px 20px rgba(var(--nexus-gold-rgb), 0.1)' }}>
            <div className="flex items-center justify-between mb-4">
              <ClockIcon className="w-6 h-6" style={{ color: 'var(--nexus-gold)' }} />
            </div>
            <p className="text-sm mb-1" style={{ color: 'var(--nexus-muted-2)' }}>Último acesso</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--nexus-text)' }}>05/06/2026 14:32</p>
            <p className="text-xs mt-1" style={{ color: 'var(--nexus-muted-2)' }}>Há 2 minutos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-3">
            <div className="rounded-xl p-6 mb-6"
              style={{ background: 'var(--nexus-card)', border: '1px solid rgba(var(--nexus-gold-rgb), 0.2)' }}>
              <div className="flex flex-col lg:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: 'var(--nexus-muted-2)' }} />
                  <input
                    type="text"
                    placeholder="Buscar por usuário, ação ou módulo..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                    style={{ background: 'var(--nexus-input-bg)', border: '1px solid rgba(var(--nexus-gold-rgb), 0.2)', color: 'var(--nexus-text)' }}
                  />
                </div>
                <select
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                  style={{ background: 'var(--nexus-input-bg)', border: '1px solid rgba(var(--nexus-gold-rgb), 0.2)', color: 'var(--nexus-text)' }}
                >
                  <option value="">Todos os usuários</option>
                  <option value="Clayton Marcelo">Clayton Marcelo</option>
                  <option value="Ana Beatriz">Ana Beatriz</option>
                  <option value="Carlos Eduardo">Carlos Eduardo</option>
                  <option value="Juliana Martins">Juliana Martins</option>
                  <option value="Maria Costa">Maria Costa</option>
                </select>
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                  style={{ background: 'var(--nexus-input-bg)', border: '1px solid rgba(var(--nexus-gold-rgb), 0.2)', color: 'var(--nexus-text)' }}
                >
                  <option value="">Todas as ações</option>
                  <option value="create">Criar</option>
                  <option value="update">Editar</option>
                  <option value="delete">Excluir</option>
                  <option value="login">Login</option>
                  <option value="backup">Backup</option>
                </select>
                <select
                  value={filterModule}
                  onChange={(e) => setFilterModule(e.target.value)}
                  className="px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                  style={{ background: 'var(--nexus-input-bg)', border: '1px solid rgba(var(--nexus-gold-rgb), 0.2)', color: 'var(--nexus-text)' }}
                >
                  <option value="">Todos os módulos</option>
                  <option value="clientes">Clientes</option>
                  <option value="vendas">Vendas</option>
                  <option value="compras">Compras</option>
                  <option value="financeiro">Financeiro</option>
                  <option value="produtos">Produtos</option>
                  <option value="crm">CRM</option>
                  <option value="estoque">Estoque</option>
                  <option value="fornecedores">Fornecedores</option>
                </select>
                <select
                  value={filterPeriod}
                  onChange={(e) => setFilterPeriod(e.target.value)}
                  className="px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                  style={{ background: 'var(--nexus-input-bg)', border: '1px solid rgba(var(--nexus-gold-rgb), 0.2)', color: 'var(--nexus-text)' }}
                >
                  <option value="">Todo o período</option>
                  <option value="today">Hoje</option>
                  <option value="week">Esta semana</option>
                  <option value="month">Este mês</option>
                  <option value="year">Este ano</option>
                </select>
                <button className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={{ background: 'rgba(var(--nexus-gold-rgb), 0.15)', color: 'var(--nexus-gold)', border: '1px solid rgba(var(--nexus-gold-rgb), 0.25)' }}>
                  <FunnelIcon className="w-4 h-4" />
                  Mais filtros
                </button>
                <button className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={{ background: 'rgba(var(--nexus-rose-rgb), 0.2)', color: 'var(--nexus-rose)', border: '1px solid rgba(var(--nexus-rose-rgb), 0.3)' }}>
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Exportar relatório
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(var(--nexus-gold-rgb), 0.1)' }}>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--nexus-muted-2)' }}>Data/Hora</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--nexus-muted-2)' }}>Usuário</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--nexus-muted-2)' }}>Ação</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--nexus-muted-2)' }}>Módulo</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--nexus-muted-2)' }}>Descrição</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--nexus-muted-2)' }}>IP</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--nexus-muted-2)' }}>Dispositivo</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--nexus-muted-2)' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { user: 'Clayton Marcelo', role: 'Administrador', action: 'Criar', module: 'Clientes', desc: 'Cliente "João Silva" foi cadastrado', ip: '192.168.1.100', date: '05/06/2026 14:32' },
                      { user: 'Ana Beatriz', role: 'Vendas', action: 'Editar', module: 'Vendas', desc: 'Venda #VDA-2024-1587 foi editada', ip: '192.168.1.101', date: '05/06/2026 14:28' },
                      { user: 'Carlos Eduardo', role: 'Financeiro', action: 'Excluir', module: 'Compras', desc: 'Compra #CMP-2024-984 foi cancelada', ip: '192.168.1.102', date: '05/06/2026 14:25' },
                      { user: 'Juliana Martins', role: 'Atendimento', action: 'Criar', module: 'CRM', desc: 'Interação #INT-2024-2540 foi criada', ip: '192.168.1.103', date: '05/06/2026 14:20' },
                      { user: 'Clayton Marcelo', role: 'Administrador', action: 'Login', module: 'Sistema', desc: 'Login realizado com sucesso', ip: '192.168.1.100', date: '05/06/2026 14:15' },
                      { user: 'Maria Costa', role: 'Estoque', action: 'Editar', module: 'Produtos', desc: 'Produto "Notebook Dell Inspiron 15" editado', ip: '192.168.1.104', date: '05/06/2026 14:10' },
                      { user: 'Roberto Pereira', role: 'Compras', action: 'Excluir', module: 'Fornecedores', desc: 'Fornecedor "Tech Solutions Ltda" excluído', ip: '192.168.1.105', date: '05/06/2026 14:05' },
                      { user: 'Ana Beatriz', role: 'Vendas', action: 'Editar', module: 'Clientes', desc: 'Cliente "Maria Costa" editado', ip: '192.168.1.101', date: '05/06/2026 14:00' },
                      { user: 'Carlos Eduardo', role: 'Financeiro', action: 'Criar', module: 'Financeiro', desc: 'Conta a pagar "Aluguel" criada', ip: '192.168.1.102', date: '05/06/2026 13:55' },
                      { user: 'Sistema', role: 'Automático', action: 'Backup', module: 'Sistema', desc: 'Backup automático realizado', ip: '-', date: '05/06/2026 13:50' },
                    ].map((log, index) => (
                      <tr key={index} className="transition-all duration-200 hover:bg-opacity-50"
                        style={{ borderBottom: '1px solid rgba(var(--nexus-gold-rgb), 0.05)' }}>
                        <td className="py-3 px-4 text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
                          {log.date}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                              style={{ background: 'var(--nexus-gold)', color: '#000' }}>
                              {log.user.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium" style={{ color: 'var(--nexus-text)' }}>{log.user}</p>
                              <p className="text-xs" style={{ color: 'var(--nexus-muted-2)' }}>{log.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 rounded-full text-xs font-semibold"
                            style={{ background: `${actionColor(log.action.toLowerCase())}20`, color: actionColor(log.action.toLowerCase()) }}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm" style={{ color: 'var(--nexus-muted-2)', textTransform: 'capitalize' }}>
                          {log.module}
                        </td>
                        <td className="py-3 px-4 text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
                          {log.desc}
                        </td>
                        <td className="py-3 px-4 text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
                          {log.ip}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2" style={{ color: 'var(--nexus-muted-2)' }}>
                            <ComputerDesktopIcon className="w-4 h-4" />
                            <span className="text-sm">Desktop</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <button className="text-sm font-medium transition-all duration-200 hover:opacity-80"
                            style={{ color: 'var(--nexus-gold)' }}>
                            •••
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-6">
                <p className="text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
                  Mostrando 1 a 10 de 18.732 registros
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg transition-all duration-200 disabled:opacity-50"
                    style={{ background: 'rgba(var(--nexus-gold-rgb), 0.1)', color: 'var(--nexus-gold)' }}
                  >
                    <ChevronLeftIcon className="w-5 h-5" />
                  </button>
                  <span className="px-4 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: 'var(--nexus-gold)', color: '#000' }}>
                    1
                  </span>
                  <span className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:opacity-80"
                    style={{ background: 'rgba(var(--nexus-gold-rgb), 0.1)', color: 'var(--nexus-gold)' }}>
                    2
                  </span>
                  <span className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:opacity-80"
                    style={{ background: 'rgba(var(--nexus-gold-rgb), 0.1)', color: 'var(--nexus-gold)' }}>
                    3
                  </span>
                  <span className="px-4 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: 'rgba(var(--nexus-gold-rgb), 0.1)', color: 'var(--nexus-gold)' }}>
                    ...
                  </span>
                  <span className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:opacity-80"
                    style={{ background: 'rgba(var(--nexus-gold-rgb), 0.1)', color: 'var(--nexus-gold)' }}>
                    1874
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg transition-all duration-200 disabled:opacity-50"
                    style={{ background: 'rgba(var(--nexus-gold-rgb), 0.1)', color: 'var(--nexus-gold)' }}
                  >
                    <ChevronRightIcon className="w-5 h-5" />
                  </button>
                  <select
                    className="px-3 py-2 rounded-lg text-sm outline-none transition-all duration-200 ml-4"
                    style={{ background: 'var(--nexus-input-bg)', border: '1px solid rgba(var(--nexus-gold-rgb), 0.2)', color: 'var(--nexus-text)' }}
                  >
                    <option>10</option>
                    <option>25</option>
                    <option>50</option>
                    <option>100</option>
                  </select>
                  <span className="text-sm ml-2" style={{ color: 'var(--nexus-muted-2)' }}>Registros por página</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl p-6"
              style={{ background: 'var(--nexus-card)', border: '1px solid rgba(var(--nexus-gold-rgb), 0.2)' }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--nexus-text)' }}>Eventos por módulo</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[
                      { name: 'Vendas', value: 4250 },
                      { name: 'Clientes', value: 3890 },
                      { name: 'Produtos', value: 2980 },
                      { name: 'Financeiro', value: 2750 },
                      { name: 'Outros', value: 4862 },
                    ]} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {[
                        { name: 'Vendas', value: 4250 },
                        { name: 'Clientes', value: 3890 },
                        { name: 'Produtos', value: 2980 },
                        { name: 'Financeiro', value: 2750 },
                        { name: 'Outros', value: 4862 },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl p-6"
              style={{ background: 'var(--nexus-card)', border: '1px solid rgba(var(--nexus-gold-rgb), 0.2)' }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--nexus-text)' }}>Ações por tipo</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[
                      { name: 'Criar', value: 6842 },
                      { name: 'Editar', value: 6125 },
                      { name: 'Excluir', value: 2340 },
                      { name: 'Login', value: 2185 },
                      { name: 'Outros', value: 1240 },
                    ]} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {[
                        { name: 'Criar', value: 6842 },
                        { name: 'Editar', value: 6125 },
                        { name: 'Excluir', value: 2340 },
                        { name: 'Login', value: 2185 },
                        { name: 'Outros', value: 1240 },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl p-6"
              style={{ background: 'var(--nexus-card)', border: '1px solid rgba(var(--nexus-gold-rgb), 0.2)' }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--nexus-text)' }}>Usuários mais ativos</h3>
              <div className="space-y-3">
                {[
                  { name: 'Clayton Marcelo', actions: 4850 },
                  { name: 'Ana Beatriz', actions: 3620 },
                  { name: 'Carlos Eduardo', actions: 2980 },
                  { name: 'Juliana Martins', actions: 2450 },
                  { name: 'Maria Costa', actions: 1850 },
                ].map((user, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: 'rgba(var(--nexus-gold-rgb), 0.05)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                        style={{ background: 'var(--nexus-gold)', color: '#000' }}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium" style={{ color: 'var(--nexus-text)' }}>{user.name}</span>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: 'var(--nexus-gold)' }}>{user.actions} ações</span>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200"
                style={{ background: 'rgba(var(--nexus-gold-rgb), 0.15)', color: 'var(--nexus-gold)', border: '1px solid rgba(var(--nexus-gold-rgb), 0.25)' }}>
                Ver todos os usuários →
              </button>
            </div>

            <div className="rounded-xl p-6"
              style={{ background: 'var(--nexus-card)', border: '1px solid rgba(var(--nexus-gold-rgb), 0.2)' }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--nexus-text)' }}>Últimas ações críticas</h3>
              <div className="space-y-3">
                {[
                  { desc: 'Exclusão de fornecedor Tech Solutions Ltda' },
                  { desc: 'Cancelamento de compra Compra #CMP-2024-984' },
                  { desc: 'Falha de pagamento Pagamento #PAG-2024-1563' },
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg"
                    style={{ background: 'rgba(239, 68, 68, 0.05)' }}>
                    <ExclamationTriangleIcon className="w-5 h-5 mt-0.5" style={{ color: '#EF4444' }} />
                    <p className="text-sm" style={{ color: 'var(--nexus-text)' }}>{item.desc}</p>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200"
                style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                Ver todas as ações críticas →
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
