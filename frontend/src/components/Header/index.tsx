import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MagnifyingGlassIcon, Bars3Icon, CalendarDaysIcon } from '@heroicons/react/24/outline'
import { useTheme } from '../../contexts/ThemeContext'
import { NotificacaoSininho } from '../NotificationsCenter/NotificacaoSininho'
import { UserDropdown } from '../UserDropdown'
import { ProvedorNotificacao as NotificacaoProvider } from '../NotificationsCenter/NotificacaoContext'

interface HeaderProps {
  alternarSidebar: () => void
}

export function Header({ alternarSidebar }: HeaderProps) {
  const { theme, toggleTheme } = useTheme()
  const [buscaAberta, setBuscaAberta] = useState(false)

  return (
    <NotificacaoProvider>
      <header
        className="nexus-header sticky top-0 z-30 w-full border-b backdrop-blur-md"
        style={{
          background: 'var(--nexus-header-bg)',
          borderColor: 'var(--nexus-border)',
        }}
      >
        <div className="flex items-center justify-between h-16 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={alternarSidebar}
              className="p-2 rounded-lg transition-colors hover:bg-nexus-bg/50 md:hidden whitespace-nowrap"
              style={{ color: 'var(--nexus-text)' }}
            >
              <Bars3Icon className="w-5 h-5" />
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: 'var(--nexus-bg)', border: '1px solid var(--nexus-border)' }}>
              <MagnifyingGlassIcon className="w-4 h-4" style={{ color: 'var(--nexus-muted)' }} />
              <input
                type="text"
                placeholder="Buscar no sistema..."
                className="bg-transparent border-none outline-none text-sm w-48 md:w-64"
                style={{ color: 'var(--nexus-text)' }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg transition-all duration-200 hover:bg-nexus-bg/50 whitespace-nowrap"
              style={{ color: 'var(--nexus-text)' }}
              title={`Tema: ${theme === 'dark' ? 'Escuro' : theme === 'light' ? 'Claro' : 'Automático'}`}
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            <Link
              to="/appointments"
              className="p-2 rounded-lg transition-all duration-200 hover:bg-nexus-bg/50 hidden sm:block"
              style={{ color: 'var(--nexus-text)' }}
              title="Agenda"
            >
              <CalendarDaysIcon className="w-5 h-5" />
            </Link>

            <NotificacaoSininho />

            <UserDropdown />
          </div>
        </div>

        {buscaAberta && (
          <div className="px-4 pb-3 sm:hidden">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: 'var(--nexus-bg)', border: '1px solid var(--nexus-border)' }}>
              <MagnifyingGlassIcon className="w-4 h-4" style={{ color: 'var(--nexus-muted)' }} />
              <input
                type="text"
                placeholder="Buscar no sistema..."
                className="bg-transparent border-none outline-none text-sm w-full"
                style={{ color: 'var(--nexus-text)' }}
                autoFocus
                onBlur={() => setBuscaAberta(false)}
              />
            </div>
          </div>
        )}
      </header>
    </NotificacaoProvider>
  )
}
