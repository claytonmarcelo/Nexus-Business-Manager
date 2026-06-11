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
} from '@heroicons/react/24/outline'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import api from '../../services/api'
import { AuditLog } from '../../types'
import { useToast } from '../../contexts/ToastContext'

const CORES = {
  verde: '#5EDC74',
  azul: '#31A9FF',
  laranja: '#F2A33D',
  roxo: '#B366FF',
  cinza: '#808080',
  vermelho: '#FF5D5D',
  rosa: '#F069A8',
  dourado: '#D89A4D',
  douradoClaro: '#F2B35E',
  laranjaPremium: '#E28A3F',
}

const CORES_GRAFICO = ['#5EDC74', '#31A9FF', '#F2A33D', '#B366FF', '#808080']

const DADOS_MOCK = [
  { user: 'Clayton Marcelo', role: 'Administrador', action: 'Criar', module: 'Clientes', desc: 'Cliente "João Silva" foi cadastrado', ip: '192.168.1.100', date: '05/06/2026 14:32', device: 'Desktop' },
  { user: 'Ana Beatriz', role: 'Vendas', action: 'Editar', module: 'Vendas', desc: 'Venda #VDA-2024-1587 foi editada', ip: '192.168.1.101', date: '05/06/2026 14:28', device: 'Desktop' },
  { user: 'Carlos Eduardo', role: 'Financeiro', action: 'Excluir', module: 'Compras', desc: 'Compra #CMP-2024-984 foi cancelada', ip: '192.168.1.102', date: '05/06/2026 14:25', device: 'Mobile' },
  { user: 'Juliana Martins', role: 'Atendimento', action: 'Criar', module: 'CRM', desc: 'Interação #INT-2024-2540 foi criada', ip: '192.168.1.103', date: '05/06/2026 14:20', device: 'Desktop' },
  { user: 'Clayton Marcelo', role: 'Administrador', action: 'Login', module: 'Sistema', desc: 'Login realizado com sucesso', ip: '192.168.1.100', date: '05/06/2026 14:15', device: 'Desktop' },
  { user: 'Maria Costa', role: 'Estoque', action: 'Editar', module: 'Produtos', desc: 'Produto "Notebook Dell Inspiron 15" editado', ip: '192.168.1.104', date: '05/06/2026 14:10', device: 'Tablet' },
  { user: 'Roberto Pereira', role: 'Compras', action: 'Excluir', module: 'Fornecedores', desc: 'Fornecedor "Tech Solutions Ltda" excluído', ip: '192.168.1.105', date: '05/06/2026 14:05', device: 'Desktop' },
  { user: 'Ana Beatriz', role: 'Vendas', action: 'Editar', module: 'Clientes', desc: 'Cliente "Maria Costa" editado', ip: '192.168.1.101', date: '05/06/2026 14:00', device: 'Desktop' },
  { user: 'Carlos Eduardo', role: 'Financeiro', action: 'Criar', module: 'Financeiro', desc: 'Conta a pagar "Aluguel" criada', ip: '192.168.1.102', date: '05/06/2026 13:55', device: 'Desktop' },
  { user: 'Sistema', role: 'Automático', action: 'Backup', module: 'Sistema', desc: 'Backup automático realizado', ip: '-', date: '05/06/2026 13:50', device: 'Desktop' },
]

const AVATARES: Record<string, string> = {
  'Clayton Marcelo': '',
  'Ana Beatriz': '',
  'Carlos Eduardo': '',
  'Juliana Martins': '',
  'Maria Costa': '',
  'Roberto Pereira': '',
  'Sistema': '',
}

function corAcao(acao: string) {
  const mapa: Record<string, string> = {
    Criar: CORES.verde,
    Editar: CORES.azul,
    Excluir: CORES.laranja,
    Login: CORES.roxo,
    Backup: CORES.rosa,
  }
  return mapa[acao] || CORES.dourado
}

function iconeModulo(modulo: string) {
  const mapa: Record<string, string> = {
    Clientes: '👥',
    Vendas: '💰',
    Compras: '📦',
    Financeiro: '📊',
    Produtos: '📋',
    CRM: '🤝',
    Estoque: '📦',
    Fornecedores: '🚚',
    Sistema: '⚙️',
  }
  return mapa[modulo] || '📌'
}

