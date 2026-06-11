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
} from '@heroicons/react/24/outline'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import api from '../../services/api'
import { AuditLog } from '../../types'
import { useToast } from '../../contexts/ToastContext'

const paleta = {
  pretoAbsoluto: '#050505',
  pretoProfundo: '#080808',
  pretoSecundario: '#0D0D0D',
  pretoTerciario: '#111111',
  pretoElevado: '#151515',
  bordaPrincipal: '#1F1A14',
  bordaSecundaria: '#2A2117',
  douradoEscuro: '#C8863E',
  douradoMedio: '#D89A4D',
  douradoClaro: '#F2B35E',
  laranjaPremium: '#E28A3F',
  laranjaDestaque: '#F2A85B',
  branco: '#FFFFFF',
  cinzaClaro: '#D8D8D8',
  cinzaMedio: '#A5A5A5',
  cinzaEscuro: '#757575',
  verde: '#5EDC74',
  azul: '#31A9FF',
  roxo: '#B366FF',
  vermelho: '#FF5D5D',
  rosa: '#D86D8C',
}

const coresGrafico = ['#5EDC74', '#31A9FF', '#F2A33D', '#B366FF', '#808080']

const coresBadge: Record<string, { bg: string; texto: string }> = {
  Criar: { bg: 'rgba(94,220,116,0.15)', texto: '#5EDC74' },
  Editar: { bg: 'rgba(49,169,255,0.15)', texto: '#31A9FF' },
  Excluir: { bg: 'rgba(242,163,61,0.15)', texto: '#F2A33D' },
  Login: { bg: 'rgba(179,102,255,0.15)', texto: '#B366FF' },
  Backup: { bg: 'rgba(216,109,140,0.15)', texto: '#D86D8C' },
}

