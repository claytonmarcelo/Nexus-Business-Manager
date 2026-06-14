import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { verificarPermissao } from '../PermissionGuard'
import {
  ChartBarIcon, UserGroupIcon, TruckIcon, CubeIcon,
  ClipboardDocumentListIcon, ShoppingCartIcon, CurrencyDollarIcon,
  BuildingOfficeIcon, CreditCardIcon, CalendarDaysIcon, ChartPieIcon,
  BellIcon, ShieldCheckIcon, Cog6ToothIcon, LightBulbIcon,
  InformationCircleIcon, ArrowRightOnRectangleIcon,
  ChevronLeftIcon, ChevronDownIcon, Bars3Icon,
  UsersIcon, DocumentArrowUpIcon, ArrowPathIcon,
  ClipboardDocumentCheckIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { confirmarAcao } from '../../services/sweetalert'

interface ItemMenu {
  to: string
  label: string
  icone: React.ComponentType<{ className?: string }>
  cargos?: string[]
  badge?: number
  subitens?: ItemMenu[]
}

const itensMenu: ItemMenu[] = [
  { to: '/dashboard', label: 'Dashboard', icone: ChartBarIcon },
  {
    to: '#', label: 'Cadastros', icone: UserGroupIcon,
    subitens: [
      { to: '/clients', label: 'Clientes', icone: UserGroupIcon },
      { to: '/suppliers', label: 'Fornecedores', icone: TruckIcon },
      { to: '/products', label: 'Produtos', icone: CubeIcon },
    ],
  },
  {
    to: '#', label: 'Movimentações', icone: ClipboardDocumentListIcon,
    subitens: [
      { to: '/stock', label: 'Estoque', icone: ClipboardDocumentListIcon },
      { to: '/purchases', label: 'Compras', icone: ShoppingCartIcon },
      { to: '/sales', label: 'Vendas', icone: CurrencyDollarIcon },
    ],
  },
  { to: '/crm', label: 'CRM', icone: BuildingOfficeIcon },
  { to: '/financial', label: 'Financeiro', icone: CreditCardIcon },
  { to: '/appointments', label: 'Agenda', icone: CalendarDaysIcon },
  { to: '/reports', label: 'Relatórios', icone: ChartPieIcon },
  { to: '/notifications', label: 'Notificações', icone: BellIcon },
  {
    to: '#', label: 'Administração', icone: Cog6ToothIcon, cargos: ['admin', 'manager'],
    subitens: [
      { to: '/audit', label: 'Auditoria', icone: ShieldCheckIcon, cargos: ['admin', 'manager'] },
      { to: '/logs', label: 'Logs', icone: ClipboardDocumentCheckIcon },
      { to: '/backup', label: 'Backup', icone: ArrowPathIcon },
      { to: '/import', label: 'Importação', icone: DocumentArrowUpIcon },
      { to: '/suggestions', label: 'Sugestões', icone: LightBulbIcon },
      { to: '/users', label: 'Usuários', icone: UsersIcon, cargos: ['admin', 'manager'] },
      { to: '/companies', label: 'Config. Empresa', icone: Cog6ToothIcon, cargos: ['admin'] },
    ],
  },
  {
    to: '#', label: 'Comercial', icone: CreditCardIcon,
    subitens: [
      { to: '/plans', label: 'Planos', icone: CurrencyDollarIcon },
      { to: '/subscription', label: 'Assinatura', icone: CreditCardIcon },
      { to: '/invoices', label: 'Faturas', icone: ClipboardDocumentListIcon },
    ],
  },
  { to: '/nexus-ai', label: 'Nexus AI', icone: LightBulbIcon },
  { to: '/about', label: 'Sobre', icone: InformationCircleIcon },
]

interface SidebarProps {
  recolhido: boolean
  alternarRecolhido: () => void
  mobileAberto: boolean
  fecharMobile: () => void
}

export function Sidebar({ recolhido, alternarRecolhido, mobileAberto, fecharMobile }: SidebarProps) {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [submenusAbertos, setSubmenusAbertos] = useState<Record<string, boolean>>({})

  useEffect(() => {
    itensMenu.forEach((item) => {
      if (item.subitens) {
        const ativo = item.subitens.some((s) => location.pathname.startsWith(s.to))
        if (ativo && !recolhido) {
          setSubmenusAbertos((prev) => ({ ...prev, [item.label]: true }))
        }
      }
    })
  }, [location.pathname, recolhido])

  const alternarSubmenu = (label: string) => {
    if (recolhido) return
    setSubmenusAbertos((prev) => ({ ...prev, [label]: !prev[label] }))
  }



  const itemAtivo = (to: string) => location.pathname === to || location.pathname.startsWith(to + '/')

  function renderItem(item: ItemMenu) {
    if (item.cargos && !verificarPermissao(user?.role || '', item.cargos[0])) return null

    const Icon = item.icone
    const temSubitens = item.subitens && item.subitens.length > 0
    const aberto = submenusAbertos[item.label] || false
    const ativo = itemAtivo(item.to)

    if (temSubitens) {
      const subItensVisiveis = item.subitens!.filter(
        (s) => !s.cargos || verificarPermissao(user?.role || '', s.cargos[0])
      )
      if (subItensVisiveis.length === 0) return null

      return (
        <div>
          <button
            onClick={() => alternarSubmenu(item.label)}
            className={`nexus-sidebar-item w-full ${ativo ? 'active' : ''}`}
            title={recolhido ? item.label : undefined}
          >
            <span className="nexus-sidebar-icon"><Icon className="w-4 h-4" /></span>
            {!recolhido && (
              <>
                <span className="text-[13px] font-medium flex-1 text-left">{item.label}</span>
                <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`}
                  style={{ color: 'var(--nexus-muted)' }} />
              </>
            )}
          </button>
          <AnimatePresence initial={false}>
            {aberto && !recolhido && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="ml-7 border-l pl-2 space-y-0.5 mt-0.5"
                  style={{ borderColor: 'var(--nexus-border)' }}>
                  {subItensVisiveis.map((sub) => (
                    <NavLink
                      key={sub.to}
                      to={sub.to}
                      onClick={fecharMobile}
                      className={({ isActive }) =>
                        `nexus-sidebar-item py-1 ${isActive || itemAtivo(sub.to) ? 'active' : ''}`
                      }
                    >
                      <span className="text-[12px] font-medium">{sub.label}</span>
                    </NavLink>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )
    }

    return (
      <NavLink
        to={item.to}
        onClick={fecharMobile}
        className={({ isActive }) => `nexus-sidebar-item ${isActive || ativo ? 'active' : ''}`}
        title={recolhido ? item.label : undefined}
      >
        <span className="nexus-sidebar-icon"><Icon className="w-4 h-4" /></span>
        {!recolhido && (
          <>
            <span className="text-[13px] font-medium flex-1 text-left">{item.label}</span>
          </>
        )}
      </NavLink>
    )
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className={`flex items-center justify-center transition-all duration-300 ${recolhido ? 'h-20 px-2' : 'h-[140px] px-4'}`}>
        <div className="sidebar-logo-wrapper transition-all duration-300 ease-in-out">
          <img
            src="/assets/Logo.png"
            alt="Nexus Business Manager"
            className={`sidebar-logo transition-all duration-300 ease-in-out ${recolhido ? 'sidebar-logo-collapsed' : ''}`}
            style={{ maxHeight: recolhido ? '32px' : '100%' }}
          />
        </div>
      </div>

      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {itensMenu.map((item) => (
          <div key={item.to + item.label}>{renderItem(item)}</div>
        ))}
      </nav>


    </div>
  )

  return (
    <>
      <aside
        className={`nexus-sidebar hidden md:flex flex-col border-r transition-all duration-300 ease-in-out ${recolhido ? 'w-16' : 'w-64'}`}
        style={{
          borderColor: 'var(--nexus-border)',
          background: 'var(--nexus-sidebar)',
        }}
      >
        {sidebarContent}
        <button
          onClick={alternarRecolhido}
          className="absolute -right-3 w-6 h-6 rounded-full flex items-center justify-center border shadow-sm transition-transform hover:scale-110 z-10 whitespace-nowrap"
          style={{
            background: 'var(--nexus-card)',
            borderColor: 'var(--nexus-border)',
            color: 'var(--nexus-gold)',
            top: '3.3rem',
          }}
        >
          <ChevronLeftIcon className={`w-3.5 h-3.5 transition-transform duration-200 ${recolhido ? 'rotate-180' : ''}`} />
        </button>
      </aside>

      <AnimatePresence>
        {mobileAberto && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              onClick={fecharMobile}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed top-0 left-0 z-50 w-64 h-full md:hidden border-r shadow-2xl"
              style={{
                borderColor: 'var(--nexus-border)',
                background: 'var(--nexus-sidebar)',
              }}
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
