import { useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../Sidebar'
import { Header } from '../Header'
import { Preloader } from '../Preloader'
import { ProvedorNotificacao as NotificacaoProvider } from '../NotificationsCenter/NotificacaoContext'
import { NexusAIButton } from '../ai/NexusAIButton'

export function Layout() {
  const [sidebarRecolhido, setSidebarRecolhido] = useState(() => {
    return localStorage.getItem('@nexus:sidebar-collapsed') === 'true'
  })
  const [mobileAberto, setMobileAberto] = useState(false)

  const alternarRecolhido = useCallback(() => {
    setSidebarRecolhido((prev) => {
      const novo = !prev
      localStorage.setItem('@nexus:sidebar-collapsed', String(novo))
      return novo
    })
  }, [])

  const alternarSidebar = useCallback(() => {
    setMobileAberto((prev) => !prev)
  }, [])

  const fecharMobile = useCallback(() => {
    setMobileAberto(false)
  }, [])

  return (
    <NotificacaoProvider>
      <Preloader />
      <div className={`flex min-h-screen ${sidebarRecolhido ? 'sidebar-collapsed' : ''}`}>
        <Sidebar
          recolhido={sidebarRecolhido}
          alternarRecolhido={alternarRecolhido}
          mobileAberto={mobileAberto}
          fecharMobile={fecharMobile}
        />
        <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
          <Header alternarSidebar={alternarSidebar} />
          <main className="flex-1 overflow-auto page-bg p-4 md:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
      <NexusAIButton />
    </NotificacaoProvider>
  )
}
