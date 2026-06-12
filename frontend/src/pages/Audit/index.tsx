import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ClipboardDocumentListIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  EllipsisVerticalIcon,
  ShieldExclamationIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import api from '../../services/api'
import { AuditLog } from '../../types'
import { useToast } from '../../contexts/ToastContext'

const PIE_COLORS = [
  'var(--nexus-success)', 'var(--nexus-chart-blue)',
  'var(--nexus-gold)', 'var(--nexus-chart-purple)', 'var(--nexus-muted)',
]

const cardStyle = {
  background: 'var(--nexus-card)',
  border: '1px solid var(--nexus-border)',
  boxShadow: 'var(--nexus-shadow)',
} as const

const topAccentStyle = {
  background: 'linear-gradient(90deg, transparent, var(--nexus-gold), transparent)',
  opacity: 0.3,
} as const

const actionBadgeColors: Record<string, { bg: string; text: string }> = {
  create: { bg: 'rgba(125,218,106,0.12)', text: 'var(--nexus-success)' },
  update: { bg: 'rgba(59,130,246,0.12)', text: 'var(--nexus-chart-blue)' },
  delete: { bg: 'rgba(216,154,40,0.12)', text: 'var(--nexus-warning)' },
  login: { bg: 'rgba(167,139,250,0.12)', text: 'var(--nexus-chart-purple)' },
  backup: { bg: 'rgba(216,75,95,0.12)', text: 'var(--nexus-danger)' },
}

const dadosMock = [
  { user: 'Clayton Marcelo', role: 'Administrador', action: 'create', module: 'Clientes', desc: 'Cliente "João Silva" foi cadastrado', ip: '192.168.1.100', data: '05/06/2026 14:32', device: 'Desktop' },
  { user: 'Ana Beatriz', role: 'Vendas', action: 'update', module: 'Vendas', desc: 'Venda #VDA-2024-1587 foi editada', ip: '192.168.1.101', data: '05/06/2026 14:28', device: 'Desktop' },
  { user: 'Carlos Eduardo', role: 'Financeiro', action: 'delete', module: 'Compras', desc: 'Compra #CMP-2024-984 foi cancelada', ip: '192.168.1.102', data: '05/06/2026 14:25', device: 'Mobile' },
  { user: 'Juliana Martins', role: 'Atendimento', action: 'create', module: 'CRM', desc: 'Interação #INT-2024-2540 foi criada', ip: '192.168.1.103', data: '05/06/2026 14:20', device: 'Desktop' },
  { user: 'Clayton Marcelo', role: 'Administrador', action: 'login', module: 'Sistema', desc: 'Login realizado com sucesso', ip: '192.168.1.100', data: '05/06/2026 14:15', device: 'Desktop' },
  { user: 'Maria Costa', role: 'Estoque', action: 'update', module: 'Produtos', desc: 'Produto "Notebook Dell Inspiron 15" editado', ip: '192.168.1.104', data: '05/06/2026 14:10', device: 'Tablet' },
  { user: 'Roberto Pereira', role: 'Compras', action: 'delete', module: 'Fornecedores', desc: 'Fornecedor "Tech Solutions Ltda" excluído', ip: '192.168.1.105', data: '05/06/2026 14:05', device: 'Desktop' },
  { user: 'Ana Beatriz', role: 'Vendas', action: 'update', module: 'Clientes', desc: 'Cliente "Maria Costa" editado', ip: '192.168.1.101', data: '05/06/2026 14:00', device: 'Desktop' },
  { user: 'Carlos Eduardo', role: 'Financeiro', action: 'create', module: 'Financeiro', desc: 'Conta a pagar "Aluguel" criada', ip: '192.168.1.102', data: '05/06/2026 13:55', device: 'Desktop' },
  { user: 'Sistema', role: 'Automático', action: 'backup', module: 'Sistema', desc: 'Backup automático realizado', ip: '-', data: '05/06/2026 13:50', device: 'Desktop' },
]

function iconeModulo(modulo: string) {
  const mapa: Record<string, string> = {
    Clientes: '👥', Vendas: '💰', Compras: '📦', Financeiro: '📊',
    Produtos: '📋', CRM: '🤝', Estoque: '📦', Fornecedores: '🚚', Sistema: '⚙️',
  }
  return mapa[modulo] || '📌'
}