const dadosMock = [
  { user: 'Clayton Marcelo', role: 'Administrador', action: 'Criar', module: 'Clientes', desc: 'Cliente "João Silva" foi cadastrado', ip: '192.168.1.100', data: '05/06/2026 14:32', device: 'Desktop' },
  { user: 'Ana Beatriz', role: 'Vendas', action: 'Editar', module: 'Vendas', desc: 'Venda #VDA-2024-1587 foi editada', ip: '192.168.1.101', data: '05/06/2026 14:28', device: 'Desktop' },
  { user: 'Carlos Eduardo', role: 'Financeiro', action: 'Excluir', module: 'Compras', desc: 'Compra #CMP-2024-984 foi cancelada', ip: '192.168.1.102', data: '05/06/2026 14:25', device: 'Mobile' },
  { user: 'Juliana Martins', role: 'Atendimento', action: 'Criar', module: 'CRM', desc: 'Interação #INT-2024-2540 foi criada', ip: '192.168.1.103', data: '05/06/2026 14:20', device: 'Desktop' },
  { user: 'Clayton Marcelo', role: 'Administrador', action: 'Login', module: 'Sistema', desc: 'Login realizado com sucesso', ip: '192.168.1.100', data: '05/06/2026 14:15', device: 'Desktop' },
  { user: 'Maria Costa', role: 'Estoque', action: 'Editar', module: 'Produtos', desc: 'Produto "Notebook Dell Inspiron 15" editado', ip: '192.168.1.104', data: '05/06/2026 14:10', device: 'Tablet' },
  { user: 'Roberto Pereira', role: 'Compras', action: 'Excluir', module: 'Fornecedores', desc: 'Fornecedor "Tech Solutions Ltda" excluído', ip: '192.168.1.105', data: '05/06/2026 14:05', device: 'Desktop' },
  { user: 'Ana Beatriz', role: 'Vendas', action: 'Editar', module: 'Clientes', desc: 'Cliente "Maria Costa" editado', ip: '192.168.1.101', data: '05/06/2026 14:00', device: 'Desktop' },
  { user: 'Carlos Eduardo', role: 'Financeiro', action: 'Criar', module: 'Financeiro', desc: 'Conta a pagar "Aluguel" criada', ip: '192.168.1.102', data: '05/06/2026 13:55', device: 'Desktop' },
  { user: 'Sistema', role: 'Automático', action: 'Backup', module: 'Sistema', desc: 'Backup automático realizado', ip: '-', data: '05/06/2026 13:50', device: 'Desktop' },
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

const animacaoContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const animacaoItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
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

  return (
    <div style={{ position: 'relative', minHeight: '100%', background: paleta.pretoAbsoluto }}>
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `
          radial-gradient(ellipse at 50% 0%, rgba(200,134,62,0.04) 0%, transparent 60%),
          linear-gradient(180deg, #050505 0%, #080808 40%, #0B0B0B 100%)
        `,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.006) 2px, rgba(255,255,255,0.006) 3px),
            radial-gradient(ellipse at 50% 50%, transparent 60%, rgba(0,0,0,0.6) 100%)
          `,
        }} />
      </div>

      <motion.div variants={animacaoContainer} initial="hidden" animate="visible" style={{ position: 'relative', zIndex: 1, maxWidth: 1440, margin: '0 auto' }}>

        <motion.div variants={animacaoItem} style={{ marginBottom: 32 }}>
          <h1 style={{
            fontFamily: 'Inter, "Segoe UI", Roboto, Arial, sans-serif',
            fontSize: 48, fontWeight: 700, color: paleta.branco, lineHeight: 1.1,
            letterSpacing: '-0.02em', margin: 0,
          }}>
            Auditoria
          </h1>
          <p style={{
            fontFamily: 'Inter, "Segoe UI", Roboto, Arial, sans-serif',
            fontSize: 18, fontWeight: 400, color: paleta.cinzaClaro, marginTop: 4,
          }}>
            Monitore todas as ações realizadas no sistema
          </p>
        </motion.div>

        <motion.div variants={animacaoItem} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 32 }}>
          {[
            { icon: ClipboardDocumentListIcon, label: 'Total de eventos', value: '18.732', indicador: '+15,7%', positivo: true, cor: paleta.verde },
            { icon: UserGroupIcon, label: 'Usuários ativos', value: '24', indicador: '+9,1%', positivo: true, cor: paleta.verde },
            { icon: ShieldExclamationIcon, label: 'Ações críticas', value: '128', indicador: '-8,3%', positivo: false, cor: paleta.vermelho },
            { icon: ClockIcon, label: 'Último acesso', value: '05/06/2026 14:32', info: 'Há 2 minutos' },
          ].map((card, i) => (
            <div key={i} style={{
              height: 120,
              background: 'linear-gradient(135deg, #0D0D0D 0%, #121212 100%)',
              border: `1px solid ${paleta.bordaPrincipal}`,
              borderRadius: 16,
              boxShadow: '0 10px 30px rgba(0,0,0,0.40)',
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.25s ease',
              cursor: 'default',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.45)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.40)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  width: 50, height: 50, borderRadius: 12, background: '#24180F',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <card.icon style={{ width: 20, height: 20, color: paleta.laranjaPremium }} />
                </div>
                {card.indicador && (
                  <span style={{
                    fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999,
                    background: card.positivo ? 'rgba(94,220,116,0.15)' : 'rgba(255,93,93,0.15)',
                    color: card.cor,
                  }}>
                    {card.indicador}
                  </span>
                )}
              </div>
              <div>
                <p style={{ fontSize: 13, color: paleta.douradoMedio, fontWeight: 500, margin: 0, marginBottom: 2 }}>{card.label}</p>
                <p style={{ fontSize: card.info ? 16 : 26, fontWeight: card.info ? 600 : 700, color: paleta.branco, lineHeight: 1.1, margin: 0 }}>
                  {card.value}
                </p>
                {card.info && <p style={{ fontSize: 12, color: '#9A9A9A', margin: '2px 0 0 0' }}>{card.info}</p>}
              </div>
            </div>
          ))}
        </motion.div>

        <div style={{ gap: 24, marginBottom: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
            <div style={{ flex: '1 1 500px', minWidth: 0 }}>

            <motion.div variants={animacaoItem}>
              <div style={{
                background: paleta.pretoSecundario,
                border: `1px solid ${paleta.bordaPrincipal}`,
                borderRadius: 16,
                boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                padding: 24,
              }}>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                  <div style={{ position: 'relative', flex: '2 1 200px' }}>
                    <MagnifyingGlassIcon style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: paleta.douradoMedio }} />
                    <input type="text" placeholder="Buscar por usuário, ação ou módulo..." value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      style={{
                        width: '100%', height: 48, background: paleta.pretoSecundario,
                        border: `1px solid ${paleta.bordaSecundaria}`, borderRadius: 10,
                        padding: '0 14px 0 40px', color: paleta.branco, fontSize: 14, outline: 'none',
                        boxSizing: 'border-box',
                      }} />
                  </div>
                  <select value={filtroUsuario} onChange={(e) => setFiltroUsuario(e.target.value)}
                    style={{ height: 48, background: paleta.pretoSecundario, border: `1px solid ${paleta.bordaSecundaria}`, borderRadius: 10, color: paleta.cinzaClaro, fontSize: 13, padding: '0 12px', outline: 'none', minWidth: 120 }}>
                    <option value="">Usuário</option>
                    <option>Clayton Marcelo</option>
                    <option>Ana Beatriz</option>
                    <option>Carlos Eduardo</option>
                  </select>
                  <select value={filtroAcao} onChange={(e) => setFiltroAcao(e.target.value)}
                    style={{ height: 48, background: paleta.pretoSecundario, border: `1px solid ${paleta.bordaSecundaria}`, borderRadius: 10, color: paleta.cinzaClaro, fontSize: 13, padding: '0 12px', outline: 'none', minWidth: 90 }}>
                    <option value="">Ação</option>
                    <option value="create">Criar</option>
                    <option value="update">Editar</option>
                    <option value="delete">Excluir</option>
                    <option value="login">Login</option>
                  </select>
                  <select value={filtroModulo} onChange={(e) => setFiltroModulo(e.target.value)}
                    style={{ height: 48, background: paleta.pretoSecundario, border: `1px solid ${paleta.bordaSecundaria}`, borderRadius: 10, color: paleta.cinzaClaro, fontSize: 13, padding: '0 12px', outline: 'none', minWidth: 100 }}>
                    <option value="">Módulo</option>
                    <option>Clientes</option>
                    <option>Vendas</option>
                    <option>Compras</option>
                    <option>Financeiro</option>
                  </select>
                  <select value={filtroPeriodo} onChange={(e) => setFiltroPeriodo(e.target.value)}
                    style={{ height: 48, background: paleta.pretoSecundario, border: `1px solid ${paleta.bordaSecundaria}`, borderRadius: 10, color: paleta.cinzaClaro, fontSize: 13, padding: '0 12px', outline: 'none', minWidth: 90 }}>
                    <option value="">Período</option>
                    <option value="today">Hoje</option>
                    <option value="week">Esta semana</option>
                    <option value="month">Este mês</option>
                  </select>
                  <button style={{ height: 48, padding: '0 16px', background: '#1A120D', border: `1px solid ${paleta.bordaSecundaria}`, borderRadius: 10, color: paleta.douradoMedio, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', cursor: 'pointer' }}>
                    <FunnelIcon style={{ width: 16, height: 16 }} />
                    Mais filtros
                  </button>
                  <button style={{ height: 48, padding: '0 18px', background: 'linear-gradient(135deg, #D66F7C, #C94D60)', border: 'none', borderRadius: 10, color: paleta.branco, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', boxShadow: '0 0 20px rgba(201,77,96,0.25)', cursor: 'pointer' }}>
                    <ArrowDownTrayIcon style={{ width: 16, height: 16 }} />
                    Exportar relatório
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#101010' }}>
                        {['Data/Hora', 'Usuário', 'Ação', 'Módulo', 'Descrição', 'IP', 'Dispositivo', ''].map((h) => (
                          <th key={h} style={{ padding: '14px 14px', fontSize: 11, fontWeight: 600, color: paleta.branco, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dadosMock.map((log, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s ease' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                        >
                          <td style={{ padding: '14px 14px', color: '#9A9A9A', whiteSpace: 'nowrap' }}>{log.data}</td>
                          <td style={{ padding: '14px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #D89A4D, #C8863E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#000', flexShrink: 0 }}>
                                {log.user.charAt(0)}
                              </div>
                              <div>
                                <p style={{ fontSize: 13, fontWeight: 500, color: paleta.branco, margin: 0, lineHeight: 1.3 }}>{log.user}</p>
                                <p style={{ fontSize: 11, color: '#9A9A9A', margin: 0 }}>{log.role}</p>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '14px 14px' }}>
                            <span style={{
                              display: 'inline-block', padding: '4px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                              background: coresBadge[log.action]?.bg || 'rgba(128,128,128,0.15)',
                              color: coresBadge[log.action]?.texto || '#808080',
                              lineHeight: 1.4,
                            }}>
                              {log.action}
                            </span>
                          </td>
                          <td style={{ padding: '14px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 28, height: 28, borderRadius: 6, background: paleta.pretoSecundario, border: '1px solid rgba(200,134,62,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
                                {iconeModulo(log.module)}
                              </div>
                              <span style={{ fontSize: 13, color: paleta.cinzaClaro }}>{log.module}</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 14px', color: '#BDBDBD', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.desc}</td>
                          <td style={{ padding: '14px 14px', color: '#8F8F8F', fontFamily: 'monospace' }}>{log.ip}</td>
                          <td style={{ padding: '14px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: paleta.douradoClaro }}>
                              {iconeDispositivo(log.device)}
                              <span style={{ fontSize: 12 }}>{log.device}</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 14px' }}>
                            <button style={{ width: 32, height: 32, borderRadius: 8, background: paleta.pretoTerciario, border: `1px solid ${paleta.bordaSecundaria}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: paleta.cinzaClaro, cursor: 'pointer' }}>
                              <EllipsisVerticalIcon style={{ width: 16, height: 16 }} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 }}>
                  <p style={{ fontSize: 13, color: '#9A9A9A', margin: 0 }}>Mostrando 1 a 10 de 18.732 registros</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button style={{ width: 36, height: 36, borderRadius: 8, background: paleta.pretoTerciario, border: `1px solid ${paleta.bordaSecundaria}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: paleta.cinzaClaro, cursor: 'pointer' }}>
                      <ChevronLeftIcon style={{ width: 16, height: 16 }} />
                    </button>
                    <button style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, #D66F7C, #C94D60)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: paleta.branco, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>1</button>
                    {[2, 3].map((n) => (
                      <button key={n} style={{ width: 36, height: 36, borderRadius: 8, background: paleta.pretoTerciario, border: `1px solid ${paleta.bordaSecundaria}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: paleta.cinzaClaro, fontSize: 13, cursor: 'pointer' }}>{n}</button>
                    ))}
                    <span style={{ color: '#9A9A9A', padding: '0 4px' }}>...</span>
                    <button style={{ width: 36, height: 36, borderRadius: 8, background: paleta.pretoTerciario, border: `1px solid ${paleta.bordaSecundaria}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: paleta.cinzaClaro, fontSize: 13, cursor: 'pointer' }}>1874</button>
                    <button style={{ width: 36, height: 36, borderRadius: 8, background: paleta.pretoTerciario, border: `1px solid ${paleta.bordaSecundaria}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: paleta.cinzaClaro, cursor: 'pointer' }}>
                      <ChevronRightIcon style={{ width: 16, height: 16 }} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
            </div>

            <motion.div variants={animacaoItem} style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>

              <div style={{ background: paleta.pretoSecundario, border: `1px solid ${paleta.bordaPrincipal}`, borderRadius: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.35)', padding: 22 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: paleta.branco, margin: 0, marginBottom: 16 }}>Eventos por módulo</h3>
                <div style={{ height: 190 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[
                        { name: 'Vendas', value: 4250 }, { name: 'Clientes', value: 3890 },
                        { name: 'Produtos', value: 2980 }, { name: 'Financeiro', value: 2750 },
                        { name: 'Outros', value: 4862 },
                      ]} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={4} dataKey="value">
                        {[4250, 3890, 2980, 2750, 4862].map((_, idx) => (
                          <Cell key={idx} fill={coresGrafico[idx % coresGrafico.length]} stroke="none" />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginTop: 8 }}>
                  {[
                    { name: 'Vendas', cor: paleta.verde, val: '4.250' },
                    { name: 'Clientes', cor: paleta.azul, val: '3.890' },
                    { name: 'Produtos', cor: '#F2A33D', val: '2.980' },
                    { name: 'Financeiro', cor: paleta.roxo, val: '2.750' },
                    { name: 'Outros', cor: '#808080', val: '4.862' },
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.cor, display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: paleta.branco }}>{item.name}</span>
                      </div>
                      <span style={{ fontSize: 12, color: '#9A9A9A' }}>{item.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: paleta.pretoSecundario, border: `1px solid ${paleta.bordaPrincipal}`, borderRadius: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.35)', padding: 22 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: paleta.branco, margin: 0, marginBottom: 16 }}>Ações por tipo</h3>
                <div style={{ height: 190 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[
                        { name: 'Criar', value: 6842 }, { name: 'Editar', value: 6125 },
                        { name: 'Excluir', value: 2340 }, { name: 'Login', value: 2185 },
                        { name: 'Outros', value: 1240 },
                      ]} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={4} dataKey="value">
                        {[6842, 6125, 2340, 2185, 1240].map((_, idx) => (
                          <Cell key={idx} fill={coresGrafico[idx % coresGrafico.length]} stroke="none" />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginTop: 8 }}>
                  {[
                    { name: 'Criar', cor: paleta.verde, val: '6.842' },
                    { name: 'Editar', cor: paleta.azul, val: '6.125' },
                    { name: 'Excluir', cor: '#F2A33D', val: '2.340' },
                    { name: 'Login', cor: paleta.roxo, val: '2.185' },
                    { name: 'Outros', cor: '#808080', val: '1.240' },
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.cor, display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: paleta.branco }}>{item.name}</span>
                      </div>
                      <span style={{ fontSize: 12, color: '#9A9A9A' }}>{item.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: paleta.pretoSecundario, border: `1px solid ${paleta.bordaPrincipal}`, borderRadius: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.35)', padding: 22 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: paleta.branco, margin: 0, marginBottom: 14 }}>Usuários mais ativos</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {statsUsuarios.map((u, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #D89A4D, #C8863E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#000', flexShrink: 0 }}>
                          {u.name.charAt(0)}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: paleta.branco }}>{u.name}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: paleta.douradoMedio }}>{u.value} ações</span>
                    </div>
                  ))}
                </div>
                <button style={{ width: '100%', marginTop: 14, padding: '10px 0', background: 'transparent', border: '1px solid rgba(216,154,77,0.2)', borderRadius: 10, color: paleta.douradoMedio, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                  Ver todos os usuários →
                </button>
              </div>

              <div style={{ background: paleta.pretoSecundario, border: `1px solid ${paleta.bordaPrincipal}`, borderRadius: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.35)', padding: 22 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: paleta.branco, margin: 0, marginBottom: 14 }}>Últimas ações críticas</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { desc: 'Exclusão de fornecedor Tech Solutions Ltda', data: '05/06/2026 14:25' },
                    { desc: 'Cancelamento de compra #CMP-2024-984', data: '05/06/2026 14:25' },
                    { desc: 'Falha de pagamento #PAG-2024-1563', data: '05/06/2026 14:22' },
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 10, padding: '10px 10px', borderRadius: 10, background: 'rgba(255,93,93,0.04)' }}>
                      <ExclamationTriangleIcon style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0, color: paleta.vermelho }} />
                      <div>
                        <p style={{ fontSize: 13, color: paleta.branco, margin: 0, lineHeight: 1.4 }}>{item.desc}</p>
                        <p style={{ fontSize: 11, color: '#9A9A9A', margin: '2px 0 0 0' }}>{item.data}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button style={{ width: '100%', marginTop: 14, padding: '10px 0', background: 'transparent', border: '1px solid rgba(255,93,93,0.2)', borderRadius: 10, color: paleta.vermelho, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                  Ver todas as ações críticas →
                </button>
              </div>

            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