function iconeDispositivo(device: string) {
  if (device?.toLowerCase().includes('mobile')) return <DevicePhoneMobileIcon className="w-4 h-4" />
  return <ComputerDesktopIcon className="w-4 h-4" />
}

export function Audit() {
  const { showToast } = useToast()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterModule, setFilterModule] = useState('')
  const [filterPeriod, setFilterPeriod] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const PAGE_SIZE = 10

  useEffect(() => { load() }, [page, filterUser, filterAction, filterModule, filterPeriod])

  async function load() {
    try {
      setLoading(true)
      const params: any = { page, limit: PAGE_SIZE }
      if (search) params.search = search
      if (filterUser) params.user_id = filterUser
      if (filterAction) params.action = filterAction
      if (filterModule) params.entity_type = filterModule
      if (filterPeriod) params.period = filterPeriod
      const res = await api.get('/audit', { params })
      setLogs(res.data?.data || [])
      setTotalPages(res.data?.totalPages || 1)
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.response?.data?.error || 'Erro ao carregar auditoria'
      showToast(errorMsg, 'error')
    } finally { setLoading(false) }
  }

  function actionLabel(action: string) {
    const map: Record<string, string> = {
      create: 'Criar',
      update: 'Editar',
      delete: 'Excluir',
      login: 'Login',
      backup: 'Backup',
    }
    return map[action] || action
  }

  const userStats = useMemo(() => {
    const stats: Record<string, number> = {}
    DADOS_MOCK.forEach(log => {
      stats[log.user] = (stats[log.user] || 0) + 1
    })
    return Object.entries(stats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  } as const
  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  } as const

  return (
    <div style={{ position: 'relative', background: '#050505' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(200,134,62,0.04) 0%, transparent 60%), repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.005) 2px, rgba(255,255,255,0.005) 3px)' }} />
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-[1440px] mx-auto" style={{ position: 'relative', zIndex: 1 }}>

        {/* TITULO */}
        <motion.div variants={itemVariants} className="mb-6">
          <h1 className="font-bold tracking-tight" style={{ fontFamily: 'Inter, "Segoe UI", Roboto, Arial, sans-serif', fontSize: 'clamp(28px, 4vw, 48px)', color: '#FFFFFF', lineHeight: 1.1 }}>
            Auditoria
          </h1>
          <p style={{ fontFamily: 'Inter, "Segoe UI", Roboto, Arial, sans-serif', fontSize: 'clamp(14px, 1.5vw, 18px)', fontWeight: 400, color: '#D8D8D8', marginTop: 4 }}>
            Monitore todas as ações realizadas no sistema
          </p>
        </motion.div>

        {/* CARDS DE METRICAS */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {[
            { icon: ClipboardDocumentListIcon, label: 'Total de eventos', value: '18.732', indicator: '↑ 15,7%', positive: true, color: CORES.verde },
            { icon: UserGroupIcon, label: 'Usuários ativos', value: '24', indicator: '↑ 9,1%', positive: true, color: CORES.verde },
            { icon: ExclamationTriangleIcon, label: 'Ações críticas', value: '128', indicator: '↓ 8,3%', positive: false, color: CORES.vermelho },
            { icon: ClockIcon, label: 'Último acesso', value: '05/06/2026 14:32', sub: 'Há 2 minutos' },
          ].map((card, i) => (
            <div
              key={i}
              className="transition-all duration-[0.25s] ease-out hover:-translate-y-0.5"
              style={{
                minHeight: 120,
                background: 'linear-gradient(135deg, #0D0D0D 0%, #121212 100%)',
                border: '1px solid #1F1A14',
                borderRadius: 16,
                boxShadow: '0 10px 30px rgba(0,0,0,0.40)',
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div className="flex items-center justify-between">
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 12,
                    background: '#24180F',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <card.icon className="w-5 h-5" style={{ color: '#E28A3F' }} />
                </div>
                {card.indicator && (
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      background: card.positive ? 'rgba(94, 220, 116, 0.15)' : 'rgba(255, 93, 93, 0.15)',
                      color: card.color,
                    }}
                  >
                    {card.indicator}
                  </span>
                )}
              </div>
              <div>
                <p style={{ fontSize: 13, color: '#D89A4D', fontWeight: 500, marginBottom: 2 }}>{card.label}</p>
                <p style={{ fontSize: card.sub ? 14 : 26, fontWeight: card.sub ? 600 : 700, color: '#FFFFFF', lineHeight: 1.1 }}>
                  {card.value}
                </p>
                {card.sub && <p style={{ fontSize: 12, color: '#9A9A9A', marginTop: 2 }}>{card.sub}</p>}
              </div>
            </div>
          ))}
        </motion.div>

        {/* GRID PRINCIPAL: TABELA + SIDEBAR */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(250px,300px)] gap-6">

          {/* COLUNA ESQUERDA - TABELA */}
          <motion.div variants={itemVariants} className="min-w-0">
            <div
              style={{
                background: '#0D0D0D',
                border: '1px solid #1F1A14',
                borderRadius: 16,
                boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                padding: 24,
              }}
            >
              {/* FILTROS */}
              <div className="flex flex-wrap gap-2 mb-6">
                <div className="relative flex-[2] min-w-[200px]">
                  <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#D89A4D' }} />
                  <input
                    type="text"
                    placeholder="Buscar por usuário, ação ou módulo..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                      width: '100%',
                      height: 42,
                      background: '#0D0D0D',
                      border: '1px solid #2A2117',
                      borderRadius: 10,
                      padding: '0 14px 0 40px',
                      color: '#FFFFFF',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>
                <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)}
                  style={{ height: 42, background: '#0D0D0D', border: '1px solid #2A2117', borderRadius: 10, color: '#D8D8D8', fontSize: 13, padding: '0 10px', outline: 'none', minWidth: 110, maxWidth: 140 }}>
                  <option value="">Usuário</option>
                  <option>Clayton Marcelo</option>
                  <option>Ana Beatriz</option>
                  <option>Carlos Eduardo</option>
                </select>
                <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}
                  style={{ height: 42, background: '#0D0D0D', border: '1px solid #2A2117', borderRadius: 10, color: '#D8D8D8', fontSize: 13, padding: '0 10px', outline: 'none', minWidth: 80, maxWidth: 110 }}>
                  <option value="">Ação</option>
                  <option value="create">Criar</option>
                  <option value="update">Editar</option>
                  <option value="delete">Excluir</option>
                  <option value="login">Login</option>
                </select>
                <select value={filterModule} onChange={(e) => setFilterModule(e.target.value)}
                  style={{ height: 42, background: '#0D0D0D', border: '1px solid #2A2117', borderRadius: 10, color: '#D8D8D8', fontSize: 13, padding: '0 10px', outline: 'none', minWidth: 90, maxWidth: 120 }}>
                  <option value="">Módulo</option>
                  <option>Clientes</option>
                  <option>Vendas</option>
                  <option>Compras</option>
                  <option>Financeiro</option>
                </select>
                <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)}
                  style={{ height: 42, background: '#0D0D0D', border: '1px solid #2A2117', borderRadius: 10, color: '#D8D8D8', fontSize: 13, padding: '0 10px', outline: 'none', minWidth: 80, maxWidth: 110 }}>
                  <option value="">Período</option>
                  <option value="today">Hoje</option>
                  <option value="week">Esta semana</option>
                  <option value="month">Este mês</option>
                </select>
                <button
                  style={{ height: 42, padding: '0 12px', background: '#1A120D', border: '1px solid #2A2117', borderRadius: 10, color: '#D89A4D', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                  <FunnelIcon className="w-4 h-4" />
                  Mais filtros
                </button>
                <button
                  style={{ height: 42, padding: '0 14px', background: 'linear-gradient(135deg, #D66F7C, #C94D60)', border: 'none', borderRadius: 10, color: '#FFFFFF', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', boxShadow: '0 0 20px rgba(201,77,96,0.25)' }}>
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Exportar
                </button>
              </div>

              {/* TABELA */}
              <div className="overflow-x-auto">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#101010' }}>
                      {['Data/Hora', 'Usuário', 'Ação', 'Módulo', 'Descrição', 'IP', 'Dispositivo', ''].map((h) => (
                        <th key={h} style={{ padding: '14px 14px', fontSize: 11, fontWeight: 600, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DADOS_MOCK.map((log, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          transition: 'background 0.2s ease',
                        }}
                        className="hover:bg-[rgba(255,255,255,0.015)]"
                      >
                        <td style={{ padding: '14px 14px', fontSize: 13, color: '#9A9A9A', whiteSpace: 'nowrap' }}>{log.date}</td>
                        <td style={{ padding: '14px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #D89A4D, #C8863E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#000', flexShrink: 0 }}>
                              {log.user.charAt(0)}
                            </div>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 500, color: '#FFFFFF', margin: 0, lineHeight: 1.3 }}>{log.user}</p>
                              <p style={{ fontSize: 11, color: '#9A9A9A', margin: 0 }}>{log.role}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 14px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '4px 14px',
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 600,
                              background: `${corAcao(log.action)}18`,
                              color: corAcao(log.action),
                              textAlign: 'center',
                              lineHeight: 1.4,
                            }}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: '14px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 6, background: '#0D0D0D', border: '1px solid rgba(200,134,62,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
                              {iconeModulo(log.module)}
                            </div>
                            <span style={{ fontSize: 13, color: '#D8D8D8' }}>{log.module}</span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 14px', fontSize: 13, color: '#BDBDBD', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.desc}</td>
                        <td style={{ padding: '14px 14px', fontSize: 13, color: '#8F8F8F', fontFamily: 'monospace' }}>{log.ip}</td>
                        <td style={{ padding: '14px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#F2B35E' }}>
                            {iconeDispositivo(log.device)}
                            <span style={{ fontSize: 12 }}>{log.device}</span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 14px' }}>
                          <button
                            style={{ width: 32, height: 32, borderRadius: 8, background: '#111111', border: '1px solid #2A2117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D8D8D8', cursor: 'pointer' }}
                          >
                            <EllipsisVerticalIcon className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* PAGINAÇÃO */}
              <div className="flex items-center justify-between mt-6">
                <p style={{ fontSize: 13, color: '#9A9A9A' }}>
                  Mostrando 1 a 10 de 18.732 registros
                </p>
                <div className="flex items-center gap-2">
                  <button style={{ width: 36, height: 36, borderRadius: 8, background: '#111111', border: '1px solid #2A2117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D8D8D8', cursor: 'pointer' }}>
                    <ChevronLeftIcon className="w-4 h-4" />
                  </button>
                  <button style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, #D66F7C, #C94D60)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>1</button>
                  {[2, 3].map((n) => (
                    <button key={n} style={{ width: 36, height: 36, borderRadius: 8, background: '#111111', border: '1px solid #2A2117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D8D8D8', fontSize: 13, cursor: 'pointer' }}>{n}</button>
                  ))}
                  <span style={{ color: '#9A9A9A', padding: '0 4px' }}>...</span>
                  <button style={{ width: 36, height: 36, borderRadius: 8, background: '#111111', border: '1px solid #2A2117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D8D8D8', fontSize: 13, cursor: 'pointer' }}>1874</button>
                  <button style={{ width: 36, height: 36, borderRadius: 8, background: '#111111', border: '1px solid #2A2117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D8D8D8', cursor: 'pointer' }}>
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* SIDEBAR DIREITA - 300px */}
          <motion.div variants={itemVariants} className="space-y-5">

            {/* GRAFICO DONUT - Eventos por módulo */}
            <div style={{ background: '#0D0D0D', border: '1px solid #1F1A14', borderRadius: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.35)', padding: 22 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#FFFFFF', marginBottom: 16 }}>Eventos por módulo</h3>
              <div style={{ height: 200 }}>
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
                      cx="50%" cy="50%"
                      innerRadius={55}
                      outerRadius={78}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {[4250, 3890, 2980, 2750, 4862].map((_, idx) => (
                        <Cell key={idx} fill={CORES_GRAFICO[idx % CORES_GRAFICO.length]} stroke="none" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
                {[
                  { name: 'Vendas', color: CORES.verde, value: '4.250' },
                  { name: 'Clientes', color: CORES.azul, value: '3.890' },
                  { name: 'Produtos', color: CORES.laranja, value: '2.980' },
                  { name: 'Financeiro', color: CORES.roxo, value: '2.750' },
                  { name: 'Outros', color: CORES.cinza, value: '4.862' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                      <span style={{ fontSize: 12, color: '#FFFFFF' }}>{item.name}</span>
                    </div>
                    <span style={{ fontSize: 12, color: '#9A9A9A' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* GRAFICO DONUT - Ações por tipo */}
            <div style={{ background: '#0D0D0D', border: '1px solid #1F1A14', borderRadius: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.35)', padding: 22 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#FFFFFF', marginBottom: 16 }}>Ações por tipo</h3>
              <div style={{ height: 200 }}>
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
                      cx="50%" cy="50%"
                      innerRadius={55}
                      outerRadius={78}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {[6842, 6125, 2340, 2185, 1240].map((_, idx) => (
                        <Cell key={idx} fill={['#5EDC74', '#31A9FF', '#F2A33D', '#B366FF', '#808080'][idx]} stroke="none" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
                {[
                  { name: 'Criar', color: CORES.verde, value: '6.842' },
                  { name: 'Editar', color: CORES.azul, value: '6.125' },
                  { name: 'Excluir', color: CORES.laranja, value: '2.340' },
                  { name: 'Login', color: CORES.roxo, value: '2.185' },
                  { name: 'Outros', color: CORES.cinza, value: '1.240' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                      <span style={{ fontSize: 12, color: '#FFFFFF' }}>{item.name}</span>
                    </div>
                    <span style={{ fontSize: 12, color: '#9A9A9A' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* USUÁRIOS MAIS ATIVOS */}
            <div style={{ background: '#0D0D0D', border: '1px solid #1F1A14', borderRadius: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.35)', padding: 22 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#FFFFFF', marginBottom: 14 }}>Usuários mais ativos</h3>
              <div className="space-y-3">
                {userStats.map((u, idx) => (
                  <div key={idx} className="flex items-center justify-between" style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.02)' }}>
                    <div className="flex items-center gap-3">
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #D89A4D, #C8863E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#000', flexShrink: 0 }}>
                        {u.name.charAt(0)}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#FFFFFF' }}>{u.name}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#D89A4D' }}>{u.value} ações</span>
                  </div>
                ))}
              </div>
              <button style={{ width: '100%', marginTop: 14, padding: '10px 0', background: 'transparent', border: '1px solid rgba(216,154,77,0.2)', borderRadius: 10, color: '#D89A4D', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                Ver todos os usuários →
              </button>
            </div>

            {/* ÚLTIMAS AÇÕES CRÍTICAS */}
            <div style={{ background: '#0D0D0D', border: '1px solid #1F1A14', borderRadius: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.35)', padding: 22 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#FFFFFF', marginBottom: 14 }}>Últimas ações críticas</h3>
              <div className="space-y-3">
                {[
                  { desc: 'Exclusão de fornecedor Tech Solutions Ltda', date: '05/06/2026 14:25' },
                  { desc: 'Cancelamento de compra #CMP-2024-984', date: '05/06/2026 14:25' },
                  { desc: 'Falha de pagamento #PAG-2024-1563', date: '05/06/2026 14:22' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3" style={{ padding: '10px 10px', borderRadius: 10, background: 'rgba(255,93,93,0.04)' }}>
                    <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#FF5D5D' }} />
                    <div>
                      <p style={{ fontSize: 13, color: '#FFFFFF', margin: 0, lineHeight: 1.4 }}>{item.desc}</p>
                      <p style={{ fontSize: 11, color: '#9A9A9A', margin: '2px 0 0 0' }}>{item.date}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button style={{ width: '100%', marginTop: 14, padding: '10px 0', background: 'transparent', border: '1px solid rgba(255,93,93,0.2)', borderRadius: 10, color: '#FF5D5D', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                Ver todas as ações críticas →
              </button>
            </div>

          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