function iconeDispositivo(device: string) {
  if (device?.toLowerCase().includes('mobile')) return <DevicePhoneMobileIcon className="w-4 h-4" />
  if (device?.toLowerCase().includes('tablet')) return <DevicePhoneMobileIcon className="w-4 h-4" />
  return <ComputerDesktopIcon className="w-4 h-4" />
}

export function Audit() {
  const { showToast } = useToast()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroUsuario, setFiltroUsuario] = useState('')
  const [filtroAcao, setFiltroAcao] = useState('')
  const [filtroModulo, setFiltroModulo] = useState('')
  const [filtroPeriodo, setFiltroPeriodo] = useState('')
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const TAMANHO_PAGINA = 10

  useEffect(() => { carregar() }, [pagina, filtroUsuario, filtroAcao, filtroModulo, filtroPeriodo])

  async function carregar() {
    try {
      setCarregando(true)
      const params: any = { page: pagina, limit: TAMANHO_PAGINA }
      if (busca) params.search = busca
      if (filtroUsuario) params.user_id = filtroUsuario
      if (filtroAcao) params.action = filtroAcao
      if (filtroModulo) params.entity_type = filtroModulo
      if (filtroPeriodo) params.period = filtroPeriodo
      const res = await api.get('/audit', { params })
      setLogs(res.data?.data || [])
      setTotalPaginas(res.data?.totalPages || 1)
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao carregar auditoria', 'error')
    } finally { setCarregando(false) }
  }

  const statsUsuarios = useMemo(() => {
    const stats: Record<string, number> = {}
    dadosMock.forEach((log) => { stats[log.user] = (stats[log.user] || 0) + 1 })
    return Object.entries(stats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5)
  }, [])

  const actionLabel = (action: string) => {
    const labels: Record<string, string> = {
      create: 'Criar', update: 'Editar', delete: 'Excluir',
      login: 'Login', backup: 'Backup',
    }
    return labels[action] || action
  }

  return (
    <div className="p-5 space-y-5 bg-transparent">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--nexus-text)' }}>Auditoria</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--nexus-muted)' }}>Monitore todas as ações realizadas no sistema</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { icon: ClipboardDocumentListIcon, label: 'Total de eventos', value: '18.732', trend: '+15,7%', up: true },
          { icon: UserGroupIcon, label: 'Usuários ativos', value: '24', trend: '+9,1%', up: true },
          { icon: ShieldExclamationIcon, label: 'Ações críticas', value: '128', trend: '-8,3%', up: false },
          { icon: ClockIcon, label: 'Último acesso', value: '05/06/2026 14:32', info: 'Há 2 minutos' },
        ].map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.05 }}
            whileHover={{ y: -2 }}
            className="rounded-2xl p-5 relative overflow-hidden"
            style={cardStyle}
          >
            <div className="absolute top-0 left-0 w-full h-px" style={topAccentStyle} />
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(212,149,86,0.10)', color: 'var(--nexus-gold)' }}>
                <card.icon className="w-5 h-5" />
              </div>
              {card.trend && (
                <span className="text-xs font-semibold px-2 py-1 rounded-full"
                  style={{
                    background: card.up ? 'rgba(125,218,106,0.12)' : 'rgba(216,75,95,0.12)',
                    color: card.up ? 'var(--nexus-success)' : 'var(--nexus-danger)',
                  }}>
                  {card.trend}
                </span>
              )}
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--nexus-gold)' }}>{card.label}</p>
              <p className={`font-bold ${card.info ? 'text-base' : 'text-2xl'}`} style={{ color: 'var(--nexus-text)' }}>
                {card.value}
              </p>
              {card.info && <p className="text-xs mt-1" style={{ color: 'var(--nexus-muted-2)' }}>{card.info}</p>}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Audit logs table */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="lg:col-span-3 rounded-2xl p-5 relative overflow-hidden"
          style={cardStyle}
        >
          <div className="absolute top-0 left-0 w-full h-px" style={topAccentStyle} />
          
          {/* Filters */}
          <div className="flex items-center gap-4 hide-scrollbar mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[180px] max-w-[320px]">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--nexus-muted)' }} />
              <input
                type="text"
                placeholder="Buscar por usuário, ação ou módulo..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-lg text-sm"
                style={{
                  background: 'var(--nexus-bg-soft)',
                  border: '1px solid var(--nexus-border)',
                  color: 'var(--nexus-text)',
                }}
              />
            </div>

            <div className="flex items-center gap-3 ml-auto flex-wrap">
              <select
                value={filtroUsuario}
                onChange={(e) => setFiltroUsuario(e.target.value)}
                className="h-10 px-3 rounded-lg text-sm"
                style={{
                  background: 'var(--nexus-bg-soft)',
                  border: '1px solid var(--nexus-border)',
                  color: 'var(--nexus-text)',
                }}
              >
                <option value="" style={{ background: 'var(--nexus-bg)', color: 'var(--nexus-text)' }}>Usuário</option>
                <option style={{ background: 'var(--nexus-bg)', color: 'var(--nexus-text)' }}>Clayton Marcelo</option>
                <option style={{ background: 'var(--nexus-bg)', color: 'var(--nexus-text)' }}>Ana Beatriz</option>
                <option style={{ background: 'var(--nexus-bg)', color: 'var(--nexus-text)' }}>Carlos Eduardo</option>
              </select>
              <select
                value={filtroAcao}
                onChange={(e) => setFiltroAcao(e.target.value)}
                className="h-10 px-3 rounded-lg text-sm"
                style={{
                  background: 'var(--nexus-bg-soft)',
                  border: '1px solid var(--nexus-border)',
                  color: 'var(--nexus-text)',
                }}
              >
                <option value="" style={{ background: 'var(--nexus-bg)', color: 'var(--nexus-text)' }}>Ação</option>
                <option value="create" style={{ background: 'var(--nexus-bg)', color: 'var(--nexus-text)' }}>Criar</option>
                <option value="update" style={{ background: 'var(--nexus-bg)', color: 'var(--nexus-text)' }}>Editar</option>
                <option value="delete" style={{ background: 'var(--nexus-bg)', color: 'var(--nexus-text)' }}>Excluir</option>
                <option value="login" style={{ background: 'var(--nexus-bg)', color: 'var(--nexus-text)' }}>Login</option>
              </select>
              <select
                value={filtroModulo}
                onChange={(e) => setFiltroModulo(e.target.value)}
                className="h-10 px-3 rounded-lg text-sm"
                style={{
                  background: 'var(--nexus-bg-soft)',
                  border: '1px solid var(--nexus-border)',
                  color: 'var(--nexus-text)',
                }}
              >
                <option value="" style={{ background: 'var(--nexus-bg)', color: 'var(--nexus-text)' }}>Módulo</option>
                <option style={{ background: 'var(--nexus-bg)', color: 'var(--nexus-text)' }}>Clientes</option>
                <option style={{ background: 'var(--nexus-bg)', color: 'var(--nexus-text)' }}>Vendas</option>
                <option style={{ background: 'var(--nexus-bg)', color: 'var(--nexus-text)' }}>Compras</option>
                <option style={{ background: 'var(--nexus-bg)', color: 'var(--nexus-text)' }}>Financeiro</option>
              </select>
              <select
                value={filtroPeriodo}
                onChange={(e) => setFiltroPeriodo(e.target.value)}
                className="h-10 px-3 rounded-lg text-sm"
                style={{
                  background: 'var(--nexus-bg-soft)',
                  border: '1px solid var(--nexus-border)',
                  color: 'var(--nexus-text)',
                }}
              >
                <option value="" style={{ background: 'var(--nexus-bg)', color: 'var(--nexus-text)' }}>Período</option>
                <option value="today" style={{ background: 'var(--nexus-bg)', color: 'var(--nexus-text)' }}>Hoje</option>
                <option value="week" style={{ background: 'var(--nexus-bg)', color: 'var(--nexus-text)' }}>Esta semana</option>
                <option value="month" style={{ background: 'var(--nexus-bg)', color: 'var(--nexus-text)' }}>Este mês</option>
              </select>
              <button
                className="h-10 px-4 rounded-lg text-sm font-medium flex items-center gap-2 whitespace-nowrap flex-shrink-0"
                style={{
                  background: 'var(--nexus-bg-soft)',
                  border: '1px solid var(--nexus-border)',
                  color: 'var(--nexus-gold)',
                }}
              >
                <FunnelIcon className="w-4 h-4" />
                Mais filtros
              </button>
              <div className="flex-shrink-0">
                <button
                  className="h-10 px-4 rounded-lg text-sm font-medium flex items-center gap-2 whitespace-nowrap"
                  style={{
                    background: 'linear-gradient(135deg, #D66F7C, #C94D60)',
                    border: 'none',
                    color: 'var(--nexus-text)',
                    boxShadow: '0 0 20px rgba(201,77,96,0.25)',
                  }}
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Exportar
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="">
            <table className="w-full text-left" style={{ fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--nexus-border)' }}>
                  {['Data/Hora', 'Usuário', 'Ação', 'Módulo', 'Descrição', 'IP', 'Dispositivo', ''].map((h) => (
                    <th key={h} className="pb-2 pr-2 font-semibold uppercase tracking-wider whitespace-normal break-words"
                      style={{ color: 'var(--nexus-muted-2)', fontSize: 10 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dadosMock.map((log, idx) => (
                  <tr
                    key={idx}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid var(--nexus-border)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--nexus-bg-soft)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <td className="py-2 pr-2 whitespace-normal break-words" style={{ color: 'var(--nexus-muted)' }}>{log.data}</td>
                    <td className="py-2 pr-2 whitespace-normal break-words">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: 'linear-gradient(135deg, var(--nexus-gold), #C8863E)', color: '#000' }}>
                          {log.user.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--nexus-text)' }}>{log.user}</p>
                          <p className="text-xs" style={{ color: 'var(--nexus-muted)' }}>{log.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 pr-2 whitespace-normal break-words">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          background: actionBadgeColors[log.action]?.bg || 'rgba(128,128,128,0.12)',
                          color: actionBadgeColors[log.action]?.text || 'var(--nexus-muted)',
                        }}>
                        {actionLabel(log.action)}
                      </span>
                    </td>
                    <td className="py-2 pr-2 whitespace-normal break-words">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                          style={{ background: 'var(--nexus-bg-soft)', border: '1px solid rgba(212,149,86,0.3)' }}>
                          {iconeModulo(log.module)}
                        </div>
                        <span className="text-sm" style={{ color: 'var(--nexus-muted)' }}>{log.module}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-2 max-w-[200px] truncate whitespace-normal break-words" style={{ color: 'var(--nexus-muted-2)' }}>{log.desc}</td>
                    <td className="py-2 pr-2 font-mono text-xs whitespace-normal break-words" style={{ color: 'var(--nexus-muted-2)' }}>{log.ip}</td>
                    <td className="py-2 pr-2 whitespace-normal break-words">
                      <div className="flex items-center gap-1" style={{ color: 'var(--nexus-gold)' }}>
                        {iconeDispositivo(log.device)}
                        <span className="text-xs">{log.device}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-2 whitespace-normal break-words">
                      <button className="w-8 h-8 rounded-lg flex items-center justify-center whitespace-nowrap"
                        style={{ background: 'var(--nexus-bg-soft)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-muted)' }}>
                        <EllipsisVerticalIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm" style={{ color: 'var(--nexus-muted)' }}>Mostrando 1 a 10 de 18.732 registros</p>
            <div className="flex items-center gap-1">
              <button className="w-9 h-9 rounded-lg flex items-center justify-center whitespace-nowrap"
                style={{ background: 'var(--nexus-bg-soft)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-muted)' }}>
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <button className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm whitespace-nowrap"
                style={{ background: 'linear-gradient(135deg, #D66F7C, #C94D60)', border: 'none', color: 'var(--nexus-text)' }}>1</button>
              {[2, 3].map((n) => (
                <button key={n} className="w-9 h-9 rounded-lg flex items-center justify-center text-sm whitespace-nowrap"
                  style={{ background: 'var(--nexus-bg-soft)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-muted)' }}>{n}</button>
              ))}
              <span className="px-1" style={{ color: 'var(--nexus-muted)' }}>...</span>
              <button className="w-9 h-9 rounded-lg flex items-center justify-center text-sm whitespace-nowrap"
                style={{ background: 'var(--nexus-bg-soft)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-muted)' }}>1874</button>
              <button className="w-9 h-9 rounded-lg flex items-center justify-center whitespace-nowrap"
                style={{ background: 'var(--nexus-bg-soft)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-muted)' }}>
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Events by module */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="rounded-2xl p-5 relative overflow-hidden"
            style={cardStyle}
          >
            <div className="absolute top-0 left-0 w-full h-px" style={topAccentStyle} />
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--nexus-text)' }}>Eventos por módulo</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Vendas', value: 4250 },
                      { name: 'Clientes', value: 3890 },
                      { name: 'Produtos', value: 2980 },
                      { name: 'Financeiro', value: 2750 },
                      { name: 'Outros', value: 4862 },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {[4250, 3890, 2980, 2750, 4862].map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {[
                { name: 'Vendas', val: '4.250' },
                { name: 'Clientes', val: '3.890' },
                { name: 'Produtos', val: '2.980' },
                { name: 'Financeiro', val: '2.750' },
                { name: 'Outros', val: '4.862' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                    <span className="text-xs" style={{ color: 'var(--nexus-text)' }}>{item.name}</span>
                  </div>
                  <span className="text-xs font-medium" style={{ color: 'var(--nexus-muted)' }}>{item.val}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Actions by type */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            className="rounded-2xl p-5 relative overflow-hidden"
            style={cardStyle}
          >
            <div className="absolute top-0 left-0 w-full h-px" style={topAccentStyle} />
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--nexus-text)' }}>Ações por tipo</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Criar', value: 6842 },
                      { name: 'Editar', value: 6125 },
                      { name: 'Excluir', value: 2340 },
                      { name: 'Login', value: 2185 },
                      { name: 'Outros', value: 1240 },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {[6842, 6125, 2340, 2185, 1240].map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {[
                { name: 'Criar', val: '6.842' },
                { name: 'Editar', val: '6.125' },
                { name: 'Excluir', val: '2.340' },
                { name: 'Login', val: '2.185' },
                { name: 'Outros', val: '1.240' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                    <span className="text-xs" style={{ color: 'var(--nexus-text)' }}>{item.name}</span>
                  </div>
                  <span className="text-xs font-medium" style={{ color: 'var(--nexus-muted)' }}>{item.val}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Most active users */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2 }}
            className="rounded-2xl p-5 relative overflow-hidden"
            style={cardStyle}
          >
            <div className="absolute top-0 left-0 w-full h-px" style={topAccentStyle} />
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--nexus-text)' }}>Usuários mais ativos</h3>
            <div className="space-y-2">
              {statsUsuarios.map((u, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--nexus-bg-soft)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: 'linear-gradient(135deg, var(--nexus-gold), #C8863E)', color: '#000' }}>
                      {u.name.charAt(0)}
                    </div>
                    <span className="text-sm font-medium" style={{ color: 'var(--nexus-text)' }}>{u.name}</span>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--nexus-gold)' }}>{u.value} ações</span>
                </div>
              ))}
            </div>
            <button className="w-full mt-3 py-2 rounded-lg text-sm font-medium border whitespace-nowrap"
              style={{
                background: 'transparent',
                borderColor: 'rgba(212,149,86,0.2)',
                color: 'var(--nexus-gold)',
              }}>
              Ver todos os usuários →
            </button>
          </motion.div>

          {/* Critical actions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.25 }}
            className="rounded-2xl p-5 relative overflow-hidden"
            style={cardStyle}
          >
            <div className="absolute top-0 left-0 w-full h-px" style={topAccentStyle} />
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--nexus-text)' }}>Últimas ações críticas</h3>
            <div className="space-y-2">
              {[
                { desc: 'Exclusão de fornecedor Tech Solutions Ltda', data: '05/06/2026 14:25' },
                { desc: 'Cancelamento de compra #CMP-2024-984', data: '05/06/2026 14:25' },
                { desc: 'Falha de pagamento #PAG-2024-1563', data: '05/06/2026 14:22' },
              ].map((item, idx) => (
                <div key={idx} className="flex gap-2 p-2 rounded-lg" style={{ background: 'rgba(216,75,95,0.04)' }}>
                  <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--nexus-danger)' }} />
                  <div>
                    <p className="text-sm" style={{ color: 'var(--nexus-text)' }}>{item.desc}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--nexus-muted)' }}>{item.data}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-3 py-2 rounded-lg text-sm font-medium border whitespace-nowrap"
              style={{
                background: 'transparent',
                borderColor: 'rgba(216,75,95,0.2)',
                color: 'var(--nexus-danger)',
              }}>
              Ver todas as ações críticas →
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
