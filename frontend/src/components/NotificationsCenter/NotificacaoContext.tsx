import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useAuth } from '../../contexts/AuthContext'

interface Notificacao {
  id: number
  tipo: string
  titulo: string
  mensagem: string | null
  icone: string | null
  lida: boolean
  criadaEm: string
}

interface ContextoNotificacao {
  notificacoes: Notificacao[]
  naoLidas: number
  carregando: boolean
  marcarLida: (id: number) => Promise<void>
  marcarTodasLidas: () => Promise<void>
  listarNotificacoes: () => Promise<void>
}

const NotificacaoContext = createContext<ContextoNotificacao>({} as ContextoNotificacao)

export function ProvedorNotificacao({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [carregando, setCarregando] = useState(false)

  const naoLidas = notificacoes.filter((n) => !n.lida).length

  const listarNotificacoes = useCallback(async () => {
    if (!token) return
    setCarregando(true)
    try {
      const resp = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (resp.ok) {
        const data = await resp.json()
        setNotificacoes(data.data || data || [])
      }
    } catch {
    } finally {
      setCarregando(false)
    }
  }, [token])

  const marcarLida = useCallback(async (id: number) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
      setNotificacoes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
      )
    } catch {
    }
  }, [token])

  const marcarTodasLidas = useCallback(async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })))
    } catch {
    }
  }, [token])

  useEffect(() => {
    if (token) {
      listarNotificacoes()
      const intervalo = setInterval(listarNotificacoes, 30000)
      return () => clearInterval(intervalo)
    }
  }, [token, listarNotificacoes])

  return (
    <NotificacaoContext.Provider
      value={{ notificacoes, naoLidas, carregando, marcarLida, marcarTodasLidas, listarNotificacoes }}
    >
      {children}
    </NotificacaoContext.Provider>
  )
}

export function useNotificacao() {
  return useContext(NotificacaoContext)
}
