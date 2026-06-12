import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon,
  PaintBrushIcon, ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { exibirToast } from '../../services/sweetalert'
import { confirmarAcao } from '../../services/sweetalert'

export function UserDropdown() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [aberto, setAberto] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    const confirmado = await confirmarAcao(
      'Sair do sistema',
      'Tem certeza que deseja sair?'
    )
    if (confirmado) {
      signOut()
      exibirToast.sucesso('Sessão encerrada')
    }
  }

  const iniciais = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  const roleTraducao: Record<string, string> = {
    admin: 'Administrador',
    manager: 'Gerente',
    operator: 'Operador',
    viewer: 'Visualizador',
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setAberto(!aberto)}
        className="flex items-center gap-2 p-1.5 rounded-lg transition-all duration-200 hover:bg-nexus-bg/50 group"
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white overflow-hidden"
          style={{ background: user?.avatar_url ? 'transparent' : 'linear-gradient(135deg, var(--nexus-gold), var(--nexus-rose))' }}>
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            iniciais
          )}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium leading-tight truncate max-w-[120px]"
            style={{ color: 'var(--nexus-text)' }}>
            {user?.name || 'Usuário'}
          </p>
          <p className="text-[10px] leading-tight opacity-70"
            style={{ color: 'var(--nexus-muted)' }}>
            {roleTraducao[user?.role || ''] || user?.role}
          </p>
        </div>
      </button>

      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-56 rounded-xl shadow-2xl border overflow-hidden z-50"
            style={{
              background: 'var(--nexus-card)',
              borderColor: 'var(--nexus-border)',
            }}
          >
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--nexus-border)' }}>
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--nexus-text)' }}>
                {user?.name}
              </p>
              <p className="text-xs truncate opacity-70" style={{ color: 'var(--nexus-muted)' }}>
                {user?.email}
              </p>
            </div>

            <div className="py-1">
              <Link to="/profile"
                onClick={() => setAberto(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-nexus-bg/30"
                style={{ color: 'var(--nexus-text)' }}>
                <UserIcon className="w-4 h-4 opacity-70" style={{ color: 'var(--nexus-gold)' }} />
                Meu Perfil
              </Link>

              <Link to="/settings"
                onClick={() => setAberto(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-nexus-bg/30"
                style={{ color: 'var(--nexus-text)' }}>
                <Cog6ToothIcon className="w-4 h-4 opacity-70" style={{ color: 'var(--nexus-gold)' }} />
                Configurações
              </Link>

              <button
                onClick={toggleTheme}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors hover:bg-nexus-bg/30 whitespace-nowrap"
                style={{ color: 'var(--nexus-text)' }}>
                <PaintBrushIcon className="w-4 h-4 opacity-70" style={{ color: 'var(--nexus-gold)' }} />
                Tema: {theme === 'dark' ? 'Escuro' : theme === 'light' ? 'Claro' : 'Automático'}
              </button>

              <div className="border-t my-1" style={{ borderColor: 'var(--nexus-border)' }} />

              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors hover:bg-nexus-bg/30 whitespace-nowrap"
                style={{ color: 'var(--nexus-rose)' }}>
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
                Sair do Sistema
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
