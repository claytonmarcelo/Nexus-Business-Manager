import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BellIcon } from '@heroicons/react/24/outline'
import { useNotificacao } from './NotificacaoContext'
import { tocarSomNotificacao } from '../../services/sons'

export function NotificacaoSininho() {
  const { notificacoes, naoLidas, marcarLida, marcarTodasLidas, listarNotificacoes } = useNotificacao()
  const [aberto, setAberto] = useState(false)
  const [balancando, setBalancando] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const prevNaoLidas = useRef(naoLidas)

  useEffect(() => {
    if (naoLidas > prevNaoLidas.current) {
      tocarSomNotificacao()
      setBalancando(true)
      setTimeout(() => setBalancando(false), 1000)
    }
    prevNaoLidas.current = naoLidas
  }, [naoLidas])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const iconeNotificacao = (tipo: string) => {
    switch (tipo) {
      case 'low_stock': return '📦'
      case 'appointment_reminder': return '📅'
      case 'due_bill': return '💰'
      default: return '🔔'
    }
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => { setAberto(!aberto); listarNotificacoes() }}
        className={`relative p-2 rounded-lg transition-all duration-200 hover:bg-nexus-bg/50 ${balancando ? 'animar-sininho' : ''}`}
        style={{ color: 'var(--nexus-gold)' }}
        title="Notificações"
      >
        <BellIcon className="w-5 h-5" />
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white rounded-full px-1 animate-pulse-subtle"
            style={{ background: 'var(--nexus-danger)' }}>
            {naoLidas > 99 ? '99+' : naoLidas}
          </span>
        )}
      </button>

      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 md:w-96 rounded-xl shadow-2xl border overflow-hidden z-50"
            style={{
              background: 'var(--nexus-card)',
              borderColor: 'var(--nexus-border)',
            }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: 'var(--nexus-border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--nexus-text)' }}>
                Notificações
              </h3>
              {naoLidas > 0 && (
                <button
                  onClick={marcarTodasLidas}
                  className="text-xs font-medium hover:underline whitespace-nowrap"
                  style={{ color: 'var(--nexus-gold)' }}
                >
                  Marcar todas lidas
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto custom-scrollbar">
              {notificacoes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-xs"
                  style={{ color: 'var(--nexus-muted)' }}>
                  <BellIcon className="w-8 h-8 mb-2 opacity-30" />
                  Nenhuma notificação
                </div>
              ) : (
                notificacoes.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => marcarLida(notif.id)}
                    className={`w-full text-left px-4 py-3 transition-colors duration-150 flex items-start gap-3 hover:bg-nexus-bg/30 ${!notif.lida ? 'bg-nexus-bg/20' : ''}`}
                    style={{ borderBottom: '1px solid var(--nexus-border)' }}
                  >
                    <span className="text-lg mt-0.5">{iconeNotificacao(notif.tipo)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate"
                        style={{ color: notif.lida ? 'var(--nexus-muted)' : 'var(--nexus-text)' }}>
                        {notif.titulo}
                      </p>
                      {notif.mensagem && (
                        <p className="text-xs mt-0.5 line-clamp-2"
                          style={{ color: 'var(--nexus-muted)' }}>
                          {notif.mensagem}
                        </p>
                      )}
                      <p className="text-[10px] mt-1 opacity-50"
                        style={{ color: 'var(--nexus-muted)' }}>
                        {new Date(notif.criadaEm).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    {!notif.lida && (
                      <span className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                        style={{ background: 'var(--nexus-gold)' }} />
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
